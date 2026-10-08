# ChlatWork Auth API

NestJS authentication and account-data service for ChlatWork. It verifies Google identity tokens, Telegram Mini App `initData`, and Telegram OIDC tokens; stores provider links, hashed refresh tokens, and user-owned account data in PostgreSQL; and returns short-lived access tokens to the Nuxt server. Browser code never receives these tokens directly.

## Local setup

For the optional YouTube MP4 downloader, see the
[downloader setup guide](src/youtube-downloader/README.md). It provides an opt-in
Railway image with yt-dlp, its pinned YouTube challenge solver, and ffmpeg. The
downloader remains disabled until its runtime flag and public API origin are configured.

For the separate Khmer AI & Creator bot and admin daily usage limits, see the
[Creator bot setup guide](src/creator-telegram/README.md). Its SQL updates must be
applied manually before deploying these features.

1. Copy `api/.env.example` to `api/.env` and replace every dummy value locally.
   To use `gemini-3.5-transcribe` for Creator video transcription (significantly more
   accurate for Khmer than the default `whisper-1`), set `GEMINI_API_KEY` to a real
   Google AI Studio key. When `GEMINI_API_KEY` is absent or a dummy value, the pipeline
   falls back to the OpenAI Whisper path automatically — no other changes required.

2. Review and manually execute `database/2026-08-21-create-chlatwork-auth.sql` against the intended PostgreSQL database.
   For Telegram daily expense summaries, also review and manually execute
   `database/2026-08-29-add-telegram-notification-preference.sql` and
   `database/2026-08-29-add-daily-expense-telegram-summary.sql` in that order.
   For interactive Telegram expense commands, then review and manually execute
   `database/updates/2026-09-04-add-telegram-expense-assistant.sql`.
   For recent-expense editing, finance alerts, and group splits, then review and
   manually execute
   `database/updates/2026-09-04-add-telegram-assistant-utilities.sql`.
   For daily Voting Moments, also review and manually execute
   `database/updates/2026-09-04-add-daily-moment-voting.sql`.
3. From `api/`, run `npm install`, `npm run prisma:generate`, then `npm run dev`.
4. Configure the Nuxt app with `NUXT_AUTH_API_BASE_URL=http://localhost:3002`.

The API binds to `0.0.0.0` using Railway's `PORT` value, with `3002` as the local fallback. Keep it behind HTTPS and a trusted platform proxy; do not expose PostgreSQL publicly.

## Endpoints

- `POST /auth/google`
- `POST /auth/telegram`
- `POST /auth/telegram/code`
- `POST /auth/google/link-ticket` (authenticated)
- `POST /auth/google/link-code`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`
- `GET /expenses/state` (authenticated)
- `PUT /expenses/state` (authenticated)
- `GET /payback/state` (authenticated)
- `PUT /payback/state` (authenticated)
- `GET /notifications/telegram/settings` (authenticated)
- `PUT /notifications/telegram/settings` (authenticated)
- `POST /telegram/webhook` (Telegram secret header required)

The long-running API checks once per minute for opted-in users whose local time
has reached 10:00 PM, atomically claims that local calendar day, and sends the
saved Expense Tracker range, totals, budget, insights, and category breakdown
through the Telegram bot. The API process must stay running for scheduled
delivery; serverless request-only execution is not enough.

Google and Telegram callback/origin values must be registered with their providers. For production, Google Cloud must contain the JavaScript origin `https://chlatwork.com` and redirect URI `https://chlatwork.com/api/auth/google/callback`. Provider secrets, the Telegram bot token, and `JWT_ACCESS_SECRET` belong only in the auth API runtime environment.

## Telegram assistant

The webhook supports private-chat `/start`, `/menu`, `/help`, `/today`, `/recent`,
`/spend`, `/alerts`, `/weekly`, `/vote`, and `/cancel` commands. A normal message
such as `Lunch 4.50` or `បាយ 15000៛` creates a
30-minute confirmation with Save, Edit, and Cancel buttons. Saving is
idempotent, and the confirmation changes to an Undo action after the expense is
stored.

`/start` also configures a persistent `Open ChlatWork` Mini App menu button for
that private chat. `/recent` shows the five newest expenses with guarded Edit
and Delete actions. `/spend Food week` and natural questions such as
`How much did I spend on Food this week?` are read-only.

Voice notes up to 60 seconds and receipt photos up to 10 MB become expense
drafts when `OPENAI_API_KEY` is configured. Voice uses
`OPENAI_TELEGRAM_TRANSCRIPTION_MODEL` (default `gpt-transcribe`) and receipts use
`OPENAI_TELEGRAM_VISION_MODEL` (default `gpt-5-mini`). Receipt images are sent
for one non-stored API response and are never written to ChlatWork storage.
Every AI result still requires the normal Save confirmation.

`/alerts on` enables one budget alert at 50%, 80%, and 100% for each saved
weekly or monthly budget period. `/weekly on 20` enables a Sunday digest at
20:00 in the user's saved timezone; both require the existing Telegram
notification opt-in. Use `/alerts off` or `/weekly off` to stop them.

`/vote` lists the signed-in user's open, published Voting Moments. Choosing one
opens Telegram's chat picker and shares an inline poll whose buttons update the
same Moment vote records as the web experience. Anonymous and name-required
polls use a stable Telegram identity; login-required polls accept votes only
from Telegram accounts linked to ChlatWork.

For a recurring group vote, add the bot as an administrator in the Telegram
group and have a group administrator who owns the poll send `/dailyvote` there. The bot sends today's poll immediately
and starts a fresh local-date round every day at 10:00 while keeping prior
rounds for history and most-selected-place insights. Use `/votetime 11:30` to
change the local delivery time and `/stopdailyvote` to pause delivery without
deleting history. The API process must remain running for scheduled delivery.

After each Telegram vote on a bot-posted group poll, the bot updates the original
and posts the current results with voting buttons again. For non-anonymous polls,
the new message mentions known active group members who have not voted in the
current round. Login-required polls also recognize linked-account web votes.
Anonymous polls omit reminders to preserve participation privacy.

Apply `database/updates/2026-09-08-add-telegram-group-members.sql` manually before
running this version. The bot learns group members from messages it receives,
button interactions, and membership events; Telegram cannot list all existing
members through the Bot API. Existing members should send `/joinvote` in the
group once, especially when privacy mode prevents ordinary messages reaching
the bot. Keep the bot an administrator and include `chat_member` in webhook
updates so departures remove members from reminders. Inline-shared polls only
update in place because their callbacks do not expose the destination chat ID;
use `/dailyvote` in the group for automatic result posts and reminders.

Any linked group member can create a payment tracker with
`/split 60 Alice, Bob, Carol`. Each participant taps their own name to mark paid
and can tap again to undo; one Telegram user cannot claim two names in a split.

Send plain `KHQR` (case-insensitive) or `/$` in a group to show member-name
buttons. Selecting a name posts their uploaded QR in the same group, then deletes
the selected menu message and its buttons. Members without an uploaded image receive
`No KHQR available yet.` and keep the menu available for another selection.
A menu-deletion failure does not retry an already delivered QR.

The menu uses active members from `telegram_group_members` for the current group.
Button labels use their database display names. Images in `member_khqr_images` use
`tg_<telegram_user_id>` as the member key, so renaming a member or sharing a display
name never changes image ownership. There is no manual name mapping or public-file
fallback. Direct `/tg_<telegram_user_id>` commands also require active membership
in the current group. Old filename commands such as `/kakada` no longer select images.

For an individual member, send `/@kakada` or `/$ @kakada`, using their actual
Telegram username. A selected Telegram name mention also works after `/` or `/$ `,
including for members without a username. Plain `@username` messages do not trigger
KHQR replies. Name mentions use Telegram's `text_mention` user ID; typed display
names are never matched to payment images.

Before deploying mention support, manually apply
`database/updates/2026-09-10-add-telegram-member-usernames.sql`. Usernames are recorded
from subsequent messages, callbacks, and membership updates; existing members can
send `/joinvote` in their group to register theirs. Unknown or ambiguous usernames
receive guidance to register or use the `/$` menu. Images remain keyed by Telegram
user ID. Mention requests verify the current username and active membership with
[`getChatMember`](https://core.telegram.org/bots/api#getchatmember), so the bot must
be a group administrator for reliable verification. Changed usernames, departures,
and failed verification never select an image using a stale username.

Observed departures are excluded. Telegram cannot enumerate all members, so new
members must interact with the bot or be observed through membership updates.
The bot must be a group admin or have privacy mode disabled to receive
`KHQR` and `/$` messages reliably.

### Admin member KHQR uploads

The website's `/admin` page includes **Member KHQR**, with a Telegram group selector,
image previews, member search, and Upload/Replace actions. Only active members
observed in the selected group appear. Known vote-schedule titles label groups;
otherwise the selector shows the Telegram group ID. Missing members can send
`/joinvote` in their group. Choose a PNG or JPEG, check its preview and recipient,
then select **Save KHQR**; Cancel leaves the saved image unchanged. Images must
be at most 2 MB. The API detects PNG/JPEG from the file contents, so JPEG bank
exports named `.png` are accepted. Original image bytes are stored without strict
PNG parsing, dimension checks, or re-encoding. Unsupported file formats are rejected.
No packages or storage credentials are needed.

Before deploying this version, manually apply
`database/updates/2026-09-10-add-member-khqr-images.sql`. Images persist in PostgreSQL
and survive frontend/API deployments. Only database uploads are used.
Admin uploads take effect for subsequent bot replies without redeploying images;
they do not modify QR photos already posted to Telegram.

Uploads are keyed by Telegram user ID, so saving one member's QR does not change
another member's image. The same Telegram user shares their image across groups,
while each admin list contains only that group's active members. Uploads saved under
old name aliases are not automatically reassigned; upload them for the correct
member in the admin page if they have not already been updated in the database.
Switching groups clears an unsaved selection and hides responses for the previous
group. Uploads validate that the selected member is still active in that group.
This roster filtering uses existing tables and needs no new database migration.

`GET /admin/member-khqr/groups` lists available groups. Both
`GET /admin/member-khqr?chatId=...` and `POST /admin/member-khqr/:key?chatId=...`
require a valid group ID; omitting it never falls back to all groups. These admin
routes require an authenticated ADMIN. The POST accepts one multipart `image`
field. The website streams uploads
through its authenticated proxy; tokens stay server-side. `GET /member-khqr/:key`
serves uploaded PNG/JPEG images publicly through `/api/member-khqr/:key` on the website, so
Telegram can retrieve them. Content-versioned
URLs prevent a replacement from reusing the previous Telegram image cache.

New QR photo replies are scheduled for deletion 24 hours after Telegram sends
them. Before deploying this API version, manually apply
`database/updates/2026-09-10-add-telegram-member-qr-cleanup.sql`.
The cleanup scheduler checks on startup and every minute, persists deadlines
across restarts, and retries failed deletions after five minutes. The API must
stay running; deletion normally occurs within a minute of the deadline, but
backlogs or delivery failures can delay it. Only tracked QR replies are removed;
the member's command, other group messages, and public PNG files remain.
Previously sent QR messages are not tracked retroactively.
Telegram [limits deletion to messages under 48 hours old](https://core.telegram.org/bots/api#deletemessage),
so extended downtime or lost bot access can leave a QR behind. Expired tracking
records are retired with a warning. Telegram delivery and database registration
are separate operations; registration failures trigger immediate best-effort
removal, but a process crash between those operations can leave an untracked QR.

Configure a random 16-256 character `TELEGRAM_WEBHOOK_SECRET` in the API runtime,
then register the HTTPS endpoint with Telegram. Keep both values in the runtime
secret store; do not commit them:

```text
POST https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook
url=https://chlatwork.com/api/telegram/webhook
secret_token=<TELEGRAM_WEBHOOK_SECRET>
allowed_updates=["message","callback_query","inline_query","chat_member","business_connection","business_message","edited_business_message"]
```

### Telegram Business inbox security

Enable Secretary Mode for the existing ChlatWork bot in BotFather, connect it to
the account whose inbox should be protected, and grant **Delete all messages**
(`can_delete_all_messages`). Ordinary bot chats and group commands keep their
existing behavior. Re-register the webhook with the Business update types above.

Set `TELEGRAM_BUSINESS_SECURITY_ENABLED=true` to scan new and edited incoming
Business messages. Text assessment uses the bot's selected AI provider (`AI_USE_GEMINI`,
`OPENAI_API_KEY` or `GEMINI_API_KEY`, and its existing Telegram text model).
The example configuration keeps scanning and deletion disabled. Configure real
provider values separately in runtime settings. Scanning itself needs no schema change;
the security alerts below require reviewable SQL additions.

Set `TELEGRAM_BUSINESS_SECURITY_AUTO_DELETE=true` to automatically delete when
the result has at least one supported risk category, risk score **90 or greater**,
and confidence **95 or greater**. The thresholds are configurable through
`TELEGRAM_BUSINESS_SECURITY_RISK_THRESHOLD` and
`TELEGRAM_BUSINESS_SECURITY_CONFIDENCE_THRESHOLD`; each accepts integers 90-100.
With automatic deletion off, decisions are logged and messages are preserved.

`SecurityService.scan(message)` classifies scams, phishing URLs, suspicious file
metadata, spam, and explicit dangerous content. Only text, captions, linked URLs,
and document names/MIME types go to the selected AI provider; sender IDs and file
IDs are excluded, and OpenAI requests use `store: false`. Links are not fetched,
and document bytes are sent only to the opt-in private ClamAV scanner described below.
AI file-only findings have confidence capped at 85. Photos, audio, video without scannable captions, and
oversized scan payloads are preserved. AI scores are model estimates, not verified
malware/reputation findings, and cannot guarantee detection or freedom from false
positives. Spam is assessed from the current message, without a sender history.

Each candidate checks its current Business connection and excludes outgoing
account/bot messages and messages at least 48 hours old. Deletion uses
[`deleteBusinessMessages`](https://core.telegram.org/bots/api#deletebusinessmessages)
and requires an active connection with permission to delete incoming messages.
Successful webhook updates use the existing database deduplication; failed
connection/deletion requests release their update claim for Telegram to retry.
Provider failures or invalid assessments cannot themselves authorize deletion;
an independent scanner/AI verdict can still apply. Inconclusive scans complete
the update so they do not repeatedly send private content to the provider.

`TELEGRAM_BUSINESS_SECURITY_MAX_SCANS_PER_MINUTE` defaults to 60 per API process
(allowed range 1-300). Excess messages are preserved; multiple replicas each have
their own limit. Logs contain only action, score, confidence, fixed categories, and
optional fixed `fileScanStatus`/`fileScanReason` and `urlScanStatus`/`urlScanReason` values;
they contain no message content, URLs, filenames, or Telegram identities. Verify
real inbox scanning, edit handling, and deletion permissions after deployment.

If the normal bot responds but inbox scans produce no logs, inspect Telegram's
`getWebhookInfo` and confirm `allowed_updates` includes `business_connection`,
`business_message`, and `edited_business_message`. Enabling Secretary Mode in
BotFather does not replace an existing explicit webhook update list. Re-register
the webhook using the existing URL and secret and the complete update list above.

Runtime logs include `telegram_business_security_status` at startup with only
scanner switches and thresholds. `telegram_webhook_update` records only the
received update type, including normal messages and Business updates. Business
messages skipped before assessment log `telegram_business_security` with
`action: "skipped"` and a fixed reason (`disabled`, `outgoing_message`,
`bot_message`, `expired_message`, or `inactive_connection`). These diagnostics
contain no message bodies, identities, filenames, URLs, or configuration secrets.

#### Security warnings and owner Delete button

When Business security and ClamAV scanning are enabled, a confirmed `infected`
file sends a Khmer/English warning to **both** the account owner's private bot
chat and the original managed conversation. Google Web Risk matches also warn
in both destinations. AI findings with a supported risk category, risk at least
50 and confidence at least 60, also warn in both destinations. Findings with
`phishing_url` or `unsafe_url` and an actual extracted link use a **suspicious-link**
warning; scam, suspicious-file metadata, spam, and dangerous-content findings
use a **security warning**. Both clearly state they are AI assessments. A clean
or unavailable ClamAV/reputation result alone never triggers these warnings;
independent AI evidence must meet both warning thresholds. AI suspicion is never
labelled confirmed malware. Automatic deletion remains optional and keeps its existing minimum
90 risk / 95 confidence thresholds; warnings state whether the message was kept
or deleted.

On first installation, review and manually run
[`prisma/sql/telegram-business-security-alerts.sql`](prisma/sql/telegram-business-security-alerts.sql).
Keep this original creation script unchanged. For both new installations and
existing alerts tables, review and manually run the separate upgrade
[`prisma/sql/telegram-business-security-owner-alert-details.sql`](prisma/sql/telegram-business-security-owner-alert-details.sql)
before deploying. The application does not apply SQL scripts. This new upgrade
adds private report snapshots and their delivery revisions, plus the durable
finding types from the earlier link/warning upgrades if missing. Existing
installations can run this latest upgrade directly on their alerts table.
The previous creation, link-alert and warning-alert SQL files remain unchanged.
Existing delivered file alerts are retained without being resent by the upgrade.
No changes to the webhook update list are needed if `callback_query` and the
Business update types above are already registered.

- `TELEGRAM_BUSINESS_SECURITY_OWNER_ALERTS` defaults to `true` when security
  is enabled; set it to `false` to disable owner private alerts and Delete buttons.
- `TELEGRAM_BUSINESS_SECURITY_CHAT_ALERTS` defaults to `true`; set it to `false`
  to keep warnings in the owner's private bot chat only. Set both alert switches
  to `false` to disable warnings.
- AI warnings default to `TELEGRAM_BUSINESS_SECURITY_WARNING_RISK_THRESHOLD=50`
  and `TELEGRAM_BUSINESS_SECURITY_WARNING_CONFIDENCE_THRESHOLD=60`. Each accepts
  integers 1–100. Startup logs report `warningRiskThreshold` and
  `warningConfidenceThreshold`. Empty risk categories, failed assessments, and
  findings below either threshold do not warn. Confirmed ClamAV/Web Risk matches
  still alert independently of these AI warning thresholds. These settings never
  change the separate auto-delete thresholds or permissions. Moderate findings
  are kept for the owner to review; the private alert offers **Delete message**.
  Both Gemini and OpenAI receive guidance to assign review-level risks for
  concrete warning signs; uncertainty or an unfamiliar URL alone is insufficient.
- Open the main bot and send `/start` so the owner can receive private messages.
  The recipient is Telegram's `BusinessConnection.user_chat_id`, never the sender.
- Enable **Reply to messages** (`can_reply`) in Secretary Mode to post warnings
  in the managed chat. Telegram permits Business replies/edits in chats with
  incoming messages in the last 24 hours; the app conservatively skips warnings
  for source messages older than that. Missing reply permission does not prevent
  the owner alert or deletion.
- **Delete file / លុបឯកសារ** appears only in the owner alert while the source message
  is retained. It deletes the original message containing the file, independently
  of the automatic deletion setting. Only that owner may click it; the app checks
  the exact private alert message, active connection, and current **Delete all
  messages** permission again. Actions expire 48 hours after the source message.
  After success, both existing warnings show Deleted and the button is removed.
  Link warnings use **Delete message / លុបសារ** with the same authorization and
  expiry checks; it deletes the original message containing the link.

Managed-chat warnings contain the scanner verdict, source message number/time,
and deletion outcome. The owner's private report additionally includes the
Telegram sender's name, username and ID; source chat ID; filename, reported MIME
type and size; up to five distinct link destinations and their displayed labels;
sent/scan times in Phnom Penh (UTC+07); risk/confidence, categories, file/link scan
status, failure reasons and reputation threat types where available. Missing
metadata is reported as unavailable. An unlisted URL is not proof of safety, and
an aggregate link finding does not necessarily identify which individual URL
triggered it. Names are Telegram display metadata, not verified identities.

Private link destinations use `hxxps://example[.]com/path` to prevent accidental
opening. Credentials, query strings and fragments are omitted, including URLs
embedded in filenames, names or link labels; control/bidirectional formatting
characters are removed. Owner reports use plain text and disable link previews
on both sends and edits ([Telegram link preview options](https://core.telegram.org/bots/api#linkpreviewoptions)).
No complete message body, attachment bytes, or Telegram file token is retained.
Sender details stay out of AI requests and logs. Reports describe scanner
findings without accusing the sender.

Temporary action records retain a bounded metadata snapshot only for the owner
audience, enforced by a database constraint. The snapshot survives delivery
retries and Delete-button updates; same-finding edited messages refresh the
details and scores. It expires with the existing action record, 48 hours after
the source message (the background sweep does not erase already-sent Telegram
alerts). Existing queued alerts without a snapshot keep their brief report.
A shared database claim suppresses concurrent duplicate sends/clicks
across API replicas. Delivery retries up to three attempts (after 1 minute, then
5 minutes), with a current connection check; expired records are removed by a
bounded background sweep. A lost Telegram response can still cause a duplicate
warning on retry because Telegram offers no send-message idempotency key.
Notification failures never stop security handling. Logs use fixed
`telegram_business_security_alert` events without private context.

Verify both warning destinations and the owner button after deployment using a
harmless EICAR test file. Local unit tests do not send Telegram messages or
apply database changes. See Telegram's
[`BusinessBotRights`](https://core.telegram.org/bots/api#businessbotrights) and
[`sendMessage`](https://core.telegram.org/bots/api#sendmessage) reference.

#### Real URL reputation scanning (Google Web Risk Lookup)

This checks Google's reputation data for public HTTP/HTTPS targets in Telegram
URL entities, disguised `text_link` targets, plain text, and captions. The API
does **not** open submitted links, follow redirects, download linked files, or
inspect webpage content. ClamAV handles Telegram document attachments separately.

1. Enable **Web Risk API** in a Google Cloud project with billing configured.
   Create a server API key restricted to Web Risk API; configure it in Railway's
   **chlatwork API service**, separately from any AI-provider key.
2. Set `TELEGRAM_BUSINESS_SECURITY_ENABLED=true`,
   `TELEGRAM_BUSINESS_URL_SCAN_ENABLED=true`, and `WEBRISK_API_KEY` at runtime.
   The placeholder in `.env.example` must be replaced in Railway. AI is optional
   for reputation matches, but is needed to assess new/unlisted phishing links.
3. Apply the reviewable SQL above manually and redeploy. At startup check
   `urlScanEnabled: true`. Per-message logs report `urlScanStatus` and a fixed
   `urlScanReason` on failures, without raw URLs or API keys.
4. Send Google's harmless reputation test URL
   `http://testsafebrowsing.appspot.com/s/malware.html` as a new incoming message
   to the connected Business account. Expect `urlScanStatus: "unsafe"`, risk and
   confidence 100, warnings in both chats, and the owner Delete button when kept.
   The owner must have sent `/start`; current-chat warnings require Secretary
   Mode's **Reply to messages** permission. Auto-delete remains opt-in.

Lookup sends the URL path and query to Google; this feature is explicitly opt-in.
Fragments, credential-bearing URLs, common token/password/signature query
parameters, local/internal hosts, private IPv4 targets, and IPv6 literals are
excluded from reputation requests. It does not resolve DNS. URLs that fail
validation or exceed limits have an inconclusive status; a missing reputation
match (`not_listed`) is **not** a guarantee of safety. AI assessment continues
after missing matches or provider failures. Submitted links are not retained
in the database or logs; bounded in-memory caches hold target hashes and verdicts.

Default limits: 5 distinct links per message, 2 concurrent requests per API
process, 60 requests/minute per process, and a 5-second deadline per lookup.
Configure `TELEGRAM_BUSINESS_URL_SCAN_MAX_LINKS` (1–10),
`TELEGRAM_BUSINESS_URL_SCAN_MAX_CONCURRENT` (1–4),
`TELEGRAM_BUSINESS_URL_SCAN_MAX_REQUESTS_PER_MINUTE` (1–300), and
`WEBRISK_TIMEOUT_MS` (1,000–10,000) as needed. Identical simultaneous targets
share one request. Negative results cache for 30 seconds; matches cache for at
most 10 minutes and never beyond Google's expiry. Failures are not cached.
These limits are per process, so set a project-wide Google quota/billing budget
as well when using replicas. The local rate limit is not a monthly spending cap.

Google currently includes the first 100,000 Lookup requests/month at no charge,
then charges $0.50 per 1,000 at the next tier. Using the Update API's
`threatLists.computeDiff` in the same project changes Lookup pricing to the
Update API rate; this implementation uses Lookup only. Review Google's
[pricing](https://cloud.google.com/web-risk/pricing),
[Lookup guide](https://docs.cloud.google.com/web-risk/docs/lookup-api), and
[API-key header guidance](https://docs.cloud.google.com/docs/authentication/api-keys-use).
Local tests mock Google and Telegram; live reputation and warning delivery
must be checked after runtime configuration and deployment.

#### Real document malware scanning (ClamAV)

Set `TELEGRAM_BUSINESS_FILE_SCAN_ENABLED=true` and configure a **private** ClamD
endpoint. Every supported incoming Telegram `document` is downloaded from Telegram
and scanned as bytes, regardless of extension or reported MIME. The API keeps bytes
only in bounded process memory; ClamD may use temporary files during scanning and
removes them afterward. Bytes are never sent to the AI provider or a public file
analysis service. Photos, voice messages, and videos sent as media are not scanned;
send them as documents if document scanning is needed. Links are still assessed
from message text; they are not fetched or reputation-checked.

| Setting                                      | Default               | Accepted values                                      |
| -------------------------------------------- | --------------------- | ---------------------------------------------------- |
| `TELEGRAM_BUSINESS_FILE_SCAN_ENABLED`        | `false`               | `true` / `false`; requires Business security enabled |
| `CLAMAV_HOST`                                | required when enabled | Loopback/private IP or `<service>.railway.internal`  |
| `CLAMAV_PORT`                                | `3310`                | 1-65535                                              |
| `CLAMAV_TIMEOUT_MS`                          | `10000`               | 1000-30000; total socket deadline                    |
| `TELEGRAM_BUSINESS_FILE_SCAN_MAX_BYTES`      | `10485760` (10 MiB)   | 1-20971520 (20 MiB)                                  |
| `TELEGRAM_BUSINESS_FILE_SCAN_MAX_CONCURRENT` | `2`                   | 1-4 per API process, including downloads             |

ClamAV signature findings produce `riskScore: 100`, `confidence: 100`, category
`suspicious_file`, and `fileScanStatus: "infected"`. These scores represent the
engine verdict, not AI certainty. Existing auto-delete, thresholds, age, incoming
message, and deletion permission gates still apply. With auto-delete off, infected
documents are preserved and logged. A clean engine result means no known signature
was detected; it does not prove a file is safe.

Disabled scanning, missing/oversized files, saturated concurrency, download errors,
scanner outages, malformed responses, encrypted files, and heuristic/scan-limit
findings never authorize malware deletion. Logs show `disabled`, `unsupported`,
`busy`, or `unavailable` and a fixed reason where relevant. Files are not queued
or retried after an acknowledged update. Independent high-confidence phishing or
scam text/captions can still trigger the existing AI deletion rules, including
when file scanning is unavailable. With file scanning enabled, an AI provider is
optional for document malware detection; text assessment still requires the
selected provider. No database migration or additional webhook update type is needed.

#### Railway scanner setup

1. Add a separate service named `clamav` from this repository in the **same project
   and environment** as the Nest API. Set its root directory to `/infra/clamav`;
   Railway should use that directory's `Dockerfile`. Keep the existing API service
   root/build/start settings. Use one scanner replica initially.
2. Give the scanner about **4 GiB RAM** and attach a volume at `/var/lib/clamav`
   for official signature updates. Leave FreshClam enabled. Initial signature
   download/engine loading can take several minutes. Maintain the pinned ClamAV
   image as upstream security patches are released. See the
   [official Docker guide](https://docs.clamav.net/manual/Installing/Docker.html).
3. Use only Railway private networking. Create **no public domain or TCP proxy**
   for ClamAV: the [ClamD TCP protocol](https://docs.clamav.net/manual/Usage/Scanning.html)
   has no authentication or TLS. Copy the scanner's private hostname into the
   API's `CLAMAV_HOST` (normally `clamav.railway.internal`), port `3310`.
   See [Railway private networking](https://docs.railway.com/networking/private-networking).
4. In the API runtime settings, enable `TELEGRAM_BUSINESS_SECURITY_ENABLED` and
   `TELEGRAM_BUSINESS_FILE_SCAN_ENABLED`. Start with
   `TELEGRAM_BUSINESS_SECURITY_AUTO_DELETE=false`, then deploy the API changes.
   Startup logs should show `scanningEnabled: true` and `fileScanEnabled: true`.
5. From the built API container, run this smoke check (no bot token needed):

   ```sh
   node scripts/check-clamav.cjs clamav.railway.internal 3310
   ```

   It uses the production client to check ordinary bytes and the harmless
   [EICAR antivirus test marker](https://www.eicar.org/download-anti-malware-testfile/)
   against the real scanner. It writes no attachment and sends no Telegram message.

6. Send an ordinary test document and an EICAR test document **from another account**
   into a chat covered by the bot connection. Check `fileScanStatus` in logs for
   `"clean"` and `"infected"` with `action: "preserved"`. After this succeeds,
   enable auto-delete and test incoming deletion permissions separately.

For local development, build/run the scanner explicitly and expose its TCP port
only on loopback, then run the smoke check after building the API:

```sh
docker build -t chlatwork-clamav infra/clamav
docker run --name chlatwork-clamav -d -p 127.0.0.1:3310:3310 \
  --mount source=chlatwork-clamav-db,target=/var/lib/clamav chlatwork-clamav
cd api
npm run build
node scripts/check-clamav.cjs 127.0.0.1 3310
```

Enable inline mode in BotFather with `/setinline` and use a placeholder such as
`Share a ChlatWork vote`. Without inline mode, the `/vote` share buttons cannot
insert the poll into another Telegram chat.

Configure these commands through BotFather or the Bot API:

```text
start - Open the ChlatWork assistant
today - Show today's expenses
recent - Edit or delete recent expenses
spend - Ask about spending by category and date range
alerts - Manage budget threshold alerts
weekly - Manage the Sunday spending digest
vote - Share a published voting Moment
dailyvote - Set up a daily vote in this group
joinvote - Register for this group's voting reminders
votetime - Change this group's daily vote time (HH:MM)
stopdailyvote - Stop this group's daily vote
split - Split a group expense and track payments
cancel - Cancel the latest pending expense
menu - Show the assistant menu
help - Show the assistant menu
```
