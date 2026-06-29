export type BusinessServiceSlug = "invoice-generator";

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
];

export const BUSINESS_SERVICE_BY_SLUG = Object.fromEntries(
  BUSINESS_SERVICES.map((service) => [service.slug, service]),
) as Record<BusinessServiceSlug, BusinessService>;
