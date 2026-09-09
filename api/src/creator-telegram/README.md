# Khmer AI & Creator Telegram bot

This separate bot replies to Khmer AI text requests in private chats. Buttons open
the existing Creator posts, scripts, hooks, ideas, video tools, and credits pages.
The expense/voting bot keeps its existing webhook, commands, and token.

## Runtime setup

1. Create a new bot using `/newbot` in Telegram's verified **@BotFather** account.
   Choose its display name and available username there.
2. Apply these standalone SQL files manually before deploying the updated API:
   - `database/updates/2026-09-09-add-creator-usage-limits.sql`
   - `database/updates/2026-09-09-add-creator-telegram-bot.sql`
   - `database/updates/2026-09-09-add-creator-telegram-progress.sql`
   - `database/updates/2026-09-09-add-creator-telegram-reply-settings.sql`
   These assume the existing Creator AI schema has already been installed.
3. Configure `CREATOR_TELEGRAM_BOT_TOKEN` and
   `CREATOR_TELEGRAM_WEBHOOK_SECRET` in the API's runtime secret store. Use a new
   webhook secret containing 16–256 letters, numbers, underscores, or hyphens.
   Both values must differ from the original bot's configuration. Leave both
   empty to keep the new bot disabled. Never commit either value.
4. Reuse the existing HTTPS `FRONTEND_ORIGIN`. Configure the new bot's Main Mini App
   URL and menu button in BotFather to `<FRONTEND_ORIGIN>/creator`. No separate
   frontend or second credit wallet is required.
5. Register the webhook using the **new bot's** token, following the
   [Telegram Bot API](https://core.telegram.org/bots/api#setwebhook):

   ```text
   POST https://api.telegram.org/bot<CREATOR_TELEGRAM_BOT_TOKEN>/setWebhook
   url=<FRONTEND_ORIGIN>/api/creator-telegram/webhook
   secret_token=<CREATOR_TELEGRAM_WEBHOOK_SECRET>
   allowed_updates=["message","callback_query"]
   ```

   The public Nuxt endpoint forwards to `POST /creator-telegram/webhook` on Nest.
   Nest verifies the dedicated webhook secret before doing any work. The running
   Nest API processes the persistent queue; use the same always-running service
   that hosts the existing Creator worker.
6. Enable the existing Creator AI provider configuration and budgets as usual.
   The new bot uses the same `AI_ENABLED`, models, feature prices, account wallet,
   rate limits, daily allowance, provider budgets, and refund logic.

Suggested BotFather command list:

```text
start - Open Khmer AI and Creator
grammar - Correct Khmer or English grammar
rewrite - Rewrite Khmer text
latin - Convert Latin Khmer to Khmer script
humanize - Make Khmer writing sound natural
creator - Open Creator tools
credits - Show credits and daily usage
settings - Choose what appears in your replies
help - Show the bot menu
```

Send a mode command by itself, or tap a mode button, to select how subsequent
messages are processed. A command followed by text applies that mode to just that
request, for example `/latin sok sabay`. Without a saved mode, plain text uses
grammar correction, which automatically preserves Khmer, English, or mixed text.
For example, `/grammar She go to school every day.` corrects English without
translating it into Khmer. Grammar replies include the complete corrected text in
its own copyable message, then a separate “What changed” list showing the original
word or phrase, its correction, and a short reason (including missing articles
such as “a”, “an”, or “the”). Already-correct text gets “No corrections needed.”
The mode prompt displays the configured credit price.
Chat input is limited to 4,000 characters; images and video use the Creator UI.

Use **⚙️ Settings** in the bot menu or `/settings` to turn **What changed** and
**Credits used** on or off independently. Both default to on and are saved for
each Telegram user. Corrected text always remains copyable. These are display
options: charges still apply, and `/credits` always shows the wallet and daily usage.
Changes apply to replies that have not yet been prepared. A reply already saved
for delivery keeps its message boundaries so retries cannot skip or repeat parts.

## Account and retry behavior

- Accepted requests immediately receive one queued acknowledgement. When processing
  starts, the bot edits it to describe the selected task and refreshes typing every
  four seconds. After 15 seconds of processing, the same message says it is still
  working and asks the user not to resend. No estimated times or percentages are shown.
- The waiting message ID survives retries and restarts. Feedback failures never
  trigger another generation. Typing stops on completion, errors, shutdown, or lease
  expiry; slow Telegram feedback calls do not overlap. Delivery or generation retries
  update the same status with a delay notice. After the final reply, the bot deletes
  the status, or edits it to a finished notice if deletion fails. Corrected text,
  explanations, and credits remain separate messages.

- Users open Creator from the new bot once to sign in with Telegram. The API
  validates Mini App data against either configured first-party bot token,
  following [Telegram's verification rules](https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app).
  The verified Telegram identity resolves through the existing account-linking
  logic; accounts are not merged and balances are not duplicated.
- Only an active linked account can queue a request. Private chat ownership is
  checked on receipt, before generation, and before delivering the result.
- At most three requests per account may wait in the new bot's queue. The mode
  and text are frozen when queued. New generations enforce the account's latest
  daily limit, including overrides saved in **Creator → Credits & limits**.
- The webhook queues AI work before acknowledging delivery. Each Telegram update
  uses one stable Creator idempotency key, so retries do not charge twice. Database
  leases allow an expired worker claim to be resumed by another API instance.
- Long replies are split and checkpointed. A failed send retries the saved output
  rather than regenerating. If Telegram accepted a message but its response was
  lost, that one part can appear twice; its credits are still charged once.
- Pending text is cleared when the reply is persisted. Queued reply content is
  cleared after delivery or expiry. Requests expire after 24 hours; content-free
  delivery receipts are removed after seven days. Inactive mode preferences with
  no explicit reply settings are removed after 30 days; explicit reply settings
  remain saved. Existing Creator history retains generated results under
  its normal retention policy. Neither inputs nor outputs are written to logs.

## Live verification after setup

Open `/start` in both bots and confirm their menus differ. Sign in through the new
bot, use `/credits`, and send a small Khmer request. Confirm one history entry and
one charge. Raise the account's daily limit in the admin page and verify a new
request succeeds within it. Confirm groups receive no private AI or wallet reply.
The bot registration, SQL execution, provider call, and Telegram delivery must be
verified in the configured runtime; local tests do not establish those outcomes.
For a request taking over 15 seconds, verify the queued message changes to the
selected task, then the slow-request notice without adding another message. Confirm
typing continues while processing and the status disappears after result delivery.
Toggle each reply setting and send another grammar request. Confirm only the
selected sections appear, the corrected text remains copyable, another user's
settings are unchanged, and `/credits` remains available with both toggles off.
