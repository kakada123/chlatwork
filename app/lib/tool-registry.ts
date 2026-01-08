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

  // ✅ NEW
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
    key: "invoice",
    name: "Invoice Generator",
    route: "/tools/invoice",
    enabled: false,
    status: "coming-soon",
    category: "Business",
    description: "Create invoice + export PDF (later).",
  },
  {
    key: "queue",
    name: "Queue System",
    route: "/tools/queue",
    enabled: false,
    status: "coming-soon",
    category: "POS",
    description: "Ticket + display + call next (later).",
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
];

export const ENABLED_TOOLS = TOOLS.filter((t) => t.enabled);
