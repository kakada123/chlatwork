import {
  ENABLED_TOOLS,
  TOOL_ICON_CLASSES,
  TOOL_ICON_PATHS,
  type ToolCategory,
} from "~/lib/tool-registry";

export type LandingTool = {
  key: string;
  name: string;
  route: string;
  category: ToolCategory;
  description: string;
  iconPaths: string[];
  iconClass: string;
  accent: string;
};

export type LandingToolCategory = {
  name: ToolCategory;
  count: number;
  description: string;
  route: string;
  accent: string;
  tools: LandingTool[];
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
  "jpg-to-pdf": "from-orange-300 to-red-400",
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

const CATEGORY_META: Record<
  ToolCategory,
  Pick<LandingToolCategory, "description" | "route" | "accent">
> = {
  Utilities: {
    description:
      "Daily helpers for calculations, QR codes, expenses, compression, and quick office tasks.",
    route: "/tools",
    accent: "from-teal-300 via-cyan-300 to-blue-400",
  },
  "Developer Tools": {
    description:
      "Focused local-first utilities for encoding, validation, tokens, timestamps, regex, and hashes.",
    route: "/tools",
    accent: "from-violet-300 via-fuchsia-300 to-rose-400",
  },
  "PDF Tools": {
    description:
      "Private browser-side converters for merging, splitting, compressing, and creating PDF files.",
    route: "/tools/pdf",
    accent: "from-orange-300 via-rose-300 to-red-400",
  },
};

export const LANDING_TOOLS: LandingTool[] = ENABLED_TOOLS.map((tool) => ({
  key: tool.key,
  name: tool.name,
  route: tool.route,
  category: tool.category,
  description: tool.description,
  iconPaths: TOOL_ICON_PATHS[tool.key] ?? TOOL_ICON_PATHS.calculator,
  iconClass: TOOL_ICON_CLASSES[tool.key] ?? TOOL_ICON_CLASSES.calculator,
  accent: TOOL_ACCENTS[tool.key] ?? "from-gray-300 to-gray-500",
}));

export const LANDING_CATEGORIES: LandingToolCategory[] = (
  ["Utilities", "PDF Tools", "Developer Tools"] satisfies ToolCategory[]
).map((category) => {
  const tools = LANDING_TOOLS.filter((tool) => tool.category === category);

  return {
    name: category,
    count: tools.length,
    description: CATEGORY_META[category].description,
    route: CATEGORY_META[category].route,
    accent: CATEGORY_META[category].accent,
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
