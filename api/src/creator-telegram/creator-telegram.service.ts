import { BadRequestException, Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiFeature, AuthProvider } from '@prisma/client';
import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreatorCreditsService } from '../creator-ai/creator-credits.service';
import { CreatorPlanLimitsService } from '../creator-ai/creator-plan-limits.service';
import { CreatorPricingService } from '../creator-ai/creator-pricing.service';
import { FeatureAvailabilityService } from '../feature-availability/feature-availability.service';
import type {
  TelegramInlineKeyboard,
  TelegramUpdate,
} from '../telegram-bot/telegram-bot.types';
import { CreatorTelegramClient } from './creator-telegram.client';
import { CREATOR_QUEUED_STATUS } from './creator-telegram.progress';

export const KHMER_CHAT_MODES = {
  grammar: {
    feature: AiFeature.KHMER_GRAMMAR,
    label: 'Grammar · ខ្មែរ / English',
  },
  rewrite: { feature: AiFeature.KHMER_REWRITE, label: 'សរសេរឡើងវិញ · Rewrite' },
  latin: {
    feature: AiFeature.LATIN_TO_KHMER,
    label: 'ឡាតាំងទៅខ្មែរ · Latin → Khmer',
  },
  humanize: {
    feature: AiFeature.HUMANIZE,
    label: 'សរសេរបែបធម្មជាតិ · Humanize',
  },
} as const;

@Injectable()
export class CreatorTelegramService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly bot: CreatorTelegramClient,
    private readonly credits: CreatorCreditsService,
    private readonly plans: CreatorPlanLimitsService,
    private readonly pricing: CreatorPricingService,
    @Optional() private readonly availability?: FeatureAvailabilityService,
  ) {}

  isValidWebhookSecret(candidate?: string) {
    const expected = this.config.get<string>('CREATOR_TELEGRAM_WEBHOOK_SECRET');
    if (
      !candidate ||
      !expected ||
      !this.config.get<string>('CREATOR_TELEGRAM_BOT_TOKEN')
    )
      return false;
    return timingSafeEqual(
      createHash('sha256').update(candidate).digest(),
      createHash('sha256').update(expected).digest(),
    );
  }

  async handleUpdate(value: unknown) {
    if (!value || typeof value !== 'object')
      throw new BadRequestException('Invalid Creator bot update');
    const update = value as TelegramUpdate;
    if (!Number.isSafeInteger(update.update_id) || update.update_id < 0)
      throw new BadRequestException('Invalid Creator bot update');
    const callback = update.callback_query;
    const message = callback?.message ?? update.message;
    const sender = callback?.from ?? message?.from;
    // Private, user-owned chats only: groups and bot-originated messages cannot
    // charge accounts or receive private wallet information.
    if (
      !message ||
      message.chat?.type !== 'private' ||
      !sender ||
      sender.is_bot ||
      !Number.isSafeInteger(sender.id) ||
      sender.id <= 0 ||
      message.chat.id !== sender.id
    )
      return;

    const chatId = sender.id;
    if (callback) {
      if (
        typeof callback.id !== 'string' ||
        callback.id.length > 256 ||
        typeof callback.data !== 'string'
      )
        return;
      await this.bot.answerCallback(callback.id);
      if (
        callback.data === 'settings:view' ||
        /^settings:(corrections|credits):[01]$/.test(callback.data)
      ) {
        const setting = /^settings:(corrections|credits):([01])$/.exec(
          callback.data,
        );
        if (setting) {
          await this.setReplyPreference(
            chatId,
            setting[1] as 'corrections' | 'credits',
            setting[2] === '1',
            update.update_id,
          );
        }
        await this.showSettings(
          chatId,
          setting ? message.message_id : undefined,
        );
        return;
      }
      const mode = this.mode(callback.data.replace(/^mode:/, ''));
      if (!callback.data.startsWith('mode:') || !mode) return;
      if (!(await this.modeEnabled(mode.feature))) {
        await this.bot.sendMessage(
          chatId,
          'This Creator tool is temporarily unavailable.',
          await this.availableKeyboard(),
        );
        return;
      }
      await this.setMode(chatId, mode.feature, update.update_id);
      await this.bot.sendMessage(
        chatId,
        this.modePrompt(mode),
        await this.availableKeyboard(),
      );
      return;
    }

    const text = typeof message.text === 'string' ? message.text.trim() : '';
    const commandMatch =
      /^\/([a-z]+)(?:@[A-Za-z0-9_]+)?(?:\s+([\s\S]*))?$/i.exec(text);
    const command = commandMatch?.[1]?.toLowerCase();
    const mode = command ? this.mode(command) : null;
    if (command === 'start') {
      await this.showWelcome(chatId, update.update_id);
      return;
    }
    if (command === 'settings') {
      await this.showSettings(chatId);
      return;
    }
    if (command && ['help', 'menu', 'creator', 'khmer'].includes(command)) {
      await this.showMenu(chatId);
      return;
    }
    if (mode) {
      if (!(await this.modeEnabled(mode.feature))) {
        await this.bot.sendMessage(
          chatId,
          'This Creator tool is temporarily unavailable.',
          await this.availableKeyboard(),
        );
        return;
      }
      if (!commandMatch?.[2]?.trim()) {
        await this.setMode(chatId, mode.feature, update.update_id);
        await this.bot.sendMessage(
          chatId,
          this.modePrompt(mode),
          await this.availableKeyboard(),
        );
        return;
      }
    } else if (command && command !== 'credits') {
      await this.showMenu(chatId);
      return;
    }
    if (!text) {
      await this.bot.sendMessage(
        chatId,
        'Send text for Khmer AI. Use the Creator buttons for images and video tools.',
        await this.availableKeyboard(),
      );
      return;
    }

    const linked = await this.prisma.socialAccount.findUnique({
      where: {
        provider_providerUserId: {
          provider: AuthProvider.TELEGRAM,
          providerUserId: String(sender.id),
        },
      },
      select: { user: { select: { id: true, isActive: true } } },
    });
    if (!linked?.user.isActive) {
      await this.bot.sendMessage(
        chatId,
        'Open Creator once to sign in with Telegram, then return here to use Khmer AI. Your linked account shares its existing credits and daily limit.',
        await this.availableKeyboard(),
      );
      return;
    }
    if (command === 'credits') {
      const [wallet, usage] = await Promise.all([
        this.credits.getBalance(linked.user.id),
        this.plans.dailyUsage(this.prisma, linked.user.id),
      ]);
      await this.bot.sendMessage(
        chatId,
        `Credits: ${wallet.balance}\nDaily usage: ${usage.used} / ${usage.limit} credits\nRemaining today: ${usage.remaining}\nResets at 07:00 Cambodia (00:00 UTC).`,
        await this.availableKeyboard(),
      );
      return;
    }

    const content = mode ? commandMatch![2]!.trim() : text;
    if (content.length > 4000 || content.startsWith('/')) {
      await this.bot.sendMessage(
        chatId,
        'Please send 1–4,000 characters of text, or use /help for commands.',
        await this.availableKeyboard(),
      );
      return;
    }
    const preference = await this.prisma.creatorTelegramChat.findUnique({
      where: { telegramUserId: BigInt(chatId) },
    });
    const feature =
      mode?.feature ?? preference?.feature ?? AiFeature.KHMER_GRAMMAR;
    if (!(await this.modeEnabled(feature))) {
      await this.bot.sendMessage(
        chatId,
        'This Creator tool is temporarily unavailable. Choose an available mode.',
        await this.availableKeyboard(),
      );
      return;
    }
    const acknowledgementLease = randomUUID();
    const queued = await this.prisma.$transaction(async (tx) => {
      // Bound queued work before provider reservations; duplicate Telegram updates
      // keep the first request's account, mode and text immutable.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`creator-telegram-queue:${linked.user.id}`}))`;
      const existing = await tx.creatorTelegramRequest.findUnique({
        where: { updateId: BigInt(update.update_id) },
      });
      if (existing) return 'duplicate';
      const pending = await tx.creatorTelegramRequest.count({
        where: { userId: linked.user.id, processedAt: null },
      });
      if (pending >= 3) return 'full';
      await tx.creatorTelegramRequest.create({
        data: {
          updateId: BigInt(update.update_id),
          userId: linked.user.id,
          chatId: BigInt(chatId),
          feature,
          content,
          // Let the webhook save its acknowledgement before a worker takes over.
          // A crashed webhook releases this claim automatically after 30 seconds.
          leaseId: acknowledgementLease,
          lockedUntil: new Date(Date.now() + 30000),
        },
      });
      return 'queued';
    });
    if (queued === 'full')
      await this.bot.sendMessage(
        chatId,
        'Your earlier requests are still processing. Please wait for a reply before sending more text.',
      );
    if (queued === 'queued') {
      const statusMessageId = await this.bot.sendStatus(
        chatId,
        CREATOR_QUEUED_STATUS,
      );
      try {
        const saved = await this.prisma.creatorTelegramRequest.updateMany({
          where: {
            updateId: BigInt(update.update_id),
            leaseId: acknowledgementLease,
          },
          data: { statusMessageId, leaseId: null, lockedUntil: null },
        });
        if (saved.count !== 1)
          await this.bot.clearStatus(
            chatId,
            statusMessageId,
            'Your request is queued.',
          );
      } catch (error) {
        await this.bot.clearStatus(
          chatId,
          statusMessageId,
          'Your request is queued.',
        );
        throw error;
      }
    }
  }

  keyboard(): TelegramInlineKeyboard {
    return this.keyboardFor(
      Object.values(KHMER_CHAT_MODES).map((mode) => mode.feature),
    );
  }

  async availableKeyboard(): Promise<TelegramInlineKeyboard> {
    const disabled = new Set((await this.availability?.disabledKeys()) ?? []);
    return this.keyboardFor(
      Object.values(AiFeature).filter(
        (feature) => !disabled.has(`creator:${feature}`),
      ),
    );
  }

  private keyboardFor(available: AiFeature[]): TelegramInlineKeyboard {
    const toolRows = [
      [
        { feature: AiFeature.POST, text: '📝 Posts', path: '/creator/create/post' },
        { feature: AiFeature.SCRIPT, text: '🎬 Scripts', path: '/creator/create/script' },
      ],
      [
        { feature: AiFeature.CONTENT_IDEAS, text: '💡 Ideas', path: '/creator/create/ideas' },
        { feature: AiFeature.HOOK, text: '🪝 Hooks', path: '/creator/create/hook' },
      ],
    ].map((row) =>
      row
        .filter((tool) => available.includes(tool.feature))
        .map((tool) => ({ text: tool.text, web_app: { url: this.appUrl(tool.path) } })),
    );
    const videoAvailable = available.some((feature) => feature.startsWith('VIDEO_'));
    return {
      inline_keyboard: [
        ...Object.entries(KHMER_CHAT_MODES)
          .filter(([, mode]) => available.includes(mode.feature))
          .map(([key, mode]) => [
            { text: mode.label, callback_data: `mode:${key}` },
          ]),
        [{ text: '⚙️ Settings', callback_data: 'settings:view' }],
        [
          {
            text: '✨ Open Creator / Sign in',
            web_app: { url: this.appUrl('/creator') },
          },
        ],
        ...toolRows,
        [
          ...(videoAvailable
            ? [{ text: '🎞 Video tools', web_app: { url: this.appUrl('/creator#creator-video-title') } }]
            : []),
          {
            text: '💳 Credits',
            web_app: { url: this.appUrl('/creator/credits') },
          },
        ],
      ].filter((row) => row.length > 0),
    };
  }

  private async modeEnabled(feature: AiFeature) {
    return this.availability?.isEnabled(`creator:${feature}`) ?? true;
  }

  private mode(command: string) {
    return Object.hasOwn(KHMER_CHAT_MODES, command)
      ? KHMER_CHAT_MODES[command as keyof typeof KHMER_CHAT_MODES]
      : null;
  }

  private async showSettings(chatId: number, messageId?: number) {
    const preference = await this.prisma.creatorTelegramChat.findUnique({
      where: { telegramUserId: BigInt(chatId) },
    });
    const showCorrections = preference?.showCorrections ?? true;
    const showCredits = preference?.showCredits ?? true;
    const keyboard: TelegramInlineKeyboard = {
      inline_keyboard: [
        [
          {
            text: `${showCorrections ? '✅ ON' : '❌ OFF'} · What changed`,
            callback_data: `settings:corrections:${showCorrections ? '0' : '1'}`,
          },
        ],
        [
          {
            text: `${showCredits ? '✅ ON' : '❌ OFF'} · Credits used`,
            callback_data: `settings:credits:${showCredits ? '0' : '1'}`,
          },
        ],
      ],
    };
    const text =
      '⚙️ Your reply settings\n\nChoose what to include in future replies. Corrected text is always shown.\n\nHiding credits does not change charges. Use /credits to check your balance anytime.';
    if (Number.isSafeInteger(messageId) && messageId! > 0) {
      await this.bot.editMessage(chatId, messageId!, text, keyboard);
    } else {
      await this.bot.sendMessage(chatId, text, keyboard);
    }
  }

  private async setReplyPreference(
    chatId: number,
    setting: 'corrections' | 'credits',
    enabled: boolean,
    updateId: number,
  ) {
    await this.prisma.creatorTelegramChat.createMany({
      data: [{ telegramUserId: BigInt(chatId) }],
      skipDuplicates: true,
    });
    // Buttons set an explicit value. Independent update cursors prevent duplicate
    // or out-of-order callbacks from undoing either of the user's later choices.
    const field = setting === 'corrections' ? 'showCorrections' : 'showCredits';
    const cursor =
      setting === 'corrections' ? 'correctionsUpdateId' : 'creditsUpdateId';
    await this.prisma.creatorTelegramChat.updateMany({
      where: {
        telegramUserId: BigInt(chatId),
        [cursor]: { lt: BigInt(updateId) },
      },
      data: { [field]: enabled, [cursor]: BigInt(updateId) },
    });
  }

  private async setMode(chatId: number, feature: AiFeature, updateId: number) {
    // An older webhook retry cannot revert a later mode choice.
    await this.prisma.creatorTelegramChat.createMany({
      data: [
        {
          telegramUserId: BigInt(chatId),
          feature,
          lastUpdateId: BigInt(updateId),
        },
      ],
      skipDuplicates: true,
    });
    await this.prisma.creatorTelegramChat.updateMany({
      where: {
        telegramUserId: BigInt(chatId),
        lastUpdateId: { lt: BigInt(updateId) },
      },
      data: { feature, lastUpdateId: BigInt(updateId) },
    });
  }

  private modePrompt(
    mode: (typeof KHMER_CHAT_MODES)[keyof typeof KHMER_CHAT_MODES],
  ) {
    const instruction =
      mode.feature === AiFeature.KHMER_GRAMMAR
        ? 'Send Khmer or English text. Get corrected text in the original language, plus a separate list explaining mistakes and missing words.'
        : 'Send your text here.';
    return `${mode.label}\n\nផ្ញើអត្ថបទរបស់អ្នកនៅទីនេះ។\n${instruction} ${this.pricing.fixed(mode.feature)} credit(s) per request, using your account's daily allowance.`;
  }

  private async showWelcome(chatId: number, updateId: number) {
    const claimed = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`creator-telegram-welcome:${chatId}`}))`;
      await tx.creatorTelegramChat.createMany({
        data: [{ telegramUserId: BigInt(chatId) }],
        skipDuplicates: true,
      });
      const previous = await tx.creatorTelegramChat.findUniqueOrThrow({
        where: { telegramUserId: BigInt(chatId) },
        select: { welcomeUpdateId: true },
      });
      const saved = await tx.creatorTelegramChat.updateMany({
        where: {
          telegramUserId: BigInt(chatId),
          welcomeUpdateId: { lt: BigInt(updateId) },
        },
        data: { welcomeUpdateId: BigInt(updateId) },
      });
      return saved.count === 1 ? previous.welcomeUpdateId : null;
    });
    if (claimed === null) return;
    try {
      // Claim before sending, across replicas, without holding a DB transaction
      // open during Telegram calls. A later intentional Start still works.
      await this.showMenu(chatId);
    } catch (error) {
      // Retry a failed welcome without undoing a newer Start claim.
      await this.prisma.creatorTelegramChat.updateMany({
        where: {
          telegramUserId: BigInt(chatId),
          welcomeUpdateId: BigInt(updateId),
        },
        data: { welcomeUpdateId: claimed },
      });
      throw error;
    }
  }

  private async showMenu(chatId: number) {
    const preference = await this.prisma.creatorTelegramChat.findUnique({
      where: { telegramUserId: BigInt(chatId) },
    });
    const selected =
      Object.values(KHMER_CHAT_MODES).find(
        (mode) => mode.feature === preference?.feature,
      );
    const availableModes = [];
    for (const mode of Object.values(KHMER_CHAT_MODES)) {
      if (await this.modeEnabled(mode.feature)) availableModes.push(mode);
    }
    const active = availableModes.find((mode) => mode.feature === selected?.feature) ?? availableModes[0];
    await this.bot.sendMessage(
      chatId,
      active
        ? `សួស្តី! ខ្ញុំជាជំនួយការ Khmer AI & Creator។\n\nChoose a Khmer AI mode below, then send text for a reply here.\n\n${this.modePrompt(active)}\n\n/credits shows your balance and daily usage. Other available tools open in Creator.`
        : 'Khmer AI chat modes are temporarily unavailable. Available Creator tools can still be opened below.',
      await this.availableKeyboard(),
    );
    try {
      await this.bot.setChatMenuButton(
        chatId,
        'Open Creator',
        this.appUrl('/creator'),
      );
    } catch {
      /* The inline menu remains available if Telegram cannot update its menu button. */
    }
  }

  private appUrl(path: string) {
    return new URL(
      path,
      this.config.getOrThrow<string>('FRONTEND_ORIGIN'),
    ).toString();
  }
}
