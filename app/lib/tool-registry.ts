export type ToolStatus = "stable" | "beta" | "alpha" | "soon";
export type ToolCategory = "Utilities" | "Developer Tools";

export type ToolDef = {
  key: string;
  name: string;
  route: string;
  enabled: boolean;
  status: ToolStatus;
  category: ToolCategory;
  description: string;
};

export const TOOLS: ToolDef[] = [
  {
    key: "payback-calculator",
    name: "PayBack Calculator",
    route: "/tools/payback-calculator",
    enabled: true,
    status: "stable",
    category: "Utilities",
    description: "Split group spending and calculate who pays who.",
  },
  {
    key: "image-compress",
    name: "Image Compressor",
    route: "/tools/image-compress",
    enabled: true,
    status: "stable",
    category: "Utilities",
    description:
      "Compress images instantly without uploading - fast, private, and secure.",
  },
  {
    key: "qr",
    name: "QR Generator",
    route: "/tools/qr",
    enabled: true,
    status: "stable",
    category: "Utilities",
    description: "Generate QR for text/URL.",
  },
  {
    key: "wifi-qr",
    name: "Wi-Fi QR Generator",
    route: "/tools/wifi-qr",
    enabled: true,
    status: "stable",
    category: "Utilities",
    description: "Generate Wi-Fi QR to connect instantly by scanning.",
  },
  {
    key: "text-to-voice",
    name: "Text to Voice",
    route: "/tools/text-to-voice",
    enabled: true,
    status: "stable",
    category: "Utilities",
    description: "Read Khmer text aloud with the ChlatWork audio API.",
  },
  {
    key: "calculator",
    name: "Calculator",
    route: "/tools/calculator",
    enabled: true,
    status: "stable",
    category: "Utilities",
    description: "Quick calculations with history.",
  },
  {
    key: "barcode",
    name: "Barcode Generator",
    route: "/tools/barcode",
    enabled: true,
    status: "stable",
    category: "Utilities",
    description: "Generate barcodes instantly from text or numbers.",
  },
  {
    key: "expense-tracker",
    name: "Expense Tracker",
    route: "/tools/expense-tracker",
    enabled: true,
    status: "stable",
    category: "Utilities",
    description: "Track daily expenses with budget, breakdown, and insights.",
  },
  {
    key: "lucky-draw",
    name: "Lucky Draw",
    route: "/tools/lucky-draw",
    enabled: true,
    status: "stable",
    category: "Utilities",
    description:
      "Add participants and randomly draw one or more winners instantly.",
  },
  {
    key: "json-formatter",
    name: "JSON Formatter / Validator",
    route: "/tools/json-formatter",
    enabled: true,
    status: "stable",
    category: "Developer Tools",
    description: "Pretty print, minify, and validate JSON.",
  },
  {
    key: "jwt-decoder",
    name: "JWT Decoder",
    route: "/tools/jwt-decoder",
    enabled: true,
    status: "stable",
    category: "Developer Tools",
    description: "Decode JWT header, payload, and token timing claims.",
  },
  {
    key: "base64",
    name: "Base64 Encoder / Decoder",
    route: "/tools/base64",
    enabled: true,
    status: "stable",
    category: "Developer Tools",
    description: "Encode, decode, and convert files to Base64 locally.",
  },
  {
    key: "url-encoder",
    name: "URL Encoder / Decoder",
    route: "/tools/url-encoder",
    enabled: true,
    status: "stable",
    category: "Developer Tools",
    description: "Encode and decode URL components and query strings.",
  },
  {
    key: "regex-tester",
    name: "Regex Tester",
    route: "/tools/regex-tester",
    enabled: true,
    status: "stable",
    category: "Developer Tools",
    description: "Test regex patterns, flags, matches, and groups.",
  },
  {
    key: "uuid-generator",
    name: "UUID Generator",
    route: "/tools/uuid-generator",
    enabled: true,
    status: "stable",
    category: "Developer Tools",
    description: "Generate v4 UUIDs one at a time or in bulk.",
  },
  {
    key: "unix-timestamp",
    name: "Unix Timestamp Converter",
    route: "/tools/unix-timestamp",
    enabled: true,
    status: "stable",
    category: "Developer Tools",
    description: "Convert timestamps to dates and dates back to timestamps.",
  },
  {
    key: "cron-explainer",
    name: "Cron Expression Explainer",
    route: "/tools/cron-explainer",
    enabled: true,
    status: "stable",
    category: "Developer Tools",
    description: "Explain cron expressions and preview upcoming run times.",
  },
  {
    key: "hash-generator",
    name: "Hash Generator",
    route: "/tools/hash-generator",
    enabled: true,
    status: "stable",
    category: "Developer Tools",
    description: "Generate MD5, SHA-1, SHA-256, and SHA-512 hashes.",
  },
  {
    key: "password-generator",
    name: "Password Generator",
    route: "/tools/password-generator",
    enabled: true,
    status: "stable",
    category: "Developer Tools",
    description: "Generate strong passwords with length and character controls.",
  },
];

export const ENABLED_TOOLS = TOOLS.filter((tool) => tool.enabled);

export const ALL_TOOLS_ICON_PATHS = [
  "M4 5h7v7H4V5Z",
  "M13 5h7v7h-7V5Z",
  "M4 14h7v5H4v-5Z",
  "M13 14h7v5h-7v-5Z",
];

export const TOOL_ICON_PATHS: Record<string, string[]> = {
  calculator: [
    "M6.5 3.5h11a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2Z",
    "M8 7.5h8",
    "M8.5 11.5h2",
    "M13.5 11.5h2",
    "M8.5 15.5h2",
    "M13.5 15.5h2",
    "M8.5 18h7",
  ],
  qr: [
    "M4 4h6v6H4V4Z",
    "M14 4h6v6h-6V4Z",
    "M4 14h6v6H4v-6Z",
    "M7 7h.01",
    "M17 7h.01",
    "M7 17h.01",
    "M14 14h2v2",
    "M19 14h1",
    "M14 20h6",
    "M18 18h2",
  ],
  "wifi-qr": [
    "M4 4h6v6H4V4Z",
    "M14 4h6v6h-6V4Z",
    "M4 14h6v6H4v-6Z",
    "M13.5 15.5a5.5 5.5 0 0 1 7 0",
    "M15.5 18a2.5 2.5 0 0 1 3 0",
    "M17 20h.01",
  ],
  "payback-calculator": [
    "M8 6.5h10",
    "M8 6.5l3-3",
    "M8 6.5l3 3",
    "M16 17.5H6",
    "M16 17.5l-3-3",
    "M16 17.5l-3 3",
    "M7 12h10",
    "M12 9.5V14.5",
  ],
  "expense-tracker": [
    "M6 3h12a2 2 0 0 1 2 2v16l-4-2-4 2-4-2-4 2V5a2 2 0 0 1 2-2Z",
    "M8 8h8",
    "M8 12h8",
    "M8 16h5",
    "M16 16h.01",
  ],
  barcode: [
    "M4 5v14",
    "M7 5v14",
    "M11 5v14",
    "M13 5v14",
    "M17 5v14",
    "M20 5v14",
  ],
  "image-compress": [
    "M4 5h16v14H4V5Z",
    "M8 11l3 3 2-2 4 4",
    "M8 9h.01",
    "M9 20v-3",
    "M15 20v-3",
    "M10 3v2",
    "M14 3v2",
  ],
  "lucky-draw": [
    "M12 3l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 15.3 7.2 18l.9-5.4-3.9-3.8 5.4-.8L12 3Z",
    "M19 21l-3-3",
    "M5 21l3-3",
    "M12 15.3V21",
  ],
  "text-to-voice": [
    "M4 9v6h4l5 4V5L8 9H4Z",
    "M16 9.5a4 4 0 0 1 0 5",
    "M18.5 7a7.5 7.5 0 0 1 0 10",
  ],
  base64: ["M7 7h4a3 3 0 0 1 0 6H7V7Z", "M7 13h5a3 3 0 0 1 0 6H7v-6Z", "M17 7v12"],
  "json-formatter": [
    "M8 6H6a2 2 0 0 0-2 2v2a2 2 0 0 1-2 2 2 2 0 0 1 2 2v2a2 2 0 0 0 2 2h2",
    "M16 6h2a2 2 0 0 1 2 2v2a2 2 0 0 0 2 2 2 2 0 0 0-2 2v2a2 2 0 0 1-2 2h-2",
    "M10 12h4",
  ],
  "jwt-decoder": [
    "M12 3l7 4v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V7l7-4Z",
    "M9 12h6",
    "M10 15h4",
    "M10 9h4",
  ],
  "url-encoder": [
    "M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1",
    "M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1",
  ],
  "uuid-generator": [
    "M5 5h6v6H5V5Z",
    "M13 5h6v6h-6V5Z",
    "M5 13h6v6H5v-6Z",
    "M14 14h1",
    "M18 14h1",
    "M14 18h5",
  ],
  "password-generator": [
    "M7 11V8a5 5 0 0 1 10 0v3",
    "M6 11h12v9H6v-9Z",
    "M12 15v2",
  ],
  "unix-timestamp": [
    "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z",
    "M12 7v5l3 2",
    "M4 22h16",
  ],
  "cron-explainer": [
    "M5 4h14v16H5V4Z",
    "M8 2v4",
    "M16 2v4",
    "M5 9h14",
    "M12 13v3l2 1",
  ],
  "regex-tester": [
    "M4 7h16",
    "M4 17h16",
    "M8 12h.01",
    "M12 12h.01",
    "M16 12h.01",
  ],
  "hash-generator": [
    "M10 3 8 21",
    "M16 3l-2 18",
    "M4 9h16",
    "M3 15h16",
  ],
};

export const TOOL_ICON_CLASSES: Record<string, string> = {
  calculator: "bg-blue-50 text-blue-700 group-hover:bg-blue-600 group-hover:text-white",
  qr: "bg-emerald-50 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white",
  "wifi-qr": "bg-cyan-50 text-cyan-700 group-hover:bg-cyan-600 group-hover:text-white",
  "payback-calculator":
    "bg-amber-50 text-amber-700 group-hover:bg-amber-500 group-hover:text-white",
  "expense-tracker": "bg-rose-50 text-rose-700 group-hover:bg-rose-600 group-hover:text-white",
  barcode: "bg-slate-100 text-slate-700 group-hover:bg-slate-800 group-hover:text-white",
  "image-compress":
    "bg-violet-50 text-violet-700 group-hover:bg-violet-600 group-hover:text-white",
  "lucky-draw": "bg-fuchsia-50 text-fuchsia-700 group-hover:bg-fuchsia-600 group-hover:text-white",
  "text-to-voice": "bg-teal-50 text-teal-700 group-hover:bg-teal-600 group-hover:text-white",
  base64: "bg-indigo-50 text-indigo-700 group-hover:bg-indigo-600 group-hover:text-white",
  "json-formatter":
    "bg-emerald-50 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white",
  "jwt-decoder": "bg-amber-50 text-amber-700 group-hover:bg-amber-500 group-hover:text-white",
  "url-encoder": "bg-cyan-50 text-cyan-700 group-hover:bg-cyan-600 group-hover:text-white",
  "uuid-generator": "bg-sky-50 text-sky-700 group-hover:bg-sky-600 group-hover:text-white",
  "password-generator":
    "bg-red-50 text-red-700 group-hover:bg-red-600 group-hover:text-white",
  "unix-timestamp":
    "bg-lime-50 text-lime-700 group-hover:bg-lime-600 group-hover:text-white",
  "cron-explainer":
    "bg-orange-50 text-orange-700 group-hover:bg-orange-500 group-hover:text-white",
  "regex-tester": "bg-purple-50 text-purple-700 group-hover:bg-purple-600 group-hover:text-white",
  "hash-generator":
    "bg-zinc-100 text-zinc-700 group-hover:bg-zinc-800 group-hover:text-white",
};
