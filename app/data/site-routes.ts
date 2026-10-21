import { STARTER_GUIDE_PATHS } from "./guides.ts";
import { DEVELOPER_GUIDE_PATHS } from "./developer-guides.ts";
import { POST_PATHS } from "./posts.ts";
import { CREATOR_ROUTE_PATHS } from "./creator-tools.ts";

export const LEGAL_PAGE_PATHS = [
  "/privacy-policy",
  "/terms",
  "/cookies",
  "/disclaimer",
];

export const PUBLIC_TRUST_PAGE_PATHS = [
  "/about",
  "/editorial-policy",
  "/contact",
  "/buy-me-coffee",
];

export const PUBLIC_PRODUCT_PAGE_PATHS = ["/link", ...CREATOR_ROUTE_PATHS];

export const PUBLIC_DIRECTORY_PAGE_PATHS = [
  "/developer-commands",
  "/developer-guides",
  "/tools",
  "/guides",
  "/posts",
  "/tools/pdf",
  "/tools/image",
  "/tools/qr-barcode",
  "/tools/date-time",
  "/tools/calculators",
  "/tools/productivity",
];

// These are account workspaces, not public product or editorial landing pages.
export const NAVIGATION_ONLY_PAGE_PATHS = ["/moments/create", "/moments"];

export const COMMERCIAL_PAGE_PATHS = [
  "/portfolio",
  "/pricing",
  "/services/invoice-generator",
];

export const BETA_TOOL_PAGE_PATHS = [
  "/tools/compress-pdf",
  "/tools/html-to-pdf",
];

export const ALL_TOOL_PAGE_PATHS = [
  "/tools/stopwatch",
  "/tools/youtube-downloader",
  "/tools/payback-calculator",
  "/tools/image-compress",
  "/tools/image-to-pdf",
  "/tools/pdf-to-jpg",
  "/tools/merge-pdf",
  "/tools/split-pdf",
  "/tools/compress-pdf",
  "/tools/remove-pdf-pages",
  "/tools/reorder-pdf-pages",
  "/tools/html-to-pdf",
  "/tools/text-to-pdf",
  "/tools/invoice-to-pdf",
  "/tools/qr",
  "/tools/scan-qr",
  "/tools/wifi-qr",
  "/tools/text-to-voice",
  "/tools/khmer-unicode-fixer",
  "/tools/calculator",
  "/tools/barcode",
  "/tools/scan-barcode",
  "/tools/expense-tracker",
  "/tools/lucky-draw",
  "/tools/kla-klok",
  "/tools/json-formatter",
  "/tools/jwt-decoder",
  "/tools/base64",
  "/tools/url-encoder",
  "/tools/regex-tester",
  "/tools/uuid-generator",
  "/tools/unix-timestamp",
  "/tools/cron-explainer",
  "/tools/hash-generator",
  "/tools/password-generator",
];

export const INDEXABLE_TOOL_PAGE_PATHS = [...ALL_TOOL_PAGE_PATHS];

export const INDEXABLE_EDITORIAL_GUIDE_PATHS = [
  ...STARTER_GUIDE_PATHS,
  ...DEVELOPER_GUIDE_PATHS,
];

// Enumerate canonical public pages so restoring discovery never exposes private
// workspaces, generated links, or catch-all parameters through automatic routing.
export const INDEXABLE_PAGE_PATHS = [
  ...new Set([
    "/",
    ...PUBLIC_TRUST_PAGE_PATHS,
    ...PUBLIC_PRODUCT_PAGE_PATHS,
    ...PUBLIC_DIRECTORY_PAGE_PATHS,
    ...COMMERCIAL_PAGE_PATHS,
    ...LEGAL_PAGE_PATHS,
    ...INDEXABLE_TOOL_PAGE_PATHS,
    ...INDEXABLE_EDITORIAL_GUIDE_PATHS,
    ...POST_PATHS,
  ]),
];

export const NOINDEX_PAGE_PATHS = [...NAVIGATION_ONLY_PAGE_PATHS];

// The sitemap is generated from the same index allowlist used by robots metadata.
export const PUBLIC_SITEMAP_PATHS = INDEXABLE_PAGE_PATHS;

export function normalizePublisherPath(path: string) {
  if (!path || path === "/") {
    return "/";
  }

  return path.replace(/\/+$/, "");
}

export function isIndexableRoute(path: string) {
  return INDEXABLE_PAGE_PATHS.includes(normalizePublisherPath(path));
}

export function getPublisherRobots(path: string) {
  return isIndexableRoute(path) ? "index, follow" : "noindex, follow";
}

const KNOWN_ENGLISH_PAGE_PATHS = new Set([
  ...INDEXABLE_PAGE_PATHS,
  ...NOINDEX_PAGE_PATHS,
]);

export function getDisabledKhmerRedirect(path: string) {
  const normalizedPath = normalizePublisherPath(path);

  if (normalizedPath === "/km") {
    return "/";
  }

  const englishPath = normalizePublisherPath(
    normalizedPath.replace(/^\/km(?=\/)/, ""),
  );

  return KNOWN_ENGLISH_PAGE_PATHS.has(englishPath) ? englishPath : "/";
}
