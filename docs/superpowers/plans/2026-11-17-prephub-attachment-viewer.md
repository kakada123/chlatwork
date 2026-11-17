# PrepHub Attachment Viewer Implementation Plan

> Execute inline in the current checkout. The user explicitly requested applying the upload and viewer changes. Do not commit or deploy.

**Goal:** Multiple-file uploads and an accessible image/PDF gallery inside PrepHub.

**Architecture:** A shared picker and attachment helpers keep validation and sequential uploads consistent. A viewer dialog owns cancelable resource loading and PDF rendering; sections supply existing resource URLs and the subject-wide attachment collection.

**Tech Stack:** Vue, Tailwind CSS, existing PDF.js.

**Spec:** `docs/superpowers/specs/2026-11-17-prephub-attachment-viewer-design.md`.

## Global Constraints

Preserve existing file formats, 5 MiB per file, 20 files per subject, authenticated and capability resource endpoints, download behavior, and public read-only access. Do not inspect secrets or change the database.

## Review Focus

Partial upload failures and retries; account/subject changes mid-upload; stale viewer fetches/renders; corrupted or password-protected PDFs; keyboard and small-screen navigation.

## Task 1: Multiple-file selection and queued uploads

Files: new attachment helpers and picker; `PrepCapture.vue`, `PrepSection.vue`, English/Khmer locales, focused tests.

- [x] Add tests for complete-selection validation, ordered uploads, retry queue retention, and stale-owner cancellation.
- [x] Implement shared validation/picker and both upload flows without altering the server contract.
- [x] Verify successful, failed, retried, and canceled upload behavior.

## Task 2: Attachment viewer

Files: new viewer and PDF rendering helper/component; `PrepSection.vue`, `PrepNotebook.vue`, locales, tests.

- [x] Test preview collection/navigation, resource URL ownership, and stale loading cleanup.
- [x] Implement image/PDF content, dialog focus/Escape behavior, thumbnails, file navigation, PDF page navigation, loading/error states, and download.
- [x] Replace preview links while preserving public read-only controls and download URLs.
- [x] Run final focused/full frontend tests, compile CSS/components, inspect the scoped diff, and request source review.

## Validation

- 59 PrepHub tests pass, including batch retry/account cancellation, viewer navigation, stale image/PDF cleanup, password-protected PDF fallback, and a real high-resolution scanned-PDF regression.
- Full frontend suite: 843 pass; 1 existing unrelated failure in `tests/creator-proxy.test.ts` (`getHeader is not defined`).
- Focused strict TypeScript checks and production Nuxt/Nitro build pass. Build uses dummy settings with dotenv/global rc/Vite env loading disabled and all output under `.tmp/`.
- Formatting and diff whitespace checks pass. Source review found one scanned-image discard issue; it was reproduced with PDF.js, corrected, and covered by a passing regression test.
- Live browser/upload checks remain unverified: the browser-control runtime cannot start due to OpenSSL configuration access, and loopback fixture listening is denied. No deployment or database changes were performed.
