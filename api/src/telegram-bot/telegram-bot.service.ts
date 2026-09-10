import {
  BadRequestException,
  GoneException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
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
  type ParsedTelegramExpense,
  TelegramExpenseParseError,
} from './telegram-expense-parser';
import {
  TelegramAssistantAiProcessingError,
  TelegramAssistantAiService,
  TelegramAssistantAiUnavailableError,
} from './telegram-assistant-ai.service';
import { TelegramBotClient } from './telegram-bot.client';
import type {
  TelegramCallbackQuery,
  TelegramInlineQuery,
  TelegramInlineKeyboard,
  TelegramMessage,
  TelegramUpdate,
  TelegramUser,
  TelegramChat,
} from './telegram-bot.types';
import { buildTelegramTodaySummary } from './telegram-today-summary';
import {
  buildMemberQrDirectory,
  type ObservedQrMember,
} from './telegram-member-qr';
import {
  buildTelegramPollKeyboard,
  buildTelegramPollMessage,
  buildTelegramPollUpdates,
  type TelegramVotingMember,
  type TelegramVotingPoll,
} from './telegram-vote';
import {
  buildTelegramSplitKeyboard,
  buildTelegramSplitMessage,
  parseTelegramSplit,
  TelegramSplitParseError,
} from './telegram-group-split';
import {
  buildRecentExpenses,
  buildSpendingAnswer,
  parseSpendingQuestion,
  spendingDateRange,
  type SpendingQuestion,
} from './telegram-spending-query';

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
    telegramNotificationsEnabled: boolean;
    telegramBudgetAlertsEnabled: boolean;
    telegramWeeklyDigestEnabled: boolean;
    telegramWeeklyDigestHour: number;
    expenseProfile: { currency: ExpenseCurrency } | null;
  };
}

@Injectable()
export class TelegramBotService {
  private readonly logger = new Logger(TelegramBotService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly bot: TelegramBotClient,
    private readonly moments: MomentsService,
    private readonly ai: TelegramAssistantAiService,
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
      await this.observeGroupMembers(update);
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
    const command =
      typeof message.text === 'string' ? this.readCommand(message.text) : null;
    if (this.isGroupMessage(message)) {
      if (message.text?.trim().toLowerCase() === 'khqr' || command === 'khqr') {
        await this.sendMemberQrMenu(message.chat.id);
      } else if (command === 'joinvote') {
        await this.bot.sendMessage(
          message.chat.id,
          'You are registered for voting reminders in this group.',
        );
      } else if (
        ['dailyvote', 'votetime', 'voteduration', 'stopdailyvote'].includes(
          command ?? '',
        )
      ) {
        await this.handleGroupVoteCommand(message, command!);
      } else if (command === 'split') {
        await this.handleGroupSplitCommand(message);
      } else if (command) {
        await this.sendMemberQr(message, command);
      }
      return;
    }
    if (!this.isPrivateMessage(message)) return;

    const telegramUserId = String(message.from.id);
    const linked = await this.findLinkedUser(telegramUserId);

    if (command === 'start' || command === 'help' || command === 'menu') {
      await this.ensurePersistentMenu(message.chat.id);
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
    if (command === 'recent') {
      await this.sendRecentExpenses(message.chat.id, linked);
      return;
    }
    if (command === 'vote') {
      await this.sendVotingMoments(message.chat.id, linked.user.id);
      return;
    }
    if (command === 'alerts' || command === 'weekly') {
      await this.handleNotificationCommand(message, linked, command);
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
    const spendingQuestion = parseSpendingQuestion(message.text ?? '');
    if (spendingQuestion) {
      await this.sendSpendingAnswer(message.chat.id, linked, spendingQuestion);
      return;
    }
    if (command) {
      await this.bot.sendMessage(
        message.chat.id,
        'Unknown command. Use /today, /recent, /spend, /vote, or send an ' +
          'expense such as “Lunch 4.50”.',
        this.mainMenuKeyboard(),
      );
      return;
    }

    if (message.voice) {
      await this.prepareVoiceExpense(message, linked);
      return;
    }
    if (message.photo?.length) {
      await this.prepareReceiptExpense(message, linked);
      return;
    }
    if (typeof message.text === 'string') {
      await this.prepareExpense(message, linked);
    }
  }

  private async sendMemberQr(message: TelegramMessage, command: string) {
    // Member names can only select PNGs in the public KHQR folder, never paths
    // or arbitrary URLs. Existing group commands take priority over filenames.
    if (!/^[a-z0-9_]{1,32}$/.test(command)) return;
    if (
      !/^\/[a-z0-9_]{1,32}(?:@[a-z0-9_]+)?$/i.test(message.text?.trim() ?? '')
    ) {
      return;
    }
    await this.sendMemberQrPhoto(message.chat.id, command, command);
  }

  private async memberQrDirectory(chatId: number) {
    const members = await this.prisma.$queryRaw<ObservedQrMember[]>`
      SELECT telegram_user_id AS "telegramUserId", display_name AS "displayName",
        is_active AS "isActive"
      FROM telegram_group_members
      WHERE telegram_chat_id = ${BigInt(chatId)}
      ORDER BY display_name, telegram_user_id
    `;
    return buildMemberQrDirectory(members);
  }

  private async sendMemberQrMenu(chatId: number) {
    const members = await this.memberQrDirectory(chatId);
    // Keep each keyboard bounded while still listing larger observed rosters.
    for (let index = 0; index < members.length; index += 40) {
      const rows: TelegramInlineKeyboard['inline_keyboard'] = [];
      const page = members.slice(index, index + 40);
      for (let offset = 0; offset < page.length; offset += 2) {
        rows.push(
          page.slice(offset, offset + 2).map((member) => ({
            text: member.displayName,
            callback_data: `khqr:member:${member.key}`,
          })),
        );
      }
      await this.bot.sendMessage(chatId, 'KHQR · Choose a member', {
        inline_keyboard: rows,
      });
    }
    if (!members.length) {
      await this.bot.sendMessage(chatId, 'No KHQR members available yet.');
    }
  }

  private async handleMemberQrCallback(callback: TelegramCallbackQuery) {
    const message = callback.message;
    if (
      !this.isValidPollCallback(callback) ||
      !message ||
      !['group', 'supergroup'].includes(message.chat.type)
    )
      return;
    const match = /^khqr:member:([a-z0-9_]{1,32})$/.exec(callback.data ?? '');
    if (!match) return;
    // Re-resolve the selection against this group's roster, never a user-supplied path.
    const member = (await this.memberQrDirectory(message.chat.id)).find(
      (candidate) => candidate.key === match[1],
    );
    if (!member) {
      await this.bot.answerCallback(
        callback.id,
        'Member unavailable. Send KHQR again.',
      );
      return;
    }
    await this.bot.answerCallback(callback.id);
    const sent = await this.sendMemberQrPhoto(
      message.chat.id,
      member.imageName,
      member.displayName,
      true,
    );
    if (!sent) return;
    try {
      await this.bot.deleteMessages(message.chat.id, [message.message_id]);
    } catch {
      // Menu cleanup must not retry a successful QR delivery and send duplicates.
      this.logger.warn('A delivered KHQR menu could not be removed');
    }
  }

  private async sendMemberQrPhoto(
    chatId: number,
    imageName: string | null,
    displayName: string,
    reportMissing = false,
  ) {
    const unavailable = async () => {
      if (reportMissing) {
        await this.bot.sendMessage(
          chatId,
          `${displayName}: No KHQR available yet.`,
        );
      }
    };
    if (!imageName || !/^[a-z0-9_]{1,32}$/.test(imageName)) {
      await unavailable();
      return;
    }
    const photoUrl = this.appUrl(`/images/khqr/${imageName}.png`);
    let response: Response;
    try {
      // The frontend owns public assets; the separately deployed API need not
      // contain a copy or a hard-coded roster when another member is added.
      response = await fetch(photoUrl, {
        method: 'HEAD',
        redirect: 'manual',
        signal: AbortSignal.timeout(5_000),
      });
    } catch {
      throw new ServiceUnavailableException('Member QR lookup failed');
    }
    if (response.status === 404) {
      await unavailable();
      return;
    }
    if (!response.ok) {
      throw new ServiceUnavailableException('Member QR lookup failed');
    }
    // Ignore unknown commands even when the website returns an HTML fallback.
    if (
      response.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() !==
      'image/png'
    ) {
      await unavailable();
      return;
    }
    const sent = await this.bot.sendPhoto(
      chatId,
      photoUrl,
      `${displayName} · KHQR`,
    );
    const sentAt = new Date(sent.date ? sent.date * 1_000 : Date.now());
    const deleteAfter = new Date(sentAt.getTime() + 24 * 60 * 60_000);
    try {
      // Persist the deadline instead of a day-long timer so restarts do not
      // leave QR messages behind. Only the bot's photo is scheduled for removal.
      await this.prisma.$executeRaw`
        INSERT INTO telegram_member_qr_messages (
          telegram_chat_id, message_id, sent_at, delete_after, next_attempt_at
        ) VALUES (
          ${BigInt(chatId)}, ${sent.message_id}, ${sentAt},
          ${deleteAfter}, ${deleteAfter}
        )
        ON CONFLICT (telegram_chat_id, message_id) DO NOTHING
      `;
    } catch (error) {
      // Compensate when tracking fails before allowing a webhook retry to send
      // another QR. A process crash between Telegram and the DB is not atomic.
      try {
        await this.bot.deleteMessages(chatId, [sent.message_id]);
      } catch {
        this.logger.warn('An untracked member QR could not be removed');
      }
      throw error;
    }
    return true;
  }

  private async handleCallback(callback: TelegramCallbackQuery) {
    const data = typeof callback.data === 'string' ? callback.data : '';
    if (!data || data.length > 64) return;
    if (data.startsWith('khqr:member:')) {
      await this.handleMemberQrCallback(callback);
      return;
    }
    if (data.startsWith('poll:join:') || data.startsWith('poll:leave:')) {
      await this.handlePollParticipation(callback, data);
      return;
    }
    if (data.startsWith('poll:vote:') || data.startsWith('poll:cast:')) {
      await this.handlePollVote(callback, data);
      return;
    }
    if (data.startsWith('poll:daily:')) {
      await this.handleDailyVoteSchedule(callback, data);
      return;
    }
    if (data.startsWith('split:toggle:')) {
      await this.handleGroupSplitToggle(callback, data);
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
    if (data === 'menu:recent' || data === 'recent:list') {
      await this.bot.answerCallback(callback.id);
      await this.sendRecentExpenses(message.chat.id, linked);
      return;
    }
    if (data === 'menu:ask') {
      await this.bot.answerCallback(callback.id);
      await this.bot.sendMessage(
        message.chat.id,
        'Ask a spending question, for example:\n• How much did I spend this week?\n' +
          '• How much did I spend on Food this month?\n• /spend Coffee week',
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
    if (data.startsWith('settings:')) {
      await this.handleNotificationCallback(callback, linked, data);
      return;
    }
    if (data.startsWith('recent:')) {
      await this.handleRecentExpenseCallback(callback, linked, data);
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

  private async handlePollParticipation(
    callback: TelegramCallbackQuery,
    data: string,
  ) {
    const match = /^poll:(join|leave):([0-9a-f-]+)$/i.exec(data);
    const message = callback.message;
    if (
      !match ||
      !UUID_PATTERN.test(match[2]) ||
      !message ||
      !this.isGroupCallback(callback, message)
    )
      return;
    try {
      await this.moments.setTelegramRoundParticipation(
        match[2],
        message.chat.id,
        String(callback.from.id),
        this.telegramDisplayName(callback.from),
        match[1] === 'join',
      );
      await this.bot.answerCallback(
        callback.id,
        match[1] === 'join'
          ? 'Joined. You will share the bill equally.'
          : 'You are not joining and will not be included in the split.',
      );
    } catch (error) {
      if (
        error instanceof GoneException ||
        error instanceof NotFoundException
      ) {
        await this.bot.answerCallback(
          callback.id,
          'This voting round has closed.',
        );
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
      !['vote', 'cast'].includes(action) ||
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
      const round =
        action === 'cast'
          ? await this.moments.getTelegramVoteRound(momentId)
          : null;
      if (
        round &&
        callback.message &&
        round.telegramChatId !== BigInt(callback.message.chat.id)
      ) {
        throw new BadRequestException('This poll belongs to another group.');
      }
      const poll = await this.moments.respondToTelegramVote(
        round?.momentId ?? momentId,
        optionId,
        {
          telegramUserId,
          linkedUserId: linked?.user.id,
          displayName,
        },
        ...(round ? [round.id] : []),
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
        if (['group', 'supergroup'].includes(callback.message.chat.type)) {
          const chatId = callback.message.chat.id;
          const pending = await this.pendingGroupVoters(chatId, poll);
          let mainMessage = true;
          for (const message of buildTelegramPollUpdates(poll, pending)) {
            const sent = await this.bot.sendMessage(
              chatId,
              message.text,
              keyboard,
              message.entities,
            );
            if (mainMessage && poll.roundId) {
              await this.prisma
                .$executeRaw`UPDATE moment_vote_rounds SET message_id = ${sent.message_id}
                WHERE id = ${poll.roundId}::uuid`;
            }
            mainMessage = false;
          }
          // Keep the original until every replacement message has been delivered.
          try {
            await this.bot.deleteMessage(chatId, callback.message.message_id);
          } catch {
            // Old or already-deleted messages must not trigger a webhook retry
            // that would repost the successfully delivered vote update again.
          }
        }
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

  private async observeGroupMembers(update: TelegramUpdate) {
    const membership = update.chat_member;
    if (membership?.new_chat_member) {
      const member = membership.new_chat_member;
      const active =
        ['creator', 'administrator', 'member'].includes(member.status) ||
        (member.status === 'restricted' && member.is_member === true);
      if (
        [
          'creator',
          'administrator',
          'member',
          'restricted',
          'left',
          'kicked',
        ].includes(member.status)
      ) {
        await this.observeGroupMember(
          membership.chat,
          member.user,
          active,
          membership.date,
        );
      }
    }
    const message = update.message;
    if (message) {
      if (message.from)
        await this.observeGroupMember(
          message.chat,
          message.from,
          true,
          message.date,
        );
      for (const member of message.new_chat_members ?? []) {
        await this.observeGroupMember(message.chat, member, true, message.date);
      }
      if (message.left_chat_member) {
        await this.observeGroupMember(
          message.chat,
          message.left_chat_member,
          false,
          message.date,
        );
      }
    }
    const callback = update.callback_query;
    if (callback?.message && this.isValidPollCallback(callback)) {
      // A callback's message date is the poll's age, not the member's interaction time.
      await this.observeGroupMember(callback.message.chat, callback.from, true);
    }
  }

  private async observeGroupMember(
    chat: TelegramChat,
    user: TelegramUser,
    active: boolean,
    date?: number,
  ) {
    if (
      !chat ||
      !['group', 'supergroup'].includes(chat.type) ||
      !Number.isSafeInteger(chat.id) ||
      chat.id === 0 ||
      !user ||
      user.is_bot ||
      !Number.isSafeInteger(user.id) ||
      user.id <= 0
    )
      return;
    const observedAt =
      Number.isSafeInteger(date) && date! > 0
        ? new Date(date! * 1_000)
        : new Date();
    if (!Number.isFinite(observedAt.getTime())) return;
    const displayName = this.telegramDisplayName(user);
    // Ignore older deliveries so an out-of-order join cannot undo a later departure.
    await this.prisma.$executeRaw`
      INSERT INTO telegram_group_members
        (telegram_chat_id, telegram_user_id, display_name, is_active, observed_at)
      VALUES (${BigInt(chat.id)}, ${String(user.id)}, ${displayName}, ${active}, ${observedAt})
      ON CONFLICT (telegram_chat_id, telegram_user_id) DO UPDATE
        SET display_name = EXCLUDED.display_name, is_active = EXCLUDED.is_active,
            observed_at = EXCLUDED.observed_at
        WHERE telegram_group_members.observed_at <= EXCLUDED.observed_at
    `;
  }

  private async pendingGroupVoters(chatId: number, poll: TelegramVotingPoll) {
    if (poll.identityMode === 'ANONYMOUS') return [];
    const members = await this.prisma.$queryRaw<TelegramVotingMember[]>`
      SELECT telegram_user_id AS "telegramUserId", display_name AS "displayName"
      FROM telegram_group_members
      WHERE telegram_chat_id = ${BigInt(chatId)} AND is_active = TRUE
      ORDER BY telegram_user_id
    `;
    if (!members.length) return [];
    const accounts =
      poll.identityMode === 'LOGIN_REQUIRED'
        ? await this.prisma.socialAccount.findMany({
            where: {
              provider: AuthProvider.TELEGRAM,
              providerUserId: {
                in: members.map((member) => member.telegramUserId),
              },
              user: { isActive: true },
            },
            select: { providerUserId: true, userId: true },
          })
        : [];
    const accountIds = new Map(
      accounts.map((account) => [account.providerUserId, account.userId]),
    );
    // Match the same identity and date used by MomentsService, including votes cast on the web.
    const candidates = members.map((member) => ({
      member,
      responseKey: createHash('sha256')
        .update(
          poll.identityMode === 'LOGIN_REQUIRED'
            ? `account:${accountIds.get(member.telegramUserId) ?? ''}`
            : `telegram:${member.telegramUserId}`,
        )
        .digest('hex'),
    }));
    const votes = await this.prisma.momentVote.findMany({
      where: {
        momentId: poll.id,
        voteDate: new Date(`${poll.voteDate ?? '1970-01-01'}T00:00:00.000Z`),
        responseKey: {
          in: candidates.map((candidate) => candidate.responseKey),
        },
      },
      select: { responseKey: true },
    });
    const voted = new Set(votes.map((vote) => vote.responseKey));
    return candidates
      .filter((candidate) => !voted.has(candidate.responseKey))
      .map((candidate) => candidate.member);
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

    if (command === 'voteduration') {
      const match = /^\/voteduration(?:@[A-Za-z0-9_]+)?\s+(\d{1,4})\s*$/.exec(
        message.text ?? '',
      );
      try {
        await this.moments.updateDailyTelegramVoteDuration(
          linked.user.id,
          message.chat.id,
          match ? Number(match[1]) : 0,
        );
        await this.bot.sendMessage(
          message.chat.id,
          `New voting rounds will last ${Number(match![1])} minutes. The current deadline stays unchanged.`,
        );
      } catch (error) {
        if (
          error instanceof BadRequestException ||
          error instanceof NotFoundException
        ) {
          await this.bot.sendMessage(message.chat.id, error.message);
          return;
        }
        throw error;
      }
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

  private async handleGroupSplitCommand(
    message: TelegramMessage & { from: NonNullable<TelegramMessage['from']> },
  ) {
    const linked = await this.findLinkedUser(String(message.from.id));
    if (!linked) {
      await this.bot.sendMessage(
        message.chat.id,
        'Connect this Telegram account to ChlatWork before creating a split.',
      );
      return;
    }

    try {
      const currency =
        linked.user.expenseProfile?.currency ?? ExpenseCurrency.USD;
      const replyId = message.reply_to_message?.message_id;
      const [round] = replyId
        ? await this.prisma.$queryRaw<
            Array<{ id: string; closesAt: Date; creatorId: string }>
          >`
        SELECT round.id::text, round.closes_at AS "closesAt", moment.creator_id::text AS "creatorId"
        FROM moment_vote_rounds round JOIN moments moment ON moment.id = round.moment_id
        WHERE round.telegram_chat_id = ${BigInt(message.chat.id)} AND round.message_id = ${replyId}
      `
        : [];
      if (replyId && !round)
        throw new TelegramSplitParseError('Reply to the final voting results.');
      if (round && round.closesAt.getTime() > Date.now())
        throw new TelegramSplitParseError(
          'Wait until voting closes before splitting the bill.',
        );
      if (round && round.creatorId !== linked.user.id)
        throw new TelegramSplitParseError(
          'Only the poll owner can set the final bill total.',
        );
      const joined = round
        ? await this.moments.getFinalTelegramRoundParticipants(round.id)
        : undefined;
      const parsed = parseTelegramSplit(message.text ?? '', currency, joined);
      const split = await this.prisma.$transaction(async (tx) => {
        if (round) {
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${round.id}))`;
          const [existing] = await tx.$queryRaw<Array<{ id: string }>>`
            SELECT id::text FROM telegram_group_splits WHERE vote_round_id = ${round.id}::uuid
          `;
          // Webhook retries reuse the confirmed bill instead of creating another debt list.
          if (existing) {
            const saved = await tx.telegramGroupSplit.findUniqueOrThrow({
              where: { id: existing.id },
              include: { participants: { orderBy: { position: 'asc' } } },
            });
            if (
              saved.total.toString() !==
                new Prisma.Decimal(parsed.total).toString() ||
              saved.currency !== parsed.currency
            ) {
              throw new TelegramSplitParseError(
                'This round already has a bill. The existing amounts have not changed.',
              );
            }
            return saved;
          }
        }
        const created = await tx.telegramGroupSplit.create({
          data: {
            creatorUserId: linked.user.id,
            telegramChatId: BigInt(message.chat.id),
            total: new Prisma.Decimal(parsed.total),
            currency: parsed.currency,
            participants: {
              create: parsed.participants.map((participant) => ({
                position: participant.position,
                name: participant.name,
                amount: new Prisma.Decimal(participant.amount),
                telegramUserId: participant.telegramUserId,
              })),
            },
          },
          include: { participants: { orderBy: { position: 'asc' } } },
        });
        if (round)
          await tx.$executeRaw`UPDATE telegram_group_splits SET vote_round_id = ${round.id}::uuid WHERE id = ${created.id}::uuid`;
        return created;
      });
      await this.bot.sendMessage(
        message.chat.id,
        buildTelegramSplitMessage(split),
        buildTelegramSplitKeyboard(split),
      );
    } catch (error) {
      const guidance =
        error instanceof TelegramSplitParseError
          ? error.message
          : 'The split could not be created.';
      await this.bot.sendMessage(
        message.chat.id,
        `${guidance}\n\nExample: /split 60 Alice, Bob, Carol`,
      );
    }
  }

  private async handleGroupSplitToggle(
    callback: TelegramCallbackQuery,
    data: string,
  ) {
    const participantId = data.slice('split:toggle:'.length);
    const message = callback.message;
    if (
      !UUID_PATTERN.test(participantId) ||
      !message ||
      !this.isGroupCallback(callback, message)
    ) {
      await this.bot.answerCallback(
        callback.id,
        'This split action is invalid.',
      );
      return;
    }

    const telegramUserId = String(callback.from.id);
    const displayName = this.telegramDisplayName(callback.from);
    const result = await this.prisma.$transaction(async (tx) => {
      const located = await tx.telegramGroupSplitParticipant.findUnique({
        where: { id: participantId },
        include: { split: true },
      });
      if (
        !located ||
        located.split.telegramChatId !== BigInt(message.chat.id) ||
        located.split.status !== 'OPEN'
      ) {
        return { state: 'missing' as const };
      }
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${located.splitId}))`;
      // Re-read after the lock because another button click may have changed this participant.
      const current = await tx.telegramGroupSplitParticipant.findUnique({
        where: { id: participantId },
        include: { split: true },
      });
      if (!current || current.split.status !== 'OPEN') {
        return { state: 'missing' as const };
      }

      if (current.telegramUserId && current.telegramUserId !== telegramUserId) {
        return { state: 'claimed' as const };
      }
      if (!current.telegramUserId) {
        const other = await tx.telegramGroupSplitParticipant.findFirst({
          where: { splitId: current.splitId, telegramUserId },
          select: { id: true },
        });
        if (other) return { state: 'other' as const };
      }

      await tx.telegramGroupSplitParticipant.update({
        where: { id: participantId },
        data: current.paidAt
          ? { paidAt: null }
          : {
              telegramUserId,
              telegramDisplayName: displayName,
              paidAt: new Date(),
            },
      });
      const split = await tx.telegramGroupSplit.findUnique({
        where: { id: current.splitId },
        include: { participants: { orderBy: { position: 'asc' } } },
      });
      return split
        ? {
            state: current.paidAt ? ('unpaid' as const) : ('paid' as const),
            split,
          }
        : { state: 'missing' as const };
    });

    if (result.state === 'missing') {
      await this.bot.answerCallback(callback.id, 'This split is unavailable.');
      return;
    }
    if (result.state === 'claimed') {
      await this.bot.answerCallback(
        callback.id,
        'Someone else already marked this name.',
      );
      return;
    }
    if (result.state === 'other') {
      await this.bot.answerCallback(
        callback.id,
        'You are already marked under another name.',
      );
      return;
    }

    await this.bot.answerCallback(
      callback.id,
      result.state === 'paid' ? 'Marked as paid.' : 'Payment mark removed.',
    );
    await this.bot.editMessage(
      message.chat.id,
      message.message_id,
      buildTelegramSplitMessage(result.split),
      buildTelegramSplitKeyboard(result.split),
    );
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
          'Voting lasts 30 minutes. Use /voteduration 30 to change future rounds.\n' +
          'Use /votetime HH:MM to change it or /stopdailyvote to stop.\n' +
          'Members can send /joinvote to register for voting reminders.',
      );
      const sent = await this.bot.sendMessage(
        message.chat.id,
        buildTelegramPollMessage(poll),
        buildTelegramPollKeyboard(poll, this.appUrl(`/m/${poll.slug}`)),
      );
      if (poll.roundId) {
        await this.prisma
          .$executeRaw`UPDATE moment_vote_rounds SET message_id = ${sent.message_id}
          WHERE id = ${poll.roundId}::uuid`;
      }
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

    await this.prepareParsedExpense(message, linked, parsed);
  }

  private async prepareVoiceExpense(
    message: TelegramMessage,
    linked: LinkedTelegramUser,
  ) {
    const voice = message.voice;
    if (!voice) return;
    if (voice.duration > 60 || (voice.file_size ?? 0) > 10 * 1024 * 1024) {
      await this.bot.sendMessage(
        message.chat.id,
        'Voice expenses must be 60 seconds or shorter and under 10 MB.',
      );
      return;
    }

    try {
      await this.bot.sendChatAction(message.chat.id, 'typing');
      const bytes = await this.bot.downloadFile(
        voice.file_id,
        10 * 1024 * 1024,
      );
      const transcript = await this.ai.transcribeVoice(
        bytes,
        voice.mime_type ?? 'audio/ogg',
      );
      await this.bot.sendMessage(
        message.chat.id,
        `🎙 I heard: “${transcript}”\nI will still ask before saving.`,
      );
      await this.prepareExpense({ ...message, text: transcript }, linked);
    } catch (error) {
      await this.sendAiExpenseError(message.chat.id, error, 'voice message');
    }
  }

  private async prepareReceiptExpense(
    message: TelegramMessage,
    linked: LinkedTelegramUser,
  ) {
    const photo = [...(message.photo ?? [])].sort(
      (left, right) => right.width * right.height - left.width * left.height,
    )[0];
    if (!photo) return;
    if ((photo.file_size ?? 0) > 10 * 1024 * 1024) {
      await this.bot.sendMessage(
        message.chat.id,
        'Receipt photos must be under 10 MB.',
      );
      return;
    }

    try {
      await this.bot.sendChatAction(message.chat.id, 'upload_photo');
      const bytes = await this.bot.downloadFile(
        photo.file_id,
        10 * 1024 * 1024,
      );
      const currency =
        linked.user.expenseProfile?.currency ?? ExpenseCurrency.USD;
      const extracted = await this.ai.extractReceipt(
        bytes,
        'image/jpeg',
        currency,
      );
      await this.bot.sendMessage(
        message.chat.id,
        `🧾 Receipt details extracted (${extracted.confidence}% confidence). ` +
          'Check them carefully before saving.',
      );
      await this.prepareParsedExpense(message, linked, extracted.expense, {
        entryDate: extracted.entryDate,
        heading: 'Confirm receipt expense?',
      });
    } catch (error) {
      await this.sendAiExpenseError(message.chat.id, error, 'receipt');
    }
  }

  private async sendAiExpenseError(
    chatId: number,
    error: unknown,
    source: string,
  ) {
    const message =
      error instanceof TelegramAssistantAiUnavailableError
        ? 'Voice and receipt capture are not configured yet.'
        : error instanceof TelegramAssistantAiProcessingError
          ? error.message
          : `I could not process that ${source}.`;
    await this.bot.sendMessage(
      chatId,
      `${message}\n\nYou can still send text like “Lunch 4.50”.`,
    );
  }

  private async prepareParsedExpense(
    message: TelegramMessage,
    linked: LinkedTelegramUser,
    parsed: ParsedTelegramExpense,
    options: { entryDate?: string; heading?: string } = {},
  ) {
    const localDate = this.localDate(linked.user.telegramNotificationTimeZone);
    const telegramUserId = String(message.from?.id);
    const conversation =
      await this.prisma.telegramBotConversationState.findFirst({
        where: {
          telegramUserId,
          userId: linked.user.id,
          chatId: BigInt(message.chat.id),
          expiresAt: { gt: new Date() },
        },
      });
    const editTarget = conversation
      ? await this.prisma.expenseEntry.findFirst({
          where: {
            id: conversation.editTargetExpenseEntryId,
            userId: linked.user.id,
            type: ExpenseEntryType.EXPENSE,
          },
          select: { id: true },
        })
      : null;
    const requestedDate = options.entryDate;
    const entryDate =
      requestedDate && this.isSafeExpenseDate(requestedDate, localDate)
        ? requestedDate
        : localDate;

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
        entryDate: new Date(`${entryDate}T00:00:00.000Z`),
        editTargetExpenseEntryId: editTarget?.id,
        expiresAt: new Date(Date.now() + PENDING_EXPENSE_LIFETIME_MS),
      },
      update: {},
    });
    if (conversation) {
      await this.prisma.telegramBotConversationState.deleteMany({
        where: { telegramUserId, userId: linked.user.id },
      });
    }

    await this.bot.sendMessage(
      message.chat.id,
      this.pendingExpenseText(
        pending,
        pending.editTargetExpenseEntryId
          ? 'Confirm expense update?'
          : (options.heading ?? 'Confirm expense?'),
      ),
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
      if (pending.editTargetExpenseEntryId) {
        const updated = await tx.expenseEntry.updateMany({
          where: {
            id: pending.editTargetExpenseEntryId,
            userId: linked.user.id,
            type: ExpenseEntryType.EXPENSE,
          },
          data: {
            entryDate: pending.entryDate,
            category: pending.category,
            customCategory: null,
            note: pending.note,
            showNote: Boolean(pending.note),
            amount: new Prisma.Decimal(pending.amountInput),
            amountInput: pending.amountInput,
          },
        });
        if (updated.count !== 1) {
          await tx.telegramBotPendingExpense.update({
            where: { id: pending.id },
            data: { status: TelegramBotPendingExpenseStatus.CANCELLED },
          });
          return { state: 'edit-target-missing' as const };
        }
        const saved = await tx.telegramBotPendingExpense.update({
          where: { id: pending.id },
          data: {
            status: TelegramBotPendingExpenseStatus.CONFIRMED,
            confirmedAt: new Date(),
          },
        });
        return { state: 'edited' as const, pending: saved };
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
      const edited = Boolean(result.pending.editTargetExpenseEntryId);
      await this.bot.answerCallback(
        callback.id,
        edited ? 'Already updated.' : 'Already saved.',
      );
      await this.bot.editMessage(
        callbackMessage.chat.id,
        callbackMessage.message_id,
        this.pendingExpenseText(
          result.pending,
          edited ? '✅ Expense updated' : '✅ Expense saved',
        ),
        {
          inline_keyboard: [
            ...(edited
              ? [[{ text: '🕘 Recent expenses', callback_data: 'recent:list' }]]
              : [
                  [
                    {
                      text: '↩️ Undo',
                      callback_data: `expense:undo:${pendingId}`,
                    },
                  ],
                ]),
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
    if (result.state === 'edited') {
      await this.bot.answerCallback(callback.id, 'Expense updated.');
      await this.bot.editMessage(
        callbackMessage.chat.id,
        callbackMessage.message_id,
        this.pendingExpenseText(result.pending, '✅ Expense updated'),
        {
          inline_keyboard: [
            [{ text: '🕘 Recent expenses', callback_data: 'recent:list' }],
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
      'edit-target-missing':
        'That expense no longer exists. Nothing was changed.',
    };
    await this.bot.answerCallback(callback.id, messages[result.state]);
  }

  private async editExpense(
    callback: TelegramCallbackQuery,
    linked: LinkedTelegramUser,
    pendingId: string,
  ) {
    const pending = await this.prisma.telegramBotPendingExpense.findFirst({
      where: {
        id: pendingId,
        telegramUserId: String(callback.from.id),
        userId: linked.user.id,
      },
      select: { editTargetExpenseEntryId: true },
    });
    const changed = await this.cancelPendingExpense(
      pendingId,
      String(callback.from.id),
      linked.user.id,
    );
    await this.bot.answerCallback(callback.id);
    if (!changed) return;

    const message = callback.message as TelegramMessage;
    if (pending?.editTargetExpenseEntryId) {
      await this.prisma.telegramBotConversationState.upsert({
        where: { telegramUserId: String(callback.from.id) },
        create: {
          telegramUserId: String(callback.from.id),
          userId: linked.user.id,
          chatId: BigInt(message.chat.id),
          editTargetExpenseEntryId: pending.editTargetExpenseEntryId,
          expiresAt: new Date(Date.now() + 10 * 60_000),
        },
        update: {
          editTargetExpenseEntryId: pending.editTargetExpenseEntryId,
          expiresAt: new Date(Date.now() + 10 * 60_000),
        },
      });
    }
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

  private async sendRecentExpenses(chatId: number, linked: LinkedTelegramUser) {
    const currency =
      linked.user.expenseProfile?.currency ?? ExpenseCurrency.USD;
    const entries = await this.prisma.expenseEntry.findMany({
      where: {
        userId: linked.user.id,
        type: ExpenseEntryType.EXPENSE,
        amount: { not: null },
      },
      orderBy: [{ entryDate: 'desc' }, { createdAt: 'desc' }],
      take: 5,
      select: {
        id: true,
        entryDate: true,
        category: true,
        customCategory: true,
        note: true,
        amount: true,
      },
    });
    const recent = buildRecentExpenses(entries, currency);
    await this.bot.sendMessage(chatId, recent.text, recent.keyboard);
  }

  private async handleRecentExpenseCallback(
    callback: TelegramCallbackQuery,
    linked: LinkedTelegramUser,
    data: string,
  ) {
    if (data === 'recent:cancel-edit') {
      await this.prisma.telegramBotConversationState.deleteMany({
        where: {
          telegramUserId: String(callback.from.id),
          userId: linked.user.id,
        },
      });
      await this.bot.answerCallback(callback.id, 'Edit cancelled.');
      await this.sendRecentExpenses(callback.message!.chat.id, linked);
      return;
    }
    const match = /^recent:(edit|delete|confirm-delete):([0-9a-f-]+)$/i.exec(
      data,
    );
    const message = callback.message as TelegramMessage;
    if (!match || !UUID_PATTERN.test(match[2])) {
      await this.bot.answerCallback(
        callback.id,
        'This expense action is invalid.',
      );
      return;
    }
    const action = match[1];
    const entry = await this.prisma.expenseEntry.findFirst({
      where: {
        id: match[2],
        userId: linked.user.id,
        type: ExpenseEntryType.EXPENSE,
      },
    });
    if (!entry) {
      await this.bot.answerCallback(
        callback.id,
        'That expense no longer exists.',
      );
      return;
    }

    if (action === 'edit') {
      await this.prisma.telegramBotConversationState.upsert({
        where: { telegramUserId: String(callback.from.id) },
        create: {
          telegramUserId: String(callback.from.id),
          userId: linked.user.id,
          chatId: BigInt(message.chat.id),
          editTargetExpenseEntryId: entry.id,
          expiresAt: new Date(Date.now() + 10 * 60_000),
        },
        update: {
          userId: linked.user.id,
          chatId: BigInt(message.chat.id),
          editTargetExpenseEntryId: entry.id,
          expiresAt: new Date(Date.now() + 10 * 60_000),
        },
      });
      await this.bot.answerCallback(callback.id);
      await this.bot.editMessage(
        message.chat.id,
        message.message_id,
        '✏️ Send the corrected expense within 10 minutes.\n\n' +
          'Text and voice both work. Example: “Lunch 4.50”',
        {
          inline_keyboard: [
            [{ text: 'Cancel edit', callback_data: 'recent:cancel-edit' }],
          ],
        },
      );
      return;
    }

    if (action === 'delete') {
      const currency =
        linked.user.expenseProfile?.currency ?? ExpenseCurrency.USD;
      await this.bot.answerCallback(callback.id);
      await this.bot.editMessage(
        message.chat.id,
        message.message_id,
        [
          'Delete this expense?',
          '',
          `Amount: ${formatTelegramExpenseAmount(
            entry.amountInput || entry.amount?.toString() || '0',
            currency,
          )}`,
          `Category: ${entry.category === '__custom__' ? entry.customCategory || 'Other' : entry.category}`,
          `Date: ${entry.entryDate?.toISOString().slice(0, 10) ?? '—'}`,
          '',
          'This cannot be undone.',
        ].join('\n'),
        {
          inline_keyboard: [
            [
              {
                text: '🗑 Delete',
                callback_data: `recent:confirm-delete:${entry.id}`,
              },
            ],
            [{ text: 'Keep it', callback_data: 'recent:list' }],
          ],
        },
      );
      return;
    }

    const deleted = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${linked.user.id}))`;
      return tx.expenseEntry.deleteMany({
        where: { id: entry.id, userId: linked.user.id },
      });
    });
    await this.bot.answerCallback(
      callback.id,
      deleted.count === 1
        ? 'Expense deleted.'
        : 'That expense no longer exists.',
    );
    if (deleted.count === 1) {
      await this.bot.editMessage(
        message.chat.id,
        message.message_id,
        '🗑 Expense deleted.',
        {
          inline_keyboard: [
            [{ text: '🕘 Recent expenses', callback_data: 'recent:list' }],
          ],
        },
      );
    }
  }

  private async sendSpendingAnswer(
    chatId: number,
    linked: LinkedTelegramUser,
    question: SpendingQuestion,
  ) {
    const localDate = this.localDate(linked.user.telegramNotificationTimeZone);
    const range = spendingDateRange(question.range, localDate);
    const entries = await this.prisma.expenseEntry.findMany({
      where: {
        userId: linked.user.id,
        type: ExpenseEntryType.EXPENSE,
        amount: { not: null },
        ...(range.startDate
          ? {
              entryDate: {
                gte: new Date(`${range.startDate}T00:00:00.000Z`),
                lte: new Date(`${range.endDate}T00:00:00.000Z`),
              },
            }
          : {}),
        ...(question.category
          ? {
              OR: [
                {
                  category: {
                    contains: question.category,
                    mode: 'insensitive',
                  },
                },
                {
                  customCategory: {
                    contains: question.category,
                    mode: 'insensitive',
                  },
                },
                { note: { contains: question.category, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: [{ entryDate: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        entryDate: true,
        category: true,
        customCategory: true,
        note: true,
        amount: true,
      },
    });
    await this.bot.sendMessage(
      chatId,
      buildSpendingAnswer(
        question,
        localDate,
        entries,
        linked.user.expenseProfile?.currency ?? ExpenseCurrency.USD,
      ),
      {
        inline_keyboard: [
          [{ text: '🕘 Recent expenses', callback_data: 'recent:list' }],
        ],
      },
    );
  }

  private async handleNotificationCommand(
    message: TelegramMessage,
    linked: LinkedTelegramUser,
    command: 'alerts' | 'weekly',
  ) {
    const args = (message.text ?? '').trim().split(/\s+/).slice(1);
    const enabled = args[0]?.toLowerCase();
    if (!['on', 'off'].includes(enabled ?? '')) {
      await this.sendNotificationSettings(message.chat.id, linked);
      return;
    }
    if (enabled === 'on' && !linked.user.telegramNotificationsEnabled) {
      await this.bot.sendMessage(
        message.chat.id,
        'Enable Telegram notifications from ChlatWork Account settings first.',
        {
          inline_keyboard: [
            [
              {
                text: '⚙️ Account settings',
                web_app: { url: this.appUrl('/account') },
              },
            ],
          ],
        },
      );
      return;
    }

    if (command === 'alerts') {
      await this.prisma.user.update({
        where: { id: linked.user.id },
        data: { telegramBudgetAlertsEnabled: enabled === 'on' },
      });
    } else {
      const requestedHour = args[1] === undefined ? 20 : Number(args[1]);
      if (
        !Number.isInteger(requestedHour) ||
        requestedHour < 0 ||
        requestedHour > 23
      ) {
        await this.bot.sendMessage(
          message.chat.id,
          'Use /weekly on 20 with an hour from 0-23.',
        );
        return;
      }
      await this.prisma.user.update({
        where: { id: linked.user.id },
        data: {
          telegramWeeklyDigestEnabled: enabled === 'on',
          ...(enabled === 'on'
            ? { telegramWeeklyDigestHour: requestedHour }
            : {}),
        },
      });
    }
    const refreshed = await this.findLinkedUser(String(message.from?.id));
    if (refreshed)
      await this.sendNotificationSettings(message.chat.id, refreshed);
  }

  private async handleNotificationCallback(
    callback: TelegramCallbackQuery,
    linked: LinkedTelegramUser,
    data: string,
  ) {
    if (data === 'settings:notifications') {
      await this.bot.answerCallback(callback.id);
      await this.sendNotificationSettings(callback.message!.chat.id, linked);
      return;
    }
    const match = /^settings:(alerts|weekly):(on|off)$/.exec(data);
    if (!match) {
      await this.bot.answerCallback(
        callback.id,
        'This setting is unavailable.',
      );
      return;
    }
    if (match[2] === 'on' && !linked.user.telegramNotificationsEnabled) {
      await this.bot.answerCallback(
        callback.id,
        'Enable Telegram notifications in Account first.',
      );
      return;
    }
    await this.prisma.user.update({
      where: { id: linked.user.id },
      data:
        match[1] === 'alerts'
          ? { telegramBudgetAlertsEnabled: match[2] === 'on' }
          : { telegramWeeklyDigestEnabled: match[2] === 'on' },
    });
    const refreshed = await this.findLinkedUser(String(callback.from.id));
    await this.bot.answerCallback(callback.id, 'Settings updated.');
    if (refreshed)
      await this.sendNotificationSettings(callback.message!.chat.id, refreshed);
  }

  private async sendNotificationSettings(
    chatId: number,
    linked: LinkedTelegramUser,
  ) {
    await this.bot.sendMessage(
      chatId,
      [
        '🔔 Bot notifications',
        '',
        `Delivery access: ${linked.user.telegramNotificationsEnabled ? 'Enabled' : 'Disabled in Account'}`,
        `Budget alerts: ${linked.user.telegramBudgetAlertsEnabled ? 'On' : 'Off'}`,
        `Weekly digest: ${linked.user.telegramWeeklyDigestEnabled ? `On · Sunday ${String(linked.user.telegramWeeklyDigestHour).padStart(2, '0')}:00` : 'Off'}`,
        `Timezone: ${linked.user.telegramNotificationTimeZone}`,
      ].join('\n'),
      {
        inline_keyboard: [
          [
            {
              text: linked.user.telegramBudgetAlertsEnabled
                ? 'Turn alerts off'
                : 'Turn alerts on',
              callback_data: `settings:alerts:${linked.user.telegramBudgetAlertsEnabled ? 'off' : 'on'}`,
            },
          ],
          [
            {
              text: linked.user.telegramWeeklyDigestEnabled
                ? 'Turn weekly off'
                : 'Turn weekly on',
              callback_data: `settings:weekly:${linked.user.telegramWeeklyDigestEnabled ? 'off' : 'on'}`,
            },
          ],
          [
            {
              text: '⚙️ Account settings',
              web_app: { url: this.appUrl('/account') },
            },
          ],
        ],
      },
    );
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
            'send a voice note or receipt photo, or ask about your spending. ' +
            'Expenses are never saved without your confirmation.'
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
        [
          { text: '🕘 Recent', callback_data: 'menu:recent' },
          { text: '💬 Ask spending', callback_data: 'menu:ask' },
        ],
        [this.openTrackerButton()],
        [{ text: '🗳 Share a vote', callback_data: 'poll:list' }],
        [
          {
            text: '🔔 Alerts & weekly',
            callback_data: 'settings:notifications',
          },
        ],
        [
          {
            text: '⚙️ Account settings',
            web_app: { url: this.appUrl('/account') },
          },
        ],
      ],
    };
  }

  private async ensurePersistentMenu(chatId: number) {
    try {
      await this.bot.setChatMenuButton(
        chatId,
        'Open ChlatWork',
        this.appUrl('/'),
      );
    } catch {
      // A temporary Bot API failure must not hide the normal /start response.
    }
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

  private isSafeExpenseDate(value: string, localDate: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value > localDate) return false;
    const date = new Date(`${value}T00:00:00.000Z`);
    return (
      !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
    );
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
              telegramNotificationsEnabled: true,
              telegramBudgetAlertsEnabled: true,
              telegramWeeklyDigestEnabled: true,
              telegramWeeklyDigestHour: true,
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
      this.prisma.telegramBotConversationState.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      }),
    ]);
  }
}
