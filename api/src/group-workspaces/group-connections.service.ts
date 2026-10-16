import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { createHash, randomBytes, randomInt, randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  BotAccessService,
  botAccessAllowed,
  type BotKind,
} from '../bot-admin/bot-access.service';
import type {
  TelegramMessage,
  TelegramUpdate,
} from '../telegram-bot/telegram-bot.types';
import { GroupAccessService } from './group-access.service';
import { DEFAULT_GROUP_FEATURES } from './group-workspaces.types';

const hash = (value: string) =>
  createHash('sha256').update(value).digest('hex');
const groupId = (value: number) => Number.isSafeInteger(value) && value < 0;

@Injectable()
export class GroupConnectionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly groups: GroupAccessService,
    private readonly identities: BotAccessService,
  ) {}

  private async approved(userId: string, bot: BotKind) {
    const identity = await this.identities.identity(bot, userId);
    if (!botAccessAllowed(identity))
      throw new ForbiddenException('Manager approval is required.');
    return identity!;
  }

  async request(userId: string, bot: BotKind) {
    const identity = await this.approved(userId, bot);
    const nonce = randomBytes(24).toString('base64url');
    const expiresAt = new Date(Date.now() + 10 * 60_000);
    const me = await this.groups.client(bot).getMe();
    if (!me.username || !/^[A-Za-z0-9_]+$/.test(me.username))
      throw new BadRequestException('Bot connection unavailable.');
    await this.prisma.telegramGroupConnectRequest.create({
      data: {
        id: randomUUID(),
        userId,
        bot,
        telegramUserId: BigInt(identity.telegramId),
        requestId: randomInt(1, 2147483647),
        nonceHash: hash(nonce),
        expiresAt,
      },
    });
    return {
      deepLink: `https://t.me/${me.username}?start=connect_${nonce}`,
      expiresAt: expiresAt.toISOString(),
    };
  }

  async handlePrivateStart(bot: BotKind, message: TelegramMessage) {
    const match =
      /^\/start(?:@[A-Za-z0-9_]+)?\s+connect_([A-Za-z0-9_-]{32})$/.exec(
        message.text ?? '',
      );
    if (!match) return false;
    const request = await this.prisma.telegramGroupConnectRequest.findUnique({
      where: { nonceHash: hash(match[1]) },
    });
    if (
      !request ||
      request.bot !== bot ||
      message.chat.type !== 'private' ||
      message.chat.id !== message.from?.id ||
      request.telegramUserId !== BigInt(message.from.id) ||
      request.expiresAt <= new Date()
    )
      throw new BadRequestException(
        'Connection link expired or belongs to another account.',
      );
    await this.approved(request.userId, bot);
    // Telegram's selector is only a hint; completion verifies both live roles again.
    await this.groups
      .client(bot)
      .sendMessage(
        message.chat.id,
        'Choose a group you administer. Add this bot as a group administrator first.',
        {
          keyboard: [
            [
              {
                text: 'Choose my group',
                request_chat: {
                  request_id: request.requestId,
                  chat_is_channel: false,
                  bot_is_member: true,
                  user_administrator_rights: {
                    is_anonymous: false,
                    can_manage_chat: true,
                    can_delete_messages: false,
                    can_manage_video_chats: false,
                    can_restrict_members: false,
                    can_promote_members: false,
                    can_change_info: false,
                    can_invite_users: false,
                    can_post_stories: false,
                    can_edit_stories: false,
                    can_delete_stories: false,
                    can_send_welcome_messages: false,
                  },
                  bot_administrator_rights: {
                    is_anonymous: false,
                    can_manage_chat: true,
                    can_delete_messages: false,
                    can_manage_video_chats: false,
                    can_restrict_members: false,
                    can_promote_members: false,
                    can_change_info: false,
                    can_invite_users: false,
                    can_post_stories: false,
                    can_edit_stories: false,
                    can_delete_stories: false,
                    can_send_welcome_messages: false,
                  },
                  request_title: true,
                },
              },
            ],
          ],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      );
    return true;
  }

  async handleShared(bot: BotKind, message: TelegramMessage) {
    const shared = message.chat_shared;
    if (!shared) return false;
    if (
      message.chat.type !== 'private' ||
      message.chat.id !== message.from?.id ||
      !groupId(shared.chat_id) ||
      !Number.isSafeInteger(shared.request_id)
    )
      throw new BadRequestException(
        'Choose a group using the private connection button.',
      );
    const request = await this.prisma.telegramGroupConnectRequest.findUnique({
      where: {
        bot_telegramUserId_requestId: {
          bot,
          telegramUserId: BigInt(message.from.id),
          requestId: shared.request_id,
        },
      },
    });
    if (!request || request.expiresAt <= new Date())
      throw new BadRequestException(
        'Connection request expired. Open My Groups again.',
      );
    await this.approved(request.userId, bot);
    if (
      !(await this.groups.verifyRole(
        bot,
        String(shared.chat_id),
        String(message.from.id),
        true,
      ))
    )
      throw new ForbiddenException(
        'You and the bot must be group administrators.',
      );
    const workspace = await this.prisma.$transaction(async (tx) => {
      await this.identities.assertAllowedInTransaction(tx, bot, request.userId);
      const [locked] = await tx.$queryRaw<
        Array<{ connectedChatId: bigint | null }>
      >`SELECT connected_chat_id AS "connectedChatId" FROM telegram_group_connect_requests WHERE id=${request.id}::uuid AND expires_at > NOW() FOR UPDATE`;
      if (!locked) throw new ConflictException('Connection request expired.');
      if (
        locked.connectedChatId !== null &&
        locked.connectedChatId !== BigInt(shared.chat_id)
      )
        throw new ConflictException(
          'This request already connected another group.',
        );
      const alias = await tx.telegramGroupChatAlias.findUnique({
        where: { telegramChatId: BigInt(shared.chat_id) },
      });
      let workspace = alias
        ? await tx.telegramGroupWorkspace.findUniqueOrThrow({
            where: { id: alias.workspaceId },
          })
        : await tx.telegramGroupWorkspace.upsert({
            where: { telegramChatId: BigInt(shared.chat_id) },
            create: {
              telegramChatId: BigInt(shared.chat_id),
              title: (shared.title?.trim() || 'Telegram group').slice(0, 120),
            },
            update: {},
          });
      const [current] = await tx.$queryRaw<
        Array<{ status: string; chatId: bigint }>
      >`SELECT status,telegram_chat_id AS "chatId" FROM telegram_group_workspaces WHERE id=${workspace.id}::uuid FOR UPDATE`;
      if (
        !current ||
        current.status !== 'ACTIVE' ||
        current.chatId !== BigInt(shared.chat_id)
      )
        throw new ForbiddenException('This group is unavailable.');
      if (locked.connectedChatId === BigInt(shared.chat_id)) return workspace;
      // An old migration alias cannot reactivate the obsolete chat or clear suspension.
      if (
        workspace.telegramChatId !== BigInt(shared.chat_id) ||
        workspace.status !== 'ACTIVE'
      )
        throw new ForbiddenException('This group is unavailable.');
      await tx.telegramGroupChatAlias.upsert({
        where: { telegramChatId: BigInt(shared.chat_id) },
        create: {
          telegramChatId: BigInt(shared.chat_id),
          workspaceId: workspace.id,
        },
        update: {},
      });
      await tx.telegramGroupConnection.upsert({
        where: { workspaceId_bot: { workspaceId: workspace.id, bot } },
        create: {
          workspaceId: workspace.id,
          bot,
          health: 'CONNECTED',
          lastVerifiedAt: new Date(),
          ...DEFAULT_GROUP_FEATURES[bot],
        },
        update: {
          health: 'CONNECTED',
          lastVerifiedAt: new Date(),
          version: { increment: 1 },
        },
      });
      await tx.telegramGroupManager.upsert({
        where: {
          workspaceId_userId: {
            workspaceId: workspace.id,
            userId: request.userId,
          },
        },
        create: { workspaceId: workspace.id, userId: request.userId },
        update: {},
      });
      await tx.telegramGroupConnectRequest.update({
        where: { id: request.id },
        data: {
          connectedChatId: BigInt(shared.chat_id),
          workspaceId: workspace.id,
        },
      });
      await tx.telegramGroupAudit.upsert({
        where: { operationKey: `connect:${request.id}` },
        create: {
          workspaceId: workspace.id,
          actorId: request.userId,
          bot,
          action: 'CONNECTED',
          operationKey: `connect:${request.id}`,
        },
        update: {},
      });
      return workspace;
    });
    await this.groups
      .client(bot)
      .sendMessage(
        message.chat.id,
        `${workspace.title} connected. Open My Groups to configure it.`,
        { remove_keyboard: true },
      );
    return true;
  }

  async handleLifecycle(bot: BotKind, update: TelegramUpdate) {
    const own = update.my_chat_member;
    if (own) {
      if (
        !groupId(own.chat.id) ||
        own.new_chat_member.user.id !== (await this.groups.botId(bot))
      )
        return true;
      const workspace = await this.groups.forChat(bot, String(own.chat.id));
      if (workspace)
        await this.prisma.telegramGroupConnection.update({
          where: {
            workspaceId_bot: { workspaceId: workspace.workspaceId, bot },
          },
          data: {
            health: ['creator', 'administrator'].includes(
              own.new_chat_member.status,
            )
              ? 'CONNECTED'
              : 'MISSING_PERMISSIONS',
            lastVerifiedAt: new Date(),
            version: { increment: 1 },
          },
        });
      return true;
    }
    const message = update.message;
    if (!message?.migrate_to_chat_id && !message?.migrate_from_chat_id)
      return false;
    const oldId = message.migrate_from_chat_id ?? message.chat.id;
    const newId = message.migrate_to_chat_id ?? message.chat.id;
    if (!groupId(oldId) || !groupId(newId) || oldId === newId)
      throw new BadRequestException('Invalid group migration.');
    // Only authenticated Telegram service events reach this method. Live bot
    // membership in the destination is still required before any new delivery.
    const ownId = await this.groups.botId(bot);
    const member = await this.groups.client(bot).getChatMember(newId, ownId);
    if (
      member.user.id !== ownId ||
      !['creator', 'administrator'].includes(member.status)
    )
      throw new ForbiddenException('Destination bot permissions unavailable.');
    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'group-migrate:' + oldId}))`;
      const alias = await tx.telegramGroupChatAlias.findUnique({
        where: { telegramChatId: BigInt(oldId) },
      });
      if (!alias) return;
      const workspace = await tx.telegramGroupWorkspace.findUniqueOrThrow({
        where: { id: alias.workspaceId },
      });
      const destination = await tx.telegramGroupChatAlias.findUnique({
        where: { telegramChatId: BigInt(newId) },
      });
      if (destination && destination.workspaceId !== workspace.id)
        throw new ConflictException(
          'Destination is bound to another workspace.',
        );
      if (
        workspace.telegramChatId !== BigInt(oldId) &&
        workspace.telegramChatId !== BigInt(newId)
      )
        throw new ConflictException('Group has already moved.');
      if (workspace.telegramChatId === BigInt(newId)) {
        // Each bot receives its own migration event; verify and restore that
        // connection even when another bot already moved the durable workspace.
        await tx.telegramGroupConnection.update({
          where: { workspaceId_bot: { workspaceId: workspace.id, bot } },
          data: {
            health: 'CONNECTED',
            lastVerifiedAt: new Date(),
            version: { increment: 1 },
          },
        });
        return;
      }
      await tx.telegramGroupChatAlias.upsert({
        where: { telegramChatId: BigInt(newId) },
        create: { telegramChatId: BigInt(newId), workspaceId: workspace.id },
        update: {},
      });
      await tx.telegramGroupWorkspace.update({
        where: { id: workspace.id },
        data: {
          telegramChatId: BigInt(newId),
          version: { increment: 1 },
          updatedAt: new Date(),
        },
      });
      await tx.telegramGroupConnection.updateMany({
        where: { workspaceId: workspace.id },
        data: { health: 'UNVERIFIED', version: { increment: 1 } },
      });
      await tx.telegramGroupConnection.update({
        where: { workspaceId_bot: { workspaceId: workspace.id, bot } },
        data: { health: 'CONNECTED', lastVerifiedAt: new Date() },
      });
      await tx.momentVoteSchedule.updateMany({
        where: { telegramChatId: BigInt(oldId) },
        data: { telegramChatId: BigInt(newId) },
      });
      await tx.$executeRaw`
        INSERT INTO telegram_group_members(telegram_chat_id,telegram_user_id,display_name,is_active,observed_at,username)
        SELECT ${BigInt(newId)},telegram_user_id,display_name,is_active,observed_at,username FROM telegram_group_members WHERE telegram_chat_id=${BigInt(oldId)}
        ON CONFLICT(telegram_chat_id,telegram_user_id) DO UPDATE SET
          display_name=EXCLUDED.display_name,is_active=EXCLUDED.is_active,observed_at=EXCLUDED.observed_at,username=EXCLUDED.username
        WHERE telegram_group_members.observed_at<=EXCLUDED.observed_at
      `;
      // An open round follows the group and keeps its ID and ballots. Its old
      // message cannot be edited in the new chat, so the timer posts a replacement.
      // Closed rounds keep the historical chat alias for scoped history reads.
      await tx.momentVoteRound.updateMany({
        where: {
          telegramChatId: BigInt(oldId),
          finalizedAt: null,
          closesAt: { gt: new Date() },
        },
        data: { telegramChatId: BigInt(newId), messageId: null },
      });
      // Keep completed splits on their original alias.
      await tx.telegramGroupSplit.updateMany({
        where: { telegramChatId: BigInt(oldId), status: 'OPEN' },
        data: { telegramChatId: BigInt(newId) },
      });
      // Old force-reply message IDs cannot be used in the new chat. Expire only
      // unfinished prompts, leaving completed split records and history intact.
      await tx.telegramQuickSplitSession.updateMany({
        where: { telegramChatId: BigInt(oldId) },
        data: { expiresAt: new Date(0) },
      });
      await tx.telegramGroupAudit.create({
        data: {
          workspaceId: workspace.id,
          bot,
          action: 'MIGRATED',
          operationKey: `migrate:${workspace.id}:${newId}`,
          details: { from: String(oldId), to: String(newId) },
        },
      });
    });
    return true;
  }
}
