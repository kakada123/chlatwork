# ChlatWork Link

One profile belongs to each authenticated account. The editor is `/account/link`,
with Profile, Links, Appearance, Share, and Analytics sections. `/link` introduces
the feature, `/u/:slug` is the public page, and `/link/:slug` redirects to it.

## Rollout

1. Review and manually execute `database/updates/2026-10-02-create-chlatwork-link.sql`.
2. Generate the Prisma client and build/deploy the API and Nuxt app using the existing
   deployment process. No new environment variables or storage service are required.
3. Test with two accounts: save a draft, publish, upload photos, change themes,
   add/disable/reorder/remove links, share/download the QR, and unpublish. Confirm
   draft pages/photos return 404 publicly and another account cannot edit the links.
4. Check social previews against the deployed public URL. The JPEG Open Graph
   endpoint includes the name, headline, profile URL, and uploaded avatar.

The SQL is additive and is not executed by the application. Apply it before enabling
the feature. Availability is managed through `website:chlatwork-link` in the existing
admin tools controls.

## Save behavior and limits

- Save draft keeps new profiles private. Publish saves profile fields and the entire
  link list atomically. Saving an already published page updates its live content.
- Photos upload immediately. An uploaded background is displayed after saving the
  background mode. Entering a replacement HTTPS image URL or removing a photo takes
  effect on Save. Changing a slug changes the public URL; old URLs are not retained.
- Profile PATCH accepts an optional `links` array. Existing IDs must belong to the
  current profile; omitted existing links are removed. The granular link APIs remain
  available for integrations. Reordering requires every saved ID exactly once.
- Slugs are case-normalized, unique, and 3–40 characters; reserved names are blocked.
  Profiles allow 50 links, 80-character button titles, and 2048-character URLs.
- Links allow public HTTP/HTTPS addresses, `mailto:`, and `tel:`. Executable schemes,
  embedded credentials, local hosts, and IP literals are rejected. Platform icons are
  based on actual host suffixes. Images accept HTTPS URLs or JPG/PNG/WebP uploads.
- Browser uploads also support HEIC/HEIF conversion through the existing photo helper.
  The API accepts at most 5MB and 16 megapixels, checks encoded dimensions before
  decoding, and always re-encodes to a maximum of 1600px in WebP without EXIF metadata.
  Original filenames are not stored. Two image blobs per profile use PostgreSQL storage.

## Public data and analytics

Public responses contain only the published profile and enabled links. Account IDs,
photo bytes, private timestamps, and owner analytics are excluded. Public photos,
metadata, and telemetry recheck publication and account-active state. API responses
and images use `no-store` so unpublishing is visible immediately to new requests.
Public pages are indexable, with owner-supplied SEO metadata; drafts and editors are
private/noindex. Dynamic profile URLs are not added to the static sitemap.

Analytics use atomic aggregate counters rather than per-visitor event rows. They count
page loads after client mount and link activations, including repeat visits/clicks.
No IP, user-agent, referrer, cookies, or visitor identifiers are stored for this feature.
Browser blockers, network failures, and API throttling can reduce recorded counts;
these are activity totals, not unique visitor metrics. Deleted links remove their click
counts. Click telemetry is best-effort and never blocks navigation.

External image URLs are loaded directly by browsers; the API does not fetch them.
Social cards use locally uploaded avatars only. Uploading the
avatar gives the most consistent social preview. Sharing URLs use the ChlatWork
production domain.
