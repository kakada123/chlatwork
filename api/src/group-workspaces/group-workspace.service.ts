import { GroupPollMediaService } from './group-poll-media.service';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  BotAccessService,
  type BotKind,
} from '../bot-admin/bot-access.service';
import { GroupAccessService } from './group-access.service';
import type { GroupFeaturesInput } from './group-workspaces.dto';
import {
  auditMutation,
  lockGroup,
  operationKey,
  replay,
} from './group-mutations';

@Injectable()
export class GroupWorkspaceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly groups: GroupAccessService,
    private readonly identities: BotAccessService,
    @Optional() private readonly media?: GroupPollMediaService,
  ) {}

  async session(userId: string, bot: BotKind) {
    const identity = await this.identities.ensureProfile(userId, bot);
    const profile = await this.prisma.telegramBotProfile.findUniqueOrThrow({
      where: { userId },
      select: { status: true, managerRequestedAt: true },
    });
    const wallet = await this.prisma.aiWallet.findUnique({
      where: { userId },
      select: { balance: true },
    });
    const me = await this.groups.client(bot).getMe();
    return {
      bot,
      managerStatus:
        profile.status === 'PENDING' && !profile.managerRequestedAt
          ? 'NOT_REQUESTED'
          : profile.status,
      enabled: identity.enabled,
      balance: wallet?.balance ?? 0,
      botUsername: me.username,
    };
  }

  async list(userId: string, bot: BotKind, page: number) {
    const candidates = await this.prisma.telegramGroupManager.findMany({
      where: { userId, workspace: { connections: { some: { bot } } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * 20,
      take: 20,
      select: { workspaceId: true },
    });
    const items: Awaited<ReturnType<GroupAccessService['manager']>>[] = [];
    // Keep every live permission check, but bound concurrency to avoid Telegram bursts.
    for (let offset = 0; offset < candidates.length; offset += 4) {
      const batch = await Promise.all(
        candidates.slice(offset, offset + 4).map(async (candidate) => {
          try {
            return await this.groups.manager(userId, candidate.workspaceId, bot);
          } catch (error) {
            if (!(error instanceof ForbiddenException)) throw error;
            return null;
          }
        }),
      );
      for (const group of batch) if (group) items.push(group);
    }
    return { items, page, hasMore: candidates.length === 20 };
  }

  async details(userId: string, workspaceId: string, bot: BotKind) {
    const context = await this.groups.manager(userId, workspaceId, bot);
    const poll =
      bot === 'CHLATWORK'
        ? await this.prisma.moment.findUnique({
            where: { groupWorkspaceId: workspaceId },
            select: {
              id: true,
              blocks: {
                where: { type: 'POLL' },
                take: 1,
                select: { data: true },
              },
              voteSchedule: {
                select: {
                  enabled: true,
                  timeZone: true,
                  sendHour: true,
                  sendMinute: true,
                  durationMinutes: true,
                },
              },
              voteRounds: {
                where: { telegramChatId: BigInt(context.chatId) },
                orderBy: { voteDate: 'desc' },
                take: 1,
                select: { id: true, closesAt: true, voteDate: true },
              },
            },
          })
        : null;
    const data = poll?.blocks[0]?.data as
      | { options?: Array<{ id: string; label: string; imageId?: string }> }
      | undefined;
    const options = await Promise.all(
      (data?.options ?? []).map(async (option) => ({
        ...option,
        ...(option.imageId && this.media
          ? { imageUrl: await this.media.url(workspaceId, bot, option.imageId) }
          : {}),
      })),
    );
    return {
      ...context,
      poll: poll
        ? {
            id: poll.id,
            ...(poll.blocks[0]?.data as object),
            options,
            schedule: poll.voteSchedule,
            currentRound: poll.voteRounds[0] ?? null,
          }
        : null,
    };
  }

  async features(
    userId: string,
    workspaceId: string,
    bot: BotKind,
    input: GroupFeaturesInput,
    key: string,
  ) {
    await this.groups.manager(userId, workspaceId, bot);
    if (
      bot === 'CREATOR'
        ? input.voting || input.split || input.khqr
        : input.creator
    )
      throw new BadRequestException(
        'This bot does not support the selected features.',
      );
    const operation = operationKey(userId, key);
    await this.prisma.$transaction(async (tx) => {
      await this.groups.lockManager(tx, userId, bot);
      await tx.$queryRaw`SELECT id FROM telegram_group_workspaces WHERE id=${workspaceId}::uuid FOR UPDATE`;
      if (
        await replay(tx, operation, workspaceId, 'FEATURES_SAVED', {
          bot,
          ...input,
        })
      )
        return;
      await lockGroup(tx, workspaceId, input.expectedVersion);
      const { expectedVersion, ...features } = input;
      await tx.telegramGroupConnection.update({
        where: { workspaceId_bot: { workspaceId, bot } },
        data: { ...features, version: { increment: 1 } },
      });
      await auditMutation(
        tx,
        workspaceId,
        userId,
        bot,
        'FEATURES_SAVED',
        operation,
        { bot, ...input },
      );
    });
    return { updated: true };
  }

  async activity(
    userId: string,
    workspaceId: string,
    bot: BotKind,
    page: number,
  ) {
    await this.groups.manager(userId, workspaceId, bot);
    const rows = await this.prisma.telegramGroupAudit.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * 20,
      take: 20,
      select: {
        id: true,
        action: true,
        bot: true,
        createdAt: true,
        telegramUserId: true,
        actor: { select: { name: true } },
      },
    });
    return {
      items: rows.map(({ telegramUserId, actor, ...row }) => ({
        ...row,
        id: String(row.id),
        telegramUserId: telegramUserId === null ? null : String(telegramUserId),
        actorName: actor?.name ?? null,
      })),
      page,
    };
  }

  async khqr(userId: string, workspaceId: string, bot: BotKind) {
    const context = await this.groups.manager(userId, workspaceId, bot);
    const items = await this.prisma.$queryRaw<
      Array<{ memberKey: string; displayName: string; imageUrl: string }>
    >`SELECT 'tg_' || m.telegram_user_id AS "memberKey",m.display_name AS "displayName",'/api/member-khqr/tg_' || m.telegram_user_id || '?v=' || q.version AS "imageUrl" FROM telegram_group_members m JOIN member_khqr_images q ON q.member_key='tg_' || m.telegram_user_id WHERE m.telegram_chat_id=${BigInt(context.chatId)} AND m.is_active=TRUE ORDER BY m.display_name LIMIT 100`;
    return { items };
  }
}
