export type BusinessServiceSlug =
  | "qr-menu"
  | "invoice-generator"
  | "custom-business-tool";

export type BusinessService = {
  slug: BusinessServiceSlug;
  name: string;
  shortName: string;
  route: string;
  eyebrow: string;
  title: string;
  description: string;
  metaTitle: string;
  metaDescription: string;
  startingPrice: string;
  priceNote: string;
  deliveryTime: string;
  highlights: string[];
  features: string[];
  idealFor: string[];
  process: string[];
};

export const TELEGRAM_CONTACT = {
  label: "Telegram",
  value: "t.me/kakadangen",
  href: "https://t.me/kakadangen",
} as const;

export const BUSINESS_SERVICES: BusinessService[] = [
  {
    slug: "qr-menu",
    name: "QR Menu Website",
    shortName: "QR menu",
    route: "/services/qr-menu",
    eyebrow: "For restaurants, cafes, and food stalls",
    title: "A simple QR menu website customers can open from any phone.",
    description:
      "Get a clean mobile menu page, a scannable QR code, and a practical setup for table menus, takeaway counters, and Telegram sharing.",
    metaTitle: "QR Menu Website Service | ChlatWork",
    metaDescription:
      "Launch a simple QR menu website for your restaurant, cafe, or food stall with a mobile menu page, QR code, and Telegram-first setup.",
    startingPrice: "$49",
    priceNote: "One-time setup for a starter menu page.",
    deliveryTime: "2-4 days after content is ready",
    highlights: [
      "Mobile-friendly menu page",
      "QR code ready for printing",
      "Category sections for food and drinks",
      "Telegram or contact button for orders",
    ],
    features: [
      "One branded menu page with restaurant name, logo, and contact details.",
      "Menu categories, item names, prices, short descriptions, and optional photos.",
      "Downloadable QR code image for table tents, posters, and social posts.",
      "Basic SEO and social preview text for sharing the menu link.",
    ],
    idealFor: [
      "Restaurants that want to stop reprinting menus for every small update.",
      "Cafes and food stalls that receive orders through Telegram.",
      "Small teams that need a clean menu link before building a full ordering system.",
    ],
    process: [
      "Send the menu content and brand details on Telegram.",
      "Confirm the structure, language, and contact action.",
      "Review the first version and request one small revision round.",
      "Receive the live menu link and QR code image.",
    ],
  },
  {
    slug: "invoice-generator",
    name: "Invoice / Receipt Generator",
    shortName: "invoice generator",
    route: "/services/invoice-generator",
    eyebrow: "For shops, freelancers, and service teams",
    title: "A branded invoice or receipt generator for your business workflow.",
    description:
      "Turn repeated invoice or receipt work into a simple web form that calculates totals and exports a clean PDF for customers.",
    metaTitle: "Invoice and Receipt Generator Service | ChlatWork",
    metaDescription:
      "Build a custom invoice or receipt generator with branded PDF output, totals, discounts, tax fields, and a simple business-ready form.",
    startingPrice: "$79",
    priceNote: "Starter price for one document template.",
    deliveryTime: "3-5 days after requirements are clear",
    highlights: [
      "Custom business fields",
      "Automatic totals and discounts",
      "Printable PDF output",
      "Receipt or invoice layout",
    ],
    features: [
      "A simple form for customer details, line items, notes, and payment status.",
      "Automatic subtotal, discount, tax, and final total calculation.",
      "A branded PDF layout with business name, logo, address, and footer notes.",
      "Optional browser-only setup when customer data should stay on the device.",
    ],
    idealFor: [
      "Freelancers who send similar invoices every week.",
      "Small shops that need quick receipts without a full POS system.",
      "Service teams that want a consistent customer document format.",
    ],
    process: [
      "Send a sample invoice or receipt format on Telegram.",
      "Confirm fields, calculation rules, and PDF wording.",
      "Test the generated PDF with sample customer data.",
      "Receive the tool link and a short usage checklist.",
    ],
  },
  {
    slug: "custom-business-tool",
    name: "Custom Business Tool",
    shortName: "custom tool",
    route: "/services/custom-business-tool",
    eyebrow: "For small operational workflows",
    title: "A focused web tool for one real business task.",
    description:
      "Build a small tool for data entry, calculation, PDF generation, internal tracking, reporting, or team handoff without starting a large software project.",
    metaTitle: "Custom Business Tool Service | ChlatWork",
    metaDescription:
      "Request a small custom business web tool for calculations, PDF generation, data entry, reports, internal tracking, or workflow automation.",
    startingPrice: "$149",
    priceNote: "Final price depends on scope and integrations.",
    deliveryTime: "Scope first, then timeline estimate",
    highlights: [
      "Built around one workflow",
      "Simple admin-friendly UI",
      "PDF, CSV, or link outputs",
      "Scope confirmed before payment",
    ],
    features: [
      "A practical web interface tailored to the specific task your team repeats.",
      "Business rules, validation, and calculations based on real examples.",
      "Exports such as PDF, CSV, share links, or copy-ready summaries when needed.",
      "Clear handoff notes so the tool can be used without training-heavy setup.",
    ],
    idealFor: [
      "Teams using spreadsheets for repetitive business rules.",
      "Owners who need a small internal tool before investing in a full system.",
      "Operations workflows involving documents, customer records, totals, or approvals.",
    ],
    process: [
      "Describe the workflow and send sample inputs or screenshots on Telegram.",
      "Confirm the smallest useful version and what is out of scope.",
      "Build and review the first working version.",
      "Ship the tool with notes for usage, updates, and future improvements.",
    ],
  },
];

export const BUSINESS_SERVICE_BY_SLUG = Object.fromEntries(
  BUSINESS_SERVICES.map((service) => [service.slug, service]),
) as Record<BusinessServiceSlug, BusinessService>;
