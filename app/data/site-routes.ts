import { STARTER_GUIDE_PATHS } from "./guides";

export const TRUST_PAGE_PATHS = [
  "/about",
  "/editorial-policy",
  "/contact",
  "/privacy-policy",
  "/terms",
  "/cookies",
  "/disclaimer",
];

export const TOOL_CATEGORY_PATHS = [
  "/tools",
  "/tools/pdf",
  "/tools/image",
  "/tools/qr-barcode",
  "/tools/date-time",
  "/tools/calculators",
  "/tools/productivity",
];

export const TOOL_PAGE_PATHS = [
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
  "/tools/wifi-qr",
  "/tools/text-to-voice",
  "/tools/khmer-unicode-fixer",
  "/tools/calculator",
  "/tools/barcode",
  "/tools/expense-tracker",
  "/tools/lucky-draw",
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

// Focus initial indexing on the strongest pages until all tools have deeper, differentiated content.
export const FOCUSED_TOOL_PAGE_PATHS = [
  "/tools/payback-calculator",
  "/tools/expense-tracker",
  "/tools/image-compress",
  "/tools/image-to-pdf",
  "/tools/merge-pdf",
  "/tools/split-pdf",
  "/tools/qr",
  "/tools/barcode",
  "/tools/wifi-qr",
  "/tools/khmer-unicode-fixer",
  "/tools/text-to-voice",
  "/tools/calculator",
];

// This is an intentional index allowlist. Utility catalogs, service pages, beta
// tools, and legacy generated guides remain accessible but are not submitted as
// standalone search results until they have differentiated editorial value.
export const PUBLIC_SITEMAP_PATHS = [
  "/",
  ...TRUST_PAGE_PATHS,
  "/tools",
  "/guides",
  ...FOCUSED_TOOL_PAGE_PATHS,
  ...STARTER_GUIDE_PATHS,
];

// Ads are limited to substantial editorial/tool pages. Trust, directory,
// commercial, beta, and redirect-only pages intentionally do not load ad code.
export const ADSENSE_ELIGIBLE_PATHS = [
  "/",
  ...FOCUSED_TOOL_PAGE_PATHS,
  ...STARTER_GUIDE_PATHS,
];
