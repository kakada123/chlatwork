import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { GroupAccessService } from '../group-workspaces/group-access.service';
import { GroupFeaturePolicy } from '../group-workspaces/group-feature-policy';
import { lockGroup, operationKey } from '../group-workspaces/group-mutations';
import { GroupVoteService } from '../group-workspaces/group-vote.service';
import type { GroupContext } from '../group-workspaces/group-workspaces.types';
import { ensureTelegramVoteRound } from '../moments/telegram-vote-round';
import { TelegramBotClient } from './telegram-bot.client';
import { DailyMomentVoteScheduler } from './daily-moment-vote.scheduler';
import type {
  TelegramCallbackQuery,
  TelegramInlineKeyboard,
} from './telegram-bot.types';

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const PAGE_SIZE = 10;

@Injectable()
export class TelegramGroupVoteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly groups: GroupAccessService,
    private readonly policy: GroupFeaturePolicy,
    private readonly bot: TelegramBotClient,
    private readonly scheduler: DailyMomentVoteScheduler,
    private readonly votes: GroupVoteService,
  ) {}

  async showGroups(
    userId: string,
    chatId: number,
    action: 'start' | 'end',
    page = 1,
    now = new Date(),
  ) {
    const candidates = await this.prisma.telegramGroupManager.findMany({
      where: {
        userId,
        workspace: { connections: { some: { bot: 'CHLATWORK' } } },
      },
      orderBy: [{ createdAt: 'desc' }, { workspaceId: 'asc' }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE + 1,
      select: { workspaceId: true },
    });
    const keyboard: TelegramInlineKeyboard = { inline_keyboard: [] };
    for (const candidate of candidates.slice(0, PAGE_SIZE)) {
      try {
        const context = await this.authorize(userId, candidate.workspaceId);
        const schedule = await this.prisma.momentVoteSchedule.findFirst({
          where: {
            telegramChatId: BigInt(context.chatId),
            moment: { groupWorkspaceId: context.workspaceId },
          },
        });
        if (!schedule || (action === 'start' && !schedule.enabled)) continue;
        let data = `gv:s:${context.workspaceId}:${this.localDate(now, schedule.timeZone).replaceAll('-', '')}`;
        if (action === 'end') {
          // Schedule timezone changes must not hide a round that is still open.
          const round = await this.prisma.momentVoteRound.findFirst({
            where: {
              momentId: schedule.momentId,
              telegramChatId: BigInt(context.chatId),
              finalizedAt: null,
              closesAt: { gt: now },
            },
            orderBy: { closesAt: 'desc' },
          });
          if (
            !round ||
            round.telegramChatId !== BigInt(context.chatId) ||
            round.finalizedAt ||
            round.closesAt <= now
          )
            continue;
          // Bind end buttons to the displayed round so an old message cannot close a replacement.
          data = `gv:e:${round.id}`;
        }
        keyboard.inline_keyboard.push([
          { text: context.title.slice(0, 64), callback_data: data },
        ]);
      } catch (error) {
        if (!(error instanceof ForbiddenException)) throw error;
      }
    }
    const navigation = [];
    if (page > 1)
      navigation.push({
        text: 'Previous groups',
        callback_data: `gv:p:${action}:${page - 1}`,
      });
    if (candidates.length > PAGE_SIZE)
      navigation.push({
        text: 'More groups',
        callback_data: `gv:p:${action}:${page + 1}`,
      });
    const hasGroups = keyboard.inline_keyboard.length > 0;
    if (navigation.length) keyboard.inline_keyboard.push(navigation);
    await this.bot.sendMessage(
      chatId,
      hasGroups
        ? `Choose a group to ${action === 'start' ? 'start voting now' : 'end its current vote'}:`
        : 'No eligible groups on this page. Connect a group and configure an enabled poll in My Groups. Ending requires an open round.',
      keyboard,
    );
  }

  async handleCallback(userId: string, callback: TelegramCallbackQuery) {
    const message = callback.message;
    if (
      !message ||
      message.chat.type !== 'private' ||
      message.chat.id !== callback.from.id ||
      callback.from.is_bot
    ) {
      await this.bot.answerCallback(
        callback.id,
        'Use this control in your private chat with the bot.',
      );
      return;
    }
    const data = callback.data ?? '';
    const start = new RegExp(`^gv:s:(${UUID}):(\\d{8})$`, 'i').exec(data);
    const end = new RegExp(`^gv:e:(${UUID})$`, 'i').exec(data);
    const reset = new RegExp(`^gv:r:(${UUID})$`, 'i').exec(data);
    const page = /^gv:p:(start|end):([1-9][0-9]{0,4})$/.exec(data);
    if (data === 'gv:cancel') {
      await this.bot.answerCallback(callback.id, 'Reset cancelled.');
      await this.bot
        .deleteMessage(message.chat.id, message.message_id)
        .catch(() => null);
      return;
    }
    if (!start && !end && !page && !reset) {
      await this.bot.answerCallback(
        callback.id,
        'This voting control is invalid.',
      );
      return;
    }
    await this.bot.answerCallback(callback.id);
    try {
      if (page) {
        await this.showGroups(
          userId,
          message.chat.id,
          page[1] as 'start' | 'end',
          Number(page[2]),
        );
        return;
      }
      if (reset) {
        // Bind retries to this confirmation message, not Telegram's per-press callback ID.
        const key = `tg_reset_${reset[1].replaceAll('-', '')}_${message.message_id}`;
        const round = await this.prisma.momentVoteRound.findUnique({
          where: { id: reset[1] },
          include: { moment: { select: { groupWorkspaceId: true } } },
        });
        // A successful reset deletes the old round; use its audit on webhook retry.
        const audit = !round
          ? await this.prisma.telegramGroupAudit.findUnique({
              where: { operationKey: operationKey(userId, key) },
            })
          : null;
        const workspaceId =
          round?.moment.groupWorkspaceId ??
          (audit?.action === 'VOTE_RESET' ? audit.workspaceId : null);
        if (!workspaceId)
          throw new BadRequestException(
            'This reset confirmation has expired. Send /startvote again.',
          );
        const result = await this.votes.reset(
          userId,
          workspaceId,
          reset[1],
          key,
        );
        await this.bot.sendMessage(
          message.chat.id,
          result.deliveryPending
            ? 'Votes reset and voting reopened. Telegram delivery is pending; the bot will retry automatically.'
            : 'Votes reset and reopened in the selected group.',
        );
        await this.bot
          .deleteMessage(message.chat.id, message.message_id)
          .catch(() => null);
        return;
      }
      if (start) {
        const result = await this.start(userId, start[1], start[2]);
        if (result.requiresReset) {
          await this.bot.sendMessage(
            message.chat.id,
            `Today’s vote in ${result.title} has ended. Clear today’s votes and reopen with a fresh timer? This cannot be undone.`,
            {
              inline_keyboard: [
                [
                  {
                    text: 'Reset & reopen',
                    callback_data: `gv:r:${result.roundId}`,
                  },
                ],
                [{ text: 'Cancel', callback_data: 'gv:cancel' }],
              ],
            },
          );
          return;
        }
      } else await this.end(userId, end![1]);
      await this.bot.sendMessage(
        message.chat.id,
        start
          ? 'Vote is open in the selected group.'
          : 'Vote ended. Results are in the selected group.',
      );
    } catch (error) {
      if (!(error instanceof HttpException) || error.getStatus() >= 500)
        throw error;
      await this.bot.sendMessage(message.chat.id, error.message);
    }
  }

  async start(
    userId: string,
    workspaceId: string,
    expectedDate: string,
    now = new Date(),
  ) {
    const context = await this.authorize(userId, workspaceId);
    const result = await this.prisma.$transaction(async (tx) => {
      await this.lock(tx, userId, context);
      const schedule = await tx.momentVoteSchedule.findFirst({
        where: {
          telegramChatId: BigInt(context.chatId),
          moment: { groupWorkspaceId: workspaceId },
        },
        include: { moment: true },
      });
      if (!schedule?.enabled)
        throw new BadRequestException(
          'Configure an enabled poll in My Groups first.',
        );
      await tx.$queryRaw`SELECT id FROM moments WHERE id=${schedule.momentId}::uuid FOR UPDATE`;
      const moment = schedule.moment;
      if (
        moment.status !== 'PUBLISHED' ||
        moment.occasion !== 'VOTING' ||
        (moment.expiresAt && moment.expiresAt <= now) ||
        (moment.publishAt && moment.publishAt > now)
      )
        throw new BadRequestException(
          'This group poll is not open for voting.',
        );
      const date = this.localDate(now, schedule.timeZone);
      if (expectedDate !== date.replaceAll('-', ''))
        throw new BadRequestException(
          'This menu has expired. Send /startvote again.',
        );
      const voteDate = new Date(`${date}T00:00:00Z`);
      const where = {
        momentId_voteDate: { momentId: schedule.momentId, voteDate },
      };
      let round = await tx.momentVoteRound.findUnique({ where });
      if (round && round.telegramChatId !== BigInt(context.chatId))
        throw new BadRequestException(
          'This voting round belongs to another group.',
        );
      // A completed day can be reused only after an explicit, round-bound reset confirmation.
      if (round && (round.closesAt <= now || round.finalizedAt))
        return { roundId: round.id, requiresReset: true, title: context.title };
      if (!round) {
        await ensureTelegramVoteRound(tx, schedule.momentId, now);
        round = await tx.momentVoteRound.findUnique({ where });
      }
      if (!round) throw new NotFoundException('Voting round is unavailable.');
      // Claim the local day without changing future scheduling or extending a retry's timer.
      await tx.momentVoteSchedule.update({
        where: { id: schedule.id },
        data: { lastAttemptDate: voteDate },
      });
      await this.audit(tx, userId, workspaceId, round.id, 'VOTE_STARTED');
      return { roundId: round.id, requiresReset: false, title: context.title };
    });
    if (!result.requiresReset)
      await this.scheduler.refreshRound(result.roundId, now);
    return result;
  }

  async end(userId: string, roundId: string, now = new Date()) {
    const candidate = await this.prisma.momentVoteRound.findUnique({
      where: { id: roundId },
      include: { moment: { select: { groupWorkspaceId: true } } },
    });
    if (!candidate?.moment.groupWorkspaceId)
      throw new NotFoundException('Group voting round is unavailable.');
    const context = await this.authorize(
      userId,
      candidate.moment.groupWorkspaceId,
    );
    await this.prisma.$transaction(async (tx) => {
      await this.lock(tx, userId, context);
      await tx.$queryRaw`SELECT id FROM moments WHERE id=${candidate.momentId}::uuid FOR UPDATE`;
      const round = await tx.momentVoteRound.findUnique({
        where: { id: roundId },
      });
      if (
        !round ||
        round.telegramChatId !== BigInt(context.chatId) ||
        round.momentId !== candidate.momentId
      )
        throw new NotFoundException(
          'This voting round no longer belongs to the selected group.',
        );
      // Closing only changes the deadline. Ballots, participation and tomorrow's schedule remain intact.
      await tx.momentVoteRound.updateMany({
        where: {
          id: roundId,
          telegramChatId: BigInt(context.chatId),
          finalizedAt: null,
          closesAt: { gt: now },
        },
        data: { closesAt: now },
      });
      await this.audit(tx, userId, context.workspaceId, roundId, 'VOTE_ENDED');
    });
    await this.scheduler.refreshRound(roundId, now);
  }

  private async authorize(userId: string, workspaceId: string) {
    const context = await this.groups.manager(userId, workspaceId, 'CHLATWORK');
    await this.policy.assertEnabled(context, 'voting');
    return context;
  }

  private async lock(
    tx: Prisma.TransactionClient,
    userId: string,
    context: GroupContext,
  ) {
    await this.groups.lockManager(tx, userId, 'CHLATWORK');
    await lockGroup(tx, context.workspaceId, context.workspaceVersion);
    // Lock the connection too, so feature changes cannot race an authorized mutation.
    await tx.$queryRaw`SELECT workspace_id FROM telegram_group_connections WHERE workspace_id=${context.workspaceId}::uuid AND bot='CHLATWORK' FOR UPDATE`;
    const connection = await tx.telegramGroupConnection.findUnique({
      where: {
        workspaceId_bot: { workspaceId: context.workspaceId, bot: 'CHLATWORK' },
      },
    });
    if (
      !connection?.enabled ||
      connection.health !== 'CONNECTED' ||
      !connection.voting ||
      connection.version !== context.connectionVersion
    )
      throw new ForbiddenException('Group voting is unavailable.');
  }

  private async audit(
    tx: Prisma.TransactionClient,
    userId: string,
    workspaceId: string,
    roundId: string,
    action: string,
  ) {
    await tx.telegramGroupAudit.upsert({
      where: { operationKey: `${action}:${roundId}` },
      create: {
        workspaceId,
        actorId: userId,
        bot: 'CHLATWORK',
        action,
        operationKey: `${action}:${roundId}`,
        details: { roundId },
      },
      update: {},
    });
  }

  private localDate(now: Date, timeZone: string) {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now);
  }
}
