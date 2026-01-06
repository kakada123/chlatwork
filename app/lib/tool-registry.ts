export type ToolCategory = "Utilities" | "Business" | "POS";
export type ToolStatus = "alpha" | "beta" | "stable" | "coming-soon";

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
