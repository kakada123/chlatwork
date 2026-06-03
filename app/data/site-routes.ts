import { TOOL_GUIDE_PATHS } from "./tool-guide-routes";

export const TRUST_PAGE_PATHS = [
  "/about",
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

export const PUBLIC_SITEMAP_PATHS = [
  "/",
  "/km",
  "/portfolio",
  "/buy-me-coffee",
  ...TRUST_PAGE_PATHS,
  ...TOOL_CATEGORY_PATHS,
  ...TOOL_PAGE_PATHS,
  ...TOOL_GUIDE_PATHS,
];
