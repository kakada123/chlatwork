import { STARTER_GUIDE_PATHS } from "./guides";
import { TOOL_GUIDE_PATHS } from "./tool-guide-routes";

export const TRUST_PAGE_PATHS = [
  "/about",
  "/editorial-policy",
  "/contact",
  "/privacy-policy",
  "/terms",
  "/cookies",
  "/disclaimer",
];

export const SERVICE_PAGE_PATHS = ["/pricing", "/services/invoice-generator"];

export const DEMO_PAGE_PATHS: string[] = [];

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

export const FOCUSED_TOOL_GUIDE_PATHS = [
  "/how-to-split-group-expenses",
  "/how-to-track-expenses-online",
  "/how-to-compress-image-without-upload",
  "/how-to-convert-images-to-pdf",
  "/how-to-merge-pdf-files",
  "/how-to-split-pdf-online",
  "/how-to-generate-qr-code",
  "/how-to-generate-barcode-free",
  "/how-to-create-wifi-qr-code",
  "/how-to-use-khmer-unicode-fixer",
  "/how-to-convert-khmer-text-to-voice",
  "/how-to-use-date-calculator-online",
];

export const PUBLIC_SITEMAP_PATHS = [
  "/",
  "/portfolio",
  ...TRUST_PAGE_PATHS,
  ...SERVICE_PAGE_PATHS,
  ...DEMO_PAGE_PATHS,
  "/guides",
  ...TOOL_CATEGORY_PATHS,
  ...FOCUSED_TOOL_PAGE_PATHS,
  ...STARTER_GUIDE_PATHS,
  ...FOCUSED_TOOL_GUIDE_PATHS,
];
