import {
  ENABLED_TOOLS,
  TOOL_ICON_CLASSES,
  TOOL_ICON_PATHS,
  type ToolCategory,
} from "~/lib/tool-registry";
import {
  getCategoryIconImagePath,
  getToolIconImagePath,
} from "~/lib/icon-assets";
import {
  TOOL_DIRECTORY_CATEGORIES,
  getToolsForDirectoryCategory,
} from "~/data/tool-categories";

export type LandingTool = {
  key: string;
  name: string;
  route: string;
  category: ToolCategory;
  description: string;
  iconPath: string;
  iconPaths: string[];
  iconClass: string;
  accent: string;
};

export type LandingToolCategory = {
  key: string;
  name: string;
  count: number;
  description: string;
  route: string;
  iconPath: string;
  iconPaths: string[];
  accent: string;
  tools: LandingTool[];
};

const CATEGORY_ICON_PATHS: Record<string, string[]> = {
  pdf: ["M6 3h9l3 3v15H6V3Z", "M15 3v4h4", "M9 11h6", "M9 15h6"],
  image: ["M4 5h16v14H4V5Z", "M7 15l3-3 2 2 3-4 3 5", "M8 9h.01"],
  "qr-barcode": ["M4 4h6v6H4V4Z", "M14 4h6v6h-6V4Z", "M4 14h6v6H4v-6Z", "M14 14h2v2", "M19 14h1", "M14 20h6"],
  "date-time": ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z", "M12 7v5l3 2"],
  calculators: TOOL_ICON_PATHS.calculator,
  productivity: ["M5 4h14v16H5V4Z", "M8 2v4", "M16 2v4", "M8 11h8", "M8 15h5"],
  "developer-tools": ["M8 9l-3 3 3 3", "M16 9l3 3-3 3", "M14 5l-4 14"],
  "security-encoding": TOOL_ICON_PATHS["password-generator"],
  "khmer-tools": TOOL_ICON_PATHS["khmer-unicode-fixer"],
  scanners: ["M4 8V4h4", "M16 4h4v4", "M20 16v4h-4", "M8 20H4v-4", "M7 12h10"],
  generators: ["M12 3v18", "M3 12h18", "M5.6 5.6l12.8 12.8", "M18.4 5.6 5.6 18.4"],
  "file-conversion": ["M7 3h8l3 3v15H7V3Z", "M15 3v4h4", "M10 12h7", "M14 9l3 3-3 3"],
};

const TOOL_ACCENTS: Record<string, string> = {
  calculator: "from-blue-400 to-cyan-300",
  qr: "from-emerald-400 to-lime-300",
  "wifi-qr": "from-cyan-400 to-sky-300",
  "payback-calculator": "from-amber-300 to-orange-400",
  "expense-tracker": "from-rose-400 to-pink-300",
  barcode: "from-slate-300 to-zinc-500",
  "image-compress": "from-violet-400 to-indigo-300",
  "image-to-pdf": "from-orange-300 to-rose-400",
  "pdf-to-jpg": "from-sky-300 to-cyan-400",
  "merge-pdf": "from-emerald-300 to-teal-500",
  "split-pdf": "from-cyan-300 to-blue-500",
  "compress-pdf": "from-violet-300 to-purple-500",
  "remove-pdf-pages": "from-red-300 to-rose-500",
  "reorder-pdf-pages": "from-indigo-300 to-sky-500",
  "html-to-pdf": "from-zinc-300 to-slate-600",
  "text-to-pdf": "from-lime-300 to-green-500",
  "invoice-to-pdf": "from-rose-300 to-pink-500",
  "lucky-draw": "from-sky-400 to-cyan-300",
  "text-to-voice": "from-teal-300 to-emerald-400",
  "khmer-unicode-fixer": "from-emerald-300 to-cyan-400",
  base64: "from-indigo-400 to-blue-300",
  "json-formatter": "from-emerald-400 to-teal-300",
  "jwt-decoder": "from-amber-300 to-yellow-500",
  "url-encoder": "from-cyan-300 to-blue-400",
  "uuid-generator": "from-sky-300 to-indigo-400",
  "password-generator": "from-red-400 to-rose-300",
  "unix-timestamp": "from-lime-300 to-green-400",
  "cron-explainer": "from-orange-300 to-amber-500",
  "regex-tester": "from-purple-400 to-fuchsia-300",
  "hash-generator": "from-zinc-300 to-stone-500",
};

export const LANDING_TOOLS: LandingTool[] = ENABLED_TOOLS.map((tool) => ({
  key: tool.key,
  name: tool.name,
  route: tool.route,
  category: tool.category,
  description: tool.description,
  iconPath: getToolIconImagePath(tool.key),
  iconPaths: TOOL_ICON_PATHS[tool.key] ?? TOOL_ICON_PATHS.calculator,
  iconClass: TOOL_ICON_CLASSES[tool.key] ?? TOOL_ICON_CLASSES.calculator,
  accent: TOOL_ACCENTS[tool.key] ?? "from-gray-300 to-gray-500",
}));

export const LANDING_CATEGORIES: LandingToolCategory[] =
  TOOL_DIRECTORY_CATEGORIES.map((category) => {
    const categoryTools = getToolsForDirectoryCategory(category);
    const tools = categoryTools
      .map((categoryTool) =>
        LANDING_TOOLS.find((tool) => tool.key === categoryTool.key),
      )
      .filter((tool): tool is LandingTool => Boolean(tool));

    return {
      key: category.key,
      name: category.shortTitle,
      count: tools.length,
      description: category.description,
      route: category.path,
      iconPath: getCategoryIconImagePath(category.key),
      iconPaths: CATEGORY_ICON_PATHS[category.key] ?? CATEGORY_ICON_PATHS.productivity,
      accent: category.accent,
      tools,
    };
  });

export const UTILITY_TOOLS = LANDING_TOOLS.filter(
  (tool) => tool.category === "Utilities",
);

export const PDF_LANDING_TOOLS = LANDING_TOOLS.filter(
  (tool) => tool.category === "PDF Tools",
);

export const DEVELOPER_TOOLS = LANDING_TOOLS.filter(
  (tool) => tool.category === "Developer Tools",
);
