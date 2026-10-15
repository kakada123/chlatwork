# Creator Business / Secretary command edits

Connect the **Creator bot** as your Business / Secretary bot and grant reply/edit permission for the selected private chats. It must be the same bot configured for the Creator webhook; the expense/security bot has a separate integration.

Send a command with text in a permitted conversation:

```text
/grammar She go to school every day.
/khmer_to_english សួស្តី
/latin nh jol jit
```

The bot replaces that exact outgoing message with the main AI result. It sends no acknowledgement, typing indicator, explanation, credit balance, or separate reply to the recipient. All eight existing text modes work: `/grammar`, `/rewrite`, `/latin`, `/khmer_to_latin`, `/khmer_to_english`, `/latin_to_english`, `/english_to_latin`, `/humanize`. The full command and text must fit within 4,000 characters.

Ordinary outgoing text, incoming messages, bot-originated messages, unsupported commands and commands without text do not start AI work. Saved modes do not enable automatic editing. Send `/credits`, `/settings` and menu commands directly to the Creator bot instead.

## Ownership and recovery

- The sender must be the verified connection owner with an active linked account. Requests use that owner's existing credits, availability switches and daily limit. The recipient cannot spend the owner's balance.
- Ownership, enabled state, permission and account linkage are rechecked before generation and delivery. Before AI work, an identical-text edit verifies that Telegram currently allows editing this particular source, including the per-chat reply window. Failure retries without generating or charging.
- Repeated updates for one connection/chat/message share one immutable request. Failed result delivery retries the saved main result without another generation or charge. An already-applied edit is safe to repeat with the same text.
- Owner edits cancel pending work. A content-free source receipt blocks delayed original updates; edited-message events never start AI work. These receipts use the existing seven-day cleanup. Telegram has no conditional edit API, so an edit already dispatched cannot be recalled if the owner changes the source at the same instant.
- Empty, unsupported-script or oversized main output is rejected before finalizing its charge and follows the existing refund path. Generation failure leaves the original command unchanged. If valid generation finishes before later revocation, cancellation or delivery failure, the normal generation charge and account-scoped history remain; no account details are inserted into the conversation.
- Telegram limits Business reply/edit access to private chats with incoming activity in the last 24 hours. User-authored Business messages without inline keyboards have a 48-hour edit limit. Delivery retries expire under the existing 24-hour queue lifetime. See [Business rights](https://core.telegram.org/bots/api#businessbotrights) and [message editing](https://core.telegram.org/bots/api#editmessagetext).

## Release

1. Review and manually run `database/updates/2026-10-15-add-creator-business-command-edits.sql`, after the Creator group-support SQL. Existing queue rows remain valid.
2. Regenerate Prisma using the normal deployment command and deploy the API. There are no new environment variables.
3. Add `business_connection`, `business_message` and `edited_business_message` to the Creator webhook's existing `allowed_updates` alongside `message` and `callback_query`. Retain its configured URL and secret; never paste real values into source control.
4. In an authorized test chat, send `/grammar She go.` and verify that the same message becomes `She goes.` with one charge and one history result. Verify ordinary text and incoming commands remain untouched, manual edits cancel pending requests, unavailable chat permissions prevent AI spending, and disconnecting prevents further edits. These require the configured Telegram bot, database and AI provider; mocked tests do not prove live delivery.
