import { getHeader, readBody } from 'h3';
import { requestAuthApi } from '../../utils/auth';

export default defineEventHandler(async (event) => {
  const secret = getHeader(event, 'x-telegram-bot-api-secret-token');
  if (!secret) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
  }

  const body = await readBody<unknown>(event);
  // The Nuxt endpoint is the public edge; the Nest API still performs the
  // constant-time secret check before processing or persisting the update.
  return await requestAuthApi<{ ok: true }>(event, '/telegram/webhook', {
    method: 'POST',
    headers: { 'X-Telegram-Bot-Api-Secret-Token': secret },
    body,
  });
});
