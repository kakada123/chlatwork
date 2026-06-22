import {
  ENABLED_TOOLS,
  TOOL_ICON_CLASSES,
  TOOL_ICON_PATHS,
  type ToolCategory,
} from "~/lib/tool-registry";
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
  accent: string;
  tools: LandingTool[];
};

const ICON_BASE_PATH = "/assets/icons";

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
  calculator: `${ICON_BASE_PATH}/tools/tool-date-calculator.png`,
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
  productivity: `${ICON_BASE_PATH}/categories/category-productivity.png`,
  "khmer-tools": `${ICON_BASE_PATH}/categories/category-khmer-tools.png`,
  "developer-tools": `${ICON_BASE_PATH}/categories/category-developer-tools.png`,
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
  "lucky-draw": "from-fuchsia-400 to-pink-300",
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
  iconPath:
    TOOL_ICON_IMAGE_PATHS[tool.key] ??
    `${ICON_BASE_PATH}/tools/tool-date-calculator.png`,
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
      iconPath:
        CATEGORY_ICON_IMAGE_PATHS[category.key] ??
        `${ICON_BASE_PATH}/categories/category-productivity.png`,
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
