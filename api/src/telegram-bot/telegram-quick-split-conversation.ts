import type { PrismaService } from '../prisma/prisma.service';
import type { TelegramBotClient } from './telegram-bot.client';
import type { TelegramMessage } from './telegram-bot.types';
import { parseTelegramQuickSplit, TelegramSplitParseError, type TelegramQuickSplit } from './telegram-group-split';

const AMOUNT_PROMPT = 'Please enter the amount. Example: 36000';
const PEOPLE_PROMPT = 'Please enter the number of people. Example: 6';
const SESSION_LIFETIME_MS = 10 * 60_000;

interface SplitSession {
  amountInput: string | null;
  promptMessageId: number;
  lastMessageId: number;
  expiresAt: Date;
}

export class TelegramQuickSplitConversation {
  constructor(private readonly prisma: PrismaService, private readonly bot: TelegramBotClient) {}

  async handle(
    message: TelegramMessage & { from: NonNullable<TelegramMessage['from']> },
    command: string | null,
    enabled: () => Promise<boolean>,
    showResult: (split: TelegramQuickSplit) => Promise<void>,
  ): Promise<boolean> {
    const start = /^\/split(?:@[A-Za-z0-9_]+)?\s*$/i.test(message.text?.trim() ?? '');
    // Binding answers to the prompt also works with privacy mode and ignores unrelated group numbers.
    if (!start && command !== 'cancel' && (
      command || !message.text || !message.reply_to_message
    )) return false;

    const chatId = BigInt(message.chat.id);
    const senderId = String(message.from.id);
    return this.prisma.$transaction(async (tx) => {
      // The chat + sender lock prevents overlapping webhooks from consuming the same step.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`quick-split:${chatId}:${senderId}`}))`;
      const [session] = await tx.$queryRaw<SplitSession[]>`
        SELECT amount_input AS "amountInput", prompt_message_id AS "promptMessageId",
          last_message_id AS "lastMessageId", expires_at AS "expiresAt"
        FROM telegram_quick_split_sessions
        WHERE telegram_chat_id = ${chatId} AND telegram_user_id = ${senderId}
        FOR UPDATE
      `;
      if (session && message.message_id <= session.lastMessageId) return true;
      if (!start && (!session || session.expiresAt.getTime() <= Date.now())) return false;
      if (!start && command !== 'cancel' && message.reply_to_message?.message_id !== session!.promptMessageId) return false;
      if (!(await enabled())) {
        await this.bot.sendMessage(message.chat.id, 'This feature is temporarily unavailable.');
        return true;
      }
      if (command === 'cancel') {
        await tx.$executeRaw`DELETE FROM telegram_quick_split_sessions
          WHERE telegram_chat_id = ${chatId} AND telegram_user_id = ${senderId}`;
        await this.bot.sendMessage(message.chat.id, 'Split cancelled.');
        return true;
      }

      let amountInput = start ? null : session!.amountInput;
      let prompt = start || !amountInput ? AMOUNT_PROMPT : PEOPLE_PROMPT;
      if (!start) {
        try {
          if (amountInput === null) {
            const input = message.text!.trim();
            if (input.length > 32 || !parseTelegramQuickSplit(`/split ${input} / 1`)) {
              throw new TelegramSplitParseError('Enter a valid amount.');
            }
            amountInput = input;
            prompt = PEOPLE_PROMPT;
          } else {
            const result = parseTelegramQuickSplit(`/split ${amountInput} / ${message.text!.trim()}`);
            if (!result) throw new TelegramSplitParseError('Enter a whole number of people (1–50).');
            await showResult(result);
            await tx.$executeRaw`DELETE FROM telegram_quick_split_sessions
              WHERE telegram_chat_id = ${chatId} AND telegram_user_id = ${senderId}`;
            return true;
          }
        } catch (error) {
          if (!(error instanceof TelegramSplitParseError)) throw error;
          prompt = `${error.message}\n\n${amountInput === null ? AMOUNT_PROMPT : PEOPLE_PROMPT}`;
        }
      }
      const sent = await this.bot.sendMessage(
        message.chat.id, prompt, { force_reply: true, selective: true }, undefined, message.message_id,
      );
      const expiresAt = new Date(Date.now() + SESSION_LIFETIME_MS);
      await tx.$executeRaw`
        INSERT INTO telegram_quick_split_sessions (
          telegram_chat_id, telegram_user_id, amount_input, prompt_message_id, last_message_id, expires_at
        ) VALUES (${chatId}, ${senderId}, ${amountInput}, ${sent.message_id}, ${message.message_id}, ${expiresAt})
        ON CONFLICT (telegram_chat_id, telegram_user_id) DO UPDATE
        SET amount_input = EXCLUDED.amount_input, prompt_message_id = EXCLUDED.prompt_message_id,
          last_message_id = EXCLUDED.last_message_id, expires_at = EXCLUDED.expires_at
      `;
      return true;
    }, { timeout: 45_000 });
  }

  async clearCompleted(message: TelegramMessage & { from: NonNullable<TelegramMessage['from']> }) {
    // A completed shortcut ends its older wizard without clearing a newer /split request.
    await this.prisma.$executeRaw`DELETE FROM telegram_quick_split_sessions
      WHERE telegram_chat_id = ${BigInt(message.chat.id)} AND telegram_user_id = ${String(message.from.id)}
        AND last_message_id <= ${message.message_id}`;
  }
}
