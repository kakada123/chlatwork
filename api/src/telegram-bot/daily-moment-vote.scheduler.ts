import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MomentsService } from '../moments/moments.service';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramBotClient } from './telegram-bot.client';
import {
  buildTelegramPollKeyboard,
  buildTelegramPollMessage,
} from './telegram-vote';

const ONE_MINUTE_MS = 60_000;
const DELIVERY_BATCH_SIZE = 5;

interface DueDailyPoll {
  scheduleId: string;
  momentId: string;
  telegramChatId: string;
}

@Injectable()
export class DailyMomentVoteScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DailyMomentVoteScheduler.name);
  private alignmentTimer?: NodeJS.Timeout;
  private minuteTimer?: NodeJS.Timeout;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly bot: TelegramBotClient,
    private readonly moments: MomentsService,
  ) {}

  onModuleInit() {
    void this.tick();
    const delayToMinuteBoundary = ONE_MINUTE_MS - (Date.now() % ONE_MINUTE_MS);
    this.alignmentTimer = setTimeout(() => {
      void this.tick();
      this.minuteTimer = setInterval(() => void this.tick(), ONE_MINUTE_MS);
      this.minuteTimer.unref();
    }, delayToMinuteBoundary);
    this.alignmentTimer.unref();
  }

  onModuleDestroy() {
    if (this.alignmentTimer) clearTimeout(this.alignmentTimer);
    if (this.minuteTimer) clearInterval(this.minuteTimer);
  }

  async runOnce(now = new Date()) {
    // The local date is claimed atomically so multiple API replicas cannot send the same daily poll twice.
    const duePolls = await this.prisma.$queryRaw<DueDailyPoll[]>`
      WITH due AS (
        SELECT
          schedule.id,
          schedule.moment_id,
          schedule.telegram_chat_id,
          (${now}::timestamptz AT TIME ZONE schedule.time_zone)::date AS local_date
        FROM moment_vote_schedules AS schedule
        INNER JOIN moments AS moment ON moment.id = schedule.moment_id
        WHERE schedule.enabled = TRUE
          AND moment.status = 'PUBLISHED'::"MomentStatus"
          AND (moment.publish_at IS NULL OR moment.publish_at <= ${now})
          AND (moment.expires_at IS NULL OR moment.expires_at > ${now})
          AND (
            EXTRACT(HOUR FROM (${now}::timestamptz AT TIME ZONE schedule.time_zone))::integer
              > schedule.send_hour
            OR (
              EXTRACT(HOUR FROM (${now}::timestamptz AT TIME ZONE schedule.time_zone))::integer
                = schedule.send_hour
              AND EXTRACT(MINUTE FROM (${now}::timestamptz AT TIME ZONE schedule.time_zone))::integer
                >= schedule.send_minute
            )
          )
          AND (
            schedule.last_attempt_date IS NULL
            OR schedule.last_attempt_date
              < (${now}::timestamptz AT TIME ZONE schedule.time_zone)::date
          )
        ORDER BY schedule.id
        LIMIT 100
        FOR UPDATE OF schedule SKIP LOCKED
      )
      UPDATE moment_vote_schedules AS schedule
      SET last_attempt_date = due.local_date,
          updated_at = CURRENT_TIMESTAMP
      FROM due
      WHERE schedule.id = due.id
      RETURNING
        schedule.id::text AS "scheduleId",
        schedule.moment_id::text AS "momentId",
        schedule.telegram_chat_id::text AS "telegramChatId"
    `;

    for (let index = 0; index < duePolls.length; index += DELIVERY_BATCH_SIZE) {
      await Promise.all(
        duePolls
          .slice(index, index + DELIVERY_BATCH_SIZE)
          .map((poll) => this.sendPoll(poll)),
      );
    }
    return duePolls.length;
  }

  private async tick() {
    if (this.running) return;
    this.running = true;
    try {
      await this.runOnce();
    } catch {
      this.logger.warn('Daily Moment vote run failed');
    } finally {
      this.running = false;
    }
  }

  private async sendPoll(due: DueDailyPoll) {
    try {
      const poll = await this.moments.getScheduledTelegramVotingMoment(
        due.momentId,
      );
      const chatId = Number(due.telegramChatId);
      if (!Number.isSafeInteger(chatId) || chatId === 0) {
        throw new Error('Invalid Telegram chat ID');
      }
      const publicUrl = new URL(
        `/m/${poll.slug}`,
        this.config.getOrThrow<string>('FRONTEND_ORIGIN'),
      ).toString();
      await this.bot.sendMessage(
        chatId,
        buildTelegramPollMessage(poll),
        buildTelegramPollKeyboard(poll, publicUrl),
      );
      await this.prisma.momentVoteSchedule.update({
        where: { id: due.scheduleId },
        data: { lastSentAt: new Date() },
      });
    } catch {
      // Keep chat identifiers and provider details out of operational logs.
      this.logger.warn('A daily Moment vote could not be delivered');
    }
  }
}
