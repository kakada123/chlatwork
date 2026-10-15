# Khmer translation tools

“Latin” means romanized Khmer written with English letters, such as `nh jol jit`, rather than the Latin language.

| Tool            | Website route                     | Creator Telegram command |
| --------------- | --------------------------------- | ------------------------ |
| Khmer → Latin   | `/creator/khmer/khmer-to-latin`   | `/khmer_to_latin`        |
| Khmer → English | `/creator/khmer/khmer-to-english` | `/khmer_to_english`      |
| Latin → English | `/creator/khmer/latin-to-english` | `/latin_to_english`      |
| English → Latin | `/creator/khmer/english-to-latin` | `/english_to_latin`      |

All four also appear in the Creator website's Khmer AI section and the Creator Telegram bot's inline menu. Selecting a bot mode applies it to subsequent text messages; a command followed by text converts that message directly. The existing `/latin` command remains Latin → Khmer.

Each request costs 1 credit, accepts up to 4,000 characters, and uses the existing account limits, feature availability switches, saved history, idempotency and refund handling. Khmer → Latin preserves the Khmer language while changing its script. English → Latin translates into Khmer before romanizing it. These tools use AI, so ambiguous chat abbreviations may produce different spellings or interpretations.

## Release order

1. Review and manually execute `database/updates/2026-10-15-add-creator-khmer-translations.sql`. Run its enum additions in autocommit mode before the constraint transaction. It retains existing chats and requests.
2. Regenerate Prisma from `api/prisma/schema.prisma` with the usual `npm --prefix api run prisma:generate` command in the deployment environment.
3. Deploy the API and website, then verify all four directions on the signed-in website and linked Creator Telegram account. These checks require the configured AI provider and bot.

No new environment variables are required. The SQL is provided for manual review and execution; it is not run by this change.
