# YouTube Downloader Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Add a working, authenticated YouTube-to-MP4 download tool to ChlatWork.

**Architecture:** Nuxt handles the form and authenticated job requests; the existing Railway NestJS API prepares bounded temporary MP4 files with yt-dlp. Expiring random tickets deliver files directly from Railway without exposing account tokens. The first release runs on one API replica with ephemeral jobs and disk.

**Tech Stack:** Nuxt 4, Vue 3, NestJS 11, Node 22+, Python 3.10+, yt-dlp, ffmpeg/ffprobe, Jest, and Node's test runner. No new database schema or frontend test framework.

**Spec:** `docs/superpowers/specs/2026-10-08-youtube-downloader-design.md` (approved on 2026-10-08).

## Global Constraints

- Never inspect real env/secret files; modify only `api/.env.example` with placeholders.
- Public non-live, non-DRM, unrestricted videos only; MP4 with video and audio, up to 1080p.
- 20-minute source duration; 200 MiB final output; two active preparations per process; one active preparation per user; eight retained jobs per process.
- Five-minute preparation timeout; ten-minute ready-file retention; two-minute download tickets.
- Bound preview concurrency to two and preview execution to 30 seconds; reject capacity overflow.
- Single Railway API replica; jobs expire on restart; runtime flag disabled by default.
- Availability checks precede processing and file delivery. Authentication gates all metadata and job endpoints; only ticket delivery uses capability-based access.
- Khmer/English parity, server-processing disclosure, existing login/favorites/usage patterns, and no unrelated changes.
- Automated checks never contact YouTube, load real env files, deploy, or execute database changes.

## Review Focus

- Input changes while a preview/job request resolves: stale responses must not replace the current input's state (Task 4).
- Cancellation while yt-dlp or ffmpeg is running: terminate the process group, then clean files and release capacity exactly once (Task 2).
- Expiry during a slow transfer: retain the file until the transfer finishes or disconnects (Tasks 2 and 3).
- Unknown media size or silent video-only output: enforce disk bounds during work and verify audio/video after preparation (Tasks 1 and 2).
- Runtime flag enabled with an invalid public origin or missing executable: return a safe unavailable error before accepting jobs (Tasks 3 and 5).

## File Responsibilities

- `api/src/youtube-downloader/`: dedicated contracts, input policy, process runner, job service, controller, DTOs, module, and focused specs.
- `server/api/youtube-downloader/`: explicit authenticated JSON handlers; no file proxy.
- `app/lib/youtube-downloader.ts`: frontend wire types and a testable request-generation/polling controller with injected transport/timers.
- `app/composables/useYoutubeDownloader.ts`: Vue lifecycle adapter for that controller.
- `app/pages/tools/youtube-downloader.vue`: compact responsive form and result UI.
- Existing registries: route/category/vector icon/guide/admin availability integration.
- `api/Dockerfile.youtube-downloader`, `api/.dockerignore`, `api/requirements-youtube-downloader.txt`, and setup documentation: opt-in runtime recipe and safe configuration examples.

### Task 1: Video policy and subprocess boundary

**Files:** Create `api/src/youtube-downloader/youtube-downloader.types.ts`, `youtube-downloader.policy.ts`, `youtube-downloader.runner.ts`, `youtube-downloader.policy.spec.ts`, and `youtube-downloader.runner.spec.ts` in the same directory.

**Interfaces:**
- `YoutubeQuality = 360 | 480 | 720 | 1080`.
- `YoutubePreview = { videoId: string; title: string; thumbnailUrl: string; durationSeconds: number; qualities: YoutubeQuality[] }`.
- `YoutubeJobView = { id: string; status: 'preparing' | 'ready' | 'failed' | 'cancelled' | 'expired'; expiresAt: string | null; fileName?: string; sizeBytes?: number; errorCode?: string }`.
- `normalizeYoutubeUrl(input: string): { videoId: string; url: string }` reconstructs the canonical watch URL.
- `readYoutubePreview(raw: unknown, expectedVideoId: string): YoutubePreview` validates bounded metadata and derives quality choices from compatible audio/video formats.
- `YoutubeDownloaderRunner.preview(url: string, signal: AbortSignal): Promise<YoutubePreview>` and `.download(url: string, quality: YoutubeQuality, directory: string, signal: AbortSignal): Promise<{ path: string; sizeBytes: number }>`.

- [x] Write policy tests: `normalizes_watch_short_and_share_urls`, `rejects_spoofed_hosts_credentials_ports_and_invalid_ids`, `rejects_live_drm_private_and_over_1200_seconds`, and `offers_only_compatible_qualities_at_or_below_1080`. Assert canonical ID preservation and reject sizes above `200 * 1024 * 1024`.
- [x] Run the policy spec and confirm it fails because its implementation is absent.
- [x] Implement exact-host parsing, bounded metadata sanitization, and fixed format selection. Require H.264 MP4 video plus AAC audio or a progressive MP4 containing both. Never accept a client-supplied format expression.
- [x] Write runner tests with controlled spawn/filesystem fixtures: `uses_fixed_argv_without_shell_or_cookies`, `bounds_output_and_retries`, `kills_process_group_on_abort_or_timeout`, `stops_unknown_size_disk_growth`, and `verifies_final_mp4_audio_video_size`. Assert preview timeout `30000`, preparation timeout `300000`, and final size `<= 209715200`.
- [x] Implement the runner with `--ignore-config`, `--no-playlist`, cache disabled, explicit Node JS runtime, restricted retry counts, fixed random output directory, and ffprobe verification. Bound subprocess stdout to 2 MiB. Cap aggregate preparation directory growth to 450 MiB, checking every 250 ms; remove all artifacts after failure. Terminate the process group before cleanup.
- [x] Run both specs successfully using the backend test command below. Review only the new runner's process and file boundaries.

### Task 2: Bounded temporary jobs and tickets

**Files:** Create `api/src/youtube-downloader/youtube-downloader.service.ts` and `youtube-downloader.service.spec.ts`.

**Interfaces:** Consumes Task 1 contracts/runner. Produces `preview(userId: string, url: string): Promise<YoutubePreview>`, `createJob(userId: string, url: string, quality: YoutubeQuality): Promise<YoutubeJobView>`, `getJob(userId: string, jobId: string): YoutubeJobView`, `cancelJob(userId: string, jobId: string): Promise<void>`, `issueTicket(userId: string, jobId: string): { token: string; expiresAt: string }`, and `leaseDownload(token: string): { path: string; fileName: string; sizeBytes: number; release: () => Promise<void> }`.

- [x] Write failing tests: `rejects_cross_user_read_cancel_and_ticket`, `enforces_two_global_one_per_user_and_eight_retained_limits`, `expires_ready_files_after_600000ms`, and `expires_tickets_after_120000ms`. Use fake timers and actual isolated temporary-file fixtures.
- [x] Add race tests: `reserves_capacity_before_async_work`, `cancellation_waits_for_child_exit`, `releases_capacity_once_after_failure`, `holds_expired_file_until_stream_release`, and `shutdown_cancels_workers_and_cleans_owned_paths`. Unknown IDs return owner-neutral not-found responses.
- [x] Run the service spec to establish failure.
- [x] Implement atomic admission before awaits, cryptographically random IDs/tickets, owner-scoped job access, bounded maps, and a single cleanup timer. Directory ownership is established by service creation, never by request input. Hold expired files through active leases and make release idempotent.
- [x] Run service and runner specs successfully. Verify no uncaught background rejection or retained timer prevents test exit.

### Task 3: Authenticated API and direct attachment delivery

**Files:** Create `api/src/youtube-downloader/dto/youtube-preview.dto.ts`, `dto/create-youtube-job.dto.ts`, `youtube-downloader.controller.ts`, `youtube-downloader.controller.spec.ts`, `youtube-downloader.module.ts`, and `youtube-downloader.config.ts`. Modify `api/src/app.module.ts` and `api/src/feature-availability/feature-catalog.ts`. Create Nuxt handlers `server/api/youtube-downloader/preview.post.ts`, `jobs/index.post.ts`, `jobs/[id].get.ts`, `jobs/[id].delete.ts`, and `jobs/[id]/ticket.post.ts`.

**Interfaces:** Task 2 methods supply the spec's six NestJS endpoints. Preview body is `{ url: string }`; creation body is `{ url: string; quality: YoutubeQuality }`; creation returns HTTP 202 and `YoutubeJobView`; cancellation returns HTTP 204. Ticket response is `{ downloadUrl: string; expiresAt: string }`. The URL is assembled from a validated server-only public API origin and the random ticket.

- [x] Write controller tests: `requires_login_for_preview_jobs_and_tickets`, `checks_availability_before_side_effects`, `rejects_unknown_properties_invalid_ids_and_qualities`, `rejects_disabled_runtime_or_invalid_origin`, `streams_attachment_without_jwt_in_url`, and `releases_lease_on_finish_disconnect_and_stream_error`. Assert no-store and no-referrer headers and safely encoded attachment names.
- [x] Run the controller spec and verify failure.
- [x] Implement validated DTOs and explicit guards for all JSON routes. Use `FeatureAvailabilityService.isEnabled('website:youtube-downloader')` and the runtime flag; dependency-check failures return generic 503 responses. Ticket access rechecks availability and leases only the matching ready file; missing/expired tickets produce safe errors.
- [x] Implement explicit Nuxt JSON handlers using `requestAuthenticatedApi` from `server/utils/auth.ts`, including method-specific paths and no-store headers. Forward no cookies or user-supplied upstream URL. Ticket URLs require an HTTPS origin in production; allow localhost HTTP for development only.
- [x] Register the module and availability key. Run policy, runner, service, and controller specs successfully.

### Task 4: Download page and existing tool discovery

**Files:** Create `app/lib/youtube-downloader.ts`, `app/composables/useYoutubeDownloader.ts`, `app/pages/tools/youtube-downloader.vue`, and `tests/youtube-downloader.test.ts`. Modify `app/lib/tool-registry.ts`, `app/data/tool-categories.ts`, `app/data/tool-guides.ts`, and `app/data/site-routes.ts`.

**Interfaces:** Frontend wire types match Task 1 and Task 3 exactly. `createYoutubeDownloaderController(deps)` consumes injected JSON transport, timers, and a change callback; produces `preview(url)`, `prepare(quality)`, `cancel()`, `reset()`, and `dispose()`. `useYoutubeDownloader()` adapts it to reactive state, existing auth, and component disposal. Poll every two seconds only while a current job is preparing.

- [x] Write controller tests: `ignores_old_preview_after_input_change`, `cancels_job_created_after_reset`, `stops_polling_on_terminal_state_or_dispose`, `ignores_inflight_poll_after_cancel`, `surfaces_login_expiry_capacity_and_restart_errors`, and `requests_fresh_ticket_only_on_download_click`.
- [x] Run `node --test --experimental-strip-types tests/youtube-downloader.test.ts` and confirm failure.
- [x] Implement generation-based stale-request invalidation, cancellation of late-created jobs, bounded polling, and safe error-code mapping. API calls use same-origin Nuxt handlers; direct file navigation uses only the server-issued ticket URL with `referrerpolicy="no-referrer"`.
- [x] Implement the page using existing theme classes and `useLanguage`. Include URL input, loading/error state, thumbnail/title/duration, enumerated quality selector, preparation status, Cancel, and Download MP4. Keep limits and server processing visible; integrate existing login prompt, favorite control, and completion usage event.
- [x] Add a beta Utilities tool, vector icon paths/classes, and membership in the existing file-conversion category. Add guide content with explicit server-processing privacy copy. Add its route to `ALL_TOOL_PAGE_PATHS`; preserve the existing indexability allowlist.
- [x] Run the new controller tests and existing catalog/artwork/usage/mobile checks; compile the new Vue SFC with `@vue/compiler-sfc` without Nuxt config/env loading. Resolve only new failures.

### Task 5: Opt-in Railway runtime recipe

**Files:** Create `api/Dockerfile.youtube-downloader`, `api/.dockerignore`, and `api/requirements-youtube-downloader.txt`. Modify `api/.env.example` and `api/README.md`. Create `api/src/youtube-downloader/README.md` and `youtube-downloader.config.spec.ts`.

**Interfaces:** `readYoutubeDownloaderConfig(config: ConfigService)` produces `{ enabled: boolean; publicBaseUrl: string | null; ytdlpPath: string; ffmpegPath: string; ffprobePath: string }`. Variables: `YOUTUBE_DOWNLOADER_ENABLED=false`, `YOUTUBE_DOWNLOADER_PUBLIC_BASE_URL=http://localhost:3002`, and `YOUTUBE_DOWNLOADER_YTDLP_PATH=yt-dlp`; reuse `FFMPEG_PATH` and `FFPROBE_PATH`.

- [x] Write config tests: `defaults_disabled`, `rejects_missing_or_non_https_production_origin`, `rejects_url_credentials_queries_and_fragments`, and `does_not_accept_arbitrary_runtime_args`. Run the spec to confirm failure.
- [x] Implement config validation without requiring downloader configuration while the runtime flag is disabled. Run config/controller specs successfully.
- [x] Pin `yt-dlp[default,pin]==2026.8.19` (official release tag `2026.08.19`) in the dedicated requirements file; add an image-build check for the compatible EJS dependency before activation. Reference the official release and EJS documentation in setup notes.
- [x] Create an opt-in Node 22/Python/ffmpeg API image recipe with locked npm dependencies and pinned Python requirements; use an unprivileged runtime user. Docker context excludes real env files, secret/credential/key/certificate patterns, node_modules, caches, and local outputs. Verify exclusion patterns without reading forbidden files.
- [x] Document build context, configured Dockerfile, public origin, one replica, runtime activation, restart expiry, resource limits, and dependency refresh procedure. Do not change deployment configuration or install packages on the user's machine in this task.
- [x] Validate recipe syntax and examples locally. A container build or live Railway probe requires an available approved environment; report those separately if unavailable.

### Task 6: Focused verification and reviewable delivery

**Files:** All implementation files above; update this plan's checkboxes and the design review status.

- [x] Run backend checks directly, avoiding npm lifecycle hooks that may load real configuration:
  - `node api/node_modules/jest/bin/jest.js --config api/jest.config.cjs --runInBand --cacheDirectory api/.cache/youtube-jest --testPathPatterns youtube-downloader`
  - `node api/node_modules/typescript/bin/tsc --project api/tsconfig.build.json --noEmit --incremental false`
- [x] Run frontend checks: `node --test --experimental-strip-types tests/youtube-downloader.test.ts tests/tool-catalog-visibility.test.ts tests/tool-artwork.test.ts tests/tool-usage.test.ts tests/tools-mobile-ux.test.ts`; validate the page through the standalone Vue compiler. Do not start the configured app or invoke an env-loading Nuxt build.
- [x] Check changed-file formatting and `git diff --check`. Baseline-compare unrelated type failures. Confirm tests contact neither YouTube nor a database, and no real env/secret content is in the diff.
- [x] Review cross-layer contract names, ownership checks, process termination, resource bounds, ticket handling, cleanup, bilingual UI, and server-processing copy. Native execution may use one explicitly skill-authorized reviewer; do not dispatch implementers without the selected execution method.
- [x] Report changed files, behavior, focused validation, and any unverified runtime/live delivery. Supply the scoped commit message `feat: add YouTube video downloader`; commit/push or deployment happens only within the user's authorized execution scope.

## Plan Review Status

Approved and implemented in the current checkout on `feature/youtube-downloader`. Independent review findings were reproduced and fixed with regression tests. All local source checks pass; the runtime remains disabled until configured. No commit, push, deployment, dependency installation, or database change was performed.

### Runtime verification remaining

- [ ] Build the opt-in Docker image and verify installed yt-dlp, EJS, Node, ffmpeg, and ffprobe. Docker is unavailable on this host.
- [ ] Validate a permitted public video through deployed Railway preview, preparation, direct attachment delivery, cancellation, expiry, and real directory removal. Live sockets and directory removal are restricted on this managed host; local tests use documented adapters.

### Final local verification

- Frontend: 224 tests pass.
- Backend: 903 tests pass across 67 suites, including 64 downloader tests. Existing fixture paths require 66 suites from the repository root and the schema suite from `api/`; unrelated tests were not changed.
- API TypeScript check, standalone Vue/TypeScript compilation, and `git diff --check` pass.
- See `youtube-downloader-progress.md` for implementation rulings and verification limits.

## Runtime Sources

- Official pinned release: https://github.com/yt-dlp/yt-dlp/releases/tag/2026.08.19
- YouTube challenge runtime/dependencies: https://github.com/yt-dlp/yt-dlp/wiki/EJS
