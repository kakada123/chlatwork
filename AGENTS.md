Always work with a 10/10 engineering mindset.

Security rules for Codex work in this repository:

- Never open, read, cat, grep, parse, summarize, redact, copy, or print real env or secret files.
- Treat these paths and patterns as forbidden for inspection: `.env`, `.env.*`, `*.env`, `*.env.*`, `.vercel/.env*.local`, `.vercel/**/*.env*`, `*secret*`, `*credential*`, `*service-account*.json`, `firebase*.json`, `*.pem`, `*.key`, `*.p12`, and `*.pfx`.
- Use `.env.example` only, and keep it limited to dummy placeholder values.
- Ask the user for safe dummy values if a task needs configuration examples.
- Never run commands that expose environment variables, including `env`, `printenv`, `vercel env pull`, `vercel pull`, or `vercel build --yes`.
- Never run Vercel env pull commands during Codex work.

Before changing code:

- Understand the existing structure first.
- Inspect related non-secret files before editing.
- Avoid guessing. If something is unclear, make the smallest safe assumption and explain it.
- Prefer minimal, targeted changes instead of rewriting everything.
- Do not refactor unrelated code.

Coding style:

- Write clean, readable, production-ready code.
- Use clear naming and consistent formatting.
- Add comments where they explain WHY the code exists, not obvious WHAT the code does.
- Keep code simple, maintainable, and easy for teammates to review.
- Preserve current project conventions.
