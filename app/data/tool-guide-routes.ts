export type ToolGuideRoute = {
  toolKey: string;
  slug: string;
  path: string;
};

const GUIDE_SLUGS = [
  ["payback-calculator", "how-to-split-group-expenses"],
  ["image-compress", "how-to-compress-image-without-upload"],
  ["image-to-pdf", "how-to-convert-images-to-pdf"],
  ["qr", "how-to-generate-qr-code"],
  ["wifi-qr", "how-to-create-wifi-qr-code"],
  ["text-to-voice", "how-to-convert-khmer-text-to-voice"],
  ["calculator", "how-to-use-date-calculator-online"],
  ["barcode", "how-to-generate-barcode-free"],
  ["expense-tracker", "how-to-track-expenses-online"],
  ["lucky-draw", "how-to-run-lucky-draw-online"],
  ["json-formatter", "how-to-format-json-online"],
  ["jwt-decoder", "how-to-decode-jwt-token"],
  ["base64", "how-to-encode-decode-base64"],
  ["url-encoder", "how-to-encode-decode-url"],
  ["regex-tester", "how-to-test-regex-online"],
  ["uuid-generator", "how-to-generate-uuid-online"],
  ["unix-timestamp", "how-to-convert-unix-timestamp"],
  ["cron-explainer", "how-to-explain-cron-expression"],
  ["hash-generator", "how-to-generate-hash-online"],
  ["password-generator", "how-to-generate-strong-password"],
] as const;

// Keep SEO route discovery separate from page content so Nuxt config can reuse it for sitemap generation.
export const TOOL_GUIDE_ROUTES: ToolGuideRoute[] = GUIDE_SLUGS.map(
  ([toolKey, slug]) => ({
    toolKey,
    slug,
    path: `/${slug}`,
  }),
);

export const TOOL_GUIDE_PATHS = TOOL_GUIDE_ROUTES.map((route) => route.path);

export function getToolGuideRoute(toolKey: string) {
  return TOOL_GUIDE_ROUTES.find((route) => route.toolKey === toolKey) ?? null;
}

export function findToolGuideRouteByPath(path: string) {
  const normalizedPath = path.endsWith("/") ? path.slice(0, -1) : path;
  return TOOL_GUIDE_ROUTES.find((route) => route.path === normalizedPath) ?? null;
}
