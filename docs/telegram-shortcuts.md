# Fixed Telegram shortcuts

In a private chat with either bot, send `/start` or `/menu` to install the fixed
shortcut keyboard below the message input. Existing inline menus and the
Open ChlatWork / Open Creator website buttons remain available.

- ChlatWork: Add expense, Today, Recent, Ask spending, Share a vote, and Menu.
- CW Creator: Grammar, Rewrite, Latin → Khmer, Khmer → Latin, Khmer → English,
  Latin → English, English → Latin, Humanize, Credits, Settings, and Menu.

Creator tool shortcuts select a mode and ask for text. Selecting a mode does not
queue a generation or use credits. ChlatWork's Add expense and Ask spending
shortcuts display the same instructions as their inline actions; `/add` and
`/ask` also open these prompts.

Disabled tools are omitted when the keyboard is refreshed. Taps on buttons from
an older keyboard still pass the current feature and account checks. Unlinked
ChlatWork accounts receive only Menu until they connect their account.
Phone sharing temporarily replaces ChlatWork's shortcuts, then restores them
after a successful save or `/skipphone`.

Shortcuts are limited to direct bot chats. Group and Telegram Business behavior
is unchanged. No configuration or database changes are required.

Telegram controls keyboard visibility: `is_persistent` requests that clients show
the shortcuts when the typing keyboard is hidden. See the
[Telegram Bot API](https://core.telegram.org/bots/api#replykeyboardmarkup).

After deploying the API, verify both bots in Telegram by sending `/menu`, tapping
each shortcut, and returning to Menu. Check that selecting a Creator tool only
asks for input, and that ChlatWork's shortcuts return after `/phone` followed by
`/skipphone`.
