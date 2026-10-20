import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { MomentBlockType, Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import {
  editPoll,
  preparePollEdit,
  type PollChoice,
} from '../moments/moment-poll-editor';
import { GroupAccessService } from './group-access.service';
import { GroupFeaturePolicy } from './group-feature-policy';
import { DailyMomentVoteScheduler } from '../telegram-bot/daily-moment-vote.scheduler';
import { ensureTelegramVoteRound } from '../moments/telegram-vote-round';
import type { GroupVoteInput } from './group-workspaces.dto';
import {
  auditMutation,
  lockGroup,
  operationKey,
  replay,
} from './group-mutations';

@Injectable()
export class GroupVoteService {
  private readonly logger = new Logger(GroupVoteService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly groups: GroupAccessService,
    private readonly scheduler: DailyMomentVoteScheduler,
    private readonly policy: GroupFeaturePolicy,
  ) {}

  async save(
    userId: string,
    workspaceId: string,
    input: GroupVoteInput,
    key: string,
  ) {
    try {
      new Intl.DateTimeFormat('en', { timeZone: input.timeZone });
    } catch {
      throw new BadRequestException('Choose a valid timezone.');
    }
    if (
      !input.question.trim() ||
      input.question.trim().length > 240 ||
      !Number.isInteger(input.sendHour) ||
      input.sendHour < 0 ||
      input.sendHour > 23 ||
      !Number.isInteger(input.sendMinute) ||
      input.sendMinute < 0 ||
      input.sendMinute > 59 ||
      !Number.isInteger(input.durationMinutes) ||
      input.durationMinutes < 1 ||
      input.durationMinutes > 1440
    )
      throw new BadRequestException('Invalid poll schedule.');
    const context = await this.groups.manager(userId, workspaceId, 'CHLATWORK');
    const operation = operationKey(userId, key);
    await this.prisma.$transaction(async (tx) => {
      await this.groups.lockManager(tx, userId, 'CHLATWORK');
      // Check replay after locking so concurrent retries cannot both mutate.
      await tx.$queryRaw`SELECT id FROM telegram_group_workspaces WHERE id=${workspaceId}::uuid FOR UPDATE`;
      if (await replay(tx, operation, workspaceId, 'VOTE_SAVED', input)) return;
      await lockGroup(tx, workspaceId, input.expectedVersion);
      let moment = await tx.moment.findUnique({
        where: { groupWorkspaceId: workspaceId },
        include: { blocks: { where: { type: 'POLL' }, take: 1 } },
      });
      if (!moment) {
        const options = preparePollEdit({ options: [] }, input.options, []);
        moment = await tx.moment.create({
          data: {
            groupWorkspaceId: workspaceId,
            creatorId: userId,
            slug: `group-${randomUUID()}`,
            recipientName: 'Group',
            title: input.question.trim().slice(0, 120),
            occasion: 'VOTING',
            theme: 'MINIMAL',
            status: 'PUBLISHED',
            publishedAt: new Date(),
            blocks: {
              create: {
                type: 'POLL',
                position: 0,
                data: {
                  question: input.question.trim(),
                  identityMode: 'NAME_REQUIRED',
                  options: options.options,
                  nextOptionNumber: options.nextOptionNumber,
                },
              },
            },
          },
          include: { blocks: true },
        });
      } else {
        await tx.$queryRaw`SELECT id FROM moments WHERE id=${moment.id}::uuid FOR UPDATE`;
        const block = moment.blocks[0];
        if (!block) throw new NotFoundException('Group poll is unavailable.');
        const old = (block.data as Prisma.JsonObject)
          .options as unknown as PollChoice[];
        await editPoll(
          tx,
          moment.id,
          block,
          input.options,
          old.map((option) => option.id),
          { question: input.question.trim() },
        );
        await tx.moment.update({
          where: { id: moment.id },
          data: { title: input.question.trim().slice(0, 120) },
        });
      }
      await tx.momentVoteSchedule.upsert({
        where: { momentId: moment.id },
        create: {
          momentId: moment.id,
          telegramChatId: BigInt(context.chatId),
          telegramChatTitle: context.title,
          timeZone: input.timeZone,
          sendHour: input.sendHour,
          sendMinute: input.sendMinute,
          durationMinutes: input.durationMinutes,
          enabled: input.enabled,
        },
        update: {
          timeZone: input.timeZone,
          sendHour: input.sendHour,
          sendMinute: input.sendMinute,
          durationMinutes: input.durationMinutes,
          enabled: input.enabled,
        },
      });
      await auditMutation(
        tx,
        workspaceId,
        userId,
        'CHLATWORK',
        'VOTE_SAVED',
        operation,
        input,
      );
    });
    return { updated: true };
  }

  async reset(
    userId: string,
    workspaceId: string,
    roundId: string,
    key: string,
  ) {
    const context = await this.groups.manager(userId, workspaceId, 'CHLATWORK');
    await this.policy.assertEnabled(context, 'voting');
    const operation = operationKey(userId, key);
    const now = new Date();
    const replacement = await this.prisma.$transaction(async (tx) => {
      await this.groups.lockManager(tx, userId, 'CHLATWORK');
      await tx.$queryRaw`SELECT id FROM telegram_group_workspaces WHERE id=${workspaceId}::uuid FOR UPDATE`;
      if (await replay(tx, operation, workspaceId, 'VOTE_RESET', { roundId })) {
        const audit = await tx.telegramGroupAudit.findUniqueOrThrow({
          where: { operationKey: operation },
        });
        // A delivery retry must reuse the replacement, never clear its new ballots.
        return (
          (
            audit.details as {
              result?: {
                roundId: string;
                oldMessageId: number | null;
                oldChatId: string;
              };
            }
          ).result ?? null
        );
      }
      await lockGroup(tx, workspaceId, context.workspaceVersion);
      // Bot removal updates connection health independently of the workspace version.
      await tx.$queryRaw`SELECT workspace_id FROM telegram_group_connections WHERE workspace_id=${workspaceId}::uuid AND bot='CHLATWORK' FOR UPDATE`;
      const connection = await tx.telegramGroupConnection.findUnique({
        where: { workspaceId_bot: { workspaceId, bot: 'CHLATWORK' } },
      });
      if (
        !connection?.enabled ||
        connection.health !== 'CONNECTED' ||
        !connection.voting ||
        connection.version !== context.connectionVersion
      )
        throw new ForbiddenException('Group voting is unavailable.');
      const moment = await tx.moment.findUnique({
        where: { groupWorkspaceId: workspaceId },
        include: { voteSchedule: true },
      });
      const schedule = moment?.voteSchedule;
      if (
        !moment ||
        !schedule ||
        moment.status !== 'PUBLISHED' ||
        moment.occasion !== 'VOTING' ||
        (moment.expiresAt && moment.expiresAt <= now) ||
        (moment.publishAt && moment.publishAt > now) ||
        schedule.telegramChatId !== BigInt(context.chatId)
      )
        throw new BadRequestException(
          'Configure an available group poll first.',
        );
      const today = new Intl.DateTimeFormat('en-CA', {
        timeZone: schedule.timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(now);
      // Vote writes and resets share the poll lock; the old round ID is invalidated atomically.
      await tx.$queryRaw`SELECT id FROM moments WHERE id=${moment.id}::uuid FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM moment_vote_rounds WHERE id=${roundId}::uuid FOR UPDATE`;
      const round = await tx.momentVoteRound.findFirst({
        where: {
          id: roundId,
          momentId: moment.id,
          telegramChatId: { in: await this.aliases(tx, workspaceId) },
        },
      });
      if (!round || round.voteDate.toISOString().slice(0, 10) !== today)
        throw new NotFoundException(
          'Today’s group round changed. Refresh before resetting.',
        );
      await tx.momentVote.deleteMany({
        where: { momentId: round.momentId, voteDate: round.voteDate },
      });
      // Existing bill splits retain their amounts and participants via ON DELETE SET NULL.
      await tx.momentVoteRound.delete({ where: { id: round.id } });
      // Manual reset works even when daily sending is paused, without enabling the schedule.
      await ensureTelegramVoteRound(tx, moment.id, now, true);
      const reopened = await tx.momentVoteRound.findUniqueOrThrow({
        where: {
          momentId_voteDate: { momentId: moment.id, voteDate: round.voteDate },
        },
      });
      await tx.momentVoteSchedule.update({
        where: { id: schedule.id },
        data: { lastAttemptDate: round.voteDate, lastSentAt: null },
      });
      const result = {
        roundId: reopened.id,
        oldMessageId: round.messageId,
        oldChatId: String(round.telegramChatId),
      };
      await auditMutation(
        tx,
        workspaceId,
        userId,
        'CHLATWORK',
        'VOTE_RESET',
        operation,
        { roundId },
        result,
      );
      return result;
    });
    if (!replacement) return { updated: true, deliveryPending: false };
    try {
      await this.scheduler.refreshRound(replacement.roundId, now);
    } catch {
      // The persisted round has no message ID, so the minute worker can recover delivery.
      this.logger.warn(
        'Reset voting round is open; Telegram delivery will be retried',
      );
      return { updated: true, deliveryPending: true };
    }
    if (replacement.oldMessageId !== null) {
      await this.groups
        .client('CHLATWORK')
        .deleteMessage(Number(replacement.oldChatId), replacement.oldMessageId)
        .catch(() => {
          // An old message cannot accept ballots; deletion failure must not repeat the reset.
          this.logger.warn('A replaced voting message could not be removed');
        });
    }
    return { updated: true, deliveryPending: false };
  }

  async aliases(tx: Prisma.TransactionClient, workspaceId: string) {
    return (
      await tx.telegramGroupChatAlias.findMany({
        where: { workspaceId },
        select: { telegramChatId: true },
      })
    ).map((alias) => alias.telegramChatId);
  }

  async history(userId: string, workspaceId: string, page: number) {
    await this.groups.manager(userId, workspaceId, 'CHLATWORK');
    const rows = await this.prisma.momentVoteRound.findMany({
      where: {
        moment: { groupWorkspaceId: workspaceId },
        telegramChatId: { in: await this.aliases(this.prisma, workspaceId) },
      },
      orderBy: { voteDate: 'desc' },
      skip: (page - 1) * 20,
      take: 20,
      select: { id: true, voteDate: true, closesAt: true, finalizedAt: true },
    });
    return { items: rows, page };
  }
}
