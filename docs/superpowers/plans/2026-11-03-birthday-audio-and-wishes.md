# Birthday Music and AI Wishes Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement each deliverable and verify its behavior before completion.

**Goal:** Let birthday creators preview and trim the bundled music, generate editable Khmer or English wishes for any relationship and tone, and share a lively birthday celebration with confetti and falling decorations.

**Architecture:** Keep music optional. Store an allowlisted track ID and millisecond start/end boundaries in the existing HERO block, with no database migration or physical audio conversion. A reusable audio player enforces clip boundaries for preview and recipient playback. Use the existing server-side AI gateway and provider configuration for authenticated, rate-limited wish generation; return a draft for explicit application.

**Tech stack:** Vue/Nuxt, NestJS, existing structured AI gateway, HTML audio, Node tests and Jest.

## Constraints

- Preserve existing Moments, other occasions, localization, unlisted links and locked-page privacy.
- Never read real environment files or secrets; no dependency installation, migration, commit or deployment.
- Keep temporary validation output under repository-root `.tmp/`.
- Default to no music. Visitors start playback with an explicit control; no reliance on browser autoplay.
- Wish generation must never replace existing text until the creator chooses to apply the result.
- Celebration effects are birthday-only, decorative, bounded, and disabled for reduced-motion preferences. Preview effects stay inside the preview.

## Deliverables

- [x] Add a shared, browser-safe birthday audio catalog with measured durations and strict clip validation. Test unknown IDs, invalid boundaries and minimum clip length.
- [x] Validate and persist optional birthday-only music through the existing create API, and include it in local previews. Test persistence and rejection before writes.
- [x] Add an audio editor with independent track previews, start/end controls, clip preview, apply/remove selection, loading and error feedback. Test playback boundaries and cleanup.
- [x] Add a recipient music control which loops only the selected region and stops on unmount/configuration change.
- [x] Add validated, authenticated, throttled wish generation using the existing provider gateway. Support Khmer/English, common relationship presets, freeform relationship/tone and optional personal context. Test provider failures, malformed results and input validation.
- [x] Add a localized wish-generator panel with review/apply behavior and stale-request protection; integrate both editors into the birthday story step.
- [x] Enrich birthday atmosphere with falling stars and streamers, add an owned confetti canvas and localized replay button, and clean up motion when hidden or unmounted.
- [x] Run focused tests, API typecheck and Vue SFC compilation, then obtain a fresh code review. Report live-provider/browser verification limits explicitly.

## Review focus

- Audio switches or navigation while `play()`/metadata loading is pending must not restart an obsolete track.
- Seek, natural end and tab suspension must not allow playback beyond the selected region.
- Arbitrary audio URLs and invalid clip data must never be accepted by the API.
- AI input is untrusted data; output must be bounded text in the requested language and rendered as text.
- Generated drafts for an old recipient or preferences must not silently overwrite current content.

## Validation evidence

- Ten track durations measured with macOS `afinfo`; catalog checks verify every referenced asset exists.
- 37 focused birthday frontend tests and 40 birthday API tests pass, including metadata/play races, clip persistence, scheduled-unlock privacy, user-specific quotas and reduced-motion cleanup.
- Full API regression: 103 suites / 1582 tests pass; the separately run working-directory-sensitive Telegram schema suite adds 3 passing tests.
- Full frontend regression: 541 of 543 tests pass. The two pre-existing static source assertions in `tests/moments.test.ts` still fail (daily Telegram voting and published Moment surfaces).
- API TypeScript, strict typing of all four new component scripts/helpers, and six Vue components' client/SSR/style compilation pass.
- Fresh review findings fixed: apply AI quota after JWT authentication so proxy users do not share the three-request limit; preserve recipient names in script validation. Follow-up review found no blocking issues.
- No migration or dependency changes. Live browser playback/visual appearance and real provider calls remain unverified.
