# Birthday Audio Railway Migration

**Problem:** Vercel excludes `/api/` through `.vercelignore`, so the birthday UI cannot import the backend's audio catalog at build time. The user also wants the fixed audio library hosted with the Railway backend.

**Implementation:** Keep the authoritative catalog and ten original tracks in `api/src/moments/`. Nest copies the tracks into the compiled service's `moments/assets/hbd/` directory. Public catalog and audio endpoints expose track IDs, safe metadata and ranged audio streams. Nuxt uses a local contract and requests the catalog at runtime, with same-origin streaming proxies preserving Range, HEAD and uncompressed Content-Length while stripping account credentials. Existing saved track IDs and trim boundaries remain compatible.

**Storage:** These are versioned bundled assets, rebuilt with each Railway deployment. No runtime uploads, database migration, volume or new credentials are required. Future user uploads should use persistent object storage.

## Completed checks

- [x] Reproduced the Vercel failure with a production Vite bundle that rejects backend source imports, then verified the fixed bundle.
- [x] Moved all ten tracks without changing their SHA-256 hashes.
- [x] Verified 200/206/416 ranges, HEAD, allowlisted paths, missing-file handling and canceled streams.
- [x] Verified actual Nest asset copying and a direct production Nest build; the compiled service streamed the expected byte range from its built assets.
- [x] Built production Nuxt with backend-source loading rejected, dotenv disabled, and output confined to root `.tmp/`.
- [x] Passed 43 focused birthday frontend tests and 1625 API tests. Full frontend: 547/549 pass; the two existing Moments source-assertion failures remain.
- [x] Passed strict birthday component/helper typing, API TypeScript and whitespace checks. Fresh review found no blocking issues.

**Deployment boundary:** No Railway or Vercel deployment was triggered. Deploy the backend first, then the frontend. Live browser seeking/playback and deployed endpoint availability remain unverified.
