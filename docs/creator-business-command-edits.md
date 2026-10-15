# Creator Business / Secretary command edits

Connect the **Creator bot** as your Business / Secretary bot and grant reply/edit permission for the selected private chats. It must be the same bot configured for the Creator webhook; the expense/security bot has a separate integration.

Send a command with text in a permitted conversation:

```text
/grammar She go to school every day.
/khmer_to_english សួស្តី
/latin nh jol jit
```

After ownership, permission, availability and queue-capacity checks, the webhook immediately replaces the accepted command with `…`. The worker then replaces that same message with the main AI result. Masking does not wait behind earlier AI jobs. It sends no separate acknowledgement, typing indicator, explanation, credit balance, or reply to the recipient. All eight existing text modes work: `/grammar`, `/rewrite`, `/latin`, `/khmer_to_latin`, `/khmer_to_english`, `/latin_to_english`, `/english_to_latin`, `/humanize`. The full command and text must fit within 4,000 characters.

Telegram delivers the original message before notifying the bot. Masking reduces exposure while processing but cannot prevent the recipient from briefly seeing the original, including in a notification preview. If Telegram refuses or delays the edit, the original remains visible until masking succeeds. Rejected commands are not masked. To avoid sending the original at all, prepare the result in the Creator bot or website before sending it to the recipient.

Ordinary outgoing text, incoming messages, bot-originated messages, unsupported commands and commands without text do not start AI work. Saved modes do not enable automatic editing. Send `/credits`, `/settings` and menu commands directly to the Creator bot instead.

## Ownership and recovery

- The sender must be the verified connection owner with an active linked account. Requests use that owner's existing credits, availability switches and daily limit. The recipient cannot spend the owner's balance.
- Ownership, enabled state, permission and account linkage are rechecked before generation and delivery. Before AI work, the worker reapplies `…` to recover a failed initial mask and verify that Telegram allows editing this source, including the per-chat reply window. Masking failure retries without generating or charging. The raw command is never restored to the conversation.
- The webhook holds a short queue lease while masking, outside the database transaction. The worker starts after release; lease expiry recovers a crashed webhook. Replayed original updates never mask the source again, and delayed placeholder echoes do not cancel the request or discard saved output.
- Repeated updates for one connection/chat/message share one immutable request. Failed result delivery retries the saved main result without another generation or charge. An already-applied edit is safe to repeat with the same text.
- Owner edits cancel pending work. A content-free source receipt blocks delayed original updates; edited-message events never start AI work. These receipts use the existing seven-day cleanup. Telegram has no conditional edit API, so an edit already dispatched cannot be recalled if the owner changes the source at the same instant.
- Empty, unsupported-script or oversized main output is rejected before finalizing its charge and follows the existing refund path. Generation failure leaves the placeholder in place; the owner can edit it manually. If valid generation finishes before later revocation, cancellation or delivery failure, the normal generation charge and account-scoped history remain; no account details are inserted into the conversation.
- Telegram limits Business reply/edit access to private chats with incoming activity in the last 24 hours. User-authored Business messages without inline keyboards have a 48-hour edit limit. Delivery retries expire under the existing 24-hour queue lifetime. See [Business rights](https://core.telegram.org/bots/api#businessbotrights) and [message editing](https://core.telegram.org/bots/api#editmessagetext).

## Release

1. Review and manually run `database/updates/2026-10-15-add-creator-business-command-edits.sql`, after the Creator group-support SQL. Existing queue rows remain valid.
2. Regenerate Prisma using the normal deployment command and deploy the API. There are no new environment variables.
3. Add `business_connection`, `business_message` and `edited_business_message` to the Creator webhook's existing `allowed_updates` alongside `message` and `callback_query`. Retain its configured URL and secret; never paste real values into source control.
4. In an authorized test chat, send `/grammar She go.` and verify that the same message becomes `…` before `She goes.`, with one charge and one history result. Verify ordinary text and incoming commands remain untouched, manual edits cancel pending requests, unavailable chat permissions prevent AI spending, and disconnecting prevents further edits. Verify a failed generation keeps `…`, replayed webhooks never hide a finished result, and a failed result edit retries the saved result without another generation. This masking change needs no additional SQL or configuration. These checks require the configured Telegram bot, database and AI provider; mocked tests do not prove live delivery.
