# Execution ledger - plan: 2026-10-08-youtube-downloader.md

- Design and plan approved; user requested immediate implementation in this session.
- Ruling: use the current checkout on a new local feature branch rather than a second worktree. This preserves the approved documents and installed dependencies; no existing product edits were present.
- Pre-flight: policy/runner -> service -> controller -> frontend share the documented preview/job contracts; no interface conflicts found.
- Ruling: extend the backend usage allowlist as well as discovery registries, because the new tool's completion events otherwise fail validation.
- Baseline: 11 focused frontend tests pass. No real environment files inspected.
- Ruling: use a test-only adapter for the host's rmdir denial after verifying fixture files were actually unlinked. Production deletion remains unchanged; complete directory removal still needs runtime validation. Test fixtures now live in ignored api/.cache.
- Tasks 1-4: implemented. Policy/config/runner/service tests pass (51 tests); socket-free Nest API tests pass (6 tests); frontend controller and existing discovery checks pass (18 tests).
- Ruling: use socket-free Express/Nest request injection because the managed host rejects listen even outside the sandbox. This exercises the real routing/guards/validation/streaming middleware without opening a listener.
- Task 5: opt-in runtime recipe and setup guide written. Use upstream default,pin extras to pin the solver and transitive Python dependencies. No packages installed and no deployment performed.
- Task 6: final verification and independent review in progress.
- Final review: three Important issues reproduced with failing tests: portrait quality, cancellation/sweep interleaving, and competing format selection. Fixes use the shorter video dimension, skip all running jobs during sweeping, and select sanitized eligible format IDs from fresh metadata.
- Additional fixes: safe synchronous spawn errors and correct JSON headers when an attachment cannot be opened; regression tests observed failing before changes.
- Ruling: a fresh metadata query before choosing exact format IDs adds one bounded provider lookup per job, so download selection matches the validated size/codec policy. The job's overall five-minute deadline remains enforced.
- Review fixes verified: all 64 downloader tests pass after formatting; API type checking and standalone Vue/TypeScript compilation pass.
- Broader checks found the expected guide count needs to increase from 34 to 35 for the new tool. Updated that assertion. Backend schema test resolves SQL relative to api/; rerunning the full suite from its intended working directory. New fixture paths are cwd-independent.

- Final verification: 224 frontend tests pass; 903 backend tests pass across 67 suites, including all 64 downloader tests. Existing backend fixtures need two working directories: 66 suites from the root, and the schema suite from api/. No unrelated backend tests were changed.
- API TypeScript check and standalone Vue/TypeScript compilation pass. New source files were formatted and scoped diff checks pass.
- Implementation complete on feature/youtube-downloader; no commit or push. Docker and yt-dlp/ffmpeg are unavailable locally. Container build, deployed download delivery, socket behavior, and complete directory removal remain explicitly unverified; the runtime defaults disabled.
