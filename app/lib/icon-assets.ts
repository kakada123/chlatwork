const ICON_BASE_PATH = "/assets/icons";
const DEFAULT_TOOL_ICON_IMAGE_PATH = `${ICON_BASE_PATH}/tools/tool-date-calculator.png`;
const DEFAULT_CATEGORY_ICON_IMAGE_PATH = `${ICON_BASE_PATH}/categories/category-productivity.png`;

export const TOOL_ICON_IMAGE_PATHS: Record<string, string> = {
  qr: `${ICON_BASE_PATH}/tools/tool-qr-code-generator.png`,
  "wifi-qr": `${ICON_BASE_PATH}/tools/tool-wifi-qr-generator.png`,
  barcode: `${ICON_BASE_PATH}/tools/tool-barcode-generator.png`,
  "image-compress": `${ICON_BASE_PATH}/tools/tool-image-compressor.png`,
  "image-to-pdf": `${ICON_BASE_PATH}/tools/tool-image-to-pdf.png`,
  "pdf-to-jpg": `${ICON_BASE_PATH}/tools/tool-pdf-to-jpg.png`,
  "merge-pdf": `${ICON_BASE_PATH}/tools/tool-merge-pdf.png`,
  "split-pdf": `${ICON_BASE_PATH}/tools/tool-split-pdf.png`,
  "compress-pdf": `${ICON_BASE_PATH}/tools/tool-compress-pdf.png`,
  "remove-pdf-pages": `${ICON_BASE_PATH}/tools/tool-pdf-page-remover.png`,
  "reorder-pdf-pages": `${ICON_BASE_PATH}/tools/tool-pdf-page-reorder.png`,
  "html-to-pdf": `${ICON_BASE_PATH}/tools/tool-html-to-pdf.png`,
  "text-to-pdf": `${ICON_BASE_PATH}/tools/tool-text-to-pdf.png`,
  "invoice-to-pdf": `${ICON_BASE_PATH}/tools/tool-invoice-to-pdf.png`,
  calculator: DEFAULT_TOOL_ICON_IMAGE_PATH,
  "unix-timestamp": `${ICON_BASE_PATH}/tools/tool-unix-timestamp-converter.png`,
  "cron-explainer": `${ICON_BASE_PATH}/tools/tool-cron-expression-explainer.png`,
  "payback-calculator": `${ICON_BASE_PATH}/tools/tool-payback-calculator.png`,
  "expense-tracker": `${ICON_BASE_PATH}/tools/tool-expense-tracker.png`,
  "lucky-draw": `${ICON_BASE_PATH}/tools/tool-random-winner-picker.png`,
  "text-to-voice": `${ICON_BASE_PATH}/tools/tool-text-to-voice.png`,
  "khmer-unicode-fixer": `${ICON_BASE_PATH}/tools/tool-khmer-unicode-fixer.png`,
  "password-generator": `${ICON_BASE_PATH}/tools/tool-password-generator.png`,
  "json-formatter": `${ICON_BASE_PATH}/tools/tool-json-formatter.png`,
  "jwt-decoder": `${ICON_BASE_PATH}/tools/tool-jwt-decoder.png`,
  base64: `${ICON_BASE_PATH}/tools/tool-base64-encoder-decoder.png`,
  "url-encoder": `${ICON_BASE_PATH}/tools/tool-url-encoder-decoder.png`,
  "regex-tester": `${ICON_BASE_PATH}/tools/tool-regex-tester.png`,
  "hash-generator": `${ICON_BASE_PATH}/tools/tool-hash-generator.png`,
  "uuid-generator": `${ICON_BASE_PATH}/tools/tool-uuid-generator.png`,
};

export const CATEGORY_ICON_IMAGE_PATHS: Record<string, string> = {
  pdf: `${ICON_BASE_PATH}/categories/category-pdf-tools.png`,
  image: `${ICON_BASE_PATH}/categories/category-image-tools.png`,
  "qr-barcode": `${ICON_BASE_PATH}/categories/category-qr-barcode.png`,
  "date-time": `${ICON_BASE_PATH}/categories/category-date-time.png`,
  calculators: `${ICON_BASE_PATH}/categories/category-calculators.png`,
  productivity: DEFAULT_CATEGORY_ICON_IMAGE_PATH,
  "khmer-tools": `${ICON_BASE_PATH}/categories/category-khmer-tools.png`,
  "developer-tools": `${ICON_BASE_PATH}/categories/category-developer-tools.png`,
};

export function getToolIconImagePath(toolKey: string): string {
  return TOOL_ICON_IMAGE_PATHS[toolKey] ?? DEFAULT_TOOL_ICON_IMAGE_PATH;
}

export function getCategoryIconImagePath(categoryKey: string): string {
  return CATEGORY_ICON_IMAGE_PATHS[categoryKey] ?? DEFAULT_CATEGORY_ICON_IMAGE_PATH;
}
