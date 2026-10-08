# YouTube video downloader

## Intent and chosen approach

Add a ChlatWork tool that downloads a single public YouTube video as an MP4.
The user selected the existing Railway API with yt-dlp over a third-party API.
The tool follows existing directory, favorites, usage, authentication, and
admin-controlled availability patterns. No unrelated tools or APIs change.

## User flow

1. Open `/tools/youtube-downloader` and paste a YouTube watch, short, or share URL.
2. Sign in using the existing login flow before requesting server processing.
3. Preview the title, thumbnail, duration, and available MP4 quality choices.
4. Select an available quality, up to 1080p, and start preparing the download.
5. Show preparation status, cancellation, and actionable errors.
6. When ready, download the file directly from Railway using a short-lived ticket.

Changing the input clears stale preview and result state. Polling stops on
navigation, cancellation, expiry, success, or terminal failure. Khmer and English
labels follow the existing language composable. The page explains that processing
happens on the server and that temporary files expire; it does not claim local-only
processing. It asks users to download videos they own or have permission to save.

## Application boundaries

- A new Nuxt page and focused composable own form state and job polling.
- Tool registry, category, icon, guide, and route discovery entries expose the tool.
- Explicit Nuxt API handlers forward small authenticated metadata/job requests
  using the existing server-owned access token. Browser scripts receive no JWT.
- A new NestJS module validates input, invokes yt-dlp, manages temporary jobs,
  and streams ready files. Its endpoints check website feature availability
  before processing or file delivery.
- Register `website:youtube-downloader` in the existing availability catalog.

## API and lifecycle

- `POST /youtube-downloader/preview`: validate the URL and return sanitized
  video metadata and supported quality choices.
- `POST /youtube-downloader/jobs`: accept a URL and an enumerated quality,
  revalidate metadata and limits, and return an opaque job ID immediately.
- `GET /youtube-downloader/jobs/:id`: return an owner-scoped status with safe
  failure codes, ready-file metadata, and expiry.
- `DELETE /youtube-downloader/jobs/:id`: cancel an owner-scoped job and remove
  its temporary files.
- `POST /youtube-downloader/jobs/:id/ticket`: issue a short-lived cryptographically
  random bearer ticket for the owning authenticated user.
- `GET /youtube-downloader/files/:ticket`: stream the prepared attachment directly
  from Railway. The ticket grants access only to one file, expires quickly, and
  never contains a user ID, JWT, filesystem path, or upstream media URL.

Job states are `preparing`, `ready`, `failed`, `cancelled`, and `expired`.
Active transfers hold their file until completion/disconnect; expiry cleanup
must not delete a file still being streamed. Tickets and responses use no-store
caching and suppress referrer transmission. The frontend derives the download
origin from trusted server configuration, never from user input.

## Validation and resource controls

- Accept only exact known YouTube hostnames and recognized video URL shapes.
  Extract an 11-character video ID and reconstruct a canonical HTTPS watch URL.
  Reject credentials, custom ports, deceptive hosts, arbitrary URLs, playlists
  without a video ID, and malformed IDs. Ignore tracking parameters.
- Use `spawn` with `shell: false`, fixed arguments, ignored local yt-dlp config,
  and no browser-cookie or secret-file access. Users cannot supply commands,
  format expressions, output templates, or paths.
- Support public, non-live videos with an MP4-compatible video/audio combination.
  Private, restricted, DRM-protected, and unavailable videos return safe errors.
- Initial limits: 20-minute source duration, 200 MiB final output, two active
  preparations per process, one active preparation per user, eight retained jobs
  per process, a five-minute preparation timeout, ten-minute ready-file retention,
  and two-minute download tickets. Preview work has a separate bounded timeout
  and concurrency limit. Reject capacity overflow; do not build an unlimited queue.
- Bound subprocess output, retries, component downloads, and temporary-directory
  growth. Check actual file size after preparation and stop work that exceeds
  disk/time limits even when source metadata omits sizes.
- Keep files in application-owned random temporary directories. Cleanup runs
  after cancellation, failure, expiry, and shutdown. Only application-owned
  paths may be removed. Do not log raw command output, tickets, or signed URLs.
- Return generic user-facing errors for missing dependencies, upstream rejection,
  unsupported media, resource limits, expiry, and temporary service failure.

## Railway runtime and operational scope

Use yt-dlp with its default dependency group (including the YouTube challenge
solver), Python 3.10 or later, ffmpeg/ffprobe, and the existing supported Node
runtime. Add a dedicated, reproducible API runtime build recipe and setup notes.
Dependency versions must be pinned and verified during implementation rather
than installing the latest release on every request.

Document required variables with safe placeholders in `api/.env.example`:
`YOUTUBE_DOWNLOADER_ENABLED`, `YOUTUBE_DOWNLOADER_PUBLIC_BASE_URL`, and
`YOUTUBE_DOWNLOADER_YTDLP_PATH`. Reuse existing ffmpeg configuration where
appropriate. Default the runtime flag to disabled until dependencies and the
public Railway origin are configured. Never read or change real environment files.

The first release uses one Railway API replica with bounded in-memory job state
and ephemeral disk. A restart expires jobs; the UI explains that users can retry.
Multiple replicas require shared job metadata, shared storage, and distributed
admission limits before activation. No database migration is needed for this
single-replica implementation. Deployment and production configuration remain
separate from repository implementation.

## Verification and acceptance

- Test URL normalization against spoofed hosts, custom schemes/ports, playlist
  inputs, malformed IDs, and supported watch/short/share URLs.
- Test authentication, ownership isolation, availability checks, capacity limits,
  cancellation, timeouts, ticket expiry, file cleanup, and stream failures with
  controlled subprocess/file fixtures. Tests must not contact YouTube.
- Verify quality handling never produces an audio-free download or advertises a
  format the backend cannot prepare. Reject oversized and live media.
- Run focused frontend tests, backend tests, Vue compilation, API type checking,
  and scoped diff checks without loading real environment files.
- Live download verification requires the configured Railway runtime and a
  permitted public sample. Source tests do not prove YouTube availability,
  deployed runtime dependencies, or successful large-file delivery.

## Review status

The user approved this written design on 2026-10-08. The implementation plan is
`../plans/2026-10-08-youtube-downloader.md`. Implementation and independent review are complete. Local tests and source checks pass. Docker build and live Railway download verification remain outstanding; the runtime flag defaults to disabled.
