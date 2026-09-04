import {
  BadRequestException,
  GoneException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AuthProvider,
  ExpenseCurrency,
  ExpenseEntryType,
  Prisma,
  TelegramBotPendingExpenseStatus,
} from '@prisma/client';
import { createHash, timingSafeEqual } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MomentsService } from '../moments/moments.service';
import {
  formatTelegramExpenseAmount,
  parseTelegramExpense,
  TelegramExpenseParseError,
} from './telegram-expense-parser';
import { TelegramBotClient } from './telegram-bot.client';
import type {
  TelegramCallbackQuery,
  TelegramInlineQuery,
  TelegramInlineKeyboard,
  TelegramMessage,
  TelegramUpdate,
} from './telegram-bot.types';
import { buildTelegramTodaySummary } from './telegram-today-summary';
import {
  buildTelegramPollKeyboard,
  buildTelegramPollMessage,
} from './telegram-vote';

const DEFAULT_TIME_ZONE = 'Asia/Phnom_Penh';
const PENDING_EXPENSE_LIFETIME_MS = 30 * 60 * 1_000;
const RETAIN_BOT_STATE_MS = 7 * 24 * 60 * 60 * 1_000;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const POLL_OPTION_PATTERN = /^option-(?:[1-9]|10)$/;

interface LinkedTelegramUser {
  user: {
    id: string;
    isActive: boolean;
    telegramNotificationTimeZone: string;
    expenseProfile: { currency: ExpenseCurrency } | null;
  };
}

@Injectable()
export class TelegramBotService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly bot: TelegramBotClient,
    private readonly moments: MomentsService,
  ) {}

  isValidWebhookSecret(candidate?: string) {
    if (!candidate) return false;
    const expected = this.config.getOrThrow<string>('TELEGRAM_WEBHOOK_SECRET');
    const expectedHash = createHash('sha256').update(expected).digest();
    const candidateHash = createHash('sha256').update(candidate).digest();
    return timingSafeEqual(expectedHash, candidateHash);
  }

  async handleUpdate(value: unknown) {
    const update = this.parseUpdate(value);
    if (!(await this.claimUpdate(update.update_id))) return;

    try {
      if (update.inline_query) {
        await this.handleInlineQuery(update.inline_query);
      } else if (update.callback_query) {
        await this.handleCallback(update.callback_query);
      } else if (update.message) {
        await this.handleMessage(update.message);
      }

      await this.prisma.telegramBotUpdate.update({
        where: { updateId: BigInt(update.update_id) },
        data: { processedAt: new Date() },
      });
      if (update.update_id % 250 === 0) await this.cleanupOldState();
    } catch (error) {
      // Let Telegram retry transient failures, while confirmed expenses remain
      // protected by their pending-record status.
      await this.prisma.telegramBotUpdate.deleteMany({
        where: { updateId: BigInt(update.update_id), processedAt: null },
      });
      throw error;
    }
  }

  private parseUpdate(value: unknown): TelegramUpdate {
    if (!value || typeof value !== 'object') {
      throw new BadRequestException('Telegram update is invalid');
    }
    const update = value as Partial<TelegramUpdate>;
    if (
      !Number.isSafeInteger(update.update_id) ||
      (update.update_id ?? -1) < 0
    ) {
      throw new BadRequestException('Telegram update is invalid');
    }
    return update as TelegramUpdate;
  }

  private async claimUpdate(updateId: number) {
    const claimed = await this.prisma.$queryRaw<Array<{ updateId: bigint }>>`
      INSERT INTO telegram_bot_updates (update_id)
      VALUES (${BigInt(updateId)})
      ON CONFLICT (update_id) DO NOTHING
      RETURNING update_id AS "updateId"
    `;
    return claimed.length === 1;
  }

  private async handleMessage(message: TelegramMessage) {
    if (typeof message.text !== 'string') return;

    const command = this.readCommand(message.text);
    if (this.isGroupMessage(message)) {
      if (['dailyvote', 'votetime', 'stopdailyvote'].includes(command ?? '')) {
        await this.handleGroupVoteCommand(message, command!);
      }
      return;
    }
    if (!this.isPrivateMessage(message)) return;

    const telegramUserId = String(message.from.id);
    const linked = await this.findLinkedUser(telegramUserId);

    if (command === 'start' || command === 'help') {
      await this.sendMenu(message.chat.id, Boolean(linked));
      return;
    }
    if (!linked) {
      await this.sendConnectAccount(message.chat.id);
      return;
    }
    if (command === 'today') {
      await this.sendToday(message.chat.id, linked);
      return;
    }
    if (command === 'vote') {
      await this.sendVotingMoments(message.chat.id, linked.user.id);
      return;
    }
    if (command === 'cancel') {
      await this.cancelLatestPending(
        message.chat.id,
        telegramUserId,
        linked.user.id,
      );
      return;
    }
    if (command) {
      await this.bot.sendMessage(
        message.chat.id,
        'Unknown command. Use /today for spending, /vote to share a poll, ' +
          'or send an expense such as “Lunch 4.50”.',
        this.mainMenuKeyboard(),
      );
      return;
    }

    await this.prepareExpense(message, linked);
  }

  private async handleCallback(callback: TelegramCallbackQuery) {
    const data = typeof callback.data === 'string' ? callback.data : '';
    if (!data || data.length > 64) return;
    if (data.startsWith('poll:vote:')) {
      await this.handlePollVote(callback, data);
      return;
    }
    if (data.startsWith('poll:daily:')) {
      await this.handleDailyVoteSchedule(callback, data);
      return;
    }

    const message = callback.message;
    if (!message || !this.isPrivateCallback(callback, message)) return;

    const telegramUserId = String(callback.from.id);
    const linked = await this.findLinkedUser(telegramUserId);
    if (!linked) {
      await this.bot.answerCallback(
        callback.id,
        'Connect your ChlatWork account first.',
      );
      await this.sendConnectAccount(message.chat.id);
      return;
    }
    if (data === 'menu:add') {
      await this.bot.answerCallback(callback.id);
      await this.bot.sendMessage(
        message.chat.id,
        'Send one expense like:\n• Lunch 4.50\n• Coffee $2\n• បាយ 15000៛' +
          '\n\nI will show a confirmation before saving.',
      );
      return;
    }
    if (data === 'summary:today') {
      await this.bot.answerCallback(callback.id);
      await this.sendToday(message.chat.id, linked);
      return;
    }
    if (data === 'poll:list') {
      await this.bot.answerCallback(callback.id);
      await this.sendVotingMoments(message.chat.id, linked.user.id);
      return;
    }

    const [scope, action, pendingId] = data.split(':');
    if (scope !== 'expense' || !UUID_PATTERN.test(pendingId ?? '')) {
      await this.bot.answerCallback(
        callback.id,
        'This action is not available.',
      );
      return;
    }

    if (action === 'save') {
      await this.confirmExpense(callback, linked, pendingId);
    } else if (action === 'edit') {
      await this.editExpense(callback, linked, pendingId);
    } else if (action === 'cancel') {
      await this.cancelExpense(callback, linked, pendingId);
    } else if (action === 'undo') {
      await this.undoExpense(callback, linked, pendingId);
    } else {
      await this.bot.answerCallback(
        callback.id,
        'This action is not available.',
      );
    }
  }

  private async handleInlineQuery(query: TelegramInlineQuery) {
    if (!this.isValidInlineQuery(query)) return;
    const match = /^vote:([0-9a-f-]+)$/i.exec(query.query.trim());
    if (!match || !UUID_PATTERN.test(match[1])) {
      await this.bot.answerInlineQuery(query.id, []);
      return;
    }
    const linked = await this.findLinkedUser(String(query.from.id));
    if (!linked) {
      await this.bot.answerInlineQuery(query.id, []);
      return;
    }

    try {
      // Only the creator can turn a private inline query into a shareable poll.
      const poll = await this.moments.getOwnedTelegramVotingMoment(
        linked.user.id,
        match[1],
      );
      await this.bot.answerInlineQuery(query.id, [
        {
          type: 'article',
          id: `vote-${poll.id}`,
          title: poll.question,
          description: `${poll.totalVotes} votes · ${poll.title}`,
          input_message_content: {
            message_text: buildTelegramPollMessage(poll),
          },
          reply_markup: buildTelegramPollKeyboard(
            poll,
            this.appUrl(`/m/${poll.slug}`),
          ),
        },
      ]);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof GoneException ||
        error instanceof BadRequestException
      ) {
        await this.bot.answerInlineQuery(query.id, []);
        return;
      }
      throw error;
    }
  }

  private async handlePollVote(callback: TelegramCallbackQuery, data: string) {
    if (!this.isValidPollCallback(callback)) return;
    const [scope, action, momentId, optionId, extra] = data.split(':');
    if (
      scope !== 'poll' ||
      action !== 'vote' ||
      extra !== undefined ||
      !UUID_PATTERN.test(momentId ?? '') ||
      !POLL_OPTION_PATTERN.test(optionId ?? '')
    ) {
      await this.bot.answerCallback(
        callback.id,
        'This poll action is invalid.',
      );
      return;
    }

    const telegramUserId = String(callback.from.id);
    const linked = await this.findLinkedUser(telegramUserId);
    const displayName = this.telegramDisplayName(callback.from);
    try {
      const poll = await this.moments.respondToTelegramVote(
        momentId,
        optionId,
        {
          telegramUserId,
          linkedUserId: linked?.user.id,
          displayName,
        },
      );
      await this.bot.answerCallback(callback.id, 'Vote saved.');
      const keyboard = buildTelegramPollKeyboard(
        poll,
        this.appUrl(`/m/${poll.slug}`),
      );
      const text = buildTelegramPollMessage(poll);
      if (callback.inline_message_id) {
        await this.bot.editInlineMessage(
          callback.inline_message_id,
          text,
          keyboard,
        );
      } else if (callback.message) {
        await this.bot.editMessage(
          callback.message.chat.id,
          callback.message.message_id,
          text,
          keyboard,
        );
      }
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        await this.bot.answerCallback(
          callback.id,
          'Open ChlatWork and connect Telegram to vote.',
        );
        return;
      }
      if (
        error instanceof NotFoundException ||
        error instanceof GoneException ||
        error instanceof BadRequestException
      ) {
        await this.bot.answerCallback(callback.id, 'This poll is unavailable.');
        return;
      }
      throw error;
    }
  }

  private async handleGroupVoteCommand(
    message: TelegramMessage & { from: NonNullable<TelegramMessage['from']> },
    command: string,
  ) {
    const linked = await this.findLinkedUser(String(message.from.id));
    if (!linked) {
      await this.bot.sendMessage(
        message.chat.id,
        'Connect this Telegram account to ChlatWork before managing a daily vote.',
      );
      return;
    }
    if (
      !(await this.bot.isChatAdministrator(message.chat.id, message.from.id))
    ) {
      await this.bot.sendMessage(
        message.chat.id,
        'Only a group administrator can manage the daily vote.',
      );
      return;
    }

    if (command === 'dailyvote') {
      const polls = await this.moments.listTelegramVotingMoments(
        linked.user.id,
      );
      if (!polls.length) {
        await this.bot.sendMessage(
          message.chat.id,
          'You do not have an open published Voting Moment yet.',
        );
        return;
      }
      await this.bot.sendMessage(
        message.chat.id,
        'Choose the poll to send in this group every day:',
        {
          inline_keyboard: polls.map((poll) => [
            {
              text: `Schedule: ${this.truncateButtonText(poll.question)}`,
              callback_data: `poll:daily:${poll.id}`,
            },
          ]),
        },
      );
      return;
    }

    if (command === 'votetime') {
      const match = /(?:^|\s)([01]\d|2[0-3]):([0-5]\d)(?:\s|$)/.exec(
        message.text ?? '',
      );
      if (!match) {
        await this.bot.sendMessage(
          message.chat.id,
          'Use /votetime HH:MM, for example /votetime 10:00.',
        );
        return;
      }
      try {
        await this.moments.updateDailyTelegramVoteTime(
          linked.user.id,
          message.chat.id,
          Number(match[1]),
          Number(match[2]),
        );
        await this.bot.sendMessage(
          message.chat.id,
          `Daily poll time updated to ${match[1]}:${match[2]} (${linked.user.telegramNotificationTimeZone}).`,
        );
      } catch (error) {
        if (error instanceof NotFoundException) {
          await this.bot.sendMessage(
            message.chat.id,
            'Set up a daily poll in this group with /dailyvote first.',
          );
          return;
        }
        throw error;
      }
      return;
    }

    try {
      await this.moments.disableDailyTelegramVote(
        linked.user.id,
        message.chat.id,
      );
      await this.bot.sendMessage(
        message.chat.id,
        'Daily poll delivery is stopped. Vote history is still available in Manage Moments.',
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        await this.bot.sendMessage(
          message.chat.id,
          'There is no daily poll owned by you in this group.',
        );
        return;
      }
      throw error;
    }
  }

  private async handleDailyVoteSchedule(
    callback: TelegramCallbackQuery,
    data: string,
  ) {
    const match = /^poll:daily:([0-9a-f-]+)$/i.exec(data);
    const message = callback.message;
    if (
      !match ||
      !UUID_PATTERN.test(match[1]) ||
      !message ||
      !this.isGroupCallback(callback, message)
    ) {
      await this.bot.answerCallback(
        callback.id,
        'This schedule action is invalid.',
      );
      return;
    }
    const linked = await this.findLinkedUser(String(callback.from.id));
    if (!linked) {
      await this.bot.answerCallback(
        callback.id,
        'Connect your ChlatWork account first.',
      );
      return;
    }
    if (
      !(await this.bot.isChatAdministrator(message.chat.id, callback.from.id))
    ) {
      await this.bot.answerCallback(
        callback.id,
        'Only a group administrator can schedule this vote.',
      );
      return;
    }

    try {
      const poll = await this.moments.configureDailyTelegramVote(
        linked.user.id,
        match[1],
        message.chat.id,
        message.chat.title,
      );
      await this.bot.answerCallback(callback.id, 'Daily vote scheduled.');
      await this.bot.sendMessage(
        message.chat.id,
        `✅ Daily vote enabled at 10:00 (${linked.user.telegramNotificationTimeZone}).\n` +
          'Use /votetime HH:MM to change it or /stopdailyvote to stop.',
      );
      await this.bot.sendMessage(
        message.chat.id,
        buildTelegramPollMessage(poll),
        buildTelegramPollKeyboard(poll, this.appUrl(`/m/${poll.slug}`)),
      );
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof GoneException ||
        error instanceof BadRequestException
      ) {
        await this.bot.answerCallback(
          callback.id,
          'Only the poll owner can schedule this vote.',
        );
        return;
      }
      throw error;
    }
  }

  private async prepareExpense(
    message: TelegramMessage,
    linked: LinkedTelegramUser,
  ) {
    const currency =
      linked.user.expenseProfile?.currency ?? ExpenseCurrency.USD;
    let parsed;
    try {
      parsed = parseTelegramExpense(message.text ?? '', currency);
    } catch (error) {
      const guidance =
        error instanceof TelegramExpenseParseError
          ? error.message
          : 'I could not understand that expense.';
      await this.bot.sendMessage(
        message.chat.id,
        `${guidance}\n\nTry “Lunch 4.50” or “បាយ 15000៛”.`,
      );
      return;
    }

    const localDate = this.localDate(linked.user.telegramNotificationTimeZone);
    const telegramUserId = String(message.from?.id);
    const pending = await this.prisma.telegramBotPendingExpense.upsert({
      where: {
        chatId_sourceMessageId: {
          chatId: BigInt(message.chat.id),
          sourceMessageId: BigInt(message.message_id),
        },
      },
      create: {
        userId: linked.user.id,
        telegramUserId,
        chatId: BigInt(message.chat.id),
        sourceMessageId: BigInt(message.message_id),
        amountInput: parsed.amount,
        currency: parsed.currency,
        category: parsed.category,
        note: parsed.note,
        entryDate: new Date(`${localDate}T00:00:00.000Z`),
        expiresAt: new Date(Date.now() + PENDING_EXPENSE_LIFETIME_MS),
      },
      update: {},
    });

    await this.bot.sendMessage(
      message.chat.id,
      this.pendingExpenseText(pending, 'Confirm expense?'),
      {
        inline_keyboard: [
          [
            { text: '✅ Save', callback_data: `expense:save:${pending.id}` },
            { text: '✏️ Edit', callback_data: `expense:edit:${pending.id}` },
          ],
          [{ text: 'Cancel', callback_data: `expense:cancel:${pending.id}` }],
        ],
      },
    );
  }

  private async confirmExpense(
    callback: TelegramCallbackQuery,
    linked: LinkedTelegramUser,
    pendingId: string,
  ) {
    const telegramUserId = String(callback.from.id);
    const result = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${pendingId}))`;
      const pending = await tx.telegramBotPendingExpense.findFirst({
        where: { id: pendingId, telegramUserId, userId: linked.user.id },
      });
      if (!pending) return { state: 'missing' as const };
      if (pending.status === TelegramBotPendingExpenseStatus.CONFIRMED) {
        return { state: 'confirmed' as const, pending };
      }
      if (pending.status !== TelegramBotPendingExpenseStatus.PENDING) {
        return { state: 'unavailable' as const };
      }
      if (pending.expiresAt <= new Date()) {
        await tx.telegramBotPendingExpense.update({
          where: { id: pending.id },
          data: { status: TelegramBotPendingExpenseStatus.CANCELLED },
        });
        return { state: 'expired' as const };
      }

      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${linked.user.id}))`;
      const profile = await tx.expenseProfile.upsert({
        where: { userId: linked.user.id },
        create: { userId: linked.user.id },
        update: {},
        select: { currency: true },
      });
      if (profile.currency !== pending.currency) {
        await tx.telegramBotPendingExpense.update({
          where: { id: pending.id },
          data: { status: TelegramBotPendingExpenseStatus.CANCELLED },
        });
        return { state: 'currency-changed' as const };
      }
      const positions = await tx.expenseEntry.aggregate({
        where: { userId: linked.user.id },
        _max: { position: true },
      });
      const entry = await tx.expenseEntry.create({
        data: {
          userId: linked.user.id,
          position: (positions._max.position ?? -1) + 1,
          type: ExpenseEntryType.EXPENSE,
          entryDate: pending.entryDate,
          category: pending.category,
          customCategory: null,
          note: pending.note,
          showNote: Boolean(pending.note),
          amount: new Prisma.Decimal(pending.amountInput),
          amountInput: pending.amountInput,
        },
      });
      const saved = await tx.telegramBotPendingExpense.update({
        where: { id: pending.id },
        data: {
          status: TelegramBotPendingExpenseStatus.CONFIRMED,
          expenseEntryId: entry.id,
          confirmedAt: new Date(),
        },
      });
      return { state: 'saved' as const, pending: saved };
    });

    const callbackMessage = callback.message as TelegramMessage;
    if (result.state === 'confirmed') {
      await this.bot.answerCallback(callback.id, 'Already saved.');
      await this.bot.editMessage(
        callbackMessage.chat.id,
        callbackMessage.message_id,
        this.pendingExpenseText(result.pending, '✅ Expense saved'),
        {
          inline_keyboard: [
            [{ text: '↩️ Undo', callback_data: `expense:undo:${pendingId}` }],
            [this.openTrackerButton()],
          ],
        },
      );
      return;
    }
    if (result.state === 'saved') {
      await this.bot.answerCallback(callback.id, 'Expense saved.');
      await this.bot.editMessage(
        callbackMessage.chat.id,
        callbackMessage.message_id,
        this.pendingExpenseText(result.pending, '✅ Expense saved'),
        {
          inline_keyboard: [
            [{ text: '↩️ Undo', callback_data: `expense:undo:${pendingId}` }],
            [this.openTrackerButton()],
          ],
        },
      );
      return;
    }

    const messages: Record<typeof result.state, string> = {
      missing: 'Expense confirmation was not found.',
      unavailable: 'This expense is no longer pending.',
      expired: 'This confirmation expired. Send the expense again.',
      'currency-changed':
        'Your tracker currency changed. Send the expense again.',
    };
    await this.bot.answerCallback(callback.id, messages[result.state]);
  }

  private async editExpense(
    callback: TelegramCallbackQuery,
    linked: LinkedTelegramUser,
    pendingId: string,
  ) {
    const changed = await this.cancelPendingExpense(
      pendingId,
      String(callback.from.id),
      linked.user.id,
    );
    await this.bot.answerCallback(callback.id);
    if (!changed) return;

    const message = callback.message as TelegramMessage;
    await this.bot.editMessage(
      message.chat.id,
      message.message_id,
      '✏️ Send the corrected expense as a new message.\n\nExample: “Lunch 4.50”',
    );
  }

  private async cancelExpense(
    callback: TelegramCallbackQuery,
    linked: LinkedTelegramUser,
    pendingId: string,
  ) {
    const changed = await this.cancelPendingExpense(
      pendingId,
      String(callback.from.id),
      linked.user.id,
    );
    await this.bot.answerCallback(
      callback.id,
      changed ? 'Expense cancelled.' : 'This expense is no longer pending.',
    );
    if (!changed) return;

    const message = callback.message as TelegramMessage;
    await this.bot.editMessage(
      message.chat.id,
      message.message_id,
      'Cancelled — nothing was saved.',
    );
  }

  private async undoExpense(
    callback: TelegramCallbackQuery,
    linked: LinkedTelegramUser,
    pendingId: string,
  ) {
    const telegramUserId = String(callback.from.id);
    const undone = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${pendingId}))`;
      const pending = await tx.telegramBotPendingExpense.findFirst({
        where: { id: pendingId, telegramUserId, userId: linked.user.id },
      });
      if (pending?.status === TelegramBotPendingExpenseStatus.UNDONE) {
        return true;
      }
      if (
        !pending ||
        pending.status !== TelegramBotPendingExpenseStatus.CONFIRMED ||
        !pending.expenseEntryId
      ) {
        return false;
      }

      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${linked.user.id}))`;
      const removed = await tx.expenseEntry.deleteMany({
        where: { id: pending.expenseEntryId, userId: linked.user.id },
      });
      if (removed.count !== 1) return false;
      await tx.telegramBotPendingExpense.update({
        where: { id: pending.id },
        data: { status: TelegramBotPendingExpenseStatus.UNDONE },
      });
      return true;
    });

    await this.bot.answerCallback(
      callback.id,
      undone ? 'Expense removed.' : 'This expense cannot be undone.',
    );
    if (!undone) return;
    const message = callback.message as TelegramMessage;
    await this.bot.editMessage(
      message.chat.id,
      message.message_id,
      '↩️ Expense removed from ChlatWork.',
      { inline_keyboard: [[this.openTrackerButton()]] },
    );
  }

  private async cancelLatestPending(
    chatId: number,
    telegramUserId: string,
    userId: string,
  ) {
    const pending = await this.prisma.telegramBotPendingExpense.findFirst({
      where: {
        chatId: BigInt(chatId),
        telegramUserId,
        userId,
        status: TelegramBotPendingExpenseStatus.PENDING,
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!pending) {
      await this.bot.sendMessage(
        chatId,
        'There is no pending expense to cancel.',
      );
      return;
    }
    const changed = await this.cancelPendingExpense(
      pending.id,
      telegramUserId,
      userId,
    );
    await this.bot.sendMessage(
      chatId,
      changed
        ? 'Cancelled the latest pending expense.'
        : 'There is no pending expense to cancel.',
    );
  }

  private async cancelPendingExpense(
    pendingId: string,
    telegramUserId: string,
    userId: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      // Save, Edit, Cancel, and Undo share this lock so button races cannot
      // report a cancellation after the same expense was committed.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${pendingId}))`;
      const changed = await tx.telegramBotPendingExpense.updateMany({
        where: {
          id: pendingId,
          telegramUserId,
          userId,
          status: TelegramBotPendingExpenseStatus.PENDING,
        },
        data: { status: TelegramBotPendingExpenseStatus.CANCELLED },
      });
      if (changed.count === 1) return true;

      const pending = await tx.telegramBotPendingExpense.findFirst({
        where: { id: pendingId, telegramUserId, userId },
        select: { status: true },
      });
      return pending?.status === TelegramBotPendingExpenseStatus.CANCELLED;
    });
  }

  private async sendToday(chatId: number, linked: LinkedTelegramUser) {
    const currency =
      linked.user.expenseProfile?.currency ?? ExpenseCurrency.USD;
    const localDate = this.localDate(linked.user.telegramNotificationTimeZone);
    const expenses = await this.prisma.expenseEntry.findMany({
      where: {
        userId: linked.user.id,
        type: ExpenseEntryType.EXPENSE,
        entryDate: new Date(`${localDate}T00:00:00.000Z`),
        amount: { not: null },
      },
      select: {
        category: true,
        customCategory: true,
        amount: true,
      },
      orderBy: { position: 'asc' },
    });
    await this.bot.sendMessage(
      chatId,
      buildTelegramTodaySummary(
        localDate,
        currency,
        expenses.map((entry) => ({
          category: entry.category,
          customCategory: entry.customCategory,
          amount: entry.amount?.toString() ?? '0',
        })),
      ),
      {
        inline_keyboard: [
          [{ text: '➕ Add expense', callback_data: 'menu:add' }],
          [this.openTrackerButton()],
        ],
      },
    );
  }

  private async sendVotingMoments(chatId: number, userId: string) {
    const polls = await this.moments.listTelegramVotingMoments(userId);
    if (!polls.length) {
      await this.bot.sendMessage(
        chatId,
        'You do not have an open published Voting Moment yet. Create and publish one first.',
        {
          inline_keyboard: [
            [
              {
                text: 'Create Voting Moment',
                web_app: { url: this.appUrl('/moments/create') },
              },
            ],
          ],
        },
      );
      return;
    }

    await this.bot.sendMessage(
      chatId,
      'Choose a poll, then choose the Telegram chat where you want to share it.',
      {
        inline_keyboard: [
          ...polls.map((poll) => [
            {
              text: `Share: ${this.truncateButtonText(poll.question)}`,
              switch_inline_query: `vote:${poll.id}`,
            },
          ]),
          [
            {
              text: 'Manage Moments',
              web_app: { url: this.appUrl('/moments') },
            },
          ],
        ],
      },
    );
  }

  private async sendMenu(chatId: number, linked: boolean) {
    await this.bot.sendMessage(
      chatId,
      linked
        ? '👋 ChlatWork Assistant\n\nSend an expense like “Lunch 4.50”, ' +
            'or use /vote to share a published poll. Expenses are never saved ' +
            'without your confirmation.'
        : '👋 Welcome to ChlatWork. Open the Mini App and sign in with Telegram ' +
            'before using private expense data.',
      linked ? this.mainMenuKeyboard() : this.connectKeyboard(),
    );
  }

  private async sendConnectAccount(chatId: number) {
    await this.bot.sendMessage(
      chatId,
      'Open ChlatWork and sign in with this Telegram account first. ' +
        'I will not guess or merge account identities.',
      this.connectKeyboard(),
    );
  }

  private mainMenuKeyboard(): TelegramInlineKeyboard {
    return {
      inline_keyboard: [
        [
          { text: '➕ Add expense', callback_data: 'menu:add' },
          { text: '📊 Today', callback_data: 'summary:today' },
        ],
        [this.openTrackerButton()],
        [{ text: '🗳 Share a vote', callback_data: 'poll:list' }],
        [{ text: '⚙️ Settings', web_app: { url: this.appUrl('/account') } }],
      ],
    };
  }

  private connectKeyboard(): TelegramInlineKeyboard {
    return {
      inline_keyboard: [
        [{ text: 'Open ChlatWork', web_app: { url: this.appUrl('/') } }],
      ],
    };
  }

  private openTrackerButton() {
    return {
      text: 'Open Expense Tracker',
      web_app: { url: this.appUrl('/tools/expense-tracker') },
    };
  }

  private appUrl(path: string) {
    return new URL(
      path,
      this.config.getOrThrow<string>('FRONTEND_ORIGIN'),
    ).toString();
  }

  private pendingExpenseText(
    pending: {
      amountInput: string;
      currency: ExpenseCurrency;
      category: string;
      note: string;
      entryDate: Date;
    },
    heading: string,
  ) {
    return [
      heading,
      '',
      `Amount: ${formatTelegramExpenseAmount(pending.amountInput, pending.currency)}`,
      `Category: ${pending.category}`,
      `Note: ${pending.note || '—'}`,
      `Date: ${pending.entryDate.toISOString().slice(0, 10)}`,
    ].join('\n');
  }

  private readCommand(text: string) {
    const trimmed = text.trim();
    if (!trimmed.startsWith('/')) return null;
    return trimmed.slice(1).split(/[@\s]/, 1)[0]?.toLowerCase() || null;
  }

  private telegramDisplayName(user: TelegramCallbackQuery['from']) {
    const name = [user.first_name, user.last_name]
      .filter((part): part is string => Boolean(part?.trim()))
      .join(' ')
      .trim();
    return (
      name || (user.username ? `@${user.username}` : 'Telegram voter')
    ).slice(0, 80);
  }

  private truncateButtonText(value: string) {
    return value.length > 48 ? `${value.slice(0, 47)}…` : value;
  }

  private localDate(timeZone: string | null | undefined) {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timeZone || DEFAULT_TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());
    const get = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((part) => part.type === type)?.value;
    return `${get('year')}-${get('month')}-${get('day')}`;
  }

  private findLinkedUser(telegramUserId: string) {
    return this.prisma.socialAccount
      .findUnique({
        where: {
          provider_providerUserId: {
            provider: AuthProvider.TELEGRAM,
            providerUserId: telegramUserId,
          },
        },
        select: {
          user: {
            select: {
              id: true,
              isActive: true,
              telegramNotificationTimeZone: true,
              expenseProfile: { select: { currency: true } },
            },
          },
        },
      })
      .then((account) => (account?.user.isActive ? account : null));
  }

  private isPrivateMessage(
    message: TelegramMessage,
  ): message is TelegramMessage & {
    from: NonNullable<TelegramMessage['from']>;
  } {
    return Boolean(
      message.chat?.type === 'private' &&
      Number.isSafeInteger(message.chat.id) &&
      message.chat.id > 0 &&
      message.from &&
      !message.from.is_bot &&
      Number.isSafeInteger(message.from.id) &&
      message.from.id === message.chat.id &&
      Number.isSafeInteger(message.message_id) &&
      message.message_id >= 0,
    );
  }

  private isGroupMessage(
    message: TelegramMessage,
  ): message is TelegramMessage & {
    from: NonNullable<TelegramMessage['from']>;
  } {
    return Boolean(
      ['group', 'supergroup'].includes(message.chat?.type) &&
      Number.isSafeInteger(message.chat.id) &&
      message.chat.id !== 0 &&
      message.from &&
      !message.from.is_bot &&
      Number.isSafeInteger(message.from.id) &&
      message.from.id > 0 &&
      Number.isSafeInteger(message.message_id) &&
      message.message_id >= 0,
    );
  }

  private isGroupCallback(
    callback: TelegramCallbackQuery,
    message: TelegramMessage,
  ) {
    return Boolean(
      ['group', 'supergroup'].includes(message.chat?.type) &&
      Number.isSafeInteger(message.chat.id) &&
      message.chat.id !== 0 &&
      Number.isSafeInteger(message.message_id) &&
      message.message_id >= 0 &&
      Number.isSafeInteger(callback.from?.id) &&
      callback.from.id > 0 &&
      !callback.from.is_bot &&
      typeof callback.id === 'string' &&
      callback.id.length > 0 &&
      callback.id.length <= 128,
    );
  }

  private isPrivateCallback(
    callback: TelegramCallbackQuery,
    message: TelegramMessage,
  ) {
    return Boolean(
      message.chat?.type === 'private' &&
      Number.isSafeInteger(message.chat.id) &&
      message.chat.id > 0 &&
      Number.isSafeInteger(message.message_id) &&
      message.message_id >= 0 &&
      Number.isSafeInteger(callback.from?.id) &&
      callback.from.id === message.chat.id &&
      !callback.from.is_bot &&
      typeof callback.id === 'string' &&
      callback.id.length > 0 &&
      callback.id.length <= 128,
    );
  }

  private isValidInlineQuery(query: TelegramInlineQuery) {
    return Boolean(
      Number.isSafeInteger(query.from?.id) &&
      query.from.id > 0 &&
      !query.from.is_bot &&
      typeof query.id === 'string' &&
      query.id.length > 0 &&
      query.id.length <= 128 &&
      typeof query.query === 'string' &&
      query.query.length <= 256,
    );
  }

  private isValidPollCallback(callback: TelegramCallbackQuery) {
    const hasInlineMessage =
      typeof callback.inline_message_id === 'string' &&
      callback.inline_message_id.length > 0 &&
      callback.inline_message_id.length <= 256;
    const message = callback.message;
    const hasChatMessage = Boolean(
      message &&
      Number.isSafeInteger(message.chat?.id) &&
      message.chat.id !== 0 &&
      Number.isSafeInteger(message.message_id) &&
      message.message_id >= 0,
    );
    return Boolean(
      Number.isSafeInteger(callback.from?.id) &&
      callback.from.id > 0 &&
      !callback.from.is_bot &&
      typeof callback.id === 'string' &&
      callback.id.length > 0 &&
      callback.id.length <= 128 &&
      (hasInlineMessage || hasChatMessage),
    );
  }

  private async cleanupOldState() {
    const cutoff = new Date(Date.now() - RETAIN_BOT_STATE_MS);
    await this.prisma.$transaction([
      this.prisma.telegramBotUpdate.deleteMany({
        where: { receivedAt: { lt: cutoff } },
      }),
      this.prisma.telegramBotPendingExpense.deleteMany({
        where: { expiresAt: { lt: cutoff } },
      }),
    ]);
  }
}
