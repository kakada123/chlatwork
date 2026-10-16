import { BotAccessService } from '../bot-admin/bot-access.service';
import {
  Injectable,
  Optional,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiFeature, Prisma, type CreatorTelegramRequest } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreatorGenerationService } from '../creator-ai/creator-generation.service';
import { CreatorAiException } from '../creator-ai/creator-ai.errors';
import { CREATOR_AI_DEFAULTS } from '../creator-ai/creator-ai.config';
import { containsThaiScript } from '../creator-ai/creator-output-language';
import { creatorBusinessEditText } from '../creator-ai/creator-business-edit';
import { CreatorTelegramClient } from './creator-telegram.client';
import {
  CREATOR_BUSINESS_PENDING_TEXT,
  CREATOR_QUEUED_STATUS,
  CreatorTelegramProgress,
} from './creator-telegram.progress';
import {
  CreatorTelegramService,
  KHMER_CHAT_MODES,
} from './creator-telegram.service';

const DAY_MS = 86400000;

type ReplyPart = { text: string; copyable: boolean };

function readReplyParts(value: Prisma.JsonValue): ReplyPart[] | null {
  if (!Array.isArray(value)) return null;
  const parts: ReplyPart[] = [];
  for (const part of value) {
    // Already queued replies retain their original boundaries and checkpoints.
    if (typeof part === 'string') parts.push({ text: part, copyable: false });
    else if (
      part &&
      typeof part === 'object' &&
      !Array.isArray(part) &&
      typeof part.text === 'string' &&
      typeof part.copyable === 'boolean'
    ) {
      parts.push({ text: part.text, copyable: part.copyable });
    } else return null;
  }
  return parts;
}

// Telegram measures message limits in UTF-16 units. Preserve complete code points
// and prefer paragraph/word boundaries when a Khmer result needs multiple replies.
export function splitCreatorTelegramText(text: string, maxLength = 3900) {
  const parts: string[] = [];
  let rest = text;
  while (rest.length > maxLength) {
    let end = maxLength;
    const breakAt = Math.max(
      rest.lastIndexOf('\n', end),
      rest.lastIndexOf(' ', end),
    );
    if (breakAt > end / 2) end = breakAt;
    if (/[\uD800-\uDBFF]/.test(rest.charAt(end - 1))) end--;
    parts.push(rest.slice(0, end));
    rest = rest.slice(end);
  }
  if (rest) parts.push(rest);
  return parts;
}

@Injectable()
export class CreatorTelegramWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CreatorTelegramWorker.name);
  private timer: ReturnType<typeof setInterval> | null = null;
  private busy = false;
  private lastCleanup = 0;
  private progress: CreatorTelegramProgress | null = null;
  private stopping = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly generations: CreatorGenerationService,
    private readonly bot: CreatorTelegramClient,
    private readonly menu: CreatorTelegramService,
    @Optional() private readonly botAccess?: BotAccessService,
  ) {}

  onModuleInit() {
    if (
      !this.config.get<string>('CREATOR_TELEGRAM_BOT_TOKEN') ||
      !this.config.get<string>('CREATOR_TELEGRAM_WEBHOOK_SECRET')
    )
      return;
    this.timer = setInterval(() => void this.tick(), 1500);
    this.timer.unref();
  }

  async onModuleDestroy() {
    this.stopping = true;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    await this.progress?.stop();
  }

  async tick() {
    if (this.busy || this.stopping) return;
    this.busy = true;
    try {
      const job = await this.claimNext();
      if (job) {
        try {
          await this.process(job);
        } catch {
          // Never log request bodies, AI output, tokens, or provider errors.
          this.logger.warn('Creator Telegram request deferred for retry');
          const deferred = await this.prisma.creatorTelegramRequest.updateMany({
            where: { updateId: job.updateId, leaseId: job.leaseId },
            data: {
              leaseId: null,
              lockedUntil: null,
              nextAttemptAt: new Date(Date.now() + 30000),
            },
          });
          if (deferred.count === 1 && !job.businessConnectionId) {
            await this.bot.updateStatus(
              Number(job.chatId),
              job.statusMessageId,
              job.content
                ? 'Your request is delayed. Retrying automatically—no need to resend.'
                : 'Your response is ready. Retrying delivery—no need to resend.',
            );
          }
        }
      }
      if (Date.now() - this.lastCleanup > 3600000) {
        await this.prisma.creatorTelegramRequest.deleteMany({
          where: { processedAt: { lt: new Date(Date.now() - 7 * DAY_MS) } },
        });
        await this.prisma.creatorTelegramChat.deleteMany({
          where: {
            updatedAt: { lt: new Date(Date.now() - 30 * DAY_MS) },
            // Explicit display choices remain saved when a user takes a break.
            correctionsUpdateId: -1n,
            creditsUpdateId: -1n,
          },
        });
        this.lastCleanup = Date.now();
      }
    } catch {
      this.logger.error('Creator Telegram worker cycle failed');
    } finally {
      this.busy = false;
    }
  }

  private async claimNext() {
    const now = new Date();
    const available = {
      processedAt: null,
      nextAttemptAt: { lte: now },
      OR: [{ lockedUntil: null }, { lockedUntil: { lte: now } }],
    };
    const candidates = await this.prisma.creatorTelegramRequest.findMany({
      where: available,
      orderBy: [{ createdAt: 'asc' }, { updateId: 'asc' }],
      take: 10,
    });
    for (const candidate of candidates) {
      const leaseId = randomUUID();
      const lockedUntil = this.leaseDeadline();
      const claimed = await this.prisma.creatorTelegramRequest.updateMany({
        where: { updateId: candidate.updateId, ...available },
        data: { leaseId, lockedUntil },
      });
      if (claimed.count === 1) return { ...candidate, leaseId, lockedUntil };
    }
    return null;
  }

  private async process(job: CreatorTelegramRequest) {
    if (job.businessConnectionId) {
      await this.processBusinessEdit(job);
      return;
    }
    const isGroup = job.chatId < 0n;
    const telegramUserId = job.telegramUserId ?? (isGroup ? null : job.chatId);
    // Old private jobs can use their chat ID. Group jobs must carry the real sender.
    if (
      !telegramUserId ||
      telegramUserId <= 0n ||
      (!isGroup && telegramUserId !== job.chatId)
    ) {
      await this.finish(job);
      return;
    }
    const owner = await this.prisma.socialAccount.findUnique({
      where: {
        provider_providerUserId: {
          provider: 'TELEGRAM',
          providerUserId: telegramUserId.toString(),
        },
      },
      select: { user: { select: { id: true, isActive: true } } },
    });
    // Recheck ownership at execution time; queued work must not charge or reveal
    // an account that has since been disabled or unlinked from this Telegram user.
    if (
      (this.botAccess &&
        !(await this.botAccess.allowed('CREATOR', job.userId))) ||
      !owner?.user.isActive ||
      owner.user.id !== job.userId ||
      Date.now() - job.createdAt.getTime() > DAY_MS
    ) {
      await this.finish(job);
      return;
    }

    let parts = readReplyParts(job.replyParts);
    if (!parts) {
      if (
        !job.content ||
        !Object.values(KHMER_CHAT_MODES).some(
          (mode) => mode.feature === job.feature,
        )
      ) {
        await this.finish(job);
        return;
      }
      if (!(await this.ensureStatus(job))) return;
      if (this.stopping) return;
      const progress = new CreatorTelegramProgress(
        this.bot,
        Number(job.chatId),
        job.statusMessageId,
      );
      this.progress = progress;
      progress.start(job.feature, job.lockedUntil!);
      try {
        const result = await this.generations.generate(
          job.userId,
          {
            feature: job.feature,
            sourceBot: 'CREATOR',
            payload: {
              content: job.content,
              language: 'KHMER',
              tone: 'NATURAL_KHMER',
            },
            inputSummary: 'Telegram Khmer AI',
          },
          `creator-telegram:${job.updateId}`,
        );
        const preference = await this.prisma.creatorTelegramChat.findUnique({
          where: { telegramUserId },
        });
        // Keep headings, credits and navigation out of the user's copied text.
        parts = result.data.sections.flatMap((section) => {
          const explanation =
            job.feature === AiFeature.KHMER_GRAMMAR &&
            section.id === 'corrections';
          if (explanation && preference?.showCorrections === false) return [];
          const content = explanation
            ? `${section.label}\n\n${section.content}`
            : section.content;
          return splitCreatorTelegramText(content).map((text) => ({
            text,
            copyable: !explanation,
          }));
        });
        if (!isGroup && preference?.showCredits !== false) {
          parts.push({
            text: `Credits used: ${result.usage.creditsCharged} · Balance: ${result.usage.creditsRemaining}`,
            copyable: false,
          });
        }
      } catch (error) {
        if (!(error instanceof CreatorAiException)) throw error;
        const response = error.getResponse() as {
          code?: string;
          message?: string;
        };
        if (response.code === 'AI_REQUEST_IN_PROGRESS') throw error;
        // Domain errors are safe user-facing messages; unknown provider/database
        // errors remain private and retry with the same generation key.
        parts = [
          {
            text: isGroup
              ? 'This request could not be completed. Check your account in a private chat with the Creator bot.'
              : response.message ||
                'AI generation is unavailable. Please try again later.',
            copyable: false,
          },
        ];
      } finally {
        // Drain any in-flight edit before deleting the status or posting results.
        await progress.stop();
        this.progress = null;
      }
      const saved = await this.prisma.creatorTelegramRequest.updateMany({
        where: { updateId: job.updateId, leaseId: job.leaseId },
        data: {
          replyParts: parts,
          content: null,
          lockedUntil: this.leaseDeadline(),
        },
      });
      if (saved.count !== 1) return;
      job.content = null;
    }
    const recipient = await this.prisma.socialAccount.findUnique({
      where: {
        provider_providerUserId: {
          provider: 'TELEGRAM',
          providerUserId: telegramUserId.toString(),
        },
      },
      select: { user: { select: { id: true, isActive: true } } },
    });
    if (
      (this.botAccess &&
        !(await this.botAccess.allowed('CREATOR', job.userId))) ||
      !recipient?.user.isActive ||
      recipient.user.id !== job.userId
    ) {
      await this.finish(job);
      return;
    }
    // Stored reply parts can bypass today's generation checks on a later retry.
    if (containsThaiScript(parts)) {
      const notice =
        'The AI result contained unsupported script and was not sent. Please contact support if credits were used.';
      const keyboard = await this.menu.availableKeyboard(Number(job.chatId));
      if (isGroup) {
        await this.bot.sendMessage(
          Number(job.chatId),
          notice,
          keyboard,
          undefined,
          job.sourceMessageId ?? undefined,
          { messageThreadId: job.messageThreadId ?? undefined },
        );
      } else {
        await this.bot.sendMessage(Number(job.chatId), notice, keyboard);
      }
      await this.finish(job);
      return;
    }
    for (let index = job.sentParts; index < parts.length; index++) {
      const held = await this.prisma.creatorTelegramRequest.updateMany({
        where: { updateId: job.updateId, leaseId: job.leaseId },
        data: { lockedUntil: this.leaseDeadline() },
      });
      if (held.count !== 1) return;
      const part = parts[index];
      if (part.copyable) {
        if (isGroup) {
          await this.bot.sendCopyableMessage(
            Number(job.chatId),
            part.text,
            job.sourceMessageId ?? undefined,
            job.messageThreadId ?? undefined,
          );
        } else {
          await this.bot.sendCopyableMessage(Number(job.chatId), part.text);
        }
      } else {
        const keyboard =
          index === parts.length - 1
            ? await this.menu.availableKeyboard(Number(job.chatId))
            : undefined;
        if (isGroup) {
          await this.bot.sendMessage(
            Number(job.chatId),
            part.text,
            keyboard,
            undefined,
            job.sourceMessageId ?? undefined,
            { messageThreadId: job.messageThreadId ?? undefined },
          );
        } else {
          await this.bot.sendMessage(Number(job.chatId), part.text, keyboard);
        }
      }
      // Checkpoint successful parts so a later delivery failure resumes here.
      // A lost Telegram send response can repeat that part, but never the charge.
      const saved = await this.prisma.creatorTelegramRequest.updateMany({
        where: { updateId: job.updateId, leaseId: job.leaseId },
        data: { sentParts: index + 1 },
      });
      if (saved.count !== 1) return;
    }
    await this.finish(job, 'Request finished. See the reply above.');
  }

  private async businessEditAllowed(job: CreatorTelegramRequest) {
    const sender = job.telegramUserId;
    const sourceAge = job.sourceMessageDate
      ? Date.now() - job.sourceMessageDate.getTime()
      : Infinity;
    if (
      !job.businessConnectionId ||
      !sender ||
      sender <= 0n ||
      job.chatId <= 0n ||
      sender === job.chatId ||
      !job.sourceMessageId ||
      job.sourceMessageId <= 0 ||
      sourceAge < -60000 ||
      sourceAge >= 48 * 3600_000 ||
      Date.now() - job.createdAt.getTime() > DAY_MS ||
      !Object.values(KHMER_CHAT_MODES).some(
        (mode) => mode.feature === job.feature,
      )
    )
      return false;
    const owner = await this.prisma.socialAccount.findUnique({
      where: {
        provider_providerUserId: {
          provider: 'TELEGRAM',
          providerUserId: sender.toString(),
        },
      },
      select: { user: { select: { id: true, isActive: true } } },
    });
    if (
      (this.botAccess &&
        !(await this.botAccess.allowed('CREATOR', job.userId))) ||
      !owner?.user.isActive ||
      owner.user.id !== job.userId
    )
      return false;
    const connection = await this.bot.getBusinessConnection(
      job.businessConnectionId,
    );
    return (
      connection?.id === job.businessConnectionId &&
      connection.is_enabled === true &&
      connection.user?.id === Number(sender) &&
      connection.rights?.can_reply === true
    );
  }

  private async processBusinessEdit(job: CreatorTelegramRequest) {
    if (!(await this.businessEditAllowed(job))) {
      await this.finish(job);
      return;
    }
    let parts = readReplyParts(job.replyParts);
    if (!parts) {
      if (!job.content || this.stopping) {
        if (!job.content) await this.finish(job);
        return;
      }
      // Extend the claim before reserving credits; a cancelled command loses its lease.
      const held = await this.prisma.creatorTelegramRequest.updateMany({
        where: {
          updateId: job.updateId,
          leaseId: job.leaseId,
          processedAt: null,
        },
        data: { lockedUntil: this.leaseDeadline() },
      });
      if (held.count !== 1) return;
      const command =
        /^\/([a-z][a-z0-9_]{0,31})(?:@[A-Za-z0-9_]+)?\s+([\s\S]+)$/i.exec(
          job.content.trim(),
        );
      const mode =
        command &&
        Object.entries(KHMER_CHAT_MODES).find(
          ([key, value]) =>
            key === command[1].toLowerCase() && value.feature === job.feature,
        );
      if (!mode || !command?.[2].trim()) {
        await this.finish(job);
        return;
      }
      // Reapply only the placeholder: recover a failed initial mask and check edit access before spending.
      await this.bot.editBusinessMessage(
        job.businessConnectionId!,
        Number(job.chatId),
        job.sourceMessageId!,
        CREATOR_BUSINESS_PENDING_TEXT,
      );
      // Cancellation during Telegram's check must prevent subsequent AI spending.
      const generationDeadline = this.leaseDeadline();
      const stillHeld = await this.prisma.creatorTelegramRequest.updateMany({
        where: {
          updateId: job.updateId,
          leaseId: job.leaseId,
          processedAt: null,
        },
        data: { lockedUntil: generationDeadline },
      });
      if (stillHeld.count !== 1 || this.stopping) return;
      const progress = new CreatorTelegramProgress(
        this.bot,
        Number(job.chatId),
        null,
        {
          connectionId: job.businessConnectionId!,
          isActive: async () =>
            !this.stopping &&
            !!(await this.prisma.creatorTelegramRequest.findFirst({
              where: {
                updateId: job.updateId,
                leaseId: job.leaseId,
                processedAt: null,
                lockedUntil: { gt: new Date() },
              },
              select: { updateId: true },
            })),
        },
      );
      this.progress = progress;
      progress.start(job.feature, generationDeadline);
      try {
        const result = await this.generations.generate(
          job.userId,
          {
            feature: job.feature,
            payload: {
              content: command[2].trim(),
              language: 'KHMER',
              tone: 'NATURAL_KHMER',
            },
            inputSummary: 'Telegram Business command',
            outputMode: 'BUSINESS_EDIT',
            sourceBot: 'CREATOR',
          },
          `creator-telegram:${job.updateId}`,
        );
        parts = [
          { text: creatorBusinessEditText(result.data), copyable: true },
        ];
      } catch (error) {
        if (
          !(error instanceof CreatorAiException) ||
          (error.getResponse() as { code?: string }).code ===
            'AI_REQUEST_IN_PROGRESS'
        )
          throw error;
        // Keep the original hidden on failure; neither account errors nor raw commands belong in this chat.
        this.logger.warn(
          'Creator Business command failed; placeholder preserved',
        );
        await this.finish(job);
        return;
      } finally {
        // Drain native typing before editing the result, including failures and shutdown.
        await progress.stop();
        this.progress = null;
      }
      const saved = await this.prisma.creatorTelegramRequest.updateMany({
        where: {
          updateId: job.updateId,
          leaseId: job.leaseId,
          processedAt: null,
        },
        data: {
          replyParts: parts,
          content: null,
          lockedUntil: this.leaseDeadline(),
        },
      });
      if (saved.count !== 1) return;
      job.content = null;
    }
    // An edit is one indivisible message. Never insert stored credit/error reply parts.
    if (
      parts.length !== 1 ||
      !parts[0].copyable ||
      !parts[0].text.trim() ||
      parts[0].text.length > 4096 ||
      containsThaiScript(parts)
    ) {
      await this.finish(job);
      return;
    }
    if (!(await this.businessEditAllowed(job))) {
      await this.finish(job);
      return;
    }
    const held = await this.prisma.creatorTelegramRequest.updateMany({
      where: {
        updateId: job.updateId,
        leaseId: job.leaseId,
        processedAt: null,
      },
      data: { lockedUntil: this.leaseDeadline() },
    });
    if (held.count !== 1 || this.stopping) return;
    // Retrying the same text edits the same message; Telegram's not-modified response is success.
    await this.bot.editBusinessMessage(
      job.businessConnectionId!,
      Number(job.chatId),
      job.sourceMessageId!,
      parts[0].text,
    );
    await this.finish(job);
  }

  private async ensureStatus(job: CreatorTelegramRequest) {
    if (job.statusMessageId !== null) return true;
    const messageId =
      job.chatId < 0n
        ? await this.bot.sendStatus(
            Number(job.chatId),
            CREATOR_QUEUED_STATUS,
            job.sourceMessageId ?? undefined,
            job.messageThreadId ?? undefined,
          )
        : await this.bot.sendStatus(Number(job.chatId), CREATOR_QUEUED_STATUS);
    if (messageId === null) return true;
    try {
      const saved = await this.prisma.creatorTelegramRequest.updateMany({
        where: { updateId: job.updateId, leaseId: job.leaseId },
        data: { statusMessageId: messageId },
      });
      if (saved.count === 1) {
        job.statusMessageId = messageId;
        return true;
      }
    } catch (error) {
      await this.bot.clearStatus(
        Number(job.chatId),
        messageId,
        'Your request is queued.',
      );
      throw error;
    }
    await this.bot.clearStatus(
      Number(job.chatId),
      messageId,
      'Your request is queued.',
    );
    return false;
  }

  private async finish(
    job: CreatorTelegramRequest,
    fallback = 'This request is no longer pending.',
  ) {
    // Keep only a short-lived deduplication receipt after delivery; text/output
    // leave the queue immediately and existing Creator history owns the result.
    const finished = await this.prisma.creatorTelegramRequest.updateMany({
      where: { updateId: job.updateId, leaseId: job.leaseId },
      data: {
        processedAt: new Date(),
        content: null,
        replyParts: Prisma.DbNull,
        statusMessageId: null,
        leaseId: null,
        lockedUntil: null,
      },
    });
    if (finished.count === 1 && !job.businessConnectionId)
      await this.bot.clearStatus(
        Number(job.chatId),
        job.statusMessageId,
        fallback,
      );
    return finished;
  }

  private leaseDeadline() {
    const configured = Number(this.config.get('AI_PROVIDER_TIMEOUT_MS'));
    const timeout =
      Number.isFinite(configured) && configured > 0
        ? configured
        : CREATOR_AI_DEFAULTS.providerTimeoutMs;
    return new Date(Date.now() + Math.max(300000, timeout + 120000));
  }
}
