import {
  Injectable,
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
import { CreatorTelegramClient } from './creator-telegram.client';
import {
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
          if (deferred.count === 1) {
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
    const owner = await this.prisma.socialAccount.findUnique({
      where: {
        provider_providerUserId: {
          provider: 'TELEGRAM',
          providerUserId: job.chatId.toString(),
        },
      },
      select: { user: { select: { id: true, isActive: true } } },
    });
    // Recheck ownership at execution time; queued work must not charge or reveal
    // an account that has since been disabled or unlinked from this Telegram user.
    if (
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
          where: { telegramUserId: job.chatId },
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
        if (preference?.showCredits !== false) {
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
            text:
              response.message ||
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
          providerUserId: job.chatId.toString(),
        },
      },
      select: { user: { select: { id: true, isActive: true } } },
    });
    if (!recipient?.user.isActive || recipient.user.id !== job.userId) {
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
        await this.bot.sendCopyableMessage(Number(job.chatId), part.text);
      } else {
        await this.bot.sendMessage(
          Number(job.chatId),
          part.text,
          index === parts.length - 1 ? this.menu.keyboard() : undefined,
        );
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

  private async ensureStatus(job: CreatorTelegramRequest) {
    if (job.statusMessageId !== null) return true;
    const messageId = await this.bot.sendStatus(
      Number(job.chatId),
      CREATOR_QUEUED_STATUS,
    );
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
    if (finished.count === 1)
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
