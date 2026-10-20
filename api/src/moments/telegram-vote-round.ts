import type { Prisma } from '@prisma/client';

// One date and one roster are shared by manual starts, resets and daily scheduling.
export async function ensureTelegramVoteRound(
  tx: Prisma.TransactionClient,
  momentId: string,
  now: Date,
  manual = false,
) {
  // Share the poll lock with option edits so a new round uses one settled choice list.
  await tx.$queryRaw`
    SELECT id FROM moments WHERE id = ${momentId}::uuid FOR UPDATE
  `;
  await tx.$executeRaw`
    WITH inserted AS (
    INSERT INTO moment_vote_rounds (moment_id, vote_date, telegram_chat_id, closes_at)
    SELECT schedule.moment_id, (${now}::timestamptz AT TIME ZONE schedule.time_zone)::date,
      schedule.telegram_chat_id,
      LEAST(${now}::timestamptz + schedule.duration_minutes * INTERVAL '1 minute',
        (((${now}::timestamptz AT TIME ZONE schedule.time_zone)::date + 1)::timestamp
          AT TIME ZONE schedule.time_zone), moment.expires_at)
    FROM moment_vote_schedules schedule
    JOIN moments moment ON moment.id = schedule.moment_id
    WHERE schedule.moment_id = ${momentId}::uuid AND (schedule.enabled = TRUE OR ${manual})
    ON CONFLICT (moment_id, vote_date) DO NOTHING
    RETURNING id, telegram_chat_id
    )
    INSERT INTO moment_vote_round_members (round_id, telegram_user_id, display_name)
    SELECT inserted.id, member.telegram_user_id, member.display_name
    FROM inserted JOIN telegram_group_members member
      ON member.telegram_chat_id = inserted.telegram_chat_id AND member.is_active = TRUE
  `;
}
