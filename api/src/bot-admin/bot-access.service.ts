import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { AuthProvider, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type BotKind = 'CREATOR' | 'CHLATWORK';
export type BotStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
export interface BotAccess {
  userId: string;
  telegramId: string;
  status: BotStatus;
  enabled: boolean;
  isActive: boolean;
  hasMembership?: boolean;
}
export function botAccessAllowed(
  access: Pick<BotAccess, 'status' | 'enabled' | 'isActive'> | null,
) {
  return Boolean(
    access?.isActive && access.status === 'APPROVED' && access.enabled,
  );
}

@Injectable()
export class BotAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async lookup(bot: BotKind, telegramId: number | string) {
    if (
      !/^[1-9][0-9]{0,15}$/.test(String(telegramId)) ||
      !Number.isSafeInteger(Number(telegramId))
    )
      return null;
    const [row] = await this.prisma.$queryRaw<BotAccess[]>`
      SELECT u.id AS "userId", s."providerUserId" AS "telegramId", COALESCE(p.status,'PENDING') AS status,
        COALESCE(m.enabled,FALSE) AS enabled,(m.user_id IS NOT NULL) AS "hasMembership",u."isActive" AS "isActive"
      FROM social_accounts s JOIN users u ON u.id=s."userId"
      LEFT JOIN telegram_bot_profiles p ON p.user_id=u.id AND p.telegram_user_id=${BigInt(telegramId)}
      LEFT JOIN telegram_bot_memberships m ON m.user_id=p.user_id AND m.bot=${bot}
      WHERE s.provider='TELEGRAM' AND s."providerUserId"=${String(telegramId)}
    `;
    return row ?? null;
  }

  async identity(bot: BotKind, userId: string) {
    const [row] = await this.prisma.$queryRaw<BotAccess[]>`
      SELECT p.user_id AS "userId", p.telegram_user_id::text AS "telegramId", p.status,
        COALESCE(m.enabled, FALSE) AS enabled, (m.user_id IS NOT NULL) AS "hasMembership", u."isActive" AS "isActive"
      FROM telegram_bot_profiles p JOIN users u ON u.id = p.user_id
      JOIN social_accounts s ON s."userId" = p.user_id AND s.provider = 'TELEGRAM'
        AND s."providerUserId" = p.telegram_user_id::text
      LEFT JOIN telegram_bot_memberships m ON m.user_id = p.user_id AND m.bot = ${bot}
      WHERE p.user_id = ${userId}::uuid
    `;
    return row ?? null;
  }

  async requestManagerAccess(userId: string, bot: BotKind) {
    const identity = await this.identity(bot, userId);
    if (
      !identity ||
      !identity.isActive ||
      ['REJECTED', 'SUSPENDED'].includes(identity.status)
    ) {
      throw new ForbiddenException('Manager access is unavailable.');
    }
    await this.prisma.$executeRaw`
      UPDATE telegram_bot_profiles SET manager_requested_at = COALESCE(manager_requested_at, NOW())
      WHERE user_id = ${userId}::uuid
    `;
    return { status: identity.status };
  }

  async ensureProfile(userId: string, bot: BotKind) {
    const accounts = await this.prisma.socialAccount.findMany({
      where: { userId, provider: AuthProvider.TELEGRAM },
      select: { providerUserId: true },
    });
    const canonical = accounts.filter(
      (account) =>
        /^[1-9][0-9]{0,15}$/.test(account.providerUserId) &&
        Number.isSafeInteger(Number(account.providerUserId)),
    );
    if (canonical.length !== 1)
      throw new ForbiddenException(
        'Open this Mini App using your verified Telegram account.',
      );
    const telegramId = canonical[0].providerUserId;
    await this.prisma.$executeRaw`
      INSERT INTO telegram_bot_profiles(user_id, telegram_user_id)
      VALUES (${userId}::uuid, ${BigInt(telegramId)}) ON CONFLICT DO NOTHING
    `;
    await this.prisma.$executeRaw`
      INSERT INTO telegram_bot_memberships(user_id, bot)
      VALUES (${userId}::uuid, ${bot}) ON CONFLICT DO NOTHING
    `;
    const identity = await this.identity(bot, userId);
    if (!identity || identity.telegramId !== telegramId)
      throw new ConflictException('Telegram identity conflict.');
    return identity;
  }

  async allowed(bot: BotKind, userId: string) {
    const [row] = await this.prisma.$queryRaw<BotAccess[]>`
      SELECT p.status, m.enabled, u."isActive" AS "isActive"
      FROM telegram_bot_profiles p JOIN users u ON u.id = p.user_id
      JOIN social_accounts s ON s."userId" = p.user_id AND s.provider = 'TELEGRAM'
        AND s."providerUserId" = p.telegram_user_id::text
      JOIN telegram_bot_memberships m ON m.user_id = p.user_id AND m.bot = ${bot}
      WHERE p.user_id = ${userId}::uuid
    `;
    return botAccessAllowed(row ?? null);
  }

  async assertAllowedInTransaction(
    tx: Prisma.TransactionClient,
    bot: BotKind,
    userId: string,
  ) {
    const [row] = await tx.$queryRaw<BotAccess[]>`
      SELECT p.status, m.enabled, u."isActive" AS "isActive"
      FROM telegram_bot_profiles p JOIN users u ON u.id = p.user_id
      JOIN social_accounts s ON s."userId" = p.user_id AND s.provider = 'TELEGRAM'
        AND s."providerUserId" = p.telegram_user_id::text
      JOIN telegram_bot_memberships m ON m.user_id = p.user_id AND m.bot = ${bot}
      WHERE p.user_id = ${userId}::uuid FOR SHARE OF p
    `;
    if (!botAccessAllowed(row ?? null))
      throw new ForbiddenException('Bot access is unavailable.');
  }

  async assertAllowed(bot: BotKind, userId: string) {
    if (!(await this.allowed(bot, userId)))
      throw new ForbiddenException(
        'Bot access is not approved or has been disabled.',
      );
  }

  // Called only by authenticated webhooks for a matching private /start sender.
  async register(
    bot: BotKind,
    sender: {
      id: number;
      first_name?: string;
      last_name?: string;
      username?: string;
    },
    privateStart: boolean,
  ) {
    if (!privateStart || !Number.isSafeInteger(sender.id) || sender.id <= 0)
      throw new BadRequestException('Start the bot privately.');
    return this.registerIdentity(bot, sender, true);
  }

  // Caller verifies the authenticated sender's current group membership first.
  async registerMember(
    bot: BotKind,
    sender: {
      id: number;
      first_name?: string;
      last_name?: string;
      username?: string;
    },
  ) {
    if (!Number.isSafeInteger(sender.id) || sender.id <= 0)
      throw new BadRequestException('Invalid Telegram identity.');
    return this.registerIdentity(bot, sender, false);
  }

  private async registerIdentity(
    bot: BotKind,
    sender: {
      id: number;
      first_name?: string;
      last_name?: string;
      username?: string;
    },
    privateStart: boolean,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`telegram-identity:${sender.id}`}))`;
      let linked = await tx.socialAccount.findUnique({
        where: {
          provider_providerUserId: {
            provider: AuthProvider.TELEGRAM,
            providerUserId: String(sender.id),
          },
        },
        select: { userId: true },
      });
      if (!linked) {
        const user = await tx.user.create({
          data: {
            name:
              [sender.first_name, sender.last_name]
                .filter(Boolean)
                .join(' ')
                .slice(0, 100) || 'Telegram user',
            socialAccounts: {
              create: {
                provider: AuthProvider.TELEGRAM,
                providerUserId: String(sender.id),
              },
            },
          },
          select: { id: true },
        });
        linked = { userId: user.id };
      }
      const username =
        typeof sender.username === 'string' &&
        /^[A-Za-z0-9_]{1,32}$/.test(sender.username)
          ? sender.username
          : null;
      const inserted = await tx.$queryRaw<Array<{ userId: string }>>`
        INSERT INTO telegram_bot_profiles (user_id, telegram_user_id, username)
        VALUES (${linked.userId}::uuid, ${BigInt(sender.id)}, ${username})
        ON CONFLICT (user_id) DO UPDATE SET username = EXCLUDED.username, updated_at = NOW()
        WHERE telegram_bot_profiles.telegram_user_id = EXCLUDED.telegram_user_id
        RETURNING user_id AS "userId"
      `;
      if (!inserted[0])
        throw new ConflictException(
          'This account has a different Telegram identity. Contact support.',
        );
      await tx.$executeRaw`
        INSERT INTO telegram_bot_memberships (user_id, bot, first_private_started_at, last_activity_at)
        VALUES (${linked.userId}::uuid, ${bot}, CASE WHEN ${privateStart} THEN NOW() ELSE NULL END, NOW())
        ON CONFLICT (user_id, bot) DO UPDATE SET
          first_private_started_at = COALESCE(telegram_bot_memberships.first_private_started_at, CASE WHEN ${privateStart} THEN NOW() ELSE NULL END), last_activity_at = NOW()
      `;
      if (privateStart) {
        // This marker makes repeated starts idempotent without retaining message text.
        await tx.$executeRaw`
        INSERT INTO telegram_bot_audit (user_id, action, bot, operation_key, details)
        VALUES (${linked.userId}::uuid, 'PRIVATE_START', ${bot}, ${`start:${linked.userId}:${bot}`}, '{}')
        ON CONFLICT (operation_key) DO NOTHING
      `;
      }
      return linked.userId;
    });
  }

  async activity(bot: BotKind, userId: string) {
    await this.prisma.$executeRaw`
      UPDATE telegram_bot_memberships SET last_activity_at = NOW()
      WHERE user_id = ${userId}::uuid AND bot = ${bot}
        AND (last_activity_at IS NULL OR last_activity_at < NOW() - INTERVAL '1 minute')
    `;
  }
}
