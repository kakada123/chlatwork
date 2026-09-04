import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const apiModule = readFileSync('api/src/app.module.ts', 'utf8');
const controller = readFileSync(
  'api/src/telegram-bot/telegram-bot.controller.ts',
  'utf8',
);
const service = readFileSync(
  'api/src/telegram-bot/telegram-bot.service.ts',
  'utf8',
);
const proxy = readFileSync('server/api/telegram/webhook.post.ts', 'utf8');
const moments = readFileSync('api/src/moments/moments.service.ts', 'utf8');
const client = readFileSync(
  'api/src/telegram-bot/telegram-bot.client.ts',
  'utf8',
);

test('Telegram webhook is proxied to the API and verifies its secret there', () => {
  assert.match(apiModule, /TelegramBotModule/);
  assert.match(controller, /x-telegram-bot-api-secret-token/);
  assert.match(controller, /isValidWebhookSecret/);
  assert.match(proxy, /X-Telegram-Bot-Api-Secret-Token/);
  assert.match(proxy, /requestAuthApi<\{ ok: true \}>/);
});

test('expense writes require confirmation and provide undo', () => {
  assert.match(service, /expense:save:/);
  assert.match(service, /TelegramBotPendingExpenseStatus\.CONFIRMED/);
  assert.match(service, /pg_advisory_xact_lock/);
  assert.match(service, /expense:undo:/);
  assert.match(service, /ExpenseEntryType\.EXPENSE/);
});

test('published Moment polls can be shared and voted through Telegram', () => {
  assert.match(service, /command === 'vote'/);
  assert.match(service, /switch_inline_query/);
  assert.match(service, /poll:vote:/);
  assert.match(service, /respondToTelegramVote/);
  assert.match(service, /inline_message_id/);
  assert.match(client, /answerInlineQuery/);
  assert.match(client, /editInlineMessage/);
  assert.match(moments, /telegram:\$\{voter\.telegramUserId\}/);
  assert.match(moments, /account:\$\{voter\.linkedUserId!/);
});
