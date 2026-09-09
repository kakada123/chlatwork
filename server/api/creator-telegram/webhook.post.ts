import { createError, getHeader, readBody } from 'h3';
import { requestAuthApi } from '../../utils/auth';

export default defineEventHandler(async (event) => {
  const secret = getHeader(event, 'x-telegram-bot-api-secret-token');
  if (!secret) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
  // Only the authenticated Nest webhook can enqueue a chargeable AI request.
  return requestAuthApi<{ ok: true }>(event, '/creator-telegram/webhook', {
    method: 'POST',
    headers: { 'X-Telegram-Bot-Api-Secret-Token': secret },
    body: await readBody<unknown>(event),
  });
});
