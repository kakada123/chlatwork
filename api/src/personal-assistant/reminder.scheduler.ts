import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import { AuthProvider, PersonalReminderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FeatureAvailabilityService } from '../feature-availability/feature-availability.service';
import { TelegramBotClient } from '../telegram-bot/telegram-bot.client';

const ONE_MINUTE_MS = 60_000;
const CLAIM_LEASE_MS = 5 * 60_000;
const MAX_ATTEMPTS = 3;
const BATCH_SIZE = 20;

interface ClaimedReminder {
  id: string;
  userId: string;
  message: string;
}

@Injectable()
export class PersonalReminderScheduler
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PersonalReminderScheduler.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly bot: TelegramBotClient,
    @Optional() private readonly availability?: FeatureAvailabilityService,
  ) {}

  onModuleInit() {
    void this.tick();
    this.timer = setInterval(() => void this.tick(), ONE_MINUTE_MS);
    this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async runOnce(now = new Date()) {
    // Pausing the assistant must also pause its scheduled Telegram messages.
    if (this.availability && !(await this.availability.isEnabled('telegram:assistant'))) return 0;
    const lockedUntil = new Date(now.getTime() + CLAIM_LEASE_MS);
    // One transaction changes ownership before delivery, preventing concurrent replicas from sending the same row.
    const claimed = await this.prisma.$queryRaw<ClaimedReminder[]>`
      WITH due AS (
        SELECT id
        FROM personal_reminders
        WHERE (
          (status = 'PENDING'::"PersonalReminderStatus" AND remind_at <= ${now} AND next_attempt_at <= ${now})
          OR (status = 'PROCESSING'::"PersonalReminderStatus" AND locked_until <= ${now})
        )
        AND NOT EXISTS (
          SELECT 1 FROM personal_tasks AS task
          WHERE task.id = personal_reminders.task_id
            AND task.status <> 'OPEN'::"PersonalTaskStatus"
        )
        ORDER BY remind_at, id
        LIMIT ${BATCH_SIZE}
        FOR UPDATE SKIP LOCKED
      )
      UPDATE personal_reminders AS reminder
      SET status = 'PROCESSING'::"PersonalReminderStatus",
          locked_until = ${lockedUntil},
          attempt_count = reminder.attempt_count + 1,
          updated_at = CURRENT_TIMESTAMP
      FROM due
      WHERE reminder.id = due.id
      RETURNING reminder.id::text, reminder.user_id::text AS "userId", reminder.message
    `;
    await Promise.all(claimed.map((reminder) => this.deliver(reminder, now)));
    return claimed.length;
  }

  private async deliver(reminder: ClaimedReminder, now: Date) {
    try {
      const account = await this.prisma.socialAccount.findFirst({
        where: {
          userId: reminder.userId,
          provider: AuthProvider.TELEGRAM,
          user: { isActive: true },
        },
        select: { providerUserId: true },
      });
      const chatId = Number(account?.providerUserId);
      if (!Number.isSafeInteger(chatId) || chatId <= 0)
        throw new Error('Telegram account unavailable');
      await this.bot.sendMessage(chatId, `⏰ Reminder\n\n${reminder.message}`);
      await this.prisma.personalReminder.updateMany({
        where: { id: reminder.id, status: PersonalReminderStatus.PROCESSING },
        data: {
          status: PersonalReminderStatus.SENT,
          sentAt: now,
          lockedUntil: null,
          failureReason: null,
        },
      });
      this.logger.log('Personal reminder sent');
    } catch {
      const current = await this.prisma.personalReminder.findUnique({
        where: { id: reminder.id },
        select: { attemptCount: true },
      });
      const exhausted = (current?.attemptCount ?? MAX_ATTEMPTS) >= MAX_ATTEMPTS;
      await this.prisma.personalReminder.updateMany({
        where: { id: reminder.id, status: PersonalReminderStatus.PROCESSING },
        data: {
          status: exhausted
            ? PersonalReminderStatus.FAILED
            : PersonalReminderStatus.PENDING,
          lockedUntil: null,
          nextAttemptAt: new Date(
            now.getTime() +
              ONE_MINUTE_MS * Math.max(1, current?.attemptCount ?? 1),
          ),
          failedAt: exhausted ? now : null,
          failureReason: 'Telegram delivery failed',
        },
      });
      this.logger.warn('Personal reminder delivery failed');
    }
  }

  private async tick() {
    if (this.running) return;
    this.running = true;
    try {
      await this.runOnce();
    } catch {
      this.logger.warn('Personal reminder scheduler run failed');
    } finally {
      this.running = false;
    }
  }
}
