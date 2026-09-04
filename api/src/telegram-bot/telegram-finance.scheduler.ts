import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import type { ExpenseCurrency } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { formatTelegramMoney } from './telegram-group-split';

const FIVE_MINUTES_MS = 5 * 60_000;
const DELIVERY_BATCH_SIZE = 5;

interface BudgetCandidate {
  userId: string;
  currency: ExpenseCurrency;
  budgetPeriod: 'MONTHLY' | 'WEEKLY';
  budgetInput: string;
  periodStart: string;
  localDate: string;
  spent: string;
}

interface WeeklyRecipient {
  userId: string;
  localDate: string;
}

interface WeeklyExpenseRow {
  currency: ExpenseCurrency;
  entryDate: string;
  category: string;
  amount: string;
}

@Injectable()
export class TelegramFinanceScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramFinanceScheduler.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  onModuleInit() {
    void this.tick();
    this.timer = setInterval(() => void this.tick(), FIVE_MINUTES_MS);
    this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async runOnce(now = new Date()) {
    const [budgetAlerts, weeklyDigests] = await Promise.all([
      this.runBudgetAlerts(now),
      this.runWeeklyDigests(now),
    ]);
    return { budgetAlerts, weeklyDigests };
  }

  private async tick() {
    if (this.running) return;
    this.running = true;
    try {
      await this.runOnce();
    } catch {
      // No recipient or provider details are logged from scheduled finance messages.
      this.logger.warn('Telegram finance notification run failed');
    } finally {
      this.running = false;
    }
  }

  private async runBudgetAlerts(now: Date) {
    const candidates = await this.prisma.$queryRaw<BudgetCandidate[]>`
      SELECT
        recipient.id::text AS "userId",
        profile.currency::text AS "currency",
        profile."budgetPeriod"::text AS "budgetPeriod",
        profile."budgetInput" AS "budgetInput",
        period.start_date::text AS "periodStart",
        local_clock.local_date::text AS "localDate",
        COALESCE(SUM(entry.amount), 0)::text AS "spent"
      FROM users AS recipient
      JOIN expense_profiles AS profile
        ON profile."userId" = recipient.id
      CROSS JOIN LATERAL (
        SELECT (${now}::timestamptz AT TIME ZONE recipient.telegram_notification_time_zone)::date
          AS local_date
      ) AS local_clock
      CROSS JOIN LATERAL (
        SELECT CASE
          WHEN profile."budgetPeriod"::text = 'WEEKLY'
            THEN date_trunc('week', local_clock.local_date::timestamp)::date
          ELSE date_trunc('month', local_clock.local_date::timestamp)::date
        END AS start_date
      ) AS period
      LEFT JOIN expense_entries AS entry
        ON entry."userId" = recipient.id
        AND entry.type::text = 'EXPENSE'
        AND entry."entryDate" BETWEEN period.start_date AND local_clock.local_date
        AND entry.amount IS NOT NULL
      WHERE recipient.telegram_notifications_enabled = TRUE
        AND recipient.telegram_budget_alerts_enabled = TRUE
        AND profile."budgetInput" <> ''
      GROUP BY
        recipient.id,
        profile.currency,
        profile."budgetPeriod",
        profile."budgetInput",
        period.start_date,
        local_clock.local_date
      ORDER BY recipient.id
      LIMIT 100
    `;

    let sent = 0;
    for (
      let index = 0;
      index < candidates.length;
      index += DELIVERY_BATCH_SIZE
    ) {
      const batch = candidates.slice(index, index + DELIVERY_BATCH_SIZE);
      const results = await Promise.all(
        batch.map(async (candidate) => {
          try {
            const budget = parseCents(candidate.budgetInput);
            const spent = parseCents(candidate.spent);
            if (budget <= 0n) return false;
            const percent = Number((spent * 100n) / budget);
            const threshold =
              percent >= 100
                ? 100
                : percent >= 80
                  ? 80
                  : percent >= 50
                    ? 50
                    : 0;
            if (!threshold) return false;
            const periodKey = `${candidate.budgetPeriod === 'WEEKLY' ? 'W' : 'M'}:${candidate.periodStart}`;
            const claimed = await this.prisma.$queryRaw<
              Array<{ userId: string }>
            >`
              INSERT INTO telegram_budget_alert_states (
                user_id,
                period_key,
                last_threshold,
                updated_at
              ) VALUES (
                ${candidate.userId}::uuid,
                ${periodKey},
                ${threshold},
                NOW()
              )
              ON CONFLICT (user_id) DO UPDATE
              SET period_key = EXCLUDED.period_key,
                  last_threshold = EXCLUDED.last_threshold,
                  updated_at = NOW()
              WHERE telegram_budget_alert_states.period_key <> EXCLUDED.period_key
                 OR telegram_budget_alert_states.last_threshold < EXCLUDED.last_threshold
              RETURNING user_id::text AS "userId"
            `;
            if (!claimed.length) return false;

            const remaining = budget - spent;
            await this.notifications.sendToUser(
              candidate.userId,
              [
                `${threshold >= 100 ? '🚨' : '⚠️'} Budget alert: ${percent}% used`,
                `Spent: ${formatTelegramMoney(centsToDecimal(spent), candidate.currency)}`,
                `Budget: ${formatTelegramMoney(centsToDecimal(budget), candidate.currency)}`,
                remaining >= 0n
                  ? `Remaining: ${formatTelegramMoney(centsToDecimal(remaining), candidate.currency)}`
                  : `Over by: ${formatTelegramMoney(centsToDecimal(-remaining), candidate.currency)}`,
                `Period: ${candidate.budgetPeriod === 'WEEKLY' ? 'This week' : 'This month'}`,
              ].join('\n'),
            );
            return true;
          } catch {
            this.logger.warn('A Telegram budget alert could not be delivered');
            return false;
          }
        }),
      );
      sent += results.filter(Boolean).length;
    }
    return sent;
  }

  private async runWeeklyDigests(now: Date) {
    // Claim Sunday in the user's timezone before delivery so replicas cannot duplicate a digest.
    const recipients = await this.prisma.$queryRaw<WeeklyRecipient[]>`
      WITH due AS (
        SELECT
          id,
          (${now}::timestamptz AT TIME ZONE telegram_notification_time_zone)::date AS local_date
        FROM users
        WHERE telegram_notifications_enabled = TRUE
          AND telegram_weekly_digest_enabled = TRUE
          AND EXTRACT(
            ISODOW FROM (${now}::timestamptz AT TIME ZONE telegram_notification_time_zone)
          )::integer = 7
          AND EXTRACT(
            HOUR FROM (${now}::timestamptz AT TIME ZONE telegram_notification_time_zone)
          )::integer >= telegram_weekly_digest_hour
          AND (
            telegram_weekly_digest_last_attempt_date IS NULL
            OR telegram_weekly_digest_last_attempt_date
              < (${now}::timestamptz AT TIME ZONE telegram_notification_time_zone)::date
          )
        ORDER BY id
        LIMIT 100
        FOR UPDATE SKIP LOCKED
      )
      UPDATE users AS recipient
      SET telegram_weekly_digest_last_attempt_date = due.local_date
      FROM due
      WHERE recipient.id = due.id
      RETURNING recipient.id::text AS "userId", due.local_date::text AS "localDate"
    `;

    for (
      let index = 0;
      index < recipients.length;
      index += DELIVERY_BATCH_SIZE
    ) {
      const batch = recipients.slice(index, index + DELIVERY_BATCH_SIZE);
      await Promise.all(
        batch.map((recipient) => this.sendWeeklyDigest(recipient)),
      );
    }
    return recipients.length;
  }

  private async sendWeeklyDigest(recipient: WeeklyRecipient) {
    try {
      const startDate = subtractDays(recipient.localDate, 13);
      const rows = await this.prisma.$queryRaw<WeeklyExpenseRow[]>`
        SELECT
          COALESCE(profile.currency::text, 'USD') AS "currency",
          entry."entryDate"::text AS "entryDate",
          CASE
            WHEN entry.category = '__custom__'
              THEN COALESCE(NULLIF(entry."customCategory", ''), 'Other')
            ELSE COALESCE(NULLIF(entry.category, ''), 'Other')
          END AS "category",
          entry.amount::text AS "amount"
        FROM expense_entries AS entry
        LEFT JOIN expense_profiles AS profile ON profile."userId" = entry."userId"
        WHERE entry."userId" = ${recipient.userId}::uuid
          AND entry.type::text = 'EXPENSE'
          AND entry.amount IS NOT NULL
          AND entry."entryDate" BETWEEN ${startDate}::date AND ${recipient.localDate}::date
        ORDER BY entry."entryDate" ASC, entry.position ASC
      `;
      const currency = rows[0]?.currency ?? 'USD';
      const currentStart = subtractDays(recipient.localDate, 6);
      const current = rows.filter((row) => row.entryDate >= currentStart);
      const previous = rows.filter((row) => row.entryDate < currentStart);
      const currentTotal = sumRows(current);
      const previousTotal = sumRows(previous);
      const change = previousTotal
        ? Number(((currentTotal - previousTotal) * 100n) / previousTotal)
        : null;
      const top = topCategory(current);
      await this.notifications.sendToUser(
        recipient.userId,
        [
          '📅 Weekly spending digest',
          `Week: ${currentStart} → ${recipient.localDate}`,
          '',
          `Spent: ${formatTelegramMoney(centsToDecimal(currentTotal), currency)}`,
          `Entries: ${current.length}`,
          change === null
            ? 'Comparison: No spending in the previous week'
            : `Compared with last week: ${change > 0 ? '+' : ''}${change}%`,
          top
            ? `Top category: ${top[0]} — ${formatTelegramMoney(centsToDecimal(top[1]), currency)}`
            : 'Top category: No expenses',
        ].join('\n'),
      );
    } catch {
      this.logger.warn('A Telegram weekly digest could not be delivered');
    }
  }
}

function parseCents(value: string) {
  const match = value.trim().match(/^(\d+)(?:\.(\d{1,2}))?/);
  if (!match) return 0n;
  return BigInt(match[1]) * 100n + BigInt((match[2] ?? '').padEnd(2, '0'));
}

function centsToDecimal(cents: bigint) {
  return `${cents / 100n}.${(cents % 100n).toString().padStart(2, '0')}`;
}

function subtractDays(localDate: string, days: number) {
  const date = new Date(`${localDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

function sumRows(rows: WeeklyExpenseRow[]) {
  return rows.reduce((sum, row) => sum + parseCents(row.amount), 0n);
}

function topCategory(rows: WeeklyExpenseRow[]): [string, bigint] | null {
  const totals = new Map<string, bigint>();
  for (const row of rows) {
    totals.set(
      row.category,
      (totals.get(row.category) ?? 0n) + parseCents(row.amount),
    );
  }
  return (
    [...totals.entries()].sort((left, right) =>
      right[1] > left[1] ? 1 : right[1] < left[1] ? -1 : 0,
    )[0] ?? null
  );
}
