# Interactive Birthday Story Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to deliver and verify each integrated part.

**Goal:** Extend the existing birthday editor and share page with an optional interactive six-scene gift experience, preserving Simple Mode and current music, AI, celebration and sharing features.

**Architecture:** Store versioned birthday settings in HERO JSON and memory captions/dates in a bounded ordered settings array matching existing photo upload positions. Use independent Vue scenes, a small scene controller and four local theme definitions. Backend validation remains inside the independently deployed API; frontend code never imports backend source. No schema changes or new dependencies.

**Spec:** User's November 3 Interactive Birthday Surprise Experience request and latest autoplay instruction.

**Tech stack:** Vue 3/Nuxt, TypeScript, NestJS, existing image preparation/validation, canvas-confetti and audio playback helper.

## Global constraints

- Extend existing implementation; do not remove music preview/trimming, AI languages/emoji choice, celebration effects, QR sharing, scheduled unlock or nonbirthday flows.
- Story Mode is optional and defaults off for backward compatibility. Remove the legacy birthday secret section from Simple Mode; Story Mode reveals SECRET content in its scratch scene.
- Attempt autoplay when a share opens; if blocked, retry synchronously on the gift tap or explicit music control. Never claim browsers guarantee unmuted autoplay.
- Keep unlisted/noindex and scheduled-lock privacy. Validate all stored configuration and existing image uploads.
- Use tap candles, accessible scratch fallback and reduced-motion transitions. No microphone access or new voice/video uploads in this pass.
- All temporary builds/logs/caches under root `.tmp/`; no real env/secret reads, database execution, installs, commits or deployments.

## Contract

`BirthdayStorySettings`: `{ version:1, enabled:boolean, theme:'ROMANTIC_PINK'|'LUXURY_GOLD'|'CUTE_PASTEL'|'MINIMAL_ELEGANT', scenes:BirthdaySceneId[], teaser:string, cake:{design:'CLASSIC'|'CHOCOLATE'|'PASTEL',candles:number}, memories:{caption:string,date:string}[], allowReplay:boolean, allowReactions:boolean }`.

Scene IDs: `gift`, `cake`, `memories`, `message`, `secret`, `celebration`. At most six, unique, at least one; gift first if present and celebration last if present. Other scenes can be reordered. Cake candles: 1–12. Teaser: 160 characters. Up to ten memory captions (200 characters), dates empty or real YYYY-MM-DD. Invalid settings reject before writes. Missing settings means Simple Mode.

## Tasks

- [x] Define frontend settings, strict reader/default factory/theme tokens and effective-scene navigation helpers. Test malformed/order/empty scene inputs and missing photos/secrets.
- [x] Add backend DTO and strict mirrored protocol validation; persist optional birthday-only HERO settings. Preserve public unlock privacy; allow photo-free Story Mode with graceful missing-memory scene handling.
- [x] Build gift, tap-cake, memory slideshow, letter, scratch and final scenes, with next/previous/progress, replay and local recipient reaction feedback. Reuse existing music/celebration components with exposed interaction controls and autoplay fallback.
- [x] Extend the existing editor with Simple/Story choice, eight clear sections, scene toggles/order, cake/theme controls, memory captions/dates and drag/drop plus keyboard reorder controls; preserve AI editing/music preview and publish wiring.
- [x] Keep QR/unlock behavior and show browser timezone for scheduled dates. Keep reaction feedback honest: no analytics/persistence claim.
- [x] Add owner-only birthday editing, private photo previews and atomic multipart saves on the existing slug/status. Allow changing templates, copy, music, scenes and photo order. Cap new edit photo batches at 4MB for the current proxy deployment.
- [x] Run focused configuration/persistence/UI tests, strict typing and production Nuxt/Nest builds with dotenv disabled and artifacts in `.tmp/`. Fresh review and fix findings.

## Review focus

- Existing/no-settings Moments retain Simple rendering and other occasions retain their secret section.
- Disabled/empty/missing scenes never trap navigation; gift/final ordering remains coherent.
- Reordered photos and their captions/dates stay aligned through upload, preview and share rendering.
- Pointer cancellation, keyboard-only reveal, reduced-motion and replay reset every scene safely.
- Autoplay rejections and delayed catalog metadata remain recoverable on the first available gesture; one music element persists across scenes.
- Scene controls never publish, navigate or share externally without a user's action; local reactions are not represented as stored feedback.
- Edit failures never delete an existing Moment, and stale or foreign photo IDs cannot mutate another owner's data.

## Later user corrections

- Remove birthday receiver labels “Birthday Moment” and “A little place on the internet for…”; retain only the existing footer attribution.
- Secret copy is optional for birthdays, including Simple Mode; empty Story secret scenes are skipped. Other occasions retain existing validation and rendering.
- Template changes must be available after creation through an authenticated Edit action.

## Delivered API and verification

- Creation accepts optional birthday-only `birthdayStory` settings in the existing JSON block; stored IDs and Simple Mode remain compatible. No migration.
- Owner-only GET `/moments/:id/edit`, GET `/moments/:id/edit/media/:mediaId`, and PUT `/moments/:id/edit`. Nuxt proxies keep credentials server-side and owner media non-cacheable.
- PUT validates an 80KB JSON payload, bounded multipart uploads, photo membership/order, settings and expiry before a row-locked transaction. Retained IDs, share slug, status and publication timestamp are preserved.
- AI wish requests now include a validated optional `includeEmojis` boolean, with localized choice and enforcement of emoji-free prose when disabled.
- Production Nuxt built with backend source excluded and dotenv disabled. Final direct Nest build includes all ten unchanged audio tracks; compiled audio/editor smoke checks passed.
- Fresh review's schedule-clearing defect is fixed with a failing-then-passing Creator runtime regression. Upload validation includes WebP container bounds before native decode.
- Local validation does not prove deployed database transactions, browser audio/autoplay, visual appearance, microphone behavior, or live AI generation. Microphone and voice/video messages are deferred; recipient reactions are explicitly local feedback.
