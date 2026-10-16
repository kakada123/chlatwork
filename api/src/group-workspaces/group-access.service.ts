import {
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  BotAccessService,
  botAccessAllowed,
  type BotAccess,
  type BotKind,
} from '../bot-admin/bot-access.service';
import { TelegramBotClient } from '../telegram-bot/telegram-bot.client';
import { CreatorTelegramClient } from '../creator-telegram/creator-telegram.client';
import type {
  GroupConnectionRow,
  GroupContext,
} from './group-workspaces.types';

export function explicitlyBlocked(access: BotAccess | null) {
  return Boolean(
    access &&
    (!access.isActive ||
      ['REJECTED', 'SUSPENDED'].includes(access.status) ||
      (access.hasMembership && !access.enabled)),
  );
}

const CONNECTION = Prisma.sql`
  SELECT w.id::text AS "workspaceId", w.telegram_chat_id::text AS "chatId", w.title,
    c.bot, w.version AS "workspaceVersion", c.version AS "connectionVersion",
    w.status, c.enabled, c.health, c.voting, c.split, c.khqr, c.creator
  FROM telegram_group_workspaces w
  JOIN telegram_group_connections c ON c.workspace_id = w.id
`;

@Injectable()
export class GroupAccessService {
  private readonly identities = new Map<BotKind, Promise<number>>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly access: BotAccessService,
    private readonly chlatwork: TelegramBotClient,
    private readonly creator: CreatorTelegramClient,
  ) {}

  client(bot: BotKind) {
    return bot === 'CREATOR' ? this.creator : this.chlatwork;
  }

  async botId(bot: BotKind) {
    if (!this.identities.has(bot)) {
      const request = this.client(bot)
        .getMe()
        .then((user) => {
          if (!Number.isSafeInteger(user.id) || user.id <= 0)
            throw new Error('Invalid bot identity');
          return user.id;
        })
        .catch((error) => {
          this.identities.delete(bot);
          throw error;
        });
      this.identities.set(bot, request);
    }
    return this.identities.get(bot)!;
  }

  async connection(bot: BotKind, workspaceId: string) {
    const [row] = await this.prisma.$queryRaw<GroupConnectionRow[]>(Prisma.sql`
      ${CONNECTION} WHERE w.id = ${workspaceId}::uuid AND c.bot = ${bot}
    `);
    return row ?? null;
  }

  async forChat(bot: BotKind, chatId: string) {
    if (
      !/^-[1-9][0-9]{0,15}$/.test(chatId) ||
      !Number.isSafeInteger(Number(chatId))
    )
      return null;
    const [row] = await this.prisma.$queryRaw<GroupConnectionRow[]>(Prisma.sql`
      ${CONNECTION} WHERE w.telegram_chat_id = ${BigInt(chatId)} AND c.bot = ${bot}
    `);
    return row ?? null;
  }

  active(row: GroupConnectionRow | null): row is GroupConnectionRow {
    return Boolean(
      row &&
      row.status === 'ACTIVE' &&
      row.enabled &&
      row.health === 'CONNECTED',
    );
  }

  async verifyRole(
    bot: BotKind,
    chatId: string,
    telegramId: string,
    admin: boolean,
  ) {
    if (
      !/^[1-9][0-9]{0,15}$/.test(telegramId) ||
      !Number.isSafeInteger(Number(telegramId))
    )
      return false;
    const client = this.client(bot);
    try {
      const ownId = await this.botId(bot);
      const own = await client.getChatMember(Number(chatId), ownId);
      if (
        own.user?.id !== ownId ||
        !['creator', 'administrator'].includes(own.status)
      )
        return false;
      const member = await client.getChatMember(
        Number(chatId),
        Number(telegramId),
      );
      if (member.user?.id !== Number(telegramId)) return false;
      return admin
        ? ['creator', 'administrator'].includes(member.status)
        : ['creator', 'administrator', 'member'].includes(member.status) ||
            (member.status === 'restricted' && member.is_member === true);
    } catch {
      throw new ServiceUnavailableException(
        'Could not verify current Telegram group permissions. Try again.',
      );
    }
  }

  async lockManager(
    tx: Prisma.TransactionClient,
    userId: string,
    bot: BotKind,
  ) {
    // Share the profile lock with platform reviews through the actual mutation.
    await this.access.assertAllowedInTransaction(tx, bot, userId);
  }

  async manager(
    userId: string,
    workspaceId: string,
    bot: BotKind,
  ): Promise<GroupContext> {
    const identity = await this.access.identity(bot, userId);
    if (!botAccessAllowed(identity))
      throw new ForbiddenException('Manager approval is required.');
    const row = await this.connection(bot, workspaceId);
    // Management can inspect a paused connection to repair it, but a platform
    // suspension cannot be cleared through the ordinary manager interface.
    if (!row || row.status !== 'ACTIVE')
      throw new ForbiddenException('Group access is unavailable.');
    if (!(await this.verifyRole(bot, row.chatId, identity!.telegramId, true))) {
      throw new ForbiddenException(
        'You must currently be a Telegram group administrator.',
      );
    }
    return row;
  }

  async member(
    bot: BotKind,
    chatId: string,
    telegramUserId: string,
  ): Promise<GroupContext | null> {
    const identity = await this.access.lookup(bot, telegramUserId);
    if (explicitlyBlocked(identity)) return null;
    const row = await this.forChat(bot, chatId);
    if (!this.active(row)) return null;
    if (!(await this.verifyRole(bot, row.chatId, telegramUserId, false)))
      return null;
    return row;
  }

  async personalQr(bot: BotKind, userId: string): Promise<GroupContext | null> {
    const identity = await this.access.identity(bot, userId);
    if (!identity || explicitlyBlocked(identity)) return null;
    const rows = await this.prisma.$queryRaw<Array<{ chatId: string }>>`
      SELECT w.telegram_chat_id::text AS "chatId"
      FROM telegram_group_workspaces w
      JOIN telegram_group_connections c ON c.workspace_id = w.id AND c.bot = ${bot}
      JOIN telegram_group_members m ON m.telegram_chat_id = w.telegram_chat_id
        AND m.telegram_user_id = ${identity.telegramId} AND m.is_active = TRUE
      WHERE w.status = 'ACTIVE' AND c.enabled = TRUE AND c.health = 'CONNECTED'
      ORDER BY m.observed_at DESC LIMIT 20
    `;
    for (const row of rows) {
      const context = await this.member(bot, row.chatId, identity.telegramId);
      if (context) return context;
    }
    return null;
  }
}
