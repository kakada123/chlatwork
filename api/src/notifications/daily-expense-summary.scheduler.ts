import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "./notifications.service";

const ONE_MINUTE_MS = 60_000;
const DELIVERY_BATCH_SIZE = 5;

interface DueSummaryUser {
  userId: string;
  localDate: string;
}

interface DailyExpenseTotal {
  total: string;
  currency: "USD" | "KHR";
}

export function formatDailyExpenseTotal(
  total: string,
  currency: "USD" | "KHR",
) {
  const match = total.trim().match(/^(-?)(\d+)(?:\.(\d+))?$/);
  if (!match) return currency === "KHR" ? "0៛" : "$0.00";

  const [, sign, rawWhole, rawFraction = ""] = match;
  let whole = BigInt(rawWhole);
  if (
    currency === "KHR" &&
    Number(rawFraction.padEnd(2, "0").slice(0, 2)) >= 50
  ) {
    whole += 1n;
  }

  const groupedWhole = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const prefix = sign === "-" ? "-" : "";
  if (currency === "KHR") return `${prefix}${groupedWhole}៛`;

  const fraction = rawFraction.padEnd(2, "0").slice(0, 2);
  return `${prefix}$${groupedWhole}.${fraction}`;
}

@Injectable()
export class DailyExpenseSummaryScheduler
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(DailyExpenseSummaryScheduler.name);
  private alignmentTimer?: NodeJS.Timeout;
  private minuteTimer?: NodeJS.Timeout;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
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
    // Claiming the local date inside one locked statement makes delivery at-most-once across API replicas.
    // A failed provider attempt stays claimed so a transient outage cannot create repeated notification spam.
    const dueUsers = await this.prisma.$queryRaw<DueSummaryUser[]>`
      WITH due AS (
        SELECT
          id,
          (${now}::timestamptz AT TIME ZONE telegram_notification_time_zone)::date AS local_date
        FROM users
        WHERE telegram_notifications_enabled = TRUE
          AND EXTRACT(
            HOUR FROM (${now}::timestamptz AT TIME ZONE telegram_notification_time_zone)
          )::integer >= telegram_daily_expense_summary_hour
          AND (
            telegram_daily_expense_summary_last_attempt_date IS NULL
            OR telegram_daily_expense_summary_last_attempt_date
              < (${now}::timestamptz AT TIME ZONE telegram_notification_time_zone)::date
          )
        ORDER BY id
        LIMIT 100
        FOR UPDATE SKIP LOCKED
      )
      UPDATE users AS recipient
      SET telegram_daily_expense_summary_last_attempt_date = due.local_date
      FROM due
      WHERE recipient.id = due.id
      RETURNING
        recipient.id::text AS "userId",
        due.local_date::text AS "localDate"
    `;

    for (let index = 0; index < dueUsers.length; index += DELIVERY_BATCH_SIZE) {
      const batch = dueUsers.slice(index, index + DELIVERY_BATCH_SIZE);
      await Promise.all(batch.map((recipient) => this.sendSummary(recipient)));
    }

    return dueUsers.length;
  }

  private async tick() {
    if (this.running) return;
    this.running = true;
    try {
      await this.runOnce();
    } catch {
      // Keep operational logs useful without exposing account identifiers or provider request details.
      this.logger.warn("Daily expense summary run failed");
    } finally {
      this.running = false;
    }
  }

  private async sendSummary(recipient: DueSummaryUser) {
    try {
      const rows = await this.prisma.$queryRaw<DailyExpenseTotal[]>`
        SELECT
          COALESCE((
            SELECT SUM(entry.amount)
            FROM expense_entries AS entry
            WHERE entry."userId" = ${recipient.userId}::uuid
              AND entry.type = 'EXPENSE'
              AND entry."entryDate" = ${recipient.localDate}::date
          ), 0)::text AS "total",
          COALESCE((
            SELECT profile.currency::text
            FROM expense_profiles AS profile
            WHERE profile."userId" = ${recipient.userId}::uuid
          ), 'USD') AS "currency"
      `;
      const summary = rows[0] ?? { total: "0", currency: "USD" as const };
      const amount = formatDailyExpenseTotal(summary.total, summary.currency);

      await this.notifications.sendToUser(
        recipient.userId,
        `Daily expense summary\n${recipient.localDate}\nTotal spent: ${amount}`,
      );
    } catch {
      // One unavailable Telegram recipient must not block other users' summaries.
      this.logger.warn("A daily expense summary could not be delivered");
    }
  }
}
