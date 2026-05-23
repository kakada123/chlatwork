import { ENABLED_TOOLS, type ToolDef } from "~/lib/tool-registry";

export type ToolDirectoryCategoryKey =
  | "pdf"
  | "image"
  | "qr-barcode"
  | "date-time"
  | "calculators"
  | "productivity";

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
      "Convert, merge, split, compress, reorder, and create PDF files with practical browser-based tools.",
    intro:
      "Use ChlatWork PDF tools for quick document work such as creating PDFs from images, merging files, removing pages, and preparing simple invoices.",
    accent: "from-orange-300 via-rose-300 to-red-400",
    toolKeys: [
      "jpg-to-pdf",
      "image-to-pdf",
      "pdf-to-jpg",
      "merge-pdf",
      "split-pdf",
      "compress-pdf",
      "remove-pdf-pages",
      "reorder-pdf-pages",
      "html-to-pdf",
      "text-to-pdf",
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
    toolKeys: ["image-compress", "image-to-pdf", "jpg-to-pdf", "pdf-to-jpg"],
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
    toolKeys: ["qr", "wifi-qr", "barcode"],
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
      "password-generator",
    ],
  },
];

const ENABLED_TOOL_BY_KEY = new Map(
  ENABLED_TOOLS.map((tool) => [tool.key, tool]),
);

export function getToolsForDirectoryCategory(
  category: ToolDirectoryCategory,
) {
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
