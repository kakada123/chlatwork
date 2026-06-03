import type { ToolDef } from "~/lib/tool-registry";
import { LOCAL_PROCESSING_PRIVACY_NOTE } from "~/lib/privacy-copy";

export type PdfToolKey =
  | "pdf-to-jpg"
  | "merge-pdf"
  | "split-pdf"
  | "compress-pdf"
  | "remove-pdf-pages"
  | "reorder-pdf-pages"
  | "html-to-pdf"
  | "text-to-pdf"
  | "invoice-to-pdf";

export type PdfToolFaq = {
  question: string;
  answer: string;
};

export type PdfToolDef = ToolDef & {
  key: PdfToolKey;
  metaTitle: string;
  metaDescription: string;
  privacyNote: string;
  actionLabel: string;
  emptyState: string;
  accept: string;
  multiple: boolean;
  iconPaths: string[];
  faq: PdfToolFaq[];
  howItWorks: string[];
  related: PdfToolKey[];
};

const PDF_ICON_PATHS = [
  "M6 3.5h9l3.5 3.5v13.5H6V3.5Z",
  "M15 3.5v4h4",
  "M8 13h8",
  "M8 16h5",
];

const IMAGE_ICON_PATHS = [
  "M4 5h16v14H4V5Z",
  "M8 14l2.4-2.4 2.1 2.1 2.8-3.2L18 14",
  "M8 9h.01",
  "M6 20h12",
];

const PAGES_ICON_PATHS = [
  "M8 4h10v13H8V4Z",
  "M5 7h10v13H5V7Z",
  "M9 11h5",
  "M9 15h3",
];

const INVOICE_ICON_PATHS = [
  "M6 3h12v18l-3-1.5L12 21l-3-1.5L6 21V3Z",
  "M9 8h6",
  "M9 12h6",
  "M9 16h3",
];

export const PDF_TOOLS: PdfToolDef[] = [
  {
    key: "pdf-to-jpg",
    name: "PDF to JPG",
    route: "/tools/pdf-to-jpg",
    enabled: true,
    status: "stable",
    category: "PDF Tools",
    description: "Render PDF pages into downloadable JPG images.",
    metaTitle: "PDF to JPG Converter Online",
    metaDescription:
      "Convert PDF pages to JPG images in your browser. Download each rendered page without uploading your PDF.",
    privacyNote: LOCAL_PROCESSING_PRIVACY_NOTE,
    actionLabel: "Convert to JPG",
    emptyState: "Drop one PDF here to render each page as a JPG image.",
    accept: "application/pdf,.pdf",
    multiple: false,
    iconPaths: IMAGE_ICON_PATHS,
    faq: [
      {
        question: "Can I download all pages as a ZIP?",
        answer:
          "This version provides one download button per JPG page because the project does not include a ZIP library yet.",
      },
      {
        question: "Does quality depend on the PDF?",
        answer:
          "Yes. The result depends on source page size, embedded images, and the render scale selected in the tool.",
      },
    ],
    howItWorks: [
      "Choose one PDF file.",
      "Render each page locally with PDF.js.",
      "Download the JPG page images you need.",
    ],
    related: ["merge-pdf", "split-pdf", "compress-pdf"],
  },
  {
    key: "merge-pdf",
    name: "Merge PDF",
    route: "/tools/merge-pdf",
    enabled: true,
    status: "stable",
    category: "PDF Tools",
    description: "Combine multiple PDF files into one ordered PDF.",
    metaTitle: "Merge PDF Files Online",
    metaDescription:
      "Merge multiple PDF files online in your browser. Reorder files and download one combined PDF without uploading.",
    privacyNote: LOCAL_PROCESSING_PRIVACY_NOTE,
    actionLabel: "Merge PDFs",
    emptyState: "Drop two or more PDFs here to combine them.",
    accept: "application/pdf,.pdf",
    multiple: true,
    iconPaths: PDF_ICON_PATHS,
    faq: [
      {
        question: "Can I reorder PDFs before merging?",
        answer: "Yes. Use the up and down controls to set the merge order.",
      },
      {
        question: "Are form fields preserved?",
        answer:
          "Page content is copied into the merged PDF. Advanced interactive behavior may depend on the original PDF.",
      },
    ],
    howItWorks: [
      "Add two or more PDF files.",
      "Set the order.",
      "Merge and download the combined PDF.",
    ],
    related: ["split-pdf", "remove-pdf-pages", "compress-pdf"],
  },
  {
    key: "split-pdf",
    name: "Split PDF",
    route: "/tools/split-pdf",
    enabled: true,
    status: "stable",
    category: "PDF Tools",
    description: "Extract selected page ranges into a new PDF.",
    metaTitle: "Split PDF Online",
    metaDescription:
      "Split a PDF by page range online. Enter ranges like 1-3, 5, 8-10 and download a new local PDF.",
    privacyNote: LOCAL_PROCESSING_PRIVACY_NOTE,
    actionLabel: "Create Split PDF",
    emptyState: "Drop one PDF here, then choose the pages to keep.",
    accept: "application/pdf,.pdf",
    multiple: false,
    iconPaths: PAGES_ICON_PATHS,
    faq: [
      {
        question: "What page range format is supported?",
        answer: "Use comma-separated pages and ranges, for example 1-3, 5, 8-10.",
      },
      {
        question: "Can I split without uploading?",
        answer: "Yes. Page extraction runs locally in your browser.",
      },
    ],
    howItWorks: [
      "Choose one PDF.",
      "Enter the pages to keep.",
      "Download a new PDF with only those pages.",
    ],
    related: ["merge-pdf", "remove-pdf-pages", "reorder-pdf-pages"],
  },
  {
    key: "compress-pdf",
    name: "Compress PDF",
    route: "/tools/compress-pdf",
    enabled: true,
    status: "beta",
    category: "PDF Tools",
    description: "Rebuild a PDF locally and remove safe metadata where possible.",
    metaTitle: "Compress PDF Online",
    metaDescription:
      "Compress PDF online in your browser by safely rebuilding the file. Results depend on source PDF content.",
    privacyNote: LOCAL_PROCESSING_PRIVACY_NOTE,
    actionLabel: "Compress PDF",
    emptyState: "Drop one PDF here to rebuild it locally.",
    accept: "application/pdf,.pdf",
    multiple: false,
    iconPaths: PDF_ICON_PATHS,
    faq: [
      {
        question: "Why is compression limited?",
        answer:
          "Browser-side PDF compression cannot always recompress embedded images safely. This tool rebuilds the PDF and removes metadata where possible.",
      },
      {
        question: "Can the output be larger?",
        answer:
          "Sometimes, yes. If a PDF is already optimized, rebuilding it may not reduce the file size.",
      },
    ],
    howItWorks: [
      "Choose one PDF.",
      "Rebuild the document locally with object streams enabled.",
      "Compare original and output size before downloading.",
    ],
    related: ["merge-pdf", "split-pdf", "remove-pdf-pages"],
  },
  {
    key: "remove-pdf-pages",
    name: "PDF Page Remover",
    route: "/tools/remove-pdf-pages",
    enabled: true,
    status: "stable",
    category: "PDF Tools",
    description: "Remove selected pages from a PDF and download the result.",
    metaTitle: "Remove Pages from PDF Online",
    metaDescription:
      "Remove pages from a PDF online in your browser. Enter pages like 2, 5-7 and download a clean copy.",
    privacyNote: LOCAL_PROCESSING_PRIVACY_NOTE,
    actionLabel: "Remove Pages",
    emptyState: "Drop one PDF here, then enter pages to remove.",
    accept: "application/pdf,.pdf",
    multiple: false,
    iconPaths: PAGES_ICON_PATHS,
    faq: [
      {
        question: "How do I remove multiple pages?",
        answer: "Use comma-separated pages and ranges, for example 2, 5-7.",
      },
      {
        question: "Will the original file change?",
        answer: "No. The tool creates a new PDF and leaves your original file untouched.",
      },
    ],
    howItWorks: [
      "Choose one PDF.",
      "Enter the pages to remove.",
      "Download the PDF with those pages removed.",
    ],
    related: ["split-pdf", "reorder-pdf-pages", "compress-pdf"],
  },
  {
    key: "reorder-pdf-pages",
    name: "PDF Page Reorder",
    route: "/tools/reorder-pdf-pages",
    enabled: true,
    status: "stable",
    category: "PDF Tools",
    description: "Create a new PDF with pages in a custom order.",
    metaTitle: "Reorder PDF Pages Online",
    metaDescription:
      "Reorder PDF pages online in your browser. Enter a custom page order like 3,1,2,4 and download a new PDF.",
    privacyNote: LOCAL_PROCESSING_PRIVACY_NOTE,
    actionLabel: "Reorder PDF",
    emptyState: "Drop one PDF here, then enter the new page order.",
    accept: "application/pdf,.pdf",
    multiple: false,
    iconPaths: PAGES_ICON_PATHS,
    faq: [
      {
        question: "What order format is supported?",
        answer: "Enter a comma-separated page order, for example 3,1,2,4.",
      },
      {
        question: "Can I duplicate pages?",
        answer: "No. This tool expects each selected page once to avoid accidental duplicate output.",
      },
    ],
    howItWorks: [
      "Choose one PDF.",
      "Enter the new page order.",
      "Generate a PDF using that order.",
    ],
    related: ["remove-pdf-pages", "split-pdf", "merge-pdf"],
  },
  {
    key: "html-to-pdf",
    name: "HTML to PDF",
    route: "/tools/html-to-pdf",
    enabled: true,
    status: "beta",
    category: "PDF Tools",
    description: "Render simple HTML into a printable PDF page.",
    metaTitle: "HTML to PDF Converter",
    metaDescription:
      "Convert simple HTML to PDF online in your browser with a live preview and private local rendering.",
    privacyNote: LOCAL_PROCESSING_PRIVACY_NOTE,
    actionLabel: "Convert HTML to PDF",
    emptyState: "Write or paste HTML to generate a PDF.",
    accept: "",
    multiple: false,
    iconPaths: PDF_ICON_PATHS,
    faq: [
      {
        question: "Does it support every CSS feature?",
        answer:
          "No. This tool is best for simple printable HTML. Complex external assets and scripts are not guaranteed.",
      },
      {
        question: "Is the HTML sent to a server?",
        answer: "No. The preview and PDF are generated locally in your browser.",
      },
    ],
    howItWorks: [
      "Paste simple HTML.",
      "Check the preview.",
      "Render the preview into a PDF.",
    ],
    related: ["text-to-pdf", "invoice-to-pdf", "compress-pdf"],
  },
  {
    key: "text-to-pdf",
    name: "Text to PDF",
    route: "/tools/text-to-pdf",
    enabled: true,
    status: "stable",
    category: "PDF Tools",
    description: "Convert plain text into a simple downloadable PDF.",
    metaTitle: "Text to PDF Converter",
    metaDescription:
      "Convert plain text to PDF online. Set font size, page size, and margins, then download a browser-generated PDF.",
    privacyNote: LOCAL_PROCESSING_PRIVACY_NOTE,
    actionLabel: "Convert Text to PDF",
    emptyState: "Type or paste text to create a PDF.",
    accept: "",
    multiple: false,
    iconPaths: PDF_ICON_PATHS,
    faq: [
      {
        question: "Can I control page layout?",
        answer: "Yes. You can choose font size, page size, and margin before creating the PDF.",
      },
      {
        question: "Does this support rich text?",
        answer: "This tool is for plain text. Use HTML to PDF when you need basic formatting.",
      },
    ],
    howItWorks: [
      "Paste plain text.",
      "Choose layout options.",
      "Download the generated PDF.",
    ],
    related: ["html-to-pdf", "invoice-to-pdf", "compress-pdf"],
  },
  {
    key: "invoice-to-pdf",
    name: "Invoice to PDF",
    route: "/tools/invoice-to-pdf",
    enabled: true,
    status: "stable",
    category: "PDF Tools",
    description: "Fill a simple invoice form and download a clean PDF.",
    metaTitle: "Free Invoice PDF Generator",
    metaDescription:
      "Create a simple invoice PDF in your browser. Add company, customer, items, tax, notes, and download instantly.",
    privacyNote: LOCAL_PROCESSING_PRIVACY_NOTE,
    actionLabel: "Generate Invoice PDF",
    emptyState: "Fill the invoice form to generate a professional PDF.",
    accept: "",
    multiple: false,
    iconPaths: INVOICE_ICON_PATHS,
    faq: [
      {
        question: "Is invoice data stored?",
        answer: "No. The invoice is generated locally in your browser and is not uploaded.",
      },
      {
        question: "Can I edit items before downloading?",
        answer: "Yes. Add or remove rows, update quantities and prices, then regenerate the PDF.",
      },
    ],
    howItWorks: [
      "Enter invoice and customer details.",
      "Add line items, discount, tax, and notes.",
      "Download a clean invoice PDF.",
    ],
    related: ["text-to-pdf", "html-to-pdf", "compress-pdf"],
  },
];

export const PDF_TOOL_BY_KEY = Object.fromEntries(
  PDF_TOOLS.map((tool) => [tool.key, tool]),
) as Record<PdfToolKey, PdfToolDef>;

export function getPdfRelatedTools(tool: PdfToolDef) {
  return tool.related.map((key) => PDF_TOOL_BY_KEY[key]).filter(Boolean);
}
