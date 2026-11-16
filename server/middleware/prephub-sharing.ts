import { isPrepPublicPath } from "../../app/lib/prephub-sharing";
export default defineEventHandler((event) => {
  if (!isPrepPublicPath(event.path)) return;
  // Do not let a CDN retain shared content after revocation or leak capability links as referrers.
  setResponseHeader(event, "Cache-Control", "private, no-store");
  setResponseHeader(event, "Referrer-Policy", "no-referrer");
  setResponseHeader(event, "X-Robots-Tag", "noindex, nofollow, noarchive");
});
