export const TOOLS: ToolDef[] = [
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
    key: "payback-calculator",
    name: "PayBack Calculator",
    route: "/tools/payback-calculator",
    enabled: true,
    status: "stable",
    category: "Utilities",
    description: "Split group spending and calculate who pays who.",
  },

  // ✅ NEW
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
    key: "barcode",
    name: "Barcode Generator",
    route: "/tools/barcode",
    enabled: true,
    status: "stable",
    category: "Utilities",
    description: "Generate barcodes instantly from text or numbers.",
  },
  {
    key: "image-compress",
    name: "Image Compressor",
    route: "/tools/image-compress",
    enabled: true,
    status: "stable",
    category: "Utilities",
    description:
      "Compress images instantly without uploading — fast, private, and secure.",
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
];

export const ENABLED_TOOLS = TOOLS.filter((t) => t.enabled);
