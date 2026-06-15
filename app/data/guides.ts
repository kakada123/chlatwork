export type StarterGuideLink = {
  label: string;
  path: string;
};

export type StarterGuideFaq = {
  question: string;
  answer: string;
};

export type StarterGuideSection = {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
};

export type StarterGuide = {
  slug: string;
  path: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  summary: string;
  primaryTool: StarterGuideLink;
  relatedTools: StarterGuideLink[];
  steps: string[];
  examples: string[];
  sections: StarterGuideSection[];
  faqs: StarterGuideFaq[];
  keywords: string[];
};

export const STARTER_GUIDES: StarterGuide[] = [
  {
    slug: "create-qr-code-for-restaurant-menu",
    path: "/guides/create-qr-code-for-restaurant-menu",
    title: "How to Create a QR Code for a Restaurant Menu",
    metaTitle: "How to Create a QR Code for a Restaurant Menu | ChlatWork",
    metaDescription:
      "Create a restaurant menu QR code, test it, print it clearly, and avoid common mistakes with links, sizes, and table placement.",
    summary:
      "A practical guide for cafes, restaurants, and small food shops that want customers to scan a menu from the table or counter.",
    primaryTool: {
      label: "QR Code Generator",
      path: "/tools/qr",
    },
    relatedTools: [
      { label: "Image to PDF Converter", path: "/tools/image-to-pdf" },
      { label: "Wi-Fi QR Generator", path: "/tools/wifi-qr" },
      { label: "Image Compressor", path: "/tools/image-compress" },
    ],
    steps: [
      "Publish the menu first, either as a web page, PDF, or public image link.",
      "Open the QR Code Generator and paste the exact menu URL.",
      "Generate the QR code and download the PNG.",
      "Place the QR code on a simple table card, counter sign, or poster with enough white space around it.",
      "Test the printed QR code from the distance customers will scan it.",
      "Update the menu URL content when prices or items change instead of reprinting every table card.",
    ],
    examples: [
      "A Phnom Penh cafe links the QR code to a menu page that includes Khmer and English item names.",
      "A restaurant uses one QR code for dine-in tables and another QR code for a Telegram ordering channel.",
      "A small food stall prints a QR code near the cashier so customers can preview the menu while waiting.",
    ],
    sections: [
      {
        heading: "Choose a stable menu link",
        paragraphs: [
          "The QR code stores the link you give it. If the link changes later, old printed QR codes will still point to the old place.",
          "For a restaurant menu, use a stable public page when possible. A menu PDF can work, but a web page is easier to update when prices, photos, or availability change.",
        ],
        bullets: [
          "Use a full HTTPS link.",
          "Avoid private Google Drive or Facebook links that require login.",
          "Open the link in an incognito window before printing the QR code.",
        ],
      },
      {
        heading: "Print size and placement",
        paragraphs: [
          "A QR code on a table card should be large enough for older phone cameras and low-light restaurant conditions.",
          "Keep the code on a plain background and leave white space around it. Do not place it over food photos or decorative patterns.",
        ],
      },
      {
        heading: "Cambodia-specific workflow",
        paragraphs: [
          "Many Cambodian customers use Telegram, Facebook, or a bilingual Khmer-English menu. A QR code can point to the menu page, a Telegram channel, or a simple order form.",
          "If the menu includes Khmer text, test it on mobile after publishing. The scan can work perfectly while the destination page still has text or image readability problems.",
        ],
      },
    ],
    faqs: [
      {
        question: "Should my restaurant QR code link to a PDF or a web page?",
        answer:
          "A web page is easier to update. A PDF is acceptable when you already have a fixed printable menu, but check mobile readability.",
      },
      {
        question: "Can I use a Telegram link?",
        answer:
          "Yes, if the Telegram channel, bot, or chat link is intended for customers and opens correctly on mobile.",
      },
      {
        question: "How big should the printed QR code be?",
        answer:
          "For table cards, start around 3 to 4 cm wide and test from normal sitting distance. Larger signs can use larger codes.",
      },
      {
        question: "Do I need to regenerate the QR code when prices change?",
        answer:
          "Not if the QR code points to a stable web page that you can update. If it points to a replaced file URL, you may need to regenerate it.",
      },
    ],
    keywords: [
      "restaurant menu QR code",
      "QR code for menu",
      "Cambodia restaurant QR",
      "Telegram menu QR",
    ],
  },
  {
    slug: "png-vs-svg-for-qr-codes-and-barcodes",
    path: "/guides/png-vs-svg-for-qr-codes-and-barcodes",
    title: "PNG vs SVG for QR Codes and Barcodes",
    metaTitle: "PNG vs SVG for QR Codes and Barcodes | ChlatWork",
    metaDescription:
      "Understand when to use PNG or SVG for QR codes, barcode labels, printing, web pages, and POS testing.",
    summary:
      "A format guide for choosing the right download type before printing QR codes, barcodes, labels, and signs.",
    primaryTool: {
      label: "Barcode Generator",
      path: "/tools/barcode",
    },
    relatedTools: [
      { label: "QR Code Generator", path: "/tools/qr" },
      { label: "Wi-Fi QR Generator", path: "/tools/wifi-qr" },
      { label: "Image Compressor", path: "/tools/image-compress" },
    ],
    steps: [
      "Decide whether the code will be used on screen, printed small, or printed large.",
      "Use PNG when you need a simple image file for documents, chat, or quick web use.",
      "Use SVG when you need sharp barcode labels, scalable print assets, or layout editing.",
      "Avoid resizing a small PNG upward because it can become blurry.",
      "Print one test label or sign and scan it before producing many copies.",
    ],
    examples: [
      "Use PNG for a QR code that will be placed into a simple restaurant poster or sent in Telegram.",
      "Use SVG for barcode labels that need to stay sharp in a print layout.",
      "Use PNG for quick screenshots or office documents when exact print scaling is not critical.",
    ],
    sections: [
      {
        heading: "When PNG is the better choice",
        paragraphs: [
          "PNG is a normal image format. It is easy to insert into documents, slides, chat messages, and simple design tools.",
          "ChlatWork QR Generator downloads QR codes as PNG, which is practical for menu signs, forms, posters, and quick sharing.",
        ],
      },
      {
        heading: "When SVG is the better choice",
        paragraphs: [
          "SVG is vector-based, so it stays sharp when scaled. That matters for barcodes because line width and quiet space affect scanner reliability.",
          "ChlatWork Barcode Generator downloads SVG so product labels and internal stock codes can be placed into print layouts cleanly.",
        ],
      },
      {
        heading: "Scanning matters more than format names",
        paragraphs: [
          "A perfect file format can still fail if the printed code is too small, stretched, low contrast, or placed on a busy background.",
          "Always test with the actual phone, barcode scanner, POS device, or camera app your customers or staff will use.",
        ],
      },
    ],
    faqs: [
      {
        question: "Is SVG always better than PNG?",
        answer:
          "No. SVG is better for scaling and print layout, while PNG is easier for simple documents, chat, and quick web use.",
      },
      {
        question: "Why does Barcode Generator use SVG?",
        answer:
          "Barcode line sharpness matters for scanning, and SVG keeps the graphic crisp when resized.",
      },
      {
        question: "Can I print a PNG QR code?",
        answer:
          "Yes. Use a large enough size, keep white space around it, and scan a test print before publishing it.",
      },
      {
        question: "Can barcodes contain Khmer text?",
        answer:
          "Standard one-dimensional barcodes are for numbers and basic English characters. Use QR codes for Khmer text or long links.",
      },
    ],
    keywords: ["PNG vs SVG", "QR code format", "barcode SVG", "print barcode"],
  },
  {
    slug: "merge-pdf-files-safely",
    path: "/guides/merge-pdf-files-safely",
    title: "How to Merge PDF Files Safely",
    metaTitle: "How to Merge PDF Files Safely | ChlatWork",
    metaDescription:
      "Merge PDF files in the right order, protect private documents, review the result, and avoid common PDF mistakes.",
    summary:
      "A document workflow guide for combining PDFs while keeping originals and checking page order before sharing.",
    primaryTool: {
      label: "Merge PDF",
      path: "/tools/merge-pdf",
    },
    relatedTools: [
      { label: "Split PDF", path: "/tools/split-pdf" },
      { label: "Remove PDF Pages", path: "/tools/remove-pdf-pages" },
      { label: "Compress PDF", path: "/tools/compress-pdf" },
    ],
    steps: [
      "Rename source PDFs so their intended order is clear.",
      "Open Merge PDF and add two or more PDF files.",
      "Move files up or down until the sequence is correct.",
      "Merge the files in your browser and download the combined PDF.",
      "Open the result and check the first page, last page, and any signature or attachment pages.",
      "Keep the original files until the receiver confirms the merged version is accepted.",
    ],
    examples: [
      "An office assistant combines an application form, ID copy, and signed letter into one file.",
      "A student merges assignment pages and supporting documents before submission.",
      "A small business combines quotations, receipts, and delivery notes for a customer record.",
    ],
    sections: [
      {
        heading: "Prepare files before merging",
        paragraphs: [
          "Merging is safer when the input files already have clear names and the pages inside each file are correct.",
          "If one PDF contains pages you do not need, remove or split those pages before merging so the final document is easier to review.",
        ],
      },
      {
        heading: "Private document handling",
        paragraphs: [
          "ChlatWork Merge PDF uses browser-side PDF processing. Your selected PDF files are read by your browser to create the merged result.",
          "Even with local processing, you should avoid using public or shared computers for identity documents, customer files, or internal business records.",
        ],
      },
      {
        heading: "Review before sharing",
        paragraphs: [
          "After merging, open the downloaded PDF. Check page order, missing pages, blank pages, signatures, stamps, and file size.",
          "This step matters for Cambodian business workflows where a PDF may be sent by Telegram, email, or uploaded to a form and later used as the official copy.",
        ],
      },
    ],
    faqs: [
      {
        question: "Should I delete the original PDFs after merging?",
        answer:
          "Keep the originals until the merged file is reviewed and accepted. The merged file is a new output.",
      },
      {
        question: "Can I merge scanned documents?",
        answer:
          "Yes, if they are already PDF files. If they are images, convert them with Image to PDF first.",
      },
      {
        question: "What should I check after merging?",
        answer:
          "Check page order, file opening, signatures, blank pages, and whether the file size is acceptable for the destination.",
      },
      {
        question: "Does Merge PDF upload my documents?",
        answer:
          "The ChlatWork tool is designed to process selected PDFs in your browser for this workflow.",
      },
    ],
    keywords: ["merge PDF safely", "combine PDF files", "browser PDF merge", "PDF document workflow"],
  },
  {
    slug: "reduce-pdf-size-without-losing-readability",
    path: "/guides/reduce-pdf-size-without-losing-readability",
    title: "How to Reduce PDF Size Without Losing Readability",
    metaTitle: "How to Reduce PDF Size Without Losing Readability | ChlatWork",
    metaDescription:
      "Reduce PDF file size while keeping text, scans, forms, and images readable for email, Telegram, forms, and office workflows.",
    summary:
      "A practical guide to shrinking PDFs without making scanned text, receipts, or forms too blurry to use.",
    primaryTool: {
      label: "Compress PDF",
      path: "/tools/compress-pdf",
    },
    relatedTools: [
      { label: "Image Compressor", path: "/tools/image-compress" },
      { label: "Image to PDF Converter", path: "/tools/image-to-pdf" },
      { label: "Split PDF", path: "/tools/split-pdf" },
    ],
    steps: [
      "Open the PDF once and decide what must stay readable.",
      "Remove unnecessary pages before compressing if the PDF is too large.",
      "Use Compress PDF to rebuild the file locally and compare output size.",
      "If the PDF came from photos, compress or resize the images before creating the PDF.",
      "Open the result and zoom in on names, totals, QR codes, barcodes, and Khmer text.",
      "Use the smallest file that still passes the readability check.",
    ],
    examples: [
      "A shop reduces a PDF catalog before sending it by Telegram but keeps product labels readable.",
      "A student reduces scanned assignment pages but checks that handwritten notes are still clear.",
      "An office worker prepares a PDF under an upload limit for a form without damaging stamps or signatures.",
    ],
    sections: [
      {
        heading: "Start with the source problem",
        paragraphs: [
          "A PDF can be large because it contains high-resolution images, many scanned pages, embedded fonts, or unused internal data.",
          "Browser-side compression can rebuild a PDF and remove safe overhead, but it cannot always recompress every embedded image without risking document damage.",
        ],
      },
      {
        heading: "Protect readability first",
        paragraphs: [
          "Reducing size is only useful if the result is still readable. Check Khmer text, small numbers, QR codes, barcodes, signatures, and table lines.",
          "For scans and receipts, readability usually matters more than reaching the smallest possible file size.",
        ],
      },
      {
        heading: "Use the right tool order",
        paragraphs: [
          "If the PDF was created from phone photos, compress the images before turning them into a PDF. If the PDF has extra pages, split or remove pages before compression.",
          "This workflow often produces a better result than compressing an already messy PDF at the end.",
        ],
      },
    ],
    faqs: [
      {
        question: "Why did my compressed PDF not get smaller?",
        answer:
          "Some PDFs are already optimized or contain images that cannot be safely recompressed by the browser-side workflow.",
      },
      {
        question: "Can compression make a PDF blurry?",
        answer:
          "This depends on the method. Always open the output and check important text, scans, and codes before sharing.",
      },
      {
        question: "Should I compress images before making a PDF?",
        answer:
          "Yes, when the PDF is built from large phone photos. It gives you more control over size and readability.",
      },
      {
        question: "What if the upload limit is still too small?",
        answer:
          "Remove unnecessary pages, split the file into smaller parts, or ask the receiver whether multiple files are allowed.",
      },
    ],
    keywords: ["reduce PDF size", "compress PDF readability", "PDF upload limit", "small PDF file"],
  },
  {
    slug: "fix-broken-khmer-unicode-text",
    path: "/guides/fix-broken-khmer-unicode-text",
    title: "How to Fix Broken Khmer Unicode Text",
    metaTitle: "How to Fix Broken Khmer Unicode Text | ChlatWork",
    metaDescription:
      "Clean copied Khmer Unicode text, remove hidden characters, normalize spacing, handle digits, and understand legacy-font limitations.",
    summary:
      "A Khmer text cleanup guide for copied PDF text, website text, Telegram posts, forms, and content editing.",
    primaryTool: {
      label: "Khmer Unicode Fixer",
      path: "/tools/khmer-unicode-fixer",
    },
    relatedTools: [
      { label: "Text to Voice", path: "/tools/text-to-voice" },
      { label: "QR Code Generator", path: "/tools/qr" },
      { label: "Text to PDF", path: "/tools/text-to-pdf" },
    ],
    steps: [
      "Paste the copied Khmer text into Khmer Unicode Fixer.",
      "Keep Unicode normalization and spacing cleanup enabled for most cases.",
      "Choose how to handle invisible characters: replace with spaces, remove, or keep.",
      "Choose digit conversion only when your final document needs Khmer or Latin digits.",
      "Copy the cleaned result and paste it into the final document or post.",
      "Read the output once because cleanup cannot recover text that was already damaged.",
    ],
    examples: [
      "A restaurant cleans Khmer menu text before publishing it on a bilingual menu page.",
      "A shop fixes spacing in a Khmer Telegram promotion copied from an old document.",
      "A developer normalizes Khmer UI sample text before testing search and layout.",
    ],
    sections: [
      {
        heading: "Understand the type of broken text",
        paragraphs: [
          "Some copied Khmer text is valid Unicode but contains hidden characters, unusual spaces, or mixed digit styles. This is the kind of text the fixer is built for.",
          "Other text comes from old legacy fonts such as Limon or ABC. If copied text appears as Latin symbols instead of Khmer characters, cleanup alone is not enough.",
        ],
      },
      {
        heading: "Clean for the destination",
        paragraphs: [
          "A Telegram post, restaurant menu, website CMS, and printed document may expect slightly different spacing and digit style.",
          "Choose Khmer digits for Khmer-first public content when appropriate, or Latin digits when the text must match forms, IDs, invoices, prices, or mixed English workflows.",
        ],
      },
      {
        heading: "Review Khmer text on mobile",
        paragraphs: [
          "Khmer text can look acceptable on desktop but wrap poorly on a phone. After cleanup, paste the final copy into the destination page and check it at mobile width.",
          "This is especially important for menus, QR-code destination pages, support instructions, and short promotional posts.",
        ],
      },
    ],
    faqs: [
      {
        question: "Can ChlatWork recover damaged copied text?",
        answer:
          "No. The fixer can clean valid Unicode text, but it cannot recover characters that were lost before pasting.",
      },
      {
        question: "What are invisible characters?",
        answer:
          "They are formatting marks that do not show visibly but can affect search, copy/paste, wrapping, or text comparison.",
      },
      {
        question: "Should I remove all invisible characters?",
        answer:
          "Not always. Replacing them with spaces is safer for copied paragraphs because removal can join words together.",
      },
      {
        question: "Does this convert legacy Khmer fonts?",
        answer:
          "No. Legacy font conversion needs a separate character mapping. This guide focuses on real Khmer Unicode cleanup.",
      },
    ],
    keywords: ["fix Khmer Unicode", "Khmer text cleanup", "broken Khmer text", "Khmer Unicode spacing"],
  },
];

export const STARTER_GUIDE_PATHS = STARTER_GUIDES.map((guide) => guide.path);

const STARTER_GUIDES_BY_SLUG = new Map(
  STARTER_GUIDES.map((guide) => [guide.slug, guide]),
);

export function findStarterGuideByPath(path: string) {
  const normalizedPath = path.endsWith("/") ? path.slice(0, -1) : path;
  const slug = normalizedPath.split("/").pop() ?? "";

  return STARTER_GUIDES_BY_SLUG.get(slug) ?? null;
}
