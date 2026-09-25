import {
  BadRequestException,
  ConflictException,
  GoneException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
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
import { PersonalAssistantService } from '../personal-assistant/personal-assistant.service';
import { FeatureAvailabilityService } from '../feature-availability/feature-availability.service';
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
import { TelegramKlaKlokService } from './telegram-kla-klok.service';
import {
  buildKlaKlokBoardText,
  buildKlaKlokDealerKeyboard,
  buildKlaKlokDealerText,
  buildKlaKlokEndKeyboard,
  buildKlaKlokGroupKeyboard,
  buildKlaKlokRoundMessage,
  buildKlaKlokStakeKeyboard,
  callbackBelongsToUser,
  getKlaKlokSymbol,
  parseKlaKlokCallback,
  telegramUserToken,
} from './telegram-kla-klok';
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
  readMemberQrMention,
  type MemberQrMention,
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
const POLL_OPTION_PATTERN = /^option-\d{1,10}$/;
const MAX_MEMBER_USERNAME_LOOKUPS = 20;

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
    @Optional() private readonly personalAssistant?: PersonalAssistantService,
    @Optional() private readonly availability?: FeatureAvailabilityService,
    @Optional() private readonly klaKlok?: TelegramKlaKlokService,
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
      const disabled = await this.disabledUpdateFeature(update);
      if (disabled) {
        // Callback buttons and old Telegram messages remain clickable after an
        // admin switch, so the webhook checks each update before side effects.
        if (update.callback_query) {
          await this.bot.answerCallback(
            update.callback_query.id,
            'This feature is temporarily unavailable.',
          );
        } else if (update.inline_query) {
          await this.bot.answerInlineQuery(update.inline_query.id, []);
        } else if (update.message) {
          await this.bot.sendMessage(
            update.message.chat.id,
            'This feature is temporarily unavailable.',
          );
        }
      } else if (update.inline_query) {
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

  private async disabledUpdateFeature(update: TelegramUpdate) {
    if (!this.availability) return null;
    const feature = this.updateFeature(update);
    return feature && !(await this.availability.isEnabled(`telegram:${feature}`))
      ? feature
      : null;
  }

  private updateFeature(update: TelegramUpdate): string | null {
    const data = update.callback_query?.data ?? '';
    if (update.inline_query) return 'voting';
    if (data) {
      if (data.startsWith('kk:')) return 'kla-klok';
      if (data.startsWith('khqr:')) return 'khqr';
      if (data.startsWith('split:')) return 'bill-split';
      if (data.startsWith('rv:')) return 'group-voting';
      if (data.startsWith('poll:daily:')) return 'group-voting';
      if (data.startsWith('poll:')) return 'voting';
      if (data.startsWith('settings:')) return 'notifications';
      if (data.startsWith('summary:') || data === 'menu:ask')
        return 'spending';
      if (data === 'menu:recent' || data.startsWith('recent:'))
        return 'spending';
      if (data === 'menu:add' || data.startsWith('expense:')) return 'expenses';
      return null;
    }
    const message = update.message;
    if (!message) return null;
    const command =
      typeof message.text === 'string' ? this.readCommand(message.text) : null;
    if (this.isGroupMessage(message)) {
      if (command === 'klaklok') return 'kla-klok';
      if (command === 'split') return 'bill-split';
      if (
        ['joinvote', 'dailyvote', 'votetime', 'voteduration', 'resettodayvote', 'stopdailyvote']
          .includes(command ?? '')
      ) return 'group-voting';
      if (
        message.text?.trim().toLowerCase() === 'khqr' ||
        command === '$' ||
        readMemberQrMention(message) ||
        /^tg_[1-9][0-9]{0,15}$/.test(command ?? '')
      ) return 'khqr';
      return null;
    }
    if (command === 'phone' || command === 'skipphone' || message.contact)
      return 'phone';
    if (command === 'vote') return 'voting';
    if (command === 'alerts' || command === 'weekly')
      return 'notifications';
    if (
      command === 'today' ||
      command === 'recent' ||
      parseSpendingQuestion(message.text ?? '')
    ) return 'spending';
    if (command === 'cancel' || message.voice || message.photo?.length)
      return 'expenses';
    if (!command && message.text) {
      for (const currency of [ExpenseCurrency.USD, ExpenseCurrency.KHR]) {
        try {
          parseTelegramExpense(message.text, currency);
          return 'expenses';
        } catch (error) {
          if (!(error instanceof TelegramExpenseParseError)) throw error;
        }
      }
      return 'assistant';
    }
    return null;
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
      if (message.contact) return;
      if (command === 'phone') {
        await this.bot.sendMessage(
          message.chat.id,
          'To share your phone number, send /phone in a private chat with me.',
        );
        return;
      }
      if (command === 'help') {
        await this.sendHelp(message.chat.id, true);
        return;
      }
      const mention = readMemberQrMention(message);
      if (mention) {
        await this.sendMentionedMemberQr(message, mention);
      } else if (
        message.text?.trim().toLowerCase() === 'khqr' ||
        command === '$'
      ) {
        await this.sendMemberQrMenu(message.chat.id);
      } else if (command === 'joinvote') {
        await this.bot.sendMessage(
          message.chat.id,
          'Vote reminders enabled.',
        );
      } else if (
        ['dailyvote', 'votetime', 'voteduration', 'resettodayvote', 'stopdailyvote'].includes(
          command ?? '',
        )
      ) {
        await this.handleGroupVoteCommand(message, command!);
      } else if (command === 'split') {
        await this.handleGroupSplitCommand(message);
      } else if (command === 'klaklok') {
        await this.handleKlaKlokCommand(message);
      } else if (command) {
        await this.sendMemberQr(message, command);
      }
      return;
    }
    if (!this.isPrivateMessage(message)) return;
    if (command === 'skipphone') {
      await this.bot.sendMessage(
        message.chat.id,
        'Phone sharing skipped. You can share it later with /phone.',
        { remove_keyboard: true },
      );
      return;
    }
    if (command === 'help') {
      await this.sendHelp(message.chat.id, false);
      return;
    }

    const telegramUserId = String(message.from.id);
    const linked = await this.findLinkedUser(telegramUserId);

    if (command === 'start' || command === 'menu') {
      await this.ensurePersistentMenu(message.chat.id);
      await this.sendMenu(message.chat.id, Boolean(linked));
      return;
    }
    if (!linked) {
      await this.sendConnectAccount(message.chat.id);
      return;
    }
    if (message.contact) {
      await this.saveContactPhone(message, linked);
      return;
    }
    if (command === 'phone') {
      await this.requestPhone(message.chat.id);
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
        await this.availableMainMenuKeyboard(),
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
      try {
        parseTelegramExpense(
          message.text,
          linked.user.expenseProfile?.currency ?? ExpenseCurrency.USD,
        );
        await this.prepareExpense(message, linked);
        return;
      } catch (error) {
        if (!(error instanceof TelegramExpenseParseError)) throw error;
      }
      try {
        if (!this.personalAssistant) {
          await this.prepareExpense(message, linked);
          return;
        }
        const assistantReply = await this.personalAssistant.handleMessage(
          message.text,
          {
            userId: linked.user.id,
            telegramChatId: message.chat.id,
            timeZone:
              linked.user.telegramNotificationTimeZone || DEFAULT_TIME_ZONE,
          },
        );
        if (assistantReply.consumed) {
          await this.bot.sendMessage(
            message.chat.id,
            assistantReply.text ?? 'Done.',
          );
          return;
        }
      } catch (error) {
        if (error instanceof BadRequestException) {
          await this.bot.sendMessage(message.chat.id, String(error.message));
          return;
        }
        throw error;
      }
      await this.prepareExpense(message, linked);
    }
  }

  private requestPhone(chatId: number) {
    return this.bot.sendMessage(
      chatId,
      '📱 Optionally share your own Telegram phone number to save it to your ' +
        'linked ChlatWork account. Sharing replaces the phone number currently ' +
        'on your profile. Tap the button below, or /skipphone to skip.',
      {
        keyboard: [
          [{ text: '📱 Share Phone Number', request_contact: true }],
          [{ text: '/skipphone' }],
        ],
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    );
  }

  private async saveContactPhone(
    message: TelegramMessage & { from: TelegramUser },
    linked: LinkedTelegramUser,
  ) {
    const contact = message.contact;
    if (
      !contact ||
      !Number.isSafeInteger(contact.user_id) ||
      contact.user_id !== message.from.id
    ) {
      await this.bot.sendMessage(
        message.chat.id,
        'Please share your own phone number using the Share Phone Number button.',
      );
      await this.requestPhone(message.chat.id);
      return;
    }

    // Telegram may omit the leading +; never infer a country from local digits.
    const rawPhone = contact.phone_number;
    const phone = typeof rawPhone === 'string' ? rawPhone.trim() : '';
    if (!/^\+?[1-9]\d{6,14}$/.test(phone)) {
      await this.bot.sendMessage(
        message.chat.id,
        'That phone number could not be saved. Please try again with /phone.',
      );
      return;
    }

    let updated: { count: number };
    try {
      // A shared phone is profile data, never authority to merge accounts or
      // access expenses. Recheck the active Telegram link in the write itself.
      updated = await this.prisma.user.updateMany({
        where: {
          id: linked.user.id,
          isActive: true,
          socialAccounts: {
            some: {
              provider: AuthProvider.TELEGRAM,
              providerUserId: String(message.from.id),
            },
          },
        },
        data: { phone: phone.startsWith('+') ? phone : `+${phone}` },
      });
    } catch {
      // Prisma errors can include query arguments containing the phone number.
      throw new ServiceUnavailableException('Phone number could not be saved');
    }
    if (updated.count !== 1) {
      await this.sendConnectAccount(message.chat.id);
      return;
    }
    await this.bot.sendMessage(
      message.chat.id,
      'Your phone number has been saved to your ChlatWork profile.',
      { remove_keyboard: true },
    );
  }

  private async sendMentionedMemberQr(
    message: TelegramMessage,
    mention: MemberQrMention,
  ) {
    let userId: string;
    if ('username' in mention) {
      const matches = await this.prisma.$queryRaw<
        Array<{ telegramUserId: string }>
      >`
        SELECT telegram_user_id AS "telegramUserId" FROM telegram_group_members
        WHERE telegram_chat_id = ${BigInt(message.chat.id)} AND is_active = TRUE
          AND lower(username) = ${mention.username}
        LIMIT 2
      `;
      if (matches.length !== 1) {
        const refreshedUserId = await this.refreshMemberQrUsername(
          message.chat,
          mention.username,
        );
        if (!refreshedUserId) {
          await this.bot.sendMessage(
            message.chat.id,
            `Could not find @${mention.username} for KHQR. Choose their name below. If they are missing, ask them to send /$ in this group, then try again.`,
          );
          await this.sendMemberQrMenu(message.chat.id);
          return;
        }
        userId = refreshedUserId;
      } else {
        userId = matches[0].telegramUserId;
      }
    } else {
      userId = mention.userId;
    }
    const member = (await this.memberQrDirectory(message.chat.id)).find(
      (candidate) => candidate.key === `tg_${userId}`,
    );
    if (
      !member ||
      !/^[1-9][0-9]{0,15}$/.test(userId) ||
      !Number.isSafeInteger(Number(userId))
    ) {
      await this.bot.sendMessage(
        message.chat.id,
        'Member unavailable in this group. Choose a member using /$.',
      );
      return;
    }
    // Usernames can change owners. Confirm the current Telegram identity and
    // membership before selecting a payment image from a cached username.
    let current: Awaited<ReturnType<TelegramBotClient['getChatMember']>>;
    try {
      current = await this.bot.getChatMember(message.chat.id, Number(userId));
    } catch {
      await this.bot.sendMessage(
        message.chat.id,
        'Could not verify this member. Try again or choose their name using /$.',
      );
      return;
    }
    if (
      !current?.user ||
      current.user.id !== Number(userId) ||
      current.user.is_bot ||
      !(
        ['creator', 'administrator', 'member'].includes(current.status) ||
        (current.status === 'restricted' && current.is_member === true)
      ) ||
      ('username' in mention &&
        current.user.username?.toLowerCase() !== mention.username)
    ) {
      await this.bot.sendMessage(
        message.chat.id,
        'This mention no longer matches an active member. Choose their name using /$.',
      );
      return;
    }
    await this.sendMemberQrPhoto(
      message.chat.id,
      member.key,
      this.telegramDisplayName(current.user),
      true,
    );
  }

  private async refreshMemberQrUsername(chat: TelegramChat, username: string) {
    const members = await this.memberQrDirectory(chat.id);
    // Older roster entries can predate username tracking. Refresh only known
    // group identities, with bounded requests; larger rosters retain the menu.
    const candidates = members.slice(0, MAX_MEMBER_USERNAME_LOOKUPS);
    const verified = await Promise.all(
      candidates.map(async (member) => {
        const userId = member.key.slice(3);
        if (
          !/^[1-9][0-9]{0,15}$/.test(userId) ||
          !Number.isSafeInteger(Number(userId))
        )
          return null;
        try {
          const current = await this.bot.getChatMember(chat.id, Number(userId));
          if (
            current?.user?.id === Number(userId) &&
            !current.user.is_bot &&
            current.user.username?.toLowerCase() === username &&
            (['creator', 'administrator', 'member'].includes(current.status) ||
              (current.status === 'restricted' && current.is_member === true))
          )
            return current.user;
        } catch {
          // A failed lookup leaves the member picker available for this request.
        }
        return null;
      }),
    );
    const matches = verified.filter((user) => user !== null);
    if (matches.length !== 1) return null;
    await this.observeGroupMember(chat, matches[0], true);
    return String(matches[0].id);
  }

  private async sendMemberQr(message: TelegramMessage, command: string) {
    if (!/^tg_[1-9][0-9]{0,15}$/.test(command)) return;
    if (
      !/^\/[a-z0-9_]{1,32}(?:@[a-z0-9_]+)?$/i.test(message.text?.trim() ?? '')
    ) {
      return;
    }
    // Direct requests must use the same group membership check as menu buttons.
    const member = (await this.memberQrDirectory(message.chat.id)).find(
      (candidate) => candidate.key === command,
    );
    if (!member) return;
    await this.sendMemberQrPhoto(
      message.chat.id,
      member.key,
      member.displayName,
      true,
    );
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
      member.key,
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
    memberKey: string,
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
    if (!memberKey || !/^[a-z0-9_]{1,32}$/.test(memberKey)) {
      await unavailable();
      return;
    }
    // Only database uploads belong to this identity. Versioned URLs let
    // Telegram fetch a replacement instead of reusing a cached payment image.
    const [upload] = await this.prisma.$queryRaw<Array<{ version: string }>>`
      SELECT version FROM member_khqr_images WHERE member_key = ${memberKey}
    `;
    if (!upload?.version) {
      await unavailable();
      return;
    }
    const photoUrl = this.appUrl(
      `/api/member-khqr/${memberKey}?v=${upload.version}`,
    );
    let response: Response;
    try {
      // Verify the public image proxy is reachable before handing its URL to Telegram.
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
    // An HTML fallback is not a usable payment image.
    if (
      !['image/png', 'image/jpeg'].includes(
        response.headers
          .get('content-type')
          ?.split(';')[0]
          ?.trim()
          .toLowerCase() ?? '',
      )
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
    if (data.startsWith('kk:')) {
      await this.handleKlaKlokCallback(callback, data);
      return;
    }
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
    if (data.startsWith('pv:y:')) {
      await this.handlePollVote(callback, data);
      return;
    }
    if (data.startsWith('pv:n:')) {
      if (!this.isValidPollCallback(callback)) return;
      if (data.slice(5) !== BigInt(callback.from.id).toString(36)) {
        await this.bot.answerCallback(
          callback.id,
          'This confirmation belongs to another voter.',
        );
        return;
      }
      await this.bot.answerCallback(callback.id, 'Vote cancelled.');
      if (callback.message) {
        await this.bot
          .deleteMessage(callback.message.chat.id, callback.message.message_id)
          .catch(() => null);
      }
      return;
    }
    if (data.startsWith('poll:daily:')) {
      await this.handleDailyVoteSchedule(callback, data);
      return;
    }
    if (data.startsWith('rv:')) {
      await this.handleTodayVoteReset(callback, data);
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
          ? 'Joined · equal split.'
          : 'Not joining · no bill share.',
      );
    } catch (error) {
      if (
        error instanceof GoneException ||
        error instanceof NotFoundException
      ) {
        await this.bot.answerCallback(callback.id, 'Voting closed.');
        return;
      }
      throw error;
    }
  }

  private async handlePollVote(callback: TelegramCallbackQuery, data: string) {
    if (!this.isValidPollCallback(callback)) return;
    const confirmation = data.startsWith('pv:y:');
    const parts = data.split(':');
    const action = confirmation
      ? parts[2] === 'c'
        ? 'cast'
        : parts[2] === 'v'
          ? 'vote'
          : ''
      : parts[1];
    const momentId = confirmation
      ? parts[3]?.replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, '$1-$2-$3-$4-$5')
      : parts[2];
    const optionId = confirmation ? parts[4] : parts[3];
    if (
      (confirmation
        ? parts.length !== 6 || parts[5] !== BigInt(callback.from.id).toString(36)
        : parts[0] !== 'poll' || parts.length !== 4) ||
      !['vote', 'cast'].includes(action) ||
      !UUID_PATTERN.test(momentId ?? '') ||
      !POLL_OPTION_PATTERN.test(optionId ?? '')
    ) {
      await this.bot.answerCallback(
        callback.id,
        'This poll action is invalid.',
      );
      return;
    }

    if (!confirmation) {
      if (!callback.message) {
        await this.bot.answerCallback(callback.id, 'Open the Moment page to confirm your vote.');
        return;
      }
      try {
        const round = action === 'cast'
          ? await this.moments.getTelegramVoteRound(momentId!)
          : null;
        if (round && round.telegramChatId !== BigInt(callback.message.chat.id)) {
          throw new BadRequestException('This poll belongs to another group.');
        }
        const poll = round
          ? await this.moments.getTelegramVoteRoundResults(round.id)
          : await this.moments.getTelegramVotingMoment(momentId!);
        const option = poll.results.find((result) => result.optionId === optionId);
        if (!option || poll.closed) {
          throw new GoneException('This poll is unavailable.');
        }
        const compactId = momentId!.replace(/-/g, '');
        const voterId = BigInt(callback.from.id).toString(36);
        const confirmData = `pv:y:${action === 'cast' ? 'c' : 'v'}:${compactId}:${optionId}:${voterId}`;
        if (confirmData.length > 64) {
          throw new BadRequestException('Poll choice is invalid.');
        }
        await this.bot.sendMessage(
          callback.message.chat.id,
          `ប្រាកដថាចង់បោះឆ្នោតឱ្យ “${option.label}” មែនទេ?\nSure you want to vote for “${option.label}”?`,
          {
            inline_keyboard: [[
              { text: 'Yes, vote', callback_data: confirmData },
              { text: 'Cancel', callback_data: `pv:n:${voterId}` },
            ]],
          },
          undefined,
          callback.message.message_id,
        );
        await this.bot.answerCallback(callback.id);
      } catch (error) {
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
      return;
    }

    // The reply identifies the original poll; only the voter named in callback data can confirm.
    const pollMessage = callback.message?.reply_to_message;
    if (!pollMessage) {
      await this.bot.answerCallback(callback.id, 'This vote confirmation has expired.');
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
        pollMessage &&
        round.telegramChatId !== BigInt(pollMessage.chat.id)
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
      } else if (pollMessage) {
        if (['group', 'supergroup'].includes(pollMessage.chat.type)) {
          // Other voters may have replaced the message while this confirmation was open.
          const chatId = pollMessage.chat.id;
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
            await this.bot.deleteMessage(chatId, pollMessage.message_id);
          } catch {
            // Old or already-deleted messages must not trigger a webhook retry
            // that would repost the successfully delivered vote update again.
          }
        } else {
          await this.bot.editMessage(
            pollMessage.chat.id,
            pollMessage.message_id,
            text,
            keyboard,
          );
        }
      }
      if (callback.message) {
        await this.bot
          .deleteMessage(callback.message.chat.id, callback.message.message_id)
          .catch(() => null);
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
    const username =
      typeof user.username === 'string' &&
      /^[a-z][a-z0-9_]{0,31}$/i.test(user.username)
        ? user.username.toLowerCase()
        : null;
    // Ignore older deliveries so an out-of-order join cannot undo a later departure.
    await this.prisma.$executeRaw`
      INSERT INTO telegram_group_members
        (telegram_chat_id, telegram_user_id, display_name, is_active, observed_at, username)
      VALUES (${BigInt(chat.id)}, ${String(user.id)}, ${displayName}, ${active}, ${observedAt}, ${username})
      ON CONFLICT (telegram_chat_id, telegram_user_id) DO UPDATE
        SET display_name = EXCLUDED.display_name, is_active = EXCLUDED.is_active,
            observed_at = EXCLUDED.observed_at, username = EXCLUDED.username
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
      await this.bot.sendMessage(message.chat.id, 'Choose a daily vote:', {
        inline_keyboard: polls.map((poll) => [
          {
            text: `Schedule: ${this.truncateButtonText(poll.question)}`,
            callback_data: `poll:daily:${poll.id}`,
          },
        ]),
      });
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
          `Future rounds: ${Number(match![1])} min. Current timer unchanged.`,
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

    if (command === 'resettodayvote') {
      try {
        const round = await this.moments.getTodayTelegramVoteRound(
          linked.user.id,
          message.chat.id,
        );
        if (!round) {
          await this.bot.sendMessage(
            message.chat.id,
            'There is no voting round to reset today.',
          );
          return;
        }
        const adminId = BigInt(message.from.id).toString(36);
        await this.bot.sendMessage(
          message.chat.id,
          'Reset today’s entire vote? All votes and the current round will be removed. Use /votetime HH:MM afterward to start a new round today.',
          {
            inline_keyboard: [[
              { text: 'Yes, reset today', callback_data: `rv:y:${round.id}:${adminId}` },
              { text: 'Cancel', callback_data: `rv:n:${round.id}:${adminId}` },
            ]],
          },
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
        const result = await this.moments.updateDailyTelegramVoteTime(
          linked.user.id,
          message.chat.id,
          Number(match[1]),
          Number(match[2]),
        );
        await this.bot.sendMessage(
          message.chat.id,
          `Daily poll time updated to ${match[1]}:${match[2]} (${result.timeZone}). ` +
            (result.sendsToday
              ? 'A new vote will open today at that time, or on the next scheduler check if that time has passed.'
              : 'Today’s round stays in place; the new time starts tomorrow. Use /resettodayvote first to vote again today.'),
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
      await this.bot.sendMessage(message.chat.id, 'Daily vote stopped.');
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

  private async handleKlaKlokCommand(
    message: TelegramMessage & { from: NonNullable<TelegramMessage['from']> },
  ) {
    if (!this.klaKlok) {
      await this.bot.sendMessage(
        message.chat.id,
        'Kla Klok is temporarily unavailable.',
      );
      return;
    }

    const dealerTelegramUserId = String(message.from.id);
    try {
      const game = await this.klaKlok.createGame({
        telegramChatId: message.chat.id,
        telegramChatTitle: message.chat.title ?? 'Telegram group',
        dealerTelegramUserId,
        dealerDisplayName: this.telegramDisplayName(message.from),
      });

      let dealerMessage: TelegramMessage;
      try {
        // Telegram shows the same group keyboard to everyone, so dealer-only
        // financial controls live in the dealer's verified private chat.
        dealerMessage = await this.bot.sendMessage(
          message.from.id,
          buildKlaKlokDealerText({
            groupTitle: game.telegramChatTitle,
            round: game.currentRound,
          }),
          buildKlaKlokDealerKeyboard(game.id, game.currentRound),
        );
      } catch {
        await this.klaKlok.cancelSetup(game.id, dealerTelegramUserId);
        await this.bot.sendMessage(
          message.chat.id,
          'I could not send the dealer controls. Open a private chat with this bot, send /start, then retry /klaklok.',
        );
        return;
      }

      try {
        const groupMessage = await this.bot.sendMessage(
          message.chat.id,
          buildKlaKlokBoardText({
            dealerDisplayName: game.dealerDisplayName,
            round: game.currentRound,
          }),
          buildKlaKlokGroupKeyboard(game.id, game.currentRound),
        );
        await this.klaKlok.setControlMessages(
          game.id,
          groupMessage.message_id,
          dealerMessage.message_id,
        );
      } catch (error) {
        await this.klaKlok.cancelSetup(game.id, dealerTelegramUserId);
        await this.bot
          .editMessage(
            message.from.id,
            dealerMessage.message_id,
            'Kla Klok setup failed. Return to the group and retry /klaklok.',
            { inline_keyboard: [] },
          )
          .catch(() => null);
        throw error;
      }
    } catch (error) {
      if (error instanceof ConflictException) {
        await this.bot.sendMessage(message.chat.id, error.message);
        return;
      }
      throw error;
    }
  }

  private async handleKlaKlokCallback(
    callback: TelegramCallbackQuery,
    data: string,
  ) {
    if (!this.klaKlok) {
      await this.bot.answerCallback(
        callback.id,
        'Kla Klok is temporarily unavailable.',
      );
      return;
    }
    const action = parseKlaKlokCallback(data);
    const message = callback.message;
    if (!action || !message) {
      await this.bot.answerCallback(
        callback.id,
        'This Kla Klok action is invalid.',
      );
      return;
    }

    try {
      if (action.action === 'select') {
        if (!this.isGroupCallback(callback, message)) return;
        const game = await this.klaKlok.requireOpenRound(
          action.gameId,
          action.round,
        );
        if (game.telegramChatId !== message.chat.id) {
          throw new BadRequestException('This game belongs to another group.');
        }
        if (game.dealerTelegramUserId === String(callback.from.id)) {
          throw new BadRequestException('The dealer cannot place a bet.');
        }
        const symbol = getKlaKlokSymbol(action.symbol);
        await this.bot.sendMessage(
          message.chat.id,
          `${this.telegramDisplayName(callback.from)}, confirm ${symbol.glyph} ${symbol.labelKm} for round ${action.round}. Choose one amount:`,
          buildKlaKlokStakeKeyboard(
            action.gameId,
            action.round,
            action.symbol,
            telegramUserToken(callback.from.id),
          ),
          undefined,
          message.message_id,
        );
        await this.bot.answerCallback(callback.id);
        return;
      }

      if (action.action === 'bet') {
        if (!this.isGroupCallback(callback, message)) return;
        if (!callbackBelongsToUser(action.userToken, callback.from.id)) {
          throw new UnauthorizedException(
            'This bet confirmation belongs to another member.',
          );
        }
        const game = await this.klaKlok.requireOpenRound(
          action.gameId,
          action.round,
        );
        if (game.telegramChatId !== message.chat.id) {
          throw new BadRequestException('This game belongs to another group.');
        }
        const displayName = this.telegramDisplayName(callback.from);
        await this.klaKlok.confirmBet({
          gameId: action.gameId,
          round: action.round,
          telegramUserId: String(callback.from.id),
          displayName,
          symbol: action.symbol,
          amountRiel: action.amountRiel,
        });
        const symbol = getKlaKlokSymbol(action.symbol);
        await this.bot.editMessage(
          message.chat.id,
          message.message_id,
          `✅ ${displayName} confirmed ${action.amountRiel.toLocaleString('en-US')}៛ on ${symbol.glyph} ${symbol.labelKm} for round ${action.round}.`,
          { inline_keyboard: [] },
        );
        await this.bot.answerCallback(callback.id, 'Bet confirmed.');
        return;
      }

      if (action.action === 'cancel') {
        if (!this.isGroupCallback(callback, message)) return;
        if (!callbackBelongsToUser(action.userToken, callback.from.id)) {
          throw new UnauthorizedException(
            'This bet confirmation belongs to another member.',
          );
        }
        const game = await this.klaKlok.getGame(action.gameId);
        if (game.telegramChatId !== message.chat.id) {
          throw new BadRequestException('This game belongs to another group.');
        }
        await this.bot.answerCallback(callback.id, 'Bet cancelled.');
        await this.bot
          .deleteMessage(message.chat.id, message.message_id)
          .catch(() => null);
        return;
      }

      if (!this.isPrivateCallback(callback, message)) return;
      const dealerTelegramUserId = String(callback.from.id);

      if (action.action === 'roll') {
        const roll = await this.klaKlok.rollRound(
          action.gameId,
          dealerTelegramUserId,
          action.round,
        );
        if (roll.resultMessageId === null) {
          const resultMessage = await this.bot.sendMessage(
            roll.game.telegramChatId,
            buildKlaKlokRoundMessage(
              roll.roundNumber,
              roll.game.dealerDisplayName,
              roll.result,
            ),
          );
          // Persist delivery so a Telegram webhook retry does not repost a rolled round.
          await this.klaKlok.markRoundMessage(
            roll.game.id,
            roll.roundNumber,
            resultMessage.message_id,
          );
        }
        if (!roll.replay) {
          // Keep the next betting board below its result without reposting it on webhook retries.
          if (roll.game.groupMessageId !== null) {
            await this.bot
              .deleteMessage(roll.game.telegramChatId, roll.game.groupMessageId)
              .catch(() => null);
          }
          const groupMessage = await this.bot.sendMessage(
            roll.game.telegramChatId,
            buildKlaKlokBoardText({
              dealerDisplayName: roll.game.dealerDisplayName,
              round: roll.game.currentRound,
            }),
            buildKlaKlokGroupKeyboard(roll.game.id, roll.game.currentRound),
          );
          await this.klaKlok.setGroupMessage(
            roll.game.id,
            groupMessage.message_id,
          );
        }
        await this.bot.editMessage(
          message.chat.id,
          message.message_id,
          buildKlaKlokDealerText({
            groupTitle: roll.game.telegramChatTitle,
            round: roll.game.currentRound,
          }),
          buildKlaKlokDealerKeyboard(roll.game.id, roll.game.currentRound),
        );
        await this.bot.answerCallback(
          callback.id,
          `Round ${roll.roundNumber} rolled.`,
        );
        return;
      }

      const game = await this.klaKlok.getGame(action.gameId);
      if (game.dealerTelegramUserId !== dealerTelegramUserId) {
        throw new UnauthorizedException('Only the dealer can use this control.');
      }
      if (game.status !== 'OPEN' && action.action !== 'end-confirm') {
        throw new GoneException('This Kla Klok game is closed.');
      }

      if (action.action === 'end') {
        await this.bot.editMessage(
          message.chat.id,
          message.message_id,
          'End this Kla Klok game and post the final payment summary to the group?',
          buildKlaKlokEndKeyboard(
            action.gameId,
            telegramUserToken(callback.from.id),
          ),
        );
        await this.bot.answerCallback(callback.id);
        return;
      }

      if (!callbackBelongsToUser(action.userToken, callback.from.id)) {
        throw new UnauthorizedException(
          'This confirmation belongs to another dealer.',
        );
      }
      if (action.action === 'end-cancel') {
        await this.bot.editMessage(
          message.chat.id,
          message.message_id,
          buildKlaKlokDealerText({
            groupTitle: game.telegramChatTitle,
            round: game.currentRound,
          }),
          buildKlaKlokDealerKeyboard(game.id, game.currentRound),
        );
        await this.bot.answerCallback(callback.id, 'Keep playing.');
        return;
      }

      const settlement = await this.klaKlok.endGame(
        action.gameId,
        dealerTelegramUserId,
      );
      if (settlement.game.summaryMessageId === null) {
        const summaryMessage = await this.bot.sendMessage(
          settlement.game.telegramChatId,
          settlement.text.replace(
            '🏁 Kla Klok final settlement',
            `🏁 Kla Klok final settlement\nRounds played: ${settlement.rounds}`,
          ),
        );
        await this.klaKlok.markSummaryMessage(
          settlement.game.id,
          summaryMessage.message_id,
        );
      }
      if (settlement.game.groupMessageId !== null) {
        await this.bot.editMessage(
          settlement.game.telegramChatId,
          settlement.game.groupMessageId,
          `🏁 Kla Klok ended after ${settlement.rounds} round${settlement.rounds === 1 ? '' : 's'}. See the final settlement below.`,
          { inline_keyboard: [] },
        );
      }
      await this.bot.editMessage(
        message.chat.id,
        message.message_id,
        `Kla Klok ended after ${settlement.rounds} round${settlement.rounds === 1 ? '' : 's'}. The final settlement was posted in the group.`,
        { inline_keyboard: [] },
      );
      await this.bot.answerCallback(callback.id, 'Game ended.');
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException ||
        error instanceof GoneException ||
        error instanceof NotFoundException ||
        error instanceof UnauthorizedException
      ) {
        await this.bot.answerCallback(callback.id, error.message.slice(0, 180));
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
        `✅ Daily vote: 10:00 (${linked.user.telegramNotificationTimeZone}) · 30 min.\n` +
          'Settings: /help',
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

  private async handleTodayVoteReset(
    callback: TelegramCallbackQuery,
    data: string,
  ) {
    const match = /^rv:([yn]):([0-9a-f-]+):([0-9a-z]+)$/i.exec(data);
    const message = callback.message;
    if (
      !match ||
      !UUID_PATTERN.test(match[2]) ||
      !message ||
      !this.isGroupCallback(callback, message)
    ) {
      await this.bot.answerCallback(
        callback.id,
        'This reset action is invalid.',
      );
      return;
    }
    if (match[3] !== BigInt(callback.from.id).toString(36)) {
      await this.bot.answerCallback(
        callback.id,
        'This confirmation belongs to another admin.',
      );
      return;
    }
    const linked = await this.findLinkedUser(String(callback.from.id));
    if (
      !linked ||
      !(await this.bot.isChatAdministrator(message.chat.id, callback.from.id))
    ) {
      await this.bot.answerCallback(
        callback.id,
        'Only a linked group administrator can reset today’s vote.',
      );
      return;
    }
    if (match[1] === 'n') {
      await this.bot.answerCallback(callback.id, 'Reset cancelled.');
      await this.bot
        .deleteMessage(message.chat.id, message.message_id)
        .catch(() => null);
      return;
    }
    try {
      const reset = await this.moments.resetTodayTelegramVote(
        linked.user.id,
        message.chat.id,
        match[2],
      );
      await this.bot.answerCallback(callback.id, 'Today’s vote reset.');
      // Old buttons are invalid in the database even if Telegram cannot remove the message.
      if (reset.messageId !== null) {
        await this.bot
          .deleteMessage(message.chat.id, reset.messageId)
          .catch(() => null);
      }
      await this.bot
        .deleteMessage(message.chat.id, message.message_id)
        .catch(() => null);
      await this.bot.sendMessage(
        message.chat.id,
        `Today’s ${reset.deletedVotes} vote${reset.deletedVotes === 1 ? '' : 's'} reset. Use /votetime HH:MM to start a fresh round today.`,
      );
    } catch (error) {
      if (error instanceof GoneException || error instanceof NotFoundException) {
        await this.bot.answerCallback(
          callback.id,
          'Today’s voting round has changed or is unavailable.',
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

  private async sendHelp(chatId: number, group: boolean) {
    const commands = group
      ? [
          'ChlatWork · Group commands',
          '',
          '/help — Show this command list anytime',
          '/$ — Choose a member’s KHQR (or send KHQR)',
          '/@username — Get a member’s KHQR, e.g. /@kakada',
          '/$ @username — Another way to request their KHQR',
          '/tg_<Telegram ID> — Get a known group member’s KHQR',
          '/klaklok — Start a Kla Klok game as the dealer',
          '/joinvote — Register for this group’s voting reminders',
          '/split 60 — Split the final bill after voting closes (poll owner)',
          '/split 60 Alice, Bob — Split a bill with named participants',
          '',
          'Daily voting — linked ChlatWork account and group admin required:',
          '/dailyvote — Choose your Voting Moment to schedule daily',
          '/votetime 10:00 — Change the daily vote time',
          '/resettodayvote — Reset today’s votes, then use /votetime to vote again',
          '/voteduration 30 — Set future voting rounds to 30 minutes',
          '/stopdailyvote — Stop the daily vote',
          '',
          'For personal expenses and settings, send /help in a private chat with the bot.',
        ]
      : [
          'ChlatWork · Private commands',
          '',
          '/help — Show this command list anytime',
          '/start or /menu — Open the assistant menu',
          '/phone — Share or update your profile phone number (optional)',
          '/skipphone — Dismiss phone sharing',
          '',
          'Sign in with Telegram in ChlatWork to use:',
          '/today — Today’s expense summary',
          '/recent — Recent expenses',
          '/spend Coffee week — Ask about spending',
          '/vote — Choose a Voting Moment to share',
          '/alerts — View notification settings',
          '/alerts on or /alerts off — Toggle budget alerts',
          '/weekly — View weekly digest settings',
          '/weekly on 20 or /weekly off — Set the digest hour or disable it',
          '/cancel — Cancel your latest pending expense',
          '',
          'Send an expense like “Lunch 4.50”, a voice note, or a receipt photo. Confirm before saving.',
          'For KHQR, group voting, and bill splits, send /help in your group.',
        ];
    const disabled = new Set((await this.availability?.disabledKeys()) ?? []);
    const commandFeature = (line: string) => {
      if (/^\/(?:\$|@|tg_)/.test(line)) return 'khqr';
      if (/^\/klaklok\b/.test(line)) return 'kla-klok';
      if (/^\/split/.test(line)) return 'bill-split';
      if (
        /^\/(?:joinvote|dailyvote|votetime|voteduration|resettodayvote|stopdailyvote)/.test(line)
      ) return 'group-voting';
      if (/^\/(?:today|recent|spend)/.test(line)) return 'spending';
      if (/^\/vote\b/.test(line)) return 'voting';
      if (/^\/(?:alerts|weekly)/.test(line)) return 'notifications';
      if (/^\/(?:phone|skipphone)/.test(line)) return 'phone';
      if (/^\/cancel/.test(line) || line.startsWith('Send an expense'))
        return 'expenses';
      return null;
    };
    await this.bot.sendMessage(
      chatId,
      commands
        .filter((line) => {
          const feature = commandFeature(line);
          return !feature || !disabled.has(`telegram:${feature}`);
        })
        .join('\n'),
    );
  }

  private async sendMenu(chatId: number, linked: boolean) {
    const expensesEnabled =
      (await this.availability?.isEnabled('telegram:expenses')) ?? true;
    await this.bot.sendMessage(
      chatId,
      linked
        ? expensesEnabled
          ? '👋 ChlatWork Assistant\n\nSend an expense like “Lunch 4.50”, ' +
              'send a voice note or receipt photo, or ask about your spending. ' +
              'Expenses are never saved without your confirmation.'
          : '👋 ChlatWork Assistant\n\nChoose an available feature below.'
        : '👋 Welcome to ChlatWork. Open the Mini App and sign in with Telegram ' +
            'before using private expense data.',
      linked ? await this.availableMainMenuKeyboard() : this.connectKeyboard(),
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

  private async availableMainMenuKeyboard(): Promise<TelegramInlineKeyboard> {
    const keyboard = this.mainMenuKeyboard();
    if (!this.availability) return keyboard;
    const disabled = new Set(await this.availability.disabledKeys());
    const keyForButton = (data?: string) => {
      if (!data) return null;
      if (data === 'menu:add') return 'expenses';
      if (
        data === 'summary:today' ||
        data === 'menu:recent' ||
        data === 'menu:ask'
      ) return 'spending';
      if (data === 'poll:list') return 'voting';
      if (data === 'settings:notifications') return 'notifications';
      return null;
    };
    return {
      inline_keyboard: keyboard.inline_keyboard
        .map((row) =>
          row.filter((button) => {
            if (
              button.web_app?.url.endsWith('/tools/expense-tracker') &&
              disabled.has('website:expense-tracker')
            ) return false;
            const feature = keyForButton(button.callback_data);
            return !feature || !disabled.has(`telegram:${feature}`);
          }),
        )
        .filter((row) => row.length > 0),
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
