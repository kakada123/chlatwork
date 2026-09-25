import { AiFeature } from '@prisma/client';

const websiteNames: Record<string, string> = {
  'payback-calculator': 'PayBack Calculator',
  'image-compress': 'Image Compressor',
  'image-to-pdf': 'Image to PDF',
  'pdf-to-jpg': 'PDF to JPG',
  'merge-pdf': 'Merge PDF',
  'split-pdf': 'Split PDF',
  'remove-pdf-pages': 'Remove PDF Pages',
  'reorder-pdf-pages': 'Reorder PDF Pages',
  'html-to-pdf': 'HTML to PDF',
  'invoice-to-pdf': 'Invoice to PDF',
  qr: 'QR Generator',
  'scan-qr': 'QR Scanner',
  'wifi-qr': 'Wi-Fi QR',
  'text-to-voice': 'Text to Voice',
  'khmer-unicode-fixer': 'Khmer Unicode Fixer',
  calculator: 'Date Calculator',
  barcode: 'Barcode Generator',
  'scan-barcode': 'Barcode Scanner',
  'expense-tracker': 'Expense Tracker',
  'lucky-draw': 'Lucky Draw',
  'kla-klok': 'Kla Klok',
  'json-formatter': 'JSON Formatter',
  'jwt-decoder': 'JWT Decoder',
  base64: 'Base64',
  'url-encoder': 'URL Encoder',
  'regex-tester': 'Regex Tester',
  'uuid-generator': 'UUID Generator',
  'unix-timestamp': 'Unix Timestamp',
  'cron-explainer': 'Cron Explainer',
  'hash-generator': 'Hash Generator',
  'password-generator': 'Password Generator',
  'developer-commands': 'Developer Command Hub',
};

export const MAIN_BOT_FEATURES = {
  expenses: 'Expenses and receipts',
  spending: 'Spending and summaries',
  voting: 'Voting Moments',
  'group-voting': 'Group voting and daily votes',
  'bill-split': 'Group bill split',
  khqr: 'Group KHQR',
  notifications: 'Alerts and weekly digest',
  assistant: 'Personal assistant',
  phone: 'Phone sharing',
} as const;

export const FEATURE_CATALOG = [
  ...Object.entries(websiteNames).map(([name, label]) => ({
    key: `website:${name}`,
    label,
    group: 'Website tools',
  })),
  ...Object.values(AiFeature).map((feature) => ({
    key: `creator:${feature}`,
    label: feature
      .replaceAll('_', ' ')
      .toLowerCase()
      .replace(/\b\w/g, (letter) => letter.toUpperCase()),
    group: 'Creator AI · Website and Telegram',
  })),
  ...Object.entries(MAIN_BOT_FEATURES).map(([name, label]) => ({
    key: `telegram:${name}`,
    label,
    group: 'Main Telegram bot',
  })),
] as const;

export const KNOWN_FEATURE_KEYS = new Set<string>(
  FEATURE_CATALOG.map((item) => item.key),
);
