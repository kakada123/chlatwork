const ICON_TONES = {
  blue: "tool-icon-tone tool-icon-tone-blue",
  cyan: "tool-icon-tone tool-icon-tone-cyan",
  emerald: "tool-icon-tone tool-icon-tone-emerald",
  amber: "tool-icon-tone tool-icon-tone-amber",
  violet: "tool-icon-tone tool-icon-tone-violet",
  indigo: "tool-icon-tone tool-icon-tone-indigo",
  rose: "tool-icon-tone tool-icon-tone-rose",
} as const;

const ICON_TONE_BY_KEY: Record<string, keyof typeof ICON_TONES> = {
  "payback-calculator": "emerald",
  "expense-tracker": "emerald",
  calculator: "cyan",
  calculators: "emerald",
  productivity: "emerald",

  "image-compress": "violet",
  image: "violet",

  "image-to-pdf": "rose",
  "pdf-to-jpg": "rose",
  "merge-pdf": "rose",
  "split-pdf": "rose",
  "compress-pdf": "rose",
  "remove-pdf-pages": "rose",
  "reorder-pdf-pages": "rose",
  "html-to-pdf": "rose",
  "text-to-pdf": "rose",
  "invoice-to-pdf": "rose",
  pdf: "rose",
  "file-conversion": "rose",

  qr: "blue",
  "scan-qr": "blue",
  "wifi-qr": "blue",
  barcode: "blue",
  "scan-barcode": "blue",
  "qr-barcode": "blue",
  scanners: "blue",

  "text-to-voice": "amber",
  "khmer-unicode-fixer": "amber",
  "khmer-tools": "amber",
  "date-time": "cyan",

  "json-formatter": "indigo",
  base64: "indigo",
  "url-encoder": "indigo",
  "regex-tester": "indigo",
  "uuid-generator": "indigo",
  "unix-timestamp": "indigo",
  "cron-explainer": "indigo",
  "hash-generator": "indigo",
  "developer-tools": "indigo",

  "jwt-decoder": "rose",
  "password-generator": "rose",
  "security-encoding": "rose",
  "lucky-draw": "violet",
  generators: "violet",
};

export function getToolIconTone(key: string) {
  return ICON_TONES[ICON_TONE_BY_KEY[key] ?? "cyan"];
}
