# Creator Telegram groups

Creator supports private chats, groups, and supergroups. Every request uses the Telegram sender's linked ChlatWork account, credits, limits, and personal mode. Other members cannot select or spend that account's credits.

In a group, use a command with text, for example `/latin nh jol jit` or `/khmer_to_english សួស្តី`. Commands addressed to this bot, such as `/latin@your_creator_bot nh jol jit`, also work. Commands addressed to other bots are ignored.

Alternatively, select a mode from the menu or send its command alone, then **reply to a Creator bot message** with your text. Ordinary group conversation and replies to other people or bots do not start paid requests. Each replying member uses their own selected mode.

Menus appear before the short input prompt. Group website buttons use standard URLs because Telegram limits Web App buttons to private chats. Results and acknowledgements reply to the source message and retain its forum topic. Group replies omit credit balances and personal error details; `/credits` and `/settings` direct members to a private chat.

Anonymous administrator messages, channel messages, and bot-originated requests are ignored because they do not identify a billable person. Members must link an active account through the existing Telegram sign-in flow. No new environment variables are required.

## Release

1. Review and manually run `database/updates/2026-10-15-enable-creator-telegram-groups.sql` before deploying the API. It preserves existing requests and backfills their sender identity from private chat IDs.
2. Regenerate Prisma with the usual deployment command, `npm --prefix api run prisma:generate`, then deploy the API.
3. Add the Creator bot to a test group with permission to send messages. Verify a command addressed to its username and a reply to the bot with two linked accounts. Check account isolation, private balances, topic replies, and retry behavior.

Telegram's group privacy mode can remain enabled: directed commands and replies to the bot are the intended entry points. BotFather group-joining settings and live group permissions must be checked on the actual bot. Local mocked tests do not establish live Telegram delivery or AI translation quality.

References: [Telegram inline keyboard buttons](https://core.telegram.org/bots/api#inlinekeyboardbutton), [group privacy behavior](https://core.telegram.org/bots/faq#what-messages-will-my-bot-get).
