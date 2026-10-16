import { operationKey, replay } from '../group-workspaces/group-mutations';
import type { GroupStatusInput } from '../group-workspaces/group-workspaces.dto';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreatorCreditAdminService } from '../creator-ai/creator-credit-admin.service';
import type { BotUsersQuery, ReviewBotUser } from './bot-admin.dto';
import type { BotKind, BotStatus } from './bot-access.service';

export interface BotProfileRow {
  userId: string;
  telegramId: string;
  username: string | null;
  name: string | null;
  status: BotStatus;
  version: number;
  isActive: boolean;
  createdAt: Date;
  balance: number;
  creatorEnabled: boolean;
  chlatworkEnabled: boolean;
}

const PROFILE_SELECT = Prisma.sql`
  SELECT p.user_id AS "userId", p.telegram_user_id::text AS "telegramId", p.username,
    u.name, p.status, p.version, u."isActive" AS "isActive", p.created_at AS "createdAt",
    COALESCE(w.balance, 0) AS balance,
    COALESCE(c.enabled, FALSE) AS "creatorEnabled", COALESCE(b.enabled, FALSE) AS "chlatworkEnabled"
  FROM telegram_bot_profiles p JOIN users u ON u.id = p.user_id
  LEFT JOIN ai_wallets w ON w.user_id = p.user_id
  LEFT JOIN telegram_bot_memberships c ON c.user_id = p.user_id AND c.bot = 'CREATOR'
  LEFT JOIN telegram_bot_memberships b ON b.user_id = p.user_id AND b.bot = 'CHLATWORK'
`;

@Injectable()
export class BotAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly credits: CreatorCreditAdminService,
  ) {}

  async groups(page = 1) {
    const items = await this.prisma.telegramGroupWorkspace.findMany({
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * 20,
      take: 20,
      include: { connections: true, _count: { select: { managers: true } } },
    });
    return {
      items: items.map(({ telegramChatId, ...row }) => ({
        ...row,
        chatId: String(telegramChatId),
      })),
      page,
    };
  }

  async groupDetails(id: string) {
    const row = await this.prisma.telegramGroupWorkspace.findUnique({
      where: { id },
      include: {
        connections: true,
        managers: {
          select: { userId: true, user: { select: { name: true } } },
        },
        audit: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: { id: true, action: true, createdAt: true, details: true },
        },
      },
    });
    if (!row) throw new NotFoundException('Group not found.');
    return {
      ...row,
      telegramChatId: String(row.telegramChatId),
      audit: row.audit.map((entry) => ({ ...entry, id: String(entry.id) })),
    };
  }

  async groupStatus(
    actorId: string,
    id: string,
    key: string,
    input: GroupStatusInput,
  ) {
    const operation = operationKey(actorId, key);
    return this.prisma.$transaction(async (tx) => {
      const [workspace] = await tx.$queryRaw<
        Array<{ version: number }>
      >`SELECT version FROM telegram_group_workspaces WHERE id=${id}::uuid FOR UPDATE`;
      if (!workspace) throw new NotFoundException('Group not found.');
      if (await replay(tx, operation, id, 'PLATFORM_STATUS', input))
        return { updated: true };
      if (workspace.version !== input.expectedVersion)
        throw new ConflictException('Refresh the group before reviewing it.');
      await tx.telegramGroupWorkspace.update({
        where: { id },
        data: {
          status: input.status,
          version: { increment: 1 },
          updatedAt: new Date(),
        },
      });
      await tx.telegramGroupAudit.create({
        data: {
          workspaceId: id,
          actorId,
          action: 'PLATFORM_STATUS',
          operationKey: operation,
          details: {
            status: input.status,
            reason: input.reason.trim(),
            fingerprint: createHash('sha256')
              .update(JSON.stringify(input))
              .digest('hex'),
          },
        },
      });
      return { updated: true };
    });
  }

  async users(query: BotUsersQuery) {
    const needle = `%${query.search.trim().replace(/[\\%_]/g, '\\$&')}%`;
    const filter = Prisma.sql`
      WHERE (p.status <> 'PENDING' OR p.manager_requested_at IS NOT NULL)
      AND (p.telegram_user_id::text ILIKE ${needle} OR p.username ILIKE ${needle} OR u.name ILIKE ${needle})
      ${query.status ? Prisma.sql`AND p.status = ${query.status}` : Prisma.empty}
      ${query.bot ? Prisma.sql`AND EXISTS (SELECT 1 FROM telegram_bot_memberships m WHERE m.user_id = p.user_id AND m.bot = ${query.bot})` : Prisma.empty}
    `;
    const [items, count] = await Promise.all([
      this.prisma.$queryRaw<BotProfileRow[]>(Prisma.sql`
        ${PROFILE_SELECT} ${filter}
        ORDER BY p.created_at DESC, p.user_id LIMIT 20 OFFSET ${(query.page - 1) * 20}
      `),
      this.prisma.$queryRaw<Array<{ total: number }>>(Prisma.sql`
        SELECT COUNT(*)::integer AS total FROM telegram_bot_profiles p
        JOIN users u ON u.id = p.user_id ${filter}
      `),
    ]);
    return {
      items,
      total: count[0]?.total ?? 0,
      page: query.page,
      pageSize: 20,
    };
  }

  async overview(bot?: BotKind) {
    const scope = bot
      ? Prisma.sql`AND EXISTS (SELECT 1 FROM telegram_bot_memberships m WHERE m.user_id = p.user_id AND m.bot = ${bot})`
      : Prisma.empty;
    const [counts, activity, usage] = await Promise.all([
      this.prisma.$queryRaw<
        Array<{ status: string; count: number }>
      >(Prisma.sql`
        SELECT status, COUNT(*)::integer AS count FROM telegram_bot_profiles p
        WHERE (p.status <> 'PENDING' OR p.manager_requested_at IS NOT NULL) ${scope} GROUP BY status
      `),
      this.prisma.$queryRaw<Array<{ bot: string; active: number }>>`
        SELECT bot, COUNT(*)::integer AS active FROM telegram_bot_memberships
        WHERE last_activity_at >= NOW() - INTERVAL '1 day' GROUP BY bot
      `,
      this.prisma.$queryRaw<
        Array<{ bot: string; credits: number; failures: number }>
      >`
        SELECT metadata->>'bot' AS bot,
          COALESCE(SUM(CASE WHEN type = 'RESERVE' THEN -amount WHEN type = 'REFUND' THEN -amount ELSE 0 END), 0)::integer AS credits,
          COUNT(*) FILTER (WHERE type = 'REFUND')::integer AS failures
        FROM ai_credit_transactions WHERE created_at >= NOW() - INTERVAL '1 day'
          AND metadata->>'bot' IN ('CREATOR', 'CHLATWORK') GROUP BY metadata->>'bot'
      `,
    ]);
    return {
      counts,
      activity: bot ? activity.filter((row) => row.bot === bot) : activity,
      usage: bot ? usage.filter((row) => row.bot === bot) : usage,
    };
  }

  async profile(userId: string) {
    const [row] = await this.prisma.$queryRaw<BotProfileRow[]>(Prisma.sql`
      ${PROFILE_SELECT} WHERE p.user_id = ${userId}::uuid
    `);
    if (!row) throw new NotFoundException('Telegram user not found.');
    return row;
  }

  async details(userId: string) {
    const profile = await this.profile(userId);
    const [memberships, audit, credits, qr] = await Promise.all([
      this.prisma.$queryRaw`
        SELECT bot, enabled, first_private_started_at AS "firstPrivateStartedAt",
          last_activity_at AS "lastActivityAt"
        FROM telegram_bot_memberships WHERE user_id = ${userId}::uuid ORDER BY bot
      `,
      this.prisma.$queryRaw`
        SELECT id::text, actor_id AS "actorId", action, bot, details, created_at AS "createdAt"
        FROM telegram_bot_audit WHERE user_id = ${userId}::uuid
        ORDER BY created_at DESC, id DESC LIMIT 50
      `,
      profile.isActive ? this.credits.details(userId) : Promise.resolve(null),
      this.prisma.$queryRaw<Array<{ version: string }>>`
        SELECT version FROM member_khqr_images WHERE member_key = ${`tg_${profile.telegramId}`}
      `,
    ]);
    return {
      profile,
      memberships,
      audit,
      credits,
      qrUrl: qr[0]
        ? `/api/member-khqr/tg_${profile.telegramId}?v=${qr[0].version}`
        : null,
    };
  }

  async review(
    actorId: string,
    userId: string,
    key: string,
    input: ReviewBotUser,
  ) {
    if (!/^[A-Za-z0-9._:-]{16,128}$/.test(key ?? '')) {
      throw new ConflictException('A valid confirmation key is required.');
    }
    const operation = `review:${createHash('sha256').update(`${actorId}:${key}`).digest('hex')}`;
    const fingerprint = createHash('sha256')
      .update(
        JSON.stringify([
          userId,
          input.status,
          input.creatorEnabled,
          input.chlatworkEnabled,
          input.expectedVersion,
          input.startingCredits,
          input.expectedBalance,
          input.reason,
        ]),
      )
      .digest('hex');

    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${operation}))`;
      const [previous] = await tx.$queryRaw<
        Array<{
          userId: string;
          details: { fingerprint: string; version: number };
        }>
      >`
        SELECT user_id AS "userId", details FROM telegram_bot_audit WHERE operation_key = ${operation}
      `;
      if (previous) {
        if (
          previous.userId !== userId ||
          previous.details.fingerprint !== fingerprint
        ) {
          throw new ConflictException(
            'This confirmation was used for a different change.',
          );
        }
        return { version: previous.details.version };
      }
      const [profile] = await tx.$queryRaw<
        Array<{ status: BotStatus; version: number }>
      >`
        SELECT status, version FROM telegram_bot_profiles WHERE user_id = ${userId}::uuid FOR UPDATE
      `;
      if (!profile) throw new NotFoundException('Telegram user not found.');
      if (profile.version !== input.expectedVersion) {
        throw new ConflictException(
          'This profile changed. Refresh and review again.',
        );
      }
      if (input.startingCredits > 0) {
        if (profile.status !== 'PENDING' || input.status !== 'APPROVED') {
          throw new ConflictException(
            'Starting credits apply only to the first pending approval.',
          );
        }
        // Approval and its first grant commit together. The wallet service also
        // prevents a second automatic welcome grant when Creator is opened later.
        await this.credits.adjust(
          actorId,
          `approval:${operation}`,
          {
            userId,
            amount: input.startingCredits,
            expectedBalance: input.expectedBalance,
            reason: input.reason,
          },
          tx,
        );
      }
      const version = profile.version + 1;
      await tx.$executeRaw`
        UPDATE telegram_bot_profiles SET status = ${input.status}, version = ${version},
          reviewed_by = ${actorId}::uuid, reviewed_at = NOW(), updated_at = NOW()
        WHERE user_id = ${userId}::uuid
      `;
      for (const [bot, enabled] of [
        ['CREATOR', input.creatorEnabled],
        ['CHLATWORK', input.chlatworkEnabled],
      ] as const) {
        // Enabling access does not imply the user has privately started this bot.
        await tx.$executeRaw`
          INSERT INTO telegram_bot_memberships(user_id, bot, enabled)
          VALUES (${userId}::uuid, ${bot}, ${enabled})
          ON CONFLICT (user_id, bot) DO UPDATE SET enabled = EXCLUDED.enabled
        `;
      }
      const details = JSON.stringify({
        fingerprint,
        version,
        previousStatus: profile.status,
        status: input.status,
        creatorEnabled: input.creatorEnabled,
        chlatworkEnabled: input.chlatworkEnabled,
        startingCredits: input.startingCredits,
        reason: input.reason,
      });
      await tx.$executeRaw`
        INSERT INTO telegram_bot_audit(user_id, actor_id, action, operation_key, details)
        VALUES (${userId}::uuid, ${actorId}::uuid, 'ACCESS_REVIEW', ${operation}, ${details}::jsonb)
      `;
      await tx.$executeRaw`
        INSERT INTO telegram_bot_notifications(operation_key, user_id, bot)
        SELECT ${operation}, user_id, bot FROM telegram_bot_memberships
        WHERE user_id = ${userId}::uuid AND first_private_started_at IS NOT NULL
        ON CONFLICT DO NOTHING
      `;
      return { version };
    });
  }
}
