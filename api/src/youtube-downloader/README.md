# YouTube downloader runtime

The web tool lives at `/tools/youtube-downloader`. It requires sign-in and the
existing `website:youtube-downloader` availability switch. Only public/unlisted,
non-live, unrestricted videos with H.264 video and AAC audio are supported.

## Railway image

Use **one API replica** with `api/` as the build context and
`Dockerfile.youtube-downloader` as the Dockerfile. For a reviewed local build:

```sh
docker build -f api/Dockerfile.youtube-downloader -t chlatwork-api-youtube api
```

The recipe pins Node 22.22.1 and yt-dlp 2026.08.19 with the upstream `default,pin`
extras. Those extras include the pinned EJS challenge solver (0.8.0). Python and
ffmpeg/ffprobe come from the base image's Debian package repositories; their exact
system revisions follow that repository's security updates. The image runs as an
unprivileged user. No cookies, provider keys, or browser account exports are used.

Official references: [yt-dlp release](https://github.com/yt-dlp/yt-dlp/releases/tag/2026.08.19),
[pinned dependencies](https://github.com/yt-dlp/yt-dlp/blob/2026.08.19/pyproject.toml),
and [EJS runtime requirements](https://github.com/yt-dlp/yt-dlp/wiki/EJS).

Configure these variables separately in the Railway runtime:

| Variable | Safe local example | Purpose |
| --- | --- | --- |
| `YOUTUBE_DOWNLOADER_ENABLED` | `false` | Set `true` only after runtime verification. |
| `YOUTUBE_DOWNLOADER_PUBLIC_BASE_URL` | `http://localhost:3002` | Public API origin; HTTPS is required in production, with no path/query/credentials. |
| `YOUTUBE_DOWNLOADER_YTDLP_PATH` | `yt-dlp` | Executable name or absolute executable path. |
| `YOUTUBE_DOWNLOADER_TEMP_DIR` | blank | Optional writable temporary root; default is the OS temp directory. |
| `FFMPEG_PATH` / `FFPROBE_PATH` | `ffmpeg` / `ffprobe` | Existing optional executable overrides. |

Keep the existing API authentication/database/origin configuration and Nuxt
`NUXT_AUTH_API_BASE_URL` configuration. Configure the real public origin at
deployment; none is invented by this implementation. No database migration is needed.

The default `ffmpeg` executable is discovered on `PATH` by yt-dlp. If overriding
`FFMPEG_PATH`, use a real executable path such as `/usr/bin/ffmpeg`, not a command
name. Preview does not merge media; verify an adaptive video-and-audio download
before enabling the tool for users.

The admin availability switch controls the tool's website discovery and backend
requests. The runtime flag is an additional fail-closed dependency gate. An admin
switch alone cannot activate a runtime that has not been configured.

## Limits and lifecycle

- One source video per job, up to twenty minutes, 1080p, and 200 MiB final output.
- Two active preparations per API process, one per account; eight retained jobs.
- Two concurrent previews, thirty seconds per preview; five minutes per job.
- Working directories have a 450 MiB growth cap, checked every 250 milliseconds.
  A brief overshoot between checks is possible; provision disk headroom.
- Ready files last ten minutes; random bearer download tickets last up to two
  minutes. Tickets do not contain account tokens, upstream links, or local paths.
- Files stream directly from Railway, avoiding the Nuxt/Vercel file-response path.
  The website sends no referrer and no account JWT to the download URL.
- Cancel/failure/expiry removes owned files; an active transfer retains its file
  until completion or disconnect. Filesystem cleanup failure retains the job for
  retry and can exhaust capacity rather than permitting unbounded accumulation.
- Jobs are in memory. A restart loses job metadata, and users must prepare again.
  Do not attach a persistent download volume to this single-process implementation;
  abrupt termination can leave files until the ephemeral container disk is discarded.

Before increasing replicas, implement shared metadata/storage and distributed
admission controls. Before increasing limits, review disk, network, and CPU budgets.
Exclude `/youtube-downloader/files/*` from any application or proxy access log that
would store full ticket URLs; tickets are short-lived access capabilities.

## Verification

Automated tests use synthetic local media metadata and subprocess/file fixtures.
They do not contact YouTube or a database. They exercise URL policy, admission,
ownership, cancellation, expiry, tickets, polling races, and socket-free Nest HTTP
validation/streaming. The restricted macOS test adapter tolerates denied removal
of empty fixture directories only; file deletion is asserted, and production
directory-removal code remains unchanged.

After deploying the reviewed runtime, verify executable versions and the EJS
import, then download a short public video you own or have permission to save.
Check picture, audio, selected quality, cancellation, expiry, and actual directory
cleanup. Verify generic errors if YouTube rejects requests from the deployment IP.
Live YouTube delivery is dependent on upstream availability and is not proven by
the source test suite.

Update the pinned yt-dlp version intentionally when YouTube changes. Review its
upstream pin extra, rebuild the image, rerun focused tests, and repeat the permitted
live sample check. Never install/update download dependencies per request.
