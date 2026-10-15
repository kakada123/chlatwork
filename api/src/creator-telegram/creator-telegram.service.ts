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

type CreatorReplyContext = {
  telegramUserId: number;
  sourceMessageId: number;
  messageThreadId?: number;
};

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
  khmer_to_latin: {
    feature: AiFeature.KHMER_TO_LATIN,
    label: 'ខ្មែរ → ឡាតាំង · Khmer → Latin',
  },
  khmer_to_english: {
    feature: AiFeature.KHMER_TO_ENGLISH,
    label: 'ខ្មែរ → អង់គ្លេស · Khmer → English',
  },
  latin_to_english: {
    feature: AiFeature.LATIN_TO_ENGLISH,
    label: 'ឡាតាំង → អង់គ្លេស · Latin → English',
  },
  english_to_latin: {
    feature: AiFeature.ENGLISH_TO_LATIN,
    label: 'អង់គ្លេស → ឡាតាំង · English → Latin',
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
    const isGroup =
      message?.chat?.type === 'group' || message?.chat?.type === 'supergroup';
    // The sender authorizes paid work. A group or anonymous sender never owns a wallet.
    if (
      !message ||
      (!isGroup && message.chat?.type !== 'private') ||
      !sender ||
      sender.is_bot ||
      (!callback && message.sender_chat) ||
      !Number.isSafeInteger(sender.id) ||
      sender.id <= 0 ||
      !Number.isSafeInteger(message.chat.id) ||
      !Number.isSafeInteger(message.message_id) ||
      message.message_id <= 0 ||
      (isGroup ? message.chat.id >= 0 : message.chat.id !== sender.id) ||
      (message.message_thread_id !== undefined &&
        (!Number.isSafeInteger(message.message_thread_id) ||
          message.message_thread_id <= 0))
    )
      return;

    const chatId = message.chat.id;
    const context: CreatorReplyContext = {
      telegramUserId: sender.id,
      sourceMessageId: message.message_id,
      messageThreadId: message.message_thread_id,
    };
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
        if (isGroup) {
          await this.privateAccountNotice(chatId, context);
          return;
        }
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
        await this.sendReply(
          chatId,
          'This Creator tool is temporarily unavailable.',
          await this.availableKeyboard(chatId),
          context,
        );
        return;
      }
      await this.setMode(sender.id, mode.feature, update.update_id);
      await this.showModePrompt(chatId, mode, false, context);
      return;
    }

    const text = typeof message.text === 'string' ? message.text.trim() : '';
    const commandMatch =
      /^\/([a-z][a-z0-9_]{0,31})(?:@([A-Za-z0-9_]+))?(?:\s+([\s\S]*))?$/i.exec(
        text,
      );
    const command = commandMatch?.[1]?.toLowerCase();
    const commandText = commandMatch?.[3]?.trim();
    const mode = command ? this.mode(command) : null;
    if (isGroup) {
      const addressedTo = commandMatch?.[2];
      if (
        addressedTo &&
        addressedTo.toLowerCase() !==
          (await this.bot.getIdentity()).username?.toLowerCase()
      )
        return;
      if (!command) {
        const replySender = message.reply_to_message?.from;
        // Ordinary conversation and replies to other members/bots never spend credits.
        if (
          !replySender?.is_bot ||
          replySender.id !== (await this.bot.getIdentity()).id
        )
          return;
      }
      if (
        command &&
        !mode &&
        ![
          'start',
          'settings',
          'help',
          'menu',
          'creator',
          'khmer',
          'credits',
        ].includes(command)
      )
        return;
      if (command === 'settings' || command === 'credits') {
        await this.privateAccountNotice(chatId, context);
        return;
      }
    }
    if (command === 'start') {
      await this.showWelcome(chatId, update.update_id, context);
      return;
    }
    if (command === 'settings') {
      await this.showSettings(chatId);
      return;
    }
    if (command && ['help', 'menu', 'creator', 'khmer'].includes(command)) {
      await this.showMenu(chatId, context);
      return;
    }
    if (mode) {
      if (!(await this.modeEnabled(mode.feature))) {
        await this.sendReply(
          chatId,
          'This Creator tool is temporarily unavailable.',
          await this.availableKeyboard(chatId),
          context,
        );
        return;
      }
      if (!commandText) {
        await this.setMode(sender.id, mode.feature, update.update_id);
        await this.showModePrompt(chatId, mode, false, context);
        return;
      }
    } else if (command && command !== 'credits') {
      await this.showMenu(chatId, context);
      return;
    }
    if (!text) {
      await this.sendReply(
        chatId,
        'Send text for Khmer AI. Use the Creator buttons for images and video tools.',
        await this.availableKeyboard(chatId),
        context,
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
      await this.sendReply(
        chatId,
        'Open Creator once to sign in with Telegram, then return here to use Khmer AI. Your linked account shares its existing credits and daily limit.',
        await this.availableKeyboard(chatId),
        context,
      );
      return;
    }
    if (command === 'credits') {
      const [wallet, usage] = await Promise.all([
        this.credits.getBalance(linked.user.id),
        this.plans.dailyUsage(this.prisma, linked.user.id),
      ]);
      await this.sendReply(
        chatId,
        `Credits: ${wallet.balance}\nDaily usage: ${usage.used} / ${usage.limit} credits\nRemaining today: ${usage.remaining}\nResets at 07:00 Cambodia (00:00 UTC).`,
        await this.availableKeyboard(chatId),
        context,
      );
      return;
    }

    const content = mode ? commandText! : text;
    if (content.length > 4000 || content.startsWith('/')) {
      await this.sendReply(
        chatId,
        'Please send 1–4,000 characters of text, or use /help for commands.',
        await this.availableKeyboard(chatId),
        context,
      );
      return;
    }
    const preference = await this.prisma.creatorTelegramChat.findUnique({
      where: { telegramUserId: BigInt(sender.id) },
    });
    const feature =
      mode?.feature ?? preference?.feature ?? AiFeature.KHMER_GRAMMAR;
    if (!(await this.modeEnabled(feature))) {
      await this.sendReply(
        chatId,
        'This Creator tool is temporarily unavailable. Choose an available mode.',
        await this.availableKeyboard(chatId),
        context,
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
          telegramUserId: BigInt(sender.id),
          ...(isGroup
            ? {
                sourceMessageId: message.message_id,
                ...(message.message_thread_id
                  ? { messageThreadId: message.message_thread_id }
                  : {}),
              }
            : {}),
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
      await this.sendReply(
        chatId,
        'Your earlier requests are still processing. Please wait for a reply before sending more text.',
        undefined,
        context,
      );
    if (queued === 'queued') {
      const statusMessageId = isGroup
        ? await this.bot.sendStatus(
            chatId,
            CREATOR_QUEUED_STATUS,
            message.message_id,
            message.message_thread_id,
          )
        : await this.bot.sendStatus(chatId, CREATOR_QUEUED_STATUS);
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

  async availableKeyboard(chatId = 1): Promise<TelegramInlineKeyboard> {
    const disabled = new Set((await this.availability?.disabledKeys()) ?? []);
    return this.keyboardFor(
      Object.values(AiFeature).filter(
        (feature) => !disabled.has(`creator:${feature}`),
      ),
      chatId < 0,
    );
  }

  private keyboardFor(
    available: AiFeature[],
    group = false,
  ): TelegramInlineKeyboard {
    const toolRows = [
      [
        {
          feature: AiFeature.POST,
          text: '📝 Posts',
          path: '/creator/create/post',
        },
        {
          feature: AiFeature.SCRIPT,
          text: '🎬 Scripts',
          path: '/creator/create/script',
        },
      ],
      [
        {
          feature: AiFeature.CONTENT_IDEAS,
          text: '💡 Ideas',
          path: '/creator/create/ideas',
        },
        {
          feature: AiFeature.HOOK,
          text: '🪝 Hooks',
          path: '/creator/create/hook',
        },
      ],
    ].map((row) =>
      row
        .filter((tool) => available.includes(tool.feature))
        .map((tool) => ({
          text: tool.text,
          web_app: { url: this.appUrl(tool.path) },
        })),
    );
    const videoAvailable = available.some((feature) =>
      feature.startsWith('VIDEO_'),
    );
    const keyboard: TelegramInlineKeyboard = {
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
            ? [
                {
                  text: '🎞 Video tools',
                  web_app: { url: this.appUrl('/creator#creator-video-title') },
                },
              ]
            : []),
          {
            text: '💳 Credits',
            web_app: { url: this.appUrl('/creator/credits') },
          },
        ],
      ].filter((row) => row.length > 0),
    };
    if (!group) return keyboard;
    // Telegram Web App buttons are private-chat-only; group links open the website.
    return {
      inline_keyboard: keyboard.inline_keyboard
        .map((row) =>
          row
            .filter((button) => button.callback_data !== 'settings:view')
            .map((button) => {
              if (!button.web_app) return button;
              const { web_app, ...rest } = button;
              return { ...rest, url: web_app.url };
            }),
        )
        .filter((row) => row.length > 0),
    };
  }

  private async privateAccountNotice(
    chatId: number,
    context?: CreatorReplyContext,
  ) {
    await this.sendReply(
      chatId,
      'Open a private chat with the Creator bot for credits and reply settings.',
      await this.availableKeyboard(chatId),
      context,
    );
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

  private async showModePrompt(
    chatId: number,
    mode: (typeof KHMER_CHAT_MODES)[keyof typeof KHMER_CHAT_MODES],
    welcome = false,
    context?: CreatorReplyContext,
  ) {
    // Inline buttons always render below their message, so send the prompt separately.
    await this.sendReply(
      chatId,
      `${welcome ? 'Khmer AI & Creator\n\n' : ''}${mode.label} · ${this.pricing.fixed(mode.feature)} credit(s)`,
      await this.availableKeyboard(chatId),
      context,
    );
    await this.sendReply(
      chatId,
      chatId < 0
        ? 'ឆ្លើយតបជាមួយអត្ថបទ។ / Reply with your text.'
        : 'ផ្ញើអត្ថបទនៅទីនេះ។ / Send your text here.',
      undefined,
      context,
    );
  }

  private sendReply(
    chatId: number,
    text: string,
    keyboard?: TelegramInlineKeyboard,
    context?: CreatorReplyContext,
  ) {
    if (chatId < 0)
      return this.bot.sendMessage(
        chatId,
        text,
        keyboard,
        undefined,
        context?.sourceMessageId,
        { messageThreadId: context?.messageThreadId },
      );
    return keyboard
      ? this.bot.sendMessage(chatId, text, keyboard)
      : this.bot.sendMessage(chatId, text);
  }

  private async showWelcome(
    chatId: number,
    updateId: number,
    context?: CreatorReplyContext,
  ) {
    const telegramUserId = context?.telegramUserId ?? chatId;
    const claimed = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`creator-telegram-welcome:${telegramUserId}`}))`;
      await tx.creatorTelegramChat.createMany({
        data: [{ telegramUserId: BigInt(telegramUserId) }],
        skipDuplicates: true,
      });
      const previous = await tx.creatorTelegramChat.findUniqueOrThrow({
        where: { telegramUserId: BigInt(telegramUserId) },
        select: { welcomeUpdateId: true },
      });
      const saved = await tx.creatorTelegramChat.updateMany({
        where: {
          telegramUserId: BigInt(telegramUserId),
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
      await this.showMenu(chatId, context);
    } catch (error) {
      // Retry a failed welcome without undoing a newer Start claim.
      await this.prisma.creatorTelegramChat.updateMany({
        where: {
          telegramUserId: BigInt(telegramUserId),
          welcomeUpdateId: BigInt(updateId),
        },
        data: { welcomeUpdateId: claimed },
      });
      throw error;
    }
  }

  private async showMenu(chatId: number, context?: CreatorReplyContext) {
    const preference = await this.prisma.creatorTelegramChat.findUnique({
      where: { telegramUserId: BigInt(context?.telegramUserId ?? chatId) },
    });
    const selected = Object.values(KHMER_CHAT_MODES).find(
      (mode) => mode.feature === preference?.feature,
    );
    const availableModes = [];
    for (const mode of Object.values(KHMER_CHAT_MODES)) {
      if (await this.modeEnabled(mode.feature)) availableModes.push(mode);
    }
    const active =
      availableModes.find((mode) => mode.feature === selected?.feature) ??
      availableModes[0];
    if (active) {
      await this.showModePrompt(chatId, active, true, context);
    } else {
      await this.sendReply(
        chatId,
        'Khmer AI chat modes are temporarily unavailable. Available Creator tools can still be opened below.',
        await this.availableKeyboard(chatId),
        context,
      );
    }
    if (chatId < 0) return;
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
