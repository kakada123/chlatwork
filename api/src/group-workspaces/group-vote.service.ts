import {
  BadRequestException,
  Injectable,
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
import type { GroupVoteInput } from './group-workspaces.dto';
import {
  auditMutation,
  lockGroup,
  operationKey,
  replay,
} from './group-mutations';

@Injectable()
export class GroupVoteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly groups: GroupAccessService,
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
    const operation = operationKey(userId, key);
    return this.prisma.$transaction(async (tx) => {
      await this.groups.lockManager(tx, userId, 'CHLATWORK');
      await tx.$queryRaw`SELECT id FROM telegram_group_workspaces WHERE id=${workspaceId}::uuid FOR UPDATE`;
      if (await replay(tx, operation, workspaceId, 'VOTE_RESET', { roundId }))
        return { updated: true };
      await lockGroup(tx, workspaceId, context.workspaceVersion);
      const round = await tx.momentVoteRound.findFirst({
        where: {
          id: roundId,
          moment: { groupWorkspaceId: workspaceId },
          telegramChatId: { in: await this.aliases(tx, workspaceId) },
        },
      });
      if (!round || round.closesAt <= new Date())
        throw new NotFoundException('Current group round not found.');
      await tx.$queryRaw`SELECT id FROM moments WHERE id=${round.momentId}::uuid FOR UPDATE`;
      await tx.momentVote.deleteMany({
        where: { momentId: round.momentId, voteDate: round.voteDate },
      });
      await auditMutation(
        tx,
        workspaceId,
        userId,
        'CHLATWORK',
        'VOTE_RESET',
        operation,
        { roundId },
      );
      return { updated: true };
    });
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
