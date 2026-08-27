import { ENABLED_TOOLS, type ToolDef } from "~/lib/tool-registry";

export type ToolDirectoryCategoryKey =
  | "pdf"
  | "image"
  | "qr-barcode"
  | "date-time"
  | "calculators"
  | "productivity"
  | "developer-tools"
  | "security-encoding"
  | "khmer-tools"
  | "scanners"
  | "generators"
  | "file-conversion";

export type ToolDirectoryCategory = {
  key: ToolDirectoryCategoryKey;
  name: string;
  shortTitle: string;
  path: string;
  title: string;
  description: string;
  intro: string;
  accent: string;
  toolKeys: string[];
};

export const TOOL_DIRECTORY_CATEGORIES: ToolDirectoryCategory[] = [
  {
    key: "pdf",
    name: "PDF Tools",
    shortTitle: "PDF Tools",
    path: "/tools/pdf",
    title: "PDF Tools",
    description:
      "Convert, merge, split, reorder, and create PDF files with practical browser-based tools.",
    intro:
      "Use ChlatWork PDF tools for quick document work such as creating PDFs from images, merging files, removing pages, and preparing simple invoices.",
    accent: "from-orange-300 via-rose-300 to-red-400",
    toolKeys: [
      "image-to-pdf",
      "pdf-to-jpg",
      "merge-pdf",
      "split-pdf",
      "remove-pdf-pages",
      "reorder-pdf-pages",
      "invoice-to-pdf",
    ],
  },
  {
    key: "image",
    name: "Image Tools",
    shortTitle: "Image Tools",
    path: "/tools/image",
    title: "Image Tools",
    description:
      "Compress images and turn common image files into clean PDF documents for upload, sharing, and records.",
    intro:
      "Prepare screenshots, scans, product photos, and document images without opening heavy desktop software.",
    accent: "from-violet-300 via-sky-300 to-cyan-400",
    toolKeys: ["image-compress", "image-to-pdf", "pdf-to-jpg"],
  },
  {
    key: "qr-barcode",
    name: "QR & Barcode Tools",
    shortTitle: "QR & Barcode",
    path: "/tools/qr-barcode",
    title: "QR & Barcode Tools",
    description:
      "Generate QR codes, Wi-Fi QR posters, and barcode graphics for labels, menus, inventory, and testing.",
    intro:
      "Create scan-friendly codes for shops, offices, events, product labels, Wi-Fi access, and quick links.",
    accent: "from-emerald-300 via-cyan-300 to-sky-400",
    toolKeys: ["qr", "scan-qr", "wifi-qr", "barcode", "scan-barcode"],
  },
  {
    key: "date-time",
    name: "Date & Time Tools",
    shortTitle: "Date & Time",
    path: "/tools/date-time",
    title: "Date & Time Tools",
    description:
      "Calculate date differences, convert Unix timestamps, and explain cron schedules for planning and debugging.",
    intro:
      "Use these tools when dates, timestamps, deadlines, or scheduled jobs need to be checked quickly.",
    accent: "from-lime-300 via-emerald-300 to-teal-400",
    toolKeys: ["calculator", "unix-timestamp", "cron-explainer"],
  },
  {
    key: "calculators",
    name: "Calculator Tools",
    shortTitle: "Calculators",
    path: "/tools/calculators",
    title: "Calculator Tools",
    description:
      "Settle shared expenses, calculate dates, and track spending with focused tools for everyday work.",
    intro:
      "These tools help with practical numbers: date planning, group payback, budgets, and day-to-day expense visibility.",
    accent: "from-amber-300 via-orange-300 to-pink-400",
    toolKeys: ["calculator", "payback-calculator", "expense-tracker"],
  },
  {
    key: "productivity",
    name: "Productivity Tools",
    shortTitle: "Productivity",
    path: "/tools/productivity",
    title: "Productivity Tools",
    description:
      "Run lucky draws, read text aloud, generate passwords, and use focused helpers for small office workflows.",
    intro:
      "Productivity tools keep common work tasks direct, whether you are preparing a team activity, support note, password, or quick record.",
    accent: "from-fuchsia-300 via-violet-300 to-indigo-400",
    toolKeys: [
      "payback-calculator",
      "expense-tracker",
      "lucky-draw",
      "text-to-voice",
      "khmer-unicode-fixer",
      "password-generator",
    ],
  },
  {
    key: "developer-tools",
    name: "Developer Tools",
    shortTitle: "Developer Tools",
    path: "/tools/developer-tools",
    title: "Developer Tools",
    description:
      "Format data, inspect tokens, test patterns, and handle common developer conversions directly in your browser.",
    intro:
      "Use focused browser-based helpers for JSON, JWTs, encoding, regular expressions, identifiers, timestamps, schedules, and hashes.",
    accent: "from-cyan-300 via-sky-300 to-blue-500",
    toolKeys: [
      "json-formatter",
      "jwt-decoder",
      "base64",
      "url-encoder",
      "regex-tester",
      "uuid-generator",
      "unix-timestamp",
      "cron-explainer",
      "hash-generator",
      "password-generator",
      "html-to-pdf",
    ],
  },
  {
    key: "security-encoding",
    name: "Security & Encoding Tools",
    shortTitle: "Security & Encoding",
    path: "/tools/security-encoding",
    title: "Security & Encoding Tools",
    description:
      "Decode tokens, encode data, test patterns, generate hashes, and create strong passwords with local browser tools.",
    intro:
      "Inspect and transform common security-related formats without sending entered values to a command-execution service.",
    accent: "from-rose-300 via-orange-300 to-amber-400",
    toolKeys: [
      "jwt-decoder",
      "base64",
      "url-encoder",
      "regex-tester",
      "hash-generator",
      "password-generator",
    ],
  },
  {
    key: "khmer-tools",
    name: "Khmer Tools",
    shortTitle: "Khmer Tools",
    path: "/tools/khmer-tools",
    title: "Khmer Tools",
    description:
      "Fix Khmer Unicode text and listen to Khmer or English content directly from your browser.",
    intro:
      "Use lightweight language helpers for cleaning copied Khmer text and reading written content aloud.",
    accent: "from-fuchsia-300 via-pink-300 to-rose-400",
    toolKeys: ["khmer-unicode-fixer", "text-to-voice"],
  },
  {
    key: "scanners",
    name: "Scanner Tools",
    shortTitle: "Scanners",
    path: "/tools/scanners",
    title: "QR & Barcode Scanner Tools",
    description:
      "Read QR codes and barcodes from screenshots, uploads, labels, and camera photos locally.",
    intro:
      "Extract encoded information from images without installing a dedicated desktop scanner application.",
    accent: "from-emerald-300 via-teal-300 to-cyan-400",
    toolKeys: ["scan-qr", "scan-barcode"],
  },
  {
    key: "generators",
    name: "Generator Tools",
    shortTitle: "Generators",
    path: "/tools/generators",
    title: "Online Generator Tools",
    description:
      "Generate QR codes, barcodes, passwords, UUIDs, and hashes for everyday work and development.",
    intro:
      "Create frequently needed codes, identifiers, and secure values with simple browser-based controls.",
    accent: "from-violet-300 via-fuchsia-300 to-pink-400",
    toolKeys: [
      "qr",
      "wifi-qr",
      "barcode",
      "password-generator",
      "uuid-generator",
      "hash-generator",
    ],
  },
  {
    key: "file-conversion",
    name: "File Conversion Tools",
    shortTitle: "File Conversion",
    path: "/tools/file-conversion",
    title: "File Conversion Tools",
    description:
      "Convert images and PDFs into practical file formats using focused browser tools.",
    intro:
      "Prepare common documents and images for sharing, archiving, upload, and everyday office workflows.",
    accent: "from-blue-300 via-indigo-300 to-violet-400",
    toolKeys: [
      "image-to-pdf",
      "pdf-to-jpg",
      "invoice-to-pdf",
    ],
  },
];

const ENABLED_TOOL_BY_KEY = new Map(
  ENABLED_TOOLS.map((tool) => [tool.key, tool]),
);

export function getToolsForDirectoryCategory(category: ToolDirectoryCategory) {
  return category.toolKeys
    .map((toolKey) => ENABLED_TOOL_BY_KEY.get(toolKey))
    .filter((tool): tool is ToolDef => Boolean(tool));
}

export function findToolDirectoryCategoryBySlug(slug: string) {
  return (
    TOOL_DIRECTORY_CATEGORIES.find(
      (category) => category.path.split("/").pop() === slug,
    ) ?? null
  );
}

export function findToolDirectoryCategoryForToolKey(toolKey: string) {
  return (
    TOOL_DIRECTORY_CATEGORIES.find((category) =>
      category.toolKeys.includes(toolKey),
    ) ?? null
  );
}

export function getRelatedToolsForToolKey(toolKey: string, limit = 4) {
  const primaryCategory = findToolDirectoryCategoryForToolKey(toolKey);
  const primaryTools = primaryCategory
    ? getToolsForDirectoryCategory(primaryCategory)
    : [];
  const sameCategoryTools = primaryTools.filter((tool) => tool.key !== toolKey);
  const fallbackTools = ENABLED_TOOLS.filter(
    (tool) =>
      tool.key !== toolKey &&
      !sameCategoryTools.some((sameTool) => sameTool.key === tool.key),
  );

  return [...sameCategoryTools, ...fallbackTools].slice(0, limit);
}
