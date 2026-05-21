import {
  ENABLED_TOOLS,
  TOOL_ICON_CLASSES,
  TOOL_ICON_PATHS,
  type ToolDef,
} from "~/lib/tool-registry";
import { LOCAL_PROCESSING_PRIVACY_NOTE } from "~/lib/privacy-copy";
import { getToolGuideRoute } from "./tool-guide-routes";

export type ToolGuideFaq = {
  question: string;
  answer: string;
};

type ToolGuideContent = {
  metaTitle: string;
  metaDescription: string;
  heroTitle: string;
  heroDescription: string;
  ctaLabel: string;
  whatIs: string[];
  whyUse: string[];
  steps: string[];
  useCases: string[];
  tips: string[];
  faqs: ToolGuideFaq[];
  keywords: string[];
  applicationCategory: "UtilitiesApplication" | "DeveloperApplication";
};

type PdfGuideOptions = {
  toolName: string;
  metaTitle: string;
  metaDescription: string;
  heroTitle: string;
  heroDescription: string;
  ctaLabel: string;
  primaryUse: string;
  inputLabel: string;
  outputLabel: string;
  extraStep: string;
  limitation: string;
  keywords: string[];
};

export type ToolGuide = ToolGuideContent & {
  slug: string;
  path: string;
  tool: ToolDef;
  iconPaths: string[];
  iconClass: string;
};

function createPdfGuide(options: PdfGuideOptions): ToolGuideContent {
  return {
    metaTitle: options.metaTitle,
    metaDescription: options.metaDescription,
    heroTitle: options.heroTitle,
    heroDescription: options.heroDescription,
    ctaLabel: options.ctaLabel,
    whatIs: [
      `${options.toolName} is a browser-based PDF tool for ${options.primaryUse}. It is designed for quick document work without setting up desktop PDF software.`,
      LOCAL_PROCESSING_PRIVACY_NOTE,
    ],
    whyUse: [
      "It avoids uploading private documents to a remote PDF service.",
      "It works well for quick office, school, shop, and freelance document tasks.",
      "It keeps the workflow simple: choose input, set options, generate, and download.",
      "It is mobile responsive, so it can help when you only have a phone or tablet.",
      "It is useful when you need a fast PDF result without installing another app.",
    ],
    steps: [
      `Open ${options.toolName} from the ChlatWork PDF tools page.`,
      `Prepare your ${options.inputLabel}.`,
      options.extraStep,
      "Click the main action button and wait while the browser processes the document locally.",
      `Download the ${options.outputLabel} and check it before sharing or uploading elsewhere.`,
    ],
    useCases: [
      "A small business prepares a document before sending it to a customer.",
      "A student edits PDF pages before submitting school or university work.",
      "An office worker prepares a cleaner file for email, chat, or printing.",
      "A freelancer converts client material into a format that is easier to share.",
      "A shop owner creates or adjusts a PDF from a phone without opening desktop software.",
    ],
    tips: [
      "Use clear file names before downloading so the result is easy to find later.",
      "Preview the result before sending it to customers, school, or government forms.",
      "For very large PDFs, close other heavy browser tabs before processing.",
      "Keep a backup of the original file until you confirm the new PDF is correct.",
      options.limitation,
    ],
    faqs: [
      {
        question: `Does ${options.toolName} upload my file?`,
        answer:
          "No. This tool is designed to process files in your browser, so your file stays on your device.",
      },
      {
        question: "Is this tool free?",
        answer: "Yes. You can use the ChlatWork PDF tool directly in your browser.",
      },
      {
        question: "Will it work with large files?",
        answer:
          "It depends on your browser and device memory. Smaller files are usually faster and more reliable.",
      },
      {
        question: "Will the original file be changed?",
        answer:
          "No. The tool creates a new output file and leaves your original file untouched.",
      },
      {
        question: "What should I check before sharing the result?",
        answer:
          "Open the downloaded file and confirm page order, layout, and content before sending it.",
      },
    ],
    keywords: options.keywords,
    applicationCategory: "UtilitiesApplication",
  };
}

const RAW_GUIDES: Record<string, ToolGuideContent> = {
  "payback-calculator": {
    metaTitle: "How to Split Group Expenses for Free | ChlatWork",
    metaDescription:
      "Learn how to split shared bills, trip costs, and office expenses with the free ChlatWork PayBack Calculator.",
    heroTitle: "How to Split Group Expenses Without Confusion",
    heroDescription:
      "Use the PayBack Calculator to record who paid, who joined, and who should pay back whom after a meal, trip, or shared purchase.",
    ctaLabel: "Open PayBack Calculator",
    whatIs: [
      "The PayBack Calculator is a simple tool for settling shared spending. Instead of manually checking every receipt and doing the math in chat, you enter each payment and let the calculator show the cleanest payback plan.",
      "It is useful when one person paid for several people, when multiple people paid different amounts, or when a group wants a fair result after food, fuel, room booking, supplies, or team activity costs.",
    ],
    whyUse: [
      "It reduces awkward money conversations by showing clear payback amounts.",
      "It works well for meals, trips, office events, and small project expenses.",
      "It avoids spreadsheet setup when you only need a quick split.",
      "It helps Khmer and English speaking teams keep shared costs transparent.",
      "It keeps the result focused on who pays who, not on complex accounting.",
    ],
    steps: [
      "Open the PayBack Calculator from the ChlatWork tools page.",
      "Add each person in the group, such as friends, staff, or family members.",
      "Enter each expense with the person who paid and the amount they covered.",
      "Review the summary to see the balance for every person.",
      "Use the payback result to tell each person exactly who to pay and how much.",
      "Copy the result into Telegram, Messenger, or your team chat if the group needs a record.",
    ],
    useCases: [
      "A Phnom Penh cafe team orders lunch together and one staff member pays the full bill.",
      "Friends share fuel, snacks, and room costs for a Kampot weekend trip.",
      "A small office buys printer ink, stationery, and coffee with different people paying first.",
      "Roommates split electricity, water, internet, and grocery expenses at the end of the month.",
      "A volunteer group tracks shared event spending before collecting reimbursements.",
    ],
    tips: [
      "Enter expenses as soon as possible so nobody forgets who paid.",
      "Use clear names that everyone in the group recognizes.",
      "Round only at the final payment step, not while entering receipts.",
      "Keep receipts or screenshots for larger amounts.",
      "Share the final result before collecting money so people can confirm it.",
    ],
    faqs: [
      {
        question: "Can I use the PayBack Calculator for a restaurant bill?",
        answer:
          "Yes. Add the people who joined, enter the total paid by each person, and use the result to settle the shared meal.",
      },
      {
        question: "Does it work for trips with many expenses?",
        answer:
          "Yes. You can enter multiple payments from different people, then review the final payback summary.",
      },
      {
        question: "Is this the same as a full accounting app?",
        answer:
          "No. It is intentionally simpler. It helps groups settle shared spending quickly without setting up accounts or categories.",
      },
      {
        question: "Can I share the result with my group?",
        answer:
          "Yes. Copy the result and send it to your chat group so everyone sees the same numbers.",
      },
      {
        question: "Is the calculator free?",
        answer:
          "Yes. The ChlatWork PayBack Calculator is free to use in your browser.",
      },
    ],
    keywords: [
      "split group expenses",
      "payback calculator",
      "bill split calculator",
      "Cambodia group expense tool",
    ],
    applicationCategory: "UtilitiesApplication",
  },
  "image-compress": {
    metaTitle: "How to Compress Images Without Uploading | ChlatWork",
    metaDescription:
      "Compress JPG, PNG, and WebP images in your browser without uploading them to a server.",
    heroTitle: "How to Compress an Image Without Uploading It",
    heroDescription:
      "Reduce image size before sending, posting, or uploading, while keeping the file private on your own device.",
    ctaLabel: "Compress Image",
    whatIs: [
      "The Image Compressor is a browser-based image tool that reduces file size for common web images. You choose an image, adjust compression settings, and download a smaller copy.",
      "Because the work happens in the browser, it is a practical choice for documents, product photos, and social posts that do not need to leave your device just to become smaller.",
    ],
    whyUse: [
      "It helps websites, forms, and chats load faster with smaller images.",
      "It avoids sending private images to a remote compression service.",
      "It is useful when a government, bank, school, or marketplace form has a file-size limit.",
      "It lets small businesses prepare product photos before posting online.",
      "It saves mobile data when images need to be sent from a phone hotspot or slow connection.",
    ],
    steps: [
      "Open the ChlatWork Image Compressor.",
      "Choose the image file you want to reduce.",
      "Adjust the quality or size options if you need a specific output.",
      "Click Compress and wait for the preview result.",
      "Compare the original and compressed sizes before downloading.",
      "Download the compressed file and use that copy for upload, chat, or web publishing.",
    ],
    useCases: [
      "A shop owner in Cambodia compresses product photos before posting them on Facebook Marketplace.",
      "A student reduces a scanned document image before submitting it to an online school form.",
      "A developer compresses screenshot assets before adding them to a landing page.",
      "A support team sends smaller issue screenshots through Telegram or email.",
      "A restaurant prepares menu images that load faster on mobile data.",
    ],
    tips: [
      "Keep the original file until you confirm the compressed image still looks good.",
      "Use a lower quality setting for screenshots and a higher setting for photos with people or products.",
      "Resize very large camera photos before uploading them to a website.",
      "Check text-heavy images after compression so labels remain readable.",
      "Avoid recompressing the same image many times because quality can drop each round.",
    ],
    faqs: [
      {
        question: "Are my images uploaded to ChlatWork?",
        answer: LOCAL_PROCESSING_PRIVACY_NOTE,
      },
      {
        question: "Which image formats can I compress?",
        answer:
          "The tool is intended for common browser image formats such as JPG, PNG, and WebP.",
      },
      {
        question: "Will compression reduce quality?",
        answer:
          "Some quality reduction is normal when making a file smaller. The goal is to find a balance between size and visual clarity.",
      },
      {
        question: "Can I use it for product photos?",
        answer:
          "Yes. It is useful for product photos, but review the result so colors, labels, and details still look clear.",
      },
      {
        question: "Why is my compressed file not much smaller?",
        answer:
          "Some images are already optimized. In that case, lowering quality or resizing dimensions may create a bigger difference.",
      },
    ],
    keywords: [
      "compress image without upload",
      "online image compressor",
      "private image compression",
      "reduce image file size",
    ],
    applicationCategory: "UtilitiesApplication",
  },
  "image-to-pdf": {
    metaTitle: "How to Convert Images to PDF Online | ChlatWork",
    metaDescription:
      "Turn JPG, PNG, WebP, and HEIC images into a clean PDF with page size, orientation, margin, and ordering controls.",
    heroTitle: "How to Convert Images Into One PDF",
    heroDescription:
      "Create a PDF from screenshots, scans, receipts, or product images and arrange the pages before downloading.",
    ctaLabel: "Convert Images to PDF",
    whatIs: [
      "The Image to PDF Converter combines multiple image files into one PDF document. You can add photos or screenshots, reorder pages, adjust page settings, and download a clean PDF.",
      "It is useful when a form, customer, school, or office asks for a PDF instead of several separate image files.",
    ],
    whyUse: [
      "It keeps related images together in one easy-to-share document.",
      "It supports practical page settings such as size, orientation, margins, and images per page.",
      "It helps turn phone photos of documents into a single PDF attachment.",
      "It is faster than opening a desktop editor for simple image-to-PDF work.",
      "It makes uploads cleaner when a website only accepts one document.",
    ],
    steps: [
      "Open the Image to PDF Converter.",
      "Choose JPG, PNG, WebP, or HEIC images from your device.",
      "Drag images in the preview to put the pages in the right order.",
      "Choose the page size, orientation, margin, and how many images to place on each page.",
      "Click Convert to PDF and wait for the generated file.",
      "Download the PDF and open it once to confirm the order and page layout.",
    ],
    useCases: [
      "A small shop combines receipt photos into one PDF for monthly records.",
      "A student scans homework pages with a phone and sends one PDF to a teacher.",
      "A freelancer sends design previews as a single document to a client.",
      "An office assistant combines ID photos, forms, and signed pages for internal processing.",
      "A seller turns product photos into a quick catalog for a customer.",
    ],
    tips: [
      "Take photos in good light so the PDF stays readable.",
      "Crop or rotate images before converting if the source photo is messy.",
      "Use portrait orientation for documents and landscape for wide screenshots.",
      "Put cover pages or important pages first before generating the PDF.",
      "Compress large photos first if the final PDF must stay under an upload limit.",
    ],
    faqs: [
      {
        question: "Can I reorder images before making the PDF?",
        answer:
          "Yes. The preview supports reordering so you can place pages in the correct sequence.",
      },
      {
        question: "Can I convert phone photos to PDF?",
        answer:
          "Yes. Phone photos work well when they are clear, bright, and not too skewed.",
      },
      {
        question: "Does it support HEIC images from iPhone?",
        answer:
          "The tool includes HEIC preparation support for compatible browser environments.",
      },
      {
        question: "Can I choose A4 page size?",
        answer:
          "Yes. Use the page settings panel to choose the page size and layout before converting.",
      },
      {
        question: "Is this free to use?",
        answer:
          "Yes. You can create image PDFs with ChlatWork for free.",
      },
    ],
    keywords: [
      "convert images to PDF",
      "JPG to PDF",
      "PNG to PDF",
      "HEIC to PDF",
    ],
    applicationCategory: "UtilitiesApplication",
  },
  "jpg-to-pdf": createPdfGuide({
    toolName: "JPG to PDF",
    metaTitle: "How to Convert JPG to PDF Online | ChlatWork",
    metaDescription:
      "Learn how to convert JPG, PNG, and WebP images into one PDF locally in your browser.",
    heroTitle: "How to Convert JPG Images Into a PDF",
    heroDescription:
      "Turn photos, scans, receipts, and screenshots into one downloadable PDF without uploading files.",
    ctaLabel: "Convert JPG to PDF",
    primaryUse: "turning image files into a single PDF document",
    inputLabel: "JPG, PNG, or WebP images",
    outputLabel: "generated PDF",
    extraStep: "Arrange the images in the order you want them to appear in the PDF.",
    limitation:
      "If the source images are very large, resize or compress them first for a smaller PDF.",
    keywords: ["JPG to PDF", "convert image to PDF", "PNG to PDF", "browser PDF converter"],
  }),
  "pdf-to-jpg": createPdfGuide({
    toolName: "PDF to JPG",
    metaTitle: "How to Convert PDF to JPG Online | ChlatWork",
    metaDescription:
      "Learn how to render PDF pages as JPG images locally in your browser without uploading the PDF.",
    heroTitle: "How to Convert PDF Pages to JPG Images",
    heroDescription:
      "Render PDF pages into image files that are easy to share, preview, or upload to image-only forms.",
    ctaLabel: "Convert PDF to JPG",
    primaryUse: "rendering PDF pages into downloadable JPG images",
    inputLabel: "PDF file",
    outputLabel: "JPG page images",
    extraStep: "Choose a render quality and scale that fits your file size and sharpness needs.",
    limitation:
      "ZIP download is not included yet, so download each rendered JPG page individually.",
    keywords: ["PDF to JPG", "convert PDF to image", "PDF page image", "browser PDF renderer"],
  }),
  "merge-pdf": createPdfGuide({
    toolName: "Merge PDF",
    metaTitle: "How to Merge PDF Files Online | ChlatWork",
    metaDescription:
      "Learn how to combine multiple PDF files into one ordered PDF in your browser.",
    heroTitle: "How to Merge Multiple PDF Files",
    heroDescription:
      "Combine separate PDF documents into one clean file with the order you choose.",
    ctaLabel: "Merge PDFs",
    primaryUse: "combining multiple PDF files into one PDF",
    inputLabel: "two or more PDF files",
    outputLabel: "merged PDF",
    extraStep: "Use the file order controls to place the PDFs in the correct sequence.",
    limitation:
      "Interactive form behavior can vary because the tool copies page content into a new PDF.",
    keywords: ["merge PDF", "combine PDF files", "join PDF online", "browser PDF merge"],
  }),
  "split-pdf": createPdfGuide({
    toolName: "Split PDF",
    metaTitle: "How to Split a PDF Online | ChlatWork",
    metaDescription:
      "Learn how to split a PDF by page ranges like 1-3, 5, 8-10 using a local browser tool.",
    heroTitle: "How to Split a PDF by Page Range",
    heroDescription:
      "Extract only the PDF pages you need and download them as a new PDF file.",
    ctaLabel: "Split PDF",
    primaryUse: "extracting selected pages from a PDF",
    inputLabel: "PDF file and page range",
    outputLabel: "split PDF",
    extraStep: "Enter pages to keep, such as 1-3, 5, 8-10.",
    limitation:
      "Page numbers start at 1, so check the page count shown by the tool before generating.",
    keywords: ["split PDF", "extract PDF pages", "PDF page range", "browser PDF splitter"],
  }),
  "compress-pdf": createPdfGuide({
    toolName: "Compress PDF",
    metaTitle: "How to Compress a PDF Online | ChlatWork",
    metaDescription:
      "Learn what browser-side PDF compression can safely do and how to rebuild a PDF locally.",
    heroTitle: "How to Compress a PDF in Your Browser",
    heroDescription:
      "Rebuild a PDF locally and remove safe metadata where possible without uploading the file.",
    ctaLabel: "Compress PDF",
    primaryUse: "rebuilding a PDF to reduce safe overhead where possible",
    inputLabel: "PDF file",
    outputLabel: "compressed PDF",
    extraStep: "Review the original and output file sizes after processing.",
    limitation:
      "Compression depends on PDF content and may not shrink files that are already optimized.",
    keywords: ["compress PDF", "reduce PDF size", "PDF optimizer", "browser PDF compression"],
  }),
  "remove-pdf-pages": createPdfGuide({
    toolName: "PDF Page Remover",
    metaTitle: "How to Remove Pages from a PDF Online | ChlatWork",
    metaDescription:
      "Learn how to remove pages from a PDF using ranges like 2, 5-7 and download a new copy.",
    heroTitle: "How to Remove Pages from a PDF",
    heroDescription:
      "Delete unwanted PDF pages and create a clean copy while keeping the original file unchanged.",
    ctaLabel: "Remove PDF Pages",
    primaryUse: "removing unwanted pages from a PDF",
    inputLabel: "PDF file and pages to remove",
    outputLabel: "PDF with pages removed",
    extraStep: "Enter pages to remove, such as 2, 5-7.",
    limitation:
      "You must keep at least one page, so the tool will reject ranges that remove every page.",
    keywords: ["remove PDF pages", "delete PDF pages", "PDF page remover", "edit PDF pages"],
  }),
  "reorder-pdf-pages": createPdfGuide({
    toolName: "PDF Page Reorder",
    metaTitle: "How to Reorder PDF Pages Online | ChlatWork",
    metaDescription:
      "Learn how to reorder PDF pages using a custom order like 3,1,2,4 in your browser.",
    heroTitle: "How to Reorder PDF Pages",
    heroDescription:
      "Create a new PDF with pages arranged in the exact order you need.",
    ctaLabel: "Reorder PDF Pages",
    primaryUse: "creating a new PDF with pages in a custom order",
    inputLabel: "PDF file and custom page order",
    outputLabel: "reordered PDF",
    extraStep: "Enter the new order, such as 3,1,2,4.",
    limitation:
      "Each page can appear only once in the custom order to avoid accidental duplicates.",
    keywords: ["reorder PDF pages", "arrange PDF pages", "move PDF pages", "PDF page order"],
  }),
  "html-to-pdf": createPdfGuide({
    toolName: "HTML to PDF",
    metaTitle: "How to Convert HTML to PDF Online | ChlatWork",
    metaDescription:
      "Learn how to convert simple printable HTML into a PDF locally in your browser.",
    heroTitle: "How to Convert HTML Into a PDF",
    heroDescription:
      "Paste simple HTML, preview it, and generate a printable PDF without a backend upload.",
    ctaLabel: "Convert HTML to PDF",
    primaryUse: "turning simple HTML content into a printable PDF",
    inputLabel: "HTML content",
    outputLabel: "HTML PDF",
    extraStep: "Preview the rendered HTML and adjust simple styles before generating.",
    limitation:
      "Complex scripts, remote assets, and advanced CSS may not render exactly like a full browser print engine.",
    keywords: ["HTML to PDF", "convert HTML to PDF", "print HTML PDF", "browser HTML renderer"],
  }),
  "text-to-pdf": createPdfGuide({
    toolName: "Text to PDF",
    metaTitle: "How to Convert Text to PDF Online | ChlatWork",
    metaDescription:
      "Learn how to create a simple PDF from plain text with font size, page size, and margin options.",
    heroTitle: "How to Convert Plain Text Into a PDF",
    heroDescription:
      "Turn notes, drafts, instructions, or plain content into a clean downloadable PDF.",
    ctaLabel: "Convert Text to PDF",
    primaryUse: "creating simple PDF documents from plain text",
    inputLabel: "plain text",
    outputLabel: "text PDF",
    extraStep: "Choose font size, page size, and margin before generating the PDF.",
    limitation:
      "This tool is for plain text; use HTML to PDF when you need basic formatting.",
    keywords: ["text to PDF", "plain text PDF", "create PDF from text", "browser PDF writer"],
  }),
  "invoice-to-pdf": createPdfGuide({
    toolName: "Invoice to PDF",
    metaTitle: "How to Create an Invoice PDF for Free | ChlatWork",
    metaDescription:
      "Learn how to fill a simple invoice form and generate a clean PDF invoice in your browser.",
    heroTitle: "How to Create a Simple Invoice PDF",
    heroDescription:
      "Enter company, customer, items, discount, tax, and notes, then download a professional invoice PDF.",
    ctaLabel: "Create Invoice PDF",
    primaryUse: "generating a clean invoice PDF from a simple form",
    inputLabel: "invoice details and item rows",
    outputLabel: "invoice PDF",
    extraStep: "Add line items, discount, tax, and notes before generating the invoice.",
    limitation:
      "The invoice template is intentionally simple, so review totals and notes before sending it to a customer.",
    keywords: ["invoice PDF generator", "create invoice PDF", "free invoice tool", "browser invoice PDF"],
  }),
  qr: {
    metaTitle: "How to Generate a QR Code for Free | ChlatWork",
    metaDescription:
      "Create a free QR code for a website link, text, menu, contact note, or campaign and download it as PNG.",
    heroTitle: "How to Generate a QR Code for Free",
    heroDescription:
      "Turn a URL or text into a scannable QR code that you can download and use on posters, labels, menus, or messages.",
    ctaLabel: "Generate QR Code",
    whatIs: [
      "The QR Generator turns plain text or a link into a QR code. When someone scans it with a phone camera, the phone can open the link or display the text.",
      "QR codes are common on menus, signs, payment instructions, event posters, packaging, and office notices because they remove typing and reduce mistakes.",
    ],
    whyUse: [
      "It makes long links easier for customers and staff to open.",
      "It is useful for printed signs, product labels, and event check-in points.",
      "It can help a small business connect offline visitors to online pages.",
      "It supports quick download as an image for printing or sharing.",
      "It avoids asking people to type URLs from a poster or receipt.",
    ],
    steps: [
      "Open the ChlatWork QR Generator.",
      "Paste the website URL, menu link, form link, or text you want to encode.",
      "Check the size, margin, and error correction settings if you need a specific print result.",
      "Generate the QR code and review the preview.",
      "Download the PNG file.",
      "Test the QR code with your phone before printing or sharing it publicly.",
    ],
    useCases: [
      "A cafe prints a QR code for its online menu at every table.",
      "A local service business adds a QR code to a flyer so customers can open a booking form.",
      "An event organizer places a QR code at the entrance for registration.",
      "A teacher shares a class resource link without asking students to type it.",
      "A developer creates a quick QR code for a staging URL during testing.",
    ],
    tips: [
      "Use the full URL, including https, for website links.",
      "Leave enough white space around the QR code when printing.",
      "Avoid placing the code on a busy background.",
      "Print a test copy and scan it from the expected viewing distance.",
      "Update the destination page instead of reprinting the QR code when possible.",
    ],
    faqs: [
      {
        question: "What can I put inside a QR code?",
        answer:
          "You can encode a website link, plain text, contact note, form link, menu link, or other short information.",
      },
      {
        question: "Can phones scan the QR code without an app?",
        answer:
          "Most modern iPhone and Android cameras can scan QR codes directly from the camera app.",
      },
      {
        question: "Can I print the downloaded QR code?",
        answer:
          "Yes. Download the PNG and place it on your poster, label, document, or menu design.",
      },
      {
        question: "Why should I test before printing?",
        answer:
          "Testing confirms the link is correct, the code scans clearly, and the printed size is large enough.",
      },
      {
        question: "Is the QR Generator free?",
        answer:
          "Yes. ChlatWork lets you generate QR codes for free.",
      },
    ],
    keywords: ["generate QR code", "free QR generator", "QR code PNG", "online QR tool"],
    applicationCategory: "UtilitiesApplication",
  },
  "wifi-qr": {
    metaTitle: "How to Create a Wi-Fi QR Code for Free | ChlatWork",
    metaDescription:
      "Create a Wi-Fi QR code so customers, guests, or staff can connect by scanning instead of typing the password.",
    heroTitle: "How to Create a Wi-Fi QR Code for Free",
    heroDescription:
      "Make a scannable Wi-Fi poster for a cafe, home, office, or shop, then download or print it for guests.",
    ctaLabel: "Create Wi-Fi QR Code",
    whatIs: [
      "A Wi-Fi QR code stores your network name, password, security type, and hidden-network setting in a format phones can understand. When guests scan it, their phone can offer to join the network.",
      "This is especially helpful in shops, cafes, offices, rentals, and homes where people often mistype long Wi-Fi passwords.",
    ],
    whyUse: [
      "It helps customers connect faster without asking staff for the password.",
      "It reduces typing errors for long or mixed-case passwords.",
      "It works well for printed posters at reception desks, counters, and meeting rooms.",
      "It keeps the Wi-Fi details consistent for every guest.",
      "It is useful for Cambodia cafes, clinics, salons, co-working spaces, and small offices.",
    ],
    steps: [
      "Open the ChlatWork Wi-Fi QR Generator.",
      "Enter the Wi-Fi network name exactly as it appears on devices.",
      "Enter the password and choose the correct security type, usually WPA or WPA2.",
      "Turn on the hidden network option only if your Wi-Fi name is hidden.",
      "Generate the QR code and test it with an iPhone and an Android phone if possible.",
      "Download the QR code or poster and print it where guests can scan easily.",
    ],
    useCases: [
      "A Phnom Penh cafe places a Wi-Fi QR poster near the cashier so customers can connect while ordering.",
      "A guesthouse prints one QR code for each room or lobby network.",
      "An office puts a Wi-Fi QR code in the meeting room for visitors and vendors.",
      "A home user prints a small QR code for family guests instead of reading the password aloud.",
      "A school or training room shares a temporary Wi-Fi network with students during a workshop.",
    ],
    tips: [
      "Double-check capitalization in the network name and password.",
      "Do not print the password in plain text if you want visitors to scan only.",
      "Use a large enough QR code for the scanning distance.",
      "Replace the poster whenever the Wi-Fi password changes.",
      "Keep guest Wi-Fi separate from your internal business network when possible.",
    ],
    faqs: [
      {
        question: "Is a Wi-Fi QR code safe?",
        answer:
          "It is as safe as sharing the Wi-Fi password. Anyone who can scan the code may be able to join, so place it only where intended guests can access it.",
      },
      {
        question: "Does it work on iPhone and Android?",
        answer:
          "Most modern iPhone and Android phones support Wi-Fi QR scanning from the camera or Wi-Fi settings.",
      },
      {
        question: "Which security type should I choose?",
        answer:
          "Most home and business routers use WPA or WPA2. Choose no password only for open guest networks.",
      },
      {
        question: "Can I print the QR code as a poster?",
        answer:
          "Yes. The tool supports a print-friendly poster flow so you can place the code at a counter, table, or front desk.",
      },
      {
        question: "What if guests cannot connect?",
        answer:
          "Check the Wi-Fi name, password, security type, and hidden-network setting. A single wrong character can stop the connection.",
      },
    ],
    keywords: [
      "Wi-Fi QR code",
      "create Wi-Fi QR code",
      "Wi-Fi poster",
      "Cambodia cafe Wi-Fi QR",
    ],
    applicationCategory: "UtilitiesApplication",
  },
  "text-to-voice": {
    metaTitle: "How to Convert Khmer and English Text to Voice | ChlatWork",
    metaDescription:
      "Read Khmer or English text aloud with ChlatWork Text to Voice using automatic language detection, online audio, or browser voice controls.",
    heroTitle: "How to Convert Khmer and English Text to Voice",
    heroDescription:
      "Paste Khmer or English text, choose an audio engine, adjust voice settings, and listen or download speech when supported.",
    ctaLabel: "Open Text to Voice",
    whatIs: [
      "Text to Voice is a reading tool that turns typed Khmer or English text into audio. It detects the language automatically before using online audio or browser voice mode.",
      "It is helpful for checking announcements, learning pronunciation, preparing short audio messages, or making text easier to review by listening.",
    ],
    whyUse: [
      "It supports Khmer and English without making you choose the language manually.",
      "It gives simple controls for speed, pitch, and volume where the engine supports them.",
      "It can help staff review written notices before sending them to customers.",
      "It supports listening without setting up a full audio editing workflow.",
      "It is useful for learners, content creators, and teams preparing short Khmer or English scripts.",
    ],
    steps: [
      "Open the ChlatWork Text to Voice tool.",
      "Paste or type Khmer or English text into the text box.",
      "Let the tool detect the language automatically.",
      "Choose online audio or browser voice depending on what works best on your device.",
      "Select a voice option if more than one is available.",
      "Adjust speed, pitch, or volume when needed.",
      "Click Speak to listen, pause or stop playback, and download MP3 if the selected mode supports it.",
    ],
    useCases: [
      "A shop owner listens to a Khmer promotion message before posting it online.",
      "A teacher checks a short Khmer reading passage for class material.",
      "A content creator previews narration for a short video.",
      "A customer support team prepares a clear Khmer announcement for repeated use.",
      "A learner compares typed Khmer text with audio playback for pronunciation practice.",
      "A support team listens to English service copy before publishing it.",
    ],
    tips: [
      "Keep sentences short when testing a new voice.",
      "Add punctuation so the voice has natural pauses.",
      "Use browser voice mode for local playback when your device has a good matching voice.",
      "Use online mode when browser voices are missing or weak.",
      "Review downloaded audio before using it in public content.",
    ],
    faqs: [
      {
        question: "Does every browser have Khmer voices?",
        answer:
          "No. Browser voice support depends on the operating system and installed voices. Online mode can help when local Khmer or English voices are missing.",
      },
      {
        question: "Can I download the audio?",
        answer:
          "The tool includes a download option when the selected audio engine supports generating downloadable MP3 output.",
      },
      {
        question: "Why does online mode need the internet?",
        answer:
          "Online mode sends text to the ChlatWork audio API so it can return speech audio.",
      },
      {
        question: "Can I use English text too?",
        answer:
          "Yes. The tool detects English text automatically and can use online English audio or a matching browser voice.",
      },
      {
        question: "How do I make the voice sound more natural?",
        answer:
          "Use shorter sentences, normal punctuation, and a moderate speed setting.",
      },
    ],
    keywords: [
      "Khmer text to voice",
      "English text to voice",
      "Cambodian text to speech",
      "Khmer TTS",
      "download text to voice audio",
    ],
    applicationCategory: "UtilitiesApplication",
  },
  calculator: {
    metaTitle: "How to Use a Date Calculator Online | ChlatWork",
    metaDescription:
      "Add or subtract days, weeks, months, and years from a date with the ChlatWork Date Calculator.",
    heroTitle: "How to Use a Date Calculator Online",
    heroDescription:
      "Calculate future dates, past dates, and time differences without opening a spreadsheet.",
    ctaLabel: "Open Date Calculator",
    whatIs: [
      "The ChlatWork calculator page is currently focused on date calculations. It helps you add or subtract days, weeks, months, or years, and check date differences for planning work.",
      "It is useful for deadlines, payment dates, follow-up schedules, booking windows, warranty periods, and other date-based tasks.",
    ],
    whyUse: [
      "It avoids manual counting on a calendar.",
      "It helps teams calculate deadlines consistently.",
      "It is useful for payment reminders, delivery estimates, and project schedules.",
      "It works quickly for both future and past date checks.",
      "It is simpler than setting up a spreadsheet formula for one quick answer.",
    ],
    steps: [
      "Open the Date Calculator tool.",
      "Choose the date you want to start from.",
      "Select whether you want to add or subtract time.",
      "Enter the amount and choose days, weeks, months, or years.",
      "Run the calculation and review the resulting date.",
      "Use the date difference section when you need to compare two dates instead.",
    ],
    useCases: [
      "A small business calculates a customer payment due date 30 days after invoice issue.",
      "An HR team checks the end date for a probation period.",
      "A clinic estimates a follow-up date after a visit.",
      "A delivery team calculates the date after a promised lead time.",
      "A student checks how many days remain before an exam or submission deadline.",
    ],
    tips: [
      "Confirm whether your business counts calendar days or working days.",
      "Be careful around month ends because adding one month can behave differently than adding 30 days.",
      "Use the date difference mode when checking contract periods.",
      "Write down the starting date so teammates can reproduce the result.",
      "Check timezone-sensitive deadlines separately if an exact time also matters.",
    ],
    faqs: [
      {
        question: "Can I add weeks to a date?",
        answer:
          "Yes. Choose the start date, select plus, enter the number of weeks, and calculate.",
      },
      {
        question: "Can I subtract days from a date?",
        answer:
          "Yes. Use minus mode when you need to count backward from a deadline or event date.",
      },
      {
        question: "Is this a money calculator?",
        answer:
          "The current calculator page is focused on date calculations, not advanced financial math.",
      },
      {
        question: "Can I compare two dates?",
        answer:
          "Yes. Use the date difference section to compare two dates and see the gap.",
      },
      {
        question: "Is it free?",
        answer:
          "Yes. The ChlatWork Date Calculator is free to use online.",
      },
    ],
    keywords: ["date calculator", "add days to date", "date difference calculator", "deadline calculator"],
    applicationCategory: "UtilitiesApplication",
  },
  barcode: {
    metaTitle: "How to Generate a Barcode for Free | ChlatWork",
    metaDescription:
      "Generate CODE128, EAN13, UPC, and CODE39 barcodes from numbers and basic English characters and download them as SVG.",
    heroTitle: "How to Generate a Barcode for Free",
    heroDescription:
      "Create a barcode for labels, inventory, product codes, or testing, then download a clean SVG file.",
    ctaLabel: "Generate Barcode",
    whatIs: [
      "The Barcode Generator creates barcode graphics from numbers and basic English characters. It supports common barcode formats such as CODE128, EAN13, UPC, and CODE39.",
      "It is useful for labels, internal stock codes, sample product tags, testing scanner workflows, and simple retail preparation.",
    ],
    whyUse: [
      "It creates a downloadable SVG that stays sharp when printed.",
      "It supports several common barcode formats.",
      "It helps test POS and inventory workflows quickly.",
      "It is useful for small shops that need simple internal labels.",
      "It avoids installing desktop barcode software for quick tasks.",
    ],
    steps: [
      "Open the ChlatWork Barcode Generator.",
      "Enter the product code, stock number, or text you want to encode.",
      "Choose the barcode format that matches your need.",
      "Click Generate and review the preview.",
      "Download the SVG file.",
      "Print a sample and test it with your scanner before printing many labels.",
    ],
    useCases: [
      "A mini mart creates internal shelf labels for products that do not have barcodes.",
      "A developer tests barcode scanning in a POS or warehouse feature.",
      "A stockroom labels boxes with internal item codes.",
      "A seller prepares clean product-code labels for packaging.",
      "A training team creates sample barcodes for cashier practice.",
    ],
    tips: [
      "Use EAN or UPC only when your code length matches the format rules.",
      "Use CODE128 for flexible internal codes.",
      "Print at a readable size with enough quiet space around the barcode.",
      "Avoid stretching the barcode image after downloading.",
      "Test with the same scanner or phone app your team will use.",
    ],
    faqs: [
      {
        question: "Which barcode format should I choose?",
        answer:
          "Use CODE128 for flexible internal codes. Use EAN13 or UPC only when you have valid retail-style numeric codes.",
      },
      {
        question: "Can I print the barcode?",
        answer:
          "Yes. Download the SVG and place it in your label or document before printing.",
      },
      {
        question: "Why does my barcode not generate?",
        answer:
          "Some formats require a specific number format or length. These 1D barcode formats also do not support Khmer or other Unicode text; use QR Generator for Khmer text.",
      },
      {
        question: "Can it create official retail barcodes?",
        answer:
          "It can generate the graphic, but official retail barcode numbers usually need to come from the proper issuing authority.",
      },
      {
        question: "Is the tool free?",
        answer:
          "Yes. ChlatWork Barcode Generator is free to use.",
      },
    ],
    keywords: ["barcode generator", "generate barcode free", "CODE128 barcode", "EAN13 barcode"],
    applicationCategory: "UtilitiesApplication",
  },
  "expense-tracker": {
    metaTitle: "How to Track Expenses Online for Free | ChlatWork",
    metaDescription:
      "Track daily expenses, budgets, categories, and spending insights with the free ChlatWork Expense Tracker.",
    heroTitle: "How to Track Expenses Online for Free",
    heroDescription:
      "Record spending, compare it with a budget, and understand where money goes without a heavy finance app.",
    ctaLabel: "Open Expense Tracker",
    whatIs: [
      "The Expense Tracker helps you list spending, organize it by category, and review budget progress. It is built for quick daily tracking rather than complex accounting.",
      "It works well for personal budgets, family spending, small team petty cash, and simple project cost tracking.",
    ],
    whyUse: [
      "It helps you see spending patterns instead of guessing.",
      "It supports budgets, categories, notes, and summary insights.",
      "It is lighter than a full bookkeeping system.",
      "It can help small teams understand everyday cash spending.",
      "It is useful when you need a quick record before moving data into accounting later.",
    ],
    steps: [
      "Open the Expense Tracker.",
      "Set a budget or tracking range if needed.",
      "Add each expense with an amount, category, and optional note.",
      "Review the summary cards to see total spending and remaining budget.",
      "Check category breakdowns to find where money is going.",
      "Copy or export the result when you need to share it with someone else.",
    ],
    useCases: [
      "A family tracks grocery, transport, school, and utility expenses for the month.",
      "A small shop records daily cash purchases such as bags, tape, and cleaning supplies.",
      "A project team tracks snacks, printing, delivery, and event costs.",
      "A freelancer watches daily food, fuel, coffee, and mobile data spending.",
      "A student compares weekly spending with a fixed allowance.",
    ],
    tips: [
      "Add expenses on the same day so the record stays accurate.",
      "Use consistent categories like food, transport, rent, supplies, and bills.",
      "Write short notes for unusual or one-time expenses.",
      "Review the summary at the end of each week, not only at month end.",
      "Set a realistic budget so the tracker becomes useful instead of stressful.",
    ],
    faqs: [
      {
        question: "Is this a full accounting system?",
        answer:
          "No. It is a simple expense tracker for quick budgeting and insight, not a replacement for formal accounting software.",
      },
      {
        question: "Can I use it for a small business?",
        answer:
          "Yes, for simple day-to-day expense visibility. For tax or formal reports, confirm records with your accounting process.",
      },
      {
        question: "Can I track categories?",
        answer:
          "Yes. Categories help you see where the money is going.",
      },
      {
        question: "Should I record every small expense?",
        answer:
          "If your goal is accurate budgeting, yes. Small daily amounts can become large over a month.",
      },
      {
        question: "Is it free?",
        answer:
          "Yes. The ChlatWork Expense Tracker is free to use.",
      },
    ],
    keywords: ["expense tracker", "track expenses online", "budget tracker", "Cambodia expense tracker"],
    applicationCategory: "UtilitiesApplication",
  },
  "lucky-draw": {
    metaTitle: "How to Run a Lucky Draw Online | ChlatWork",
    metaDescription:
      "Run a fair lucky draw wheel online by adding participants, drawing winners, and sharing the result.",
    heroTitle: "How to Run a Lucky Draw Online",
    heroDescription:
      "Add names, spin the wheel, and choose winners for events, shops, classrooms, campaigns, or team activities.",
    ctaLabel: "Open Lucky Draw",
    whatIs: [
      "The Lucky Draw tool is a simple wheel for choosing random winners from a participant list. You add names, spin, and let the tool pick winners visually.",
      "It is useful for giveaways, classroom games, staff events, shop promotions, and small campaign activities where the draw needs to feel clear and fair.",
    ],
    whyUse: [
      "It makes the draw visible instead of hidden in a spreadsheet.",
      "It is easy for audiences to understand during a live event.",
      "It supports quick participant entry and winner selection.",
      "It works for small shops, schools, teams, and social campaigns.",
      "It gives a cleaner experience than manually picking names from chat.",
    ],
    steps: [
      "Open the Lucky Draw tool.",
      "Add participant names one by one or paste a list.",
      "Review the list to remove duplicates or typing mistakes.",
      "Choose the draw settings that match your event.",
      "Start the draw and let the wheel select a winner.",
      "Record or share the winner result with the audience or team.",
    ],
    useCases: [
      "A Cambodia shop runs a Facebook giveaway for customers who commented on a post.",
      "A teacher chooses a student for a classroom activity.",
      "A company picks staff prizes during a year-end party.",
      "A cafe chooses a free-drink winner from loyalty-card customers.",
      "A small online seller draws winners during a livestream promotion.",
    ],
    tips: [
      "Clean the participant list before starting the draw.",
      "Remove duplicate names unless your rules allow multiple entries.",
      "Announce the rules before spinning.",
      "Keep a screenshot or copy of the winner list for transparency.",
      "Test the draw before going live in front of customers.",
    ],
    faqs: [
      {
        question: "Can I paste many participants at once?",
        answer:
          "Yes. The tool supports adding participants quickly so you do not need to type every name manually.",
      },
      {
        question: "Can I use it for a shop giveaway?",
        answer:
          "Yes. It is a good fit for small campaigns, customer rewards, and social media giveaways.",
      },
      {
        question: "Should I remove duplicate entries?",
        answer:
          "That depends on your event rules. For one-entry-per-person draws, remove duplicates before spinning.",
      },
      {
        question: "Can I share the draw result?",
        answer:
          "Yes. You can record the winner result or share the page state where supported by the tool.",
      },
      {
        question: "Is the Lucky Draw free?",
        answer:
          "Yes. The ChlatWork Lucky Draw tool is free to use.",
      },
    ],
    keywords: ["lucky draw online", "random winner picker", "spin wheel giveaway", "Cambodia lucky draw"],
    applicationCategory: "UtilitiesApplication",
  },
  "json-formatter": {
    metaTitle: "How to Format JSON Online | ChlatWork",
    metaDescription:
      "Format, minify, and validate JSON with readable indentation and helpful error details.",
    heroTitle: "How to Format JSON Online",
    heroDescription:
      "Paste messy JSON, make it readable, minify it for transport, or validate it before using it in code.",
    ctaLabel: "Format JSON",
    whatIs: [
      "The JSON Formatter / Validator turns compact or messy JSON into readable indented output. It can also minify JSON and show validation errors when the input is not valid.",
      "Developers, API testers, support teams, and students use JSON formatters to inspect API responses, config files, logs, and webhook payloads.",
    ],
    whyUse: [
      "It makes nested JSON easier to read and debug.",
      "It helps find syntax errors before sending data to an API.",
      "It can minify JSON when smaller output is needed.",
      "It is useful for API responses, webhooks, config, and logs.",
      "It saves time compared with manually spacing large JSON blocks.",
    ],
    steps: [
      "Open the JSON Formatter / Validator.",
      "Paste your JSON into the input box.",
      "Click Format to make it readable or Minify to make it compact.",
      "If the JSON is invalid, read the error message and fix the input.",
      "Copy the result when it looks correct.",
      "Use the formatted version for debugging and the minified version for transport or storage.",
    ],
    useCases: [
      "A backend developer checks an API response from a NestJS or Laravel endpoint.",
      "A QA tester validates a webhook payload before reporting a bug.",
      "A support engineer formats application logs to inspect a customer issue.",
      "A student learns JSON structure by seeing indentation clearly.",
      "A developer prepares clean JSON for Postman, Insomnia, or a request file.",
    ],
    tips: [
      "Use double quotes for JSON keys and string values.",
      "Remove trailing commas because JSON does not allow them.",
      "Do not paste secrets into shared screenshots.",
      "Format first when debugging, then minify only when needed.",
      "Validate JSON before sending it to production APIs.",
    ],
    faqs: [
      {
        question: "What does formatting JSON do?",
        answer:
          "It adds indentation and line breaks so nested objects and arrays are easier to read.",
      },
      {
        question: "What does minifying JSON do?",
        answer:
          "It removes unnecessary spaces and line breaks so the JSON becomes smaller.",
      },
      {
        question: "Can it fix invalid JSON automatically?",
        answer:
          "It shows errors, but you should review and fix invalid input yourself so the data remains correct.",
      },
      {
        question: "Is JSON the same as JavaScript object syntax?",
        answer:
          "No. JSON is stricter. Keys must use double quotes, and trailing commas are not allowed.",
      },
      {
        question: "Can I use it for API debugging?",
        answer:
          "Yes. It is useful for reading API responses, request bodies, and webhook payloads.",
      },
    ],
    keywords: ["JSON formatter", "format JSON online", "JSON validator", "minify JSON"],
    applicationCategory: "DeveloperApplication",
  },
  "jwt-decoder": {
    metaTitle: "How to Decode a JWT Token Safely | ChlatWork",
    metaDescription:
      "Decode JWT header, payload, and timing claims while remembering that decoding does not verify the signature.",
    heroTitle: "How to Decode a JWT Token",
    heroDescription:
      "Inspect token header, payload, issued time, and expiry fields so you can debug authentication issues faster.",
    ctaLabel: "Decode JWT Token",
    whatIs: [
      "The JWT Decoder reads the visible parts of a JSON Web Token: the header and payload. It also helps explain common timing claims such as iat, exp, and nbf.",
      "Decoding is helpful for debugging authentication, but it is not the same as verifying a token signature. A decoded token can still be fake, expired, or invalid.",
    ],
    whyUse: [
      "It helps developers inspect token payloads during login and API debugging.",
      "It makes expiry and issued-at values easier to understand.",
      "It clearly separates decoding from signature verification.",
      "It is useful for frontend, backend, and QA teams checking auth flows.",
      "It helps spot wrong roles, tenants, subjects, or token times.",
    ],
    steps: [
      "Open the JWT Decoder.",
      "Paste the full token into the JWT input field.",
      "Click Decode to read the header and payload.",
      "Review claims such as sub, role, exp, iat, nbf, issuer, and audience.",
      "Check the warning that the signature is not verified by this decoder.",
      "Fix the related auth configuration or token source based on what you find.",
    ],
    useCases: [
      "A NestJS developer checks whether a guard receives the expected role claim.",
      "A Laravel API tester confirms whether a token expired before a request.",
      "A frontend developer checks whether the user ID in local storage matches the active account.",
      "A QA engineer compares staging and production issuer values.",
      "A support engineer inspects a token timing issue without exposing the signing secret.",
    ],
    tips: [
      "Never paste production secrets or signing keys into any decoder.",
      "Remember that decoding does not prove the token is trusted.",
      "Check token expiry in the same timezone context as your server logs.",
      "Use backend verification for real security decisions.",
      "Mask sensitive claim values before sharing screenshots.",
    ],
    faqs: [
      {
        question: "Does decoding a JWT verify it?",
        answer:
          "No. Decoding only reads the token content. Signature verification must happen with the correct secret or public key on the backend.",
      },
      {
        question: "Can I check if a token is expired?",
        answer:
          "Yes. If the token has an exp claim, the decoder can help you understand the expiry time.",
      },
      {
        question: "Is it safe to paste a JWT?",
        answer:
          "Be careful. A JWT can contain sensitive claims or grant access if still valid. Avoid sharing production tokens.",
      },
      {
        question: "What are header and payload?",
        answer:
          "The header describes token metadata such as algorithm. The payload contains claims such as subject, roles, and timing.",
      },
      {
        question: "Can this fix login issues?",
        answer:
          "It helps diagnose token content, but the actual fix may be in auth config, backend signing, guards, or frontend storage.",
      },
    ],
    keywords: ["JWT decoder", "decode JWT token", "JWT payload", "JWT expiry"],
    applicationCategory: "DeveloperApplication",
  },
  base64: {
    metaTitle: "How to Encode and Decode Base64 | ChlatWork",
    metaDescription:
      "Encode text, decode Base64, and convert local files to Base64 in your browser.",
    heroTitle: "How to Encode and Decode Base64",
    heroDescription:
      "Convert text to Base64, turn Base64 back into text, or create a Base64 string from a local file.",
    ctaLabel: "Open Base64 Tool",
    whatIs: [
      "Base64 is a way to represent binary data as plain text. Developers often see it in API payloads, data URLs, tokens, file previews, and email or upload workflows.",
      "The ChlatWork Base64 tool supports text encoding, text decoding, and local file-to-Base64 conversion in one place.",
    ],
    whyUse: [
      "It helps test API payloads that expect Base64 strings.",
      "It can decode readable Base64 text during debugging.",
      "It can convert a local file to Base64 without uploading it.",
      "It is useful for data URLs, small previews, and integration testing.",
      "It gives quick copy output for developers and QA teams.",
    ],
    steps: [
      "Open the Base64 Encoder / Decoder.",
      "Choose Encode, Decode, or File to Base64.",
      "Paste text or Base64 input, or choose a local file.",
      "Run the conversion.",
      "Check the result and any error message.",
      "Copy the output into your request body, config, or test note as needed.",
    ],
    useCases: [
      "A developer tests an API that accepts a Base64 image string.",
      "A QA tester decodes a sample payload to confirm its content.",
      "A frontend developer creates a quick data URL preview.",
      "A backend developer checks whether an incoming file field is valid Base64.",
      "A student learns why binary files are sometimes represented as text.",
    ],
    tips: [
      "Base64 increases size, so avoid using it for very large files when a normal upload is better.",
      "Check whether your API needs raw Base64 or a data URL prefix.",
      "Use UTF-8 text when encoding normal language content.",
      "Do not treat Base64 as encryption; it is easy to decode.",
      "Avoid sharing decoded values if they contain credentials or personal data.",
    ],
    faqs: [
      {
        question: "Is Base64 encryption?",
        answer:
          "No. Base64 is encoding, not encryption. Anyone can decode it.",
      },
      {
        question: "Can I convert a file to Base64?",
        answer:
          "Yes. Use the File to Base64 mode to choose a local file and generate text output.",
      },
      {
        question: "Why is Base64 output longer than the original file?",
        answer:
          "Base64 text is usually larger than the binary data it represents.",
      },
      {
        question: "Can I decode invalid Base64?",
        answer:
          "Invalid input will show an error. Check for missing characters, extra spaces, or the wrong data format.",
      },
      {
        question: "Does the file upload to a server?",
        answer:
          "The tool is designed to read the chosen file locally in the browser.",
      },
    ],
    keywords: ["Base64 encoder", "Base64 decoder", "file to Base64", "encode decode Base64"],
    applicationCategory: "DeveloperApplication",
  },
  "url-encoder": {
    metaTitle: "How to Encode and Decode URLs | ChlatWork",
    metaDescription:
      "Encode and decode URL components, query strings, and pasted parameters for safer web links.",
    heroTitle: "How to Encode and Decode URLs",
    heroDescription:
      "Fix spaces, special characters, and query string values so URLs can be shared or used in requests safely.",
    ctaLabel: "Open URL Encoder",
    whatIs: [
      "The URL Encoder / Decoder converts text into URL-safe characters and turns encoded URL text back into readable form. It is commonly used for query strings, redirect URLs, and API request parameters.",
      "When a URL contains spaces, Khmer text, symbols, or nested links, encoding helps browsers and servers read the value correctly.",
    ],
    whyUse: [
      "It prevents broken links caused by spaces or special characters.",
      "It helps inspect encoded query strings during debugging.",
      "It is useful for redirect URLs, tracking links, and API parameters.",
      "It can show decoded query parameters in a more readable way.",
      "It helps developers avoid manual percent-encoding mistakes.",
    ],
    steps: [
      "Open the URL Encoder / Decoder.",
      "Paste the text, URL component, or query string into the input.",
      "Click Encode when preparing text for a URL.",
      "Click Decode when reading an encoded value.",
      "Review decoded query parameters if the input contains them.",
      "Copy the result into your link, request, or debug note.",
    ],
    useCases: [
      "A developer encodes a redirect URL before adding it to an OAuth flow.",
      "A marketer checks a campaign URL with Khmer text in query parameters.",
      "A QA tester decodes a long tracking link to understand each parameter.",
      "A backend developer checks whether callback parameters are being sent correctly.",
      "A support team reads a broken customer link before reporting it to developers.",
    ],
    tips: [
      "Encode only the component that needs encoding, not always the entire URL.",
      "Decode suspicious links carefully before opening them.",
      "Watch for double encoding, where percent signs are encoded again.",
      "Keep parameter names clear so decoded query strings are easy to read.",
      "Use HTTPS links when sharing real customer or payment URLs.",
    ],
    faqs: [
      {
        question: "What does URL encoding do?",
        answer:
          "It converts characters such as spaces and symbols into a format that can travel safely inside URLs.",
      },
      {
        question: "When should I decode a URL?",
        answer:
          "Decode when you need to read an encoded parameter, redirect value, or tracking link.",
      },
      {
        question: "Can I encode Khmer text in a URL?",
        answer:
          "Yes. Non-English text can be encoded so it works correctly in a URL.",
      },
      {
        question: "What is double encoding?",
        answer:
          "Double encoding happens when an already encoded value gets encoded again, often making links fail.",
      },
      {
        question: "Is this useful for APIs?",
        answer:
          "Yes. URL encoding is common for query parameters and callback URLs in web APIs.",
      },
    ],
    keywords: ["URL encoder", "URL decoder", "encode query string", "decode URL online"],
    applicationCategory: "DeveloperApplication",
  },
  "regex-tester": {
    metaTitle: "How to Test Regex Online | ChlatWork",
    metaDescription:
      "Test JavaScript regular expressions with flags, matches, highlighting, and group results.",
    heroTitle: "How to Test Regex Online",
    heroDescription:
      "Write a pattern, paste sample text, choose flags, and inspect matches before using the regex in code.",
    ctaLabel: "Test Regex",
    whatIs: [
      "The Regex Tester lets you try a JavaScript regular expression against sample text. It shows matches, groups, and flags so you can understand what the pattern is doing.",
      "It is useful before adding regex to validation, search, parsing, log checks, import scripts, or frontend forms.",
    ],
    whyUse: [
      "It gives quick feedback while you build a pattern.",
      "It helps catch patterns that match too much or too little.",
      "It supports common JavaScript flags such as global, ignore case, multiline, dot all, and unicode.",
      "It makes capture groups easier to inspect.",
      "It reduces risky copy-paste changes in production code.",
    ],
    steps: [
      "Open the Regex Tester.",
      "Enter your regular expression pattern.",
      "Select the flags you need, such as global or ignore case.",
      "Paste realistic test text into the test string box.",
      "Review matches and capture groups.",
      "Adjust the pattern until it matches exactly what you expect.",
    ],
    useCases: [
      "A developer tests an email-like pattern before adding form validation.",
      "A backend engineer checks log lines for transaction IDs.",
      "A data entry team validates invoice codes before import.",
      "A QA tester confirms a search pattern works with Khmer and English text.",
      "A student learns how capture groups change regex output.",
    ],
    tips: [
      "Use real sample data, including edge cases and bad input.",
      "Start simple, then add stricter rules.",
      "Be careful with greedy patterns that match too much text.",
      "Use anchors when you need the entire input to match.",
      "Do not rely only on regex for security-sensitive validation.",
    ],
    faqs: [
      {
        question: "Which regex flavor does the tool use?",
        answer:
          "It is designed around JavaScript regular expressions, so behavior should match browser JavaScript.",
      },
      {
        question: "What does the global flag do?",
        answer:
          "The global flag finds all matches instead of stopping after the first match.",
      },
      {
        question: "Can regex validate emails perfectly?",
        answer:
          "Regex can catch obvious format issues, but full email validation is more complex than one simple pattern.",
      },
      {
        question: "Why does my regex match too much?",
        answer:
          "The pattern may be greedy or missing anchors. Test with smaller examples and tighten the expression.",
      },
      {
        question: "Can I copy matches?",
        answer:
          "Yes. The tool includes copy support for matched output.",
      },
    ],
    keywords: ["regex tester", "test regular expression", "JavaScript regex", "regex match groups"],
    applicationCategory: "DeveloperApplication",
  },
  "uuid-generator": {
    metaTitle: "How to Generate UUIDs Online | ChlatWork",
    metaDescription:
      "Generate one or many random v4 UUIDs and copy them for testing, database records, or sample data.",
    heroTitle: "How to Generate UUIDs Online",
    heroDescription:
      "Create v4 UUID values in bulk for development, QA, database fixtures, and temporary identifiers.",
    ctaLabel: "Generate UUIDs",
    whatIs: [
      "A UUID is a unique identifier commonly used in software systems. The ChlatWork UUID Generator creates random v4 UUIDs and lets you copy one or many at once.",
      "Developers use UUIDs for database records, test fixtures, request IDs, public identifiers, and sample data where a normal incrementing number is not ideal.",
    ],
    whyUse: [
      "It quickly generates valid v4 UUID values.",
      "It supports bulk output when you need more than one ID.",
      "It is useful for database seeding, API testing, and mock data.",
      "It avoids reusing the same fake ID in multiple tests.",
      "It gives copy-ready output for request files and scripts.",
    ],
    steps: [
      "Open the UUID Generator.",
      "Choose how many UUIDs you want.",
      "Click Generate.",
      "Review the generated UUID list.",
      "Copy one value or copy the full list.",
      "Paste the UUID into your database seed, test payload, fixture, or local note.",
    ],
    useCases: [
      "A backend developer creates IDs for local database seed records.",
      "A QA tester prepares unique values for repeated API tests.",
      "A frontend developer mocks records before the backend endpoint is ready.",
      "A DevOps engineer generates correlation IDs for manual log testing.",
      "A student learns what UUIDs look like in real applications.",
    ],
    tips: [
      "Use UUIDs when records need unique IDs across systems.",
      "Do not use random UUIDs as passwords or secrets.",
      "Keep generated test UUIDs separate from production data.",
      "Use database-native UUID generation when available in production.",
      "Generate fresh IDs when repeating tests that require uniqueness.",
    ],
    faqs: [
      {
        question: "What is a v4 UUID?",
        answer:
          "A v4 UUID is a randomly generated identifier with a standard format such as xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx.",
      },
      {
        question: "Are UUIDs guaranteed unique?",
        answer:
          "Random UUID collisions are extremely unlikely, but no random system can promise absolute uniqueness without checks.",
      },
      {
        question: "Can I generate many UUIDs at once?",
        answer:
          "Yes. Choose the quantity and generate a bulk list.",
      },
      {
        question: "Can I use UUIDs as secure tokens?",
        answer:
          "Do not treat normal UUIDs as secure secrets. Use a proper cryptographic token for security-sensitive flows.",
      },
      {
        question: "Is the UUID Generator free?",
        answer:
          "Yes. It is free to use on ChlatWork.",
      },
    ],
    keywords: ["UUID generator", "generate UUID online", "v4 UUID", "bulk UUID generator"],
    applicationCategory: "DeveloperApplication",
  },
  "unix-timestamp": {
    metaTitle: "How to Convert Unix Timestamps | ChlatWork",
    metaDescription:
      "Convert Unix timestamps to readable dates and convert dates back to seconds or milliseconds.",
    heroTitle: "How to Convert Unix Timestamps",
    heroDescription:
      "Translate timestamp values from logs, APIs, databases, and tokens into readable dates and back again.",
    ctaLabel: "Convert Timestamp",
    whatIs: [
      "A Unix timestamp is a number that represents time. It usually appears as seconds or milliseconds since January 1, 1970 UTC.",
      "The ChlatWork Unix Timestamp Converter helps you turn timestamp values into readable dates and generate timestamp values from normal dates.",
    ],
    whyUse: [
      "It makes API and database time values easier to read.",
      "It supports both seconds and milliseconds style timestamps.",
      "It helps debug logs, JWT claims, scheduled jobs, and payment events.",
      "It reduces mistakes when copying timestamps into tests.",
      "It lets you compare date values without manual timezone math.",
    ],
    steps: [
      "Open the Unix Timestamp Converter.",
      "Choose the timezone you want to view dates in.",
      "Paste a timestamp in seconds or milliseconds.",
      "Convert it to a readable date.",
      "Use the date-to-timestamp section when you need the reverse conversion.",
      "Copy seconds or milliseconds depending on what your system expects.",
    ],
    useCases: [
      "A developer checks the exp value from a JWT token.",
      "A support engineer reads payment or order event times from logs.",
      "A backend developer prepares timestamp test data for an API.",
      "A scheduler job owner confirms whether a cron output time is correct.",
      "A QA tester compares database times with user-visible dates.",
    ],
    tips: [
      "Check whether your system uses seconds or milliseconds.",
      "Be explicit about timezone when discussing timestamp bugs.",
      "JWT exp and iat values are usually seconds, not milliseconds.",
      "JavaScript Date values often use milliseconds.",
      "When logs disagree, compare the same instant in UTC first.",
    ],
    faqs: [
      {
        question: "What is the difference between seconds and milliseconds?",
        answer:
          "Milliseconds are 1000 times larger than seconds. Many APIs use seconds, while JavaScript date values often use milliseconds.",
      },
      {
        question: "Why does timezone matter?",
        answer:
          "The timestamp represents one instant, but the displayed date and time can change based on timezone.",
      },
      {
        question: "Can I convert a normal date to a timestamp?",
        answer:
          "Yes. Enter a date and copy the seconds or milliseconds result.",
      },
      {
        question: "Are Unix timestamps always UTC?",
        answer:
          "The raw timestamp is based on UTC. Timezone mainly affects how it is displayed to humans.",
      },
      {
        question: "Can this help with JWT expiry?",
        answer:
          "Yes. JWT expiry values are commonly Unix timestamps in seconds.",
      },
    ],
    keywords: ["Unix timestamp converter", "timestamp to date", "date to timestamp", "epoch converter"],
    applicationCategory: "DeveloperApplication",
  },
  "cron-explainer": {
    metaTitle: "How to Explain a Cron Expression | ChlatWork",
    metaDescription:
      "Understand cron expressions and preview upcoming run times for schedules like every 5 minutes or weekdays at 9 AM.",
    heroTitle: "How to Explain a Cron Expression",
    heroDescription:
      "Paste a cron expression, read what it means, and preview upcoming runs before using it in a job scheduler.",
    ctaLabel: "Explain Cron",
    whatIs: [
      "A cron expression describes a repeating schedule using fields for minute, hour, day, month, and weekday. It is common in backend jobs, backups, reports, reminders, and maintenance tasks.",
      "The ChlatWork Cron Expression Explainer translates the expression into simpler language and shows upcoming run times so you can catch mistakes early.",
    ],
    whyUse: [
      "It helps prevent scheduled jobs from running at the wrong time.",
      "It turns compact cron syntax into readable explanations.",
      "It previews upcoming runs for quick verification.",
      "It is useful for backups, notifications, report jobs, and cleanup tasks.",
      "It helps teammates review schedules without memorizing cron syntax.",
    ],
    steps: [
      "Open the Cron Expression Explainer.",
      "Paste a five-field cron expression such as */5 * * * *.",
      "Click Explain or choose a sample expression.",
      "Read the plain-language schedule.",
      "Review the next run times.",
      "Copy the output into your task note, deployment checklist, or code review if needed.",
    ],
    useCases: [
      "A NestJS team verifies a daily report job before deployment.",
      "A Laravel app owner checks a nightly backup schedule.",
      "A DevOps engineer confirms a cleanup task will not run during peak traffic.",
      "A small business schedules daily Telegram notifications for activity logs.",
      "A QA tester confirms a staging schedule matches production expectations.",
    ],
    tips: [
      "Confirm the timezone used by your server or scheduler.",
      "Avoid running heavy jobs during business peak hours.",
      "Preview next runs before merging schedule changes.",
      "Document business meaning beside cron expressions in code.",
      "Use clear examples in pull requests so reviewers can verify intent.",
    ],
    faqs: [
      {
        question: "What does */5 * * * * mean?",
        answer:
          "It usually means every five minutes.",
      },
      {
        question: "Does cron include timezone?",
        answer:
          "The expression itself usually does not. The scheduler or server configuration decides the timezone.",
      },
      {
        question: "Can I preview upcoming runs?",
        answer:
          "Yes. The tool shows upcoming run times so you can verify the schedule.",
      },
      {
        question: "What is a five-field cron expression?",
        answer:
          "It contains minute, hour, day of month, month, and day of week fields.",
      },
      {
        question: "Should I test cron schedules before production?",
        answer:
          "Yes. A small schedule mistake can run jobs too often, too late, or on the wrong day.",
      },
    ],
    keywords: ["cron expression explainer", "explain cron", "cron schedule", "next cron run"],
    applicationCategory: "DeveloperApplication",
  },
  "hash-generator": {
    metaTitle: "How to Generate Hashes Online | ChlatWork",
    metaDescription:
      "Generate MD5, SHA-1, SHA-256, and SHA-512 hashes from text locally in your browser.",
    heroTitle: "How to Generate Hashes Online",
    heroDescription:
      "Create common text hashes for checks, examples, debugging, and documentation without setting up a terminal command.",
    ctaLabel: "Generate Hashes",
    whatIs: [
      "A hash is a fixed-length output created from input data. The same input creates the same hash, while a small input change creates a different result.",
      "The ChlatWork Hash Generator creates MD5, SHA-1, SHA-256, and SHA-512 hashes from text so developers can compare values quickly.",
    ],
    whyUse: [
      "It helps compare text values without exposing the full original value.",
      "It supports several common hash algorithms.",
      "It is useful for examples, checksums, fixtures, and debugging.",
      "It can be faster than opening a terminal for a quick hash.",
      "It helps verify whether two text inputs are exactly the same.",
    ],
    steps: [
      "Open the Hash Generator.",
      "Paste the text you want to hash.",
      "Click Generate hashes.",
      "Review the MD5, SHA-1, SHA-256, and SHA-512 outputs.",
      "Copy the hash value you need.",
      "Compare it with your expected value or use it in documentation or test data.",
    ],
    useCases: [
      "A developer checks whether two config strings produce the same SHA-256.",
      "A QA tester compares expected and actual checksum values.",
      "A student learns how different hash algorithms produce different output lengths.",
      "A backend developer creates sample hash values for unit tests.",
      "A support engineer verifies a text checksum shared in a bug report.",
    ],
    tips: [
      "Do not use MD5 or SHA-1 for modern password security.",
      "Use SHA-256 or stronger when you need a modern general-purpose hash.",
      "Remember that hashing is one-way for practical use, not decoding.",
      "Avoid pasting secrets unless you understand where the tool runs.",
      "For files, use a dedicated file checksum flow if exact file integrity matters.",
    ],
    faqs: [
      {
        question: "Can I decode a hash?",
        answer:
          "No. Hashes are designed to be one-way. You compare values rather than decode them.",
      },
      {
        question: "Is MD5 secure?",
        answer:
          "MD5 is not recommended for modern security. It can still be useful for legacy checks or non-security examples.",
      },
      {
        question: "Which hash should I use?",
        answer:
          "SHA-256 is a common modern choice for general checks. Security-sensitive systems need a full security review.",
      },
      {
        question: "Does the same text always produce the same hash?",
        answer:
          "Yes. The exact same input and algorithm produce the same output.",
      },
      {
        question: "Can spaces change a hash?",
        answer:
          "Yes. Extra spaces, line breaks, and capitalization all change the input and therefore the hash.",
      },
    ],
    keywords: ["hash generator", "SHA-256 hash", "MD5 generator", "text hash online"],
    applicationCategory: "DeveloperApplication",
  },
  "password-generator": {
    metaTitle: "How to Generate a Strong Password | ChlatWork",
    metaDescription:
      "Generate strong random passwords with length and character options for safer accounts.",
    heroTitle: "How to Generate a Strong Password",
    heroDescription:
      "Create random passwords with lowercase, uppercase, numbers, and symbols, then copy them into your password manager.",
    ctaLabel: "Generate Password",
    whatIs: [
      "The Password Generator creates random passwords based on the length and character options you choose. It is meant to help you avoid weak, reused, or easy-to-guess passwords.",
      "A strong password is especially important for email, banking, business dashboards, admin panels, social accounts, and POS systems.",
    ],
    whyUse: [
      "It avoids predictable passwords based on names, dates, or phone numbers.",
      "It lets you control length and character types.",
      "It is useful when creating accounts for business tools or admin panels.",
      "It works well with a password manager.",
      "It helps reduce password reuse across websites.",
    ],
    steps: [
      "Open the Password Generator.",
      "Choose the password length.",
      "Select character options such as uppercase letters, lowercase letters, numbers, and symbols.",
      "Generate a password.",
      "Copy it into your password manager or account setup form.",
      "Store it safely instead of sending it through public chat.",
    ],
    useCases: [
      "A shop owner creates a new password for a POS admin account.",
      "A developer sets up a staging dashboard password for temporary access.",
      "An office manager creates stronger passwords for shared service accounts.",
      "A freelancer rotates passwords for client tools after project handover.",
      "A student learns why random passwords are safer than memorable patterns.",
    ],
    tips: [
      "Use longer passwords when the website allows it.",
      "Do not reuse the same password across accounts.",
      "Store generated passwords in a trusted password manager.",
      "Enable two-factor authentication for important accounts.",
      "Avoid sending passwords through group chat or screenshots.",
    ],
    faqs: [
      {
        question: "How long should a strong password be?",
        answer:
          "Longer is better. Many accounts should use at least 12 to 16 characters when allowed.",
      },
      {
        question: "Should I include symbols?",
        answer:
          "Symbols can help, but length and randomness are also very important.",
      },
      {
        question: "Can I remember generated passwords?",
        answer:
          "Random passwords are hard to remember. Use a password manager to store them safely.",
      },
      {
        question: "Is a password generator enough for security?",
        answer:
          "It helps, but you should also use unique passwords, two-factor authentication, and good account recovery settings.",
      },
      {
        question: "Can I use it for business accounts?",
        answer:
          "Yes. It is useful for business accounts, but store the password according to your company policy.",
      },
    ],
    keywords: ["password generator", "generate strong password", "random password", "secure password tool"],
    applicationCategory: "DeveloperApplication",
  },
};

function requireGuide(tool: ToolDef) {
  const guide = RAW_GUIDES[tool.key];
  const route = getToolGuideRoute(tool.key);

  if (!guide || !route) {
    throw new Error(`Missing SEO guide data for enabled tool: ${tool.key}`);
  }

  return {
    ...guide,
    slug: route.slug,
    path: route.path,
    tool,
    iconPaths: TOOL_ICON_PATHS[tool.key] ?? TOOL_ICON_PATHS.calculator,
    iconClass: TOOL_ICON_CLASSES[tool.key] ?? TOOL_ICON_CLASSES.calculator,
  };
}

// Building guides from ENABLED_TOOLS keeps SEO coverage aligned with the visible product catalog.
export const TOOL_GUIDES: ToolGuide[] = ENABLED_TOOLS.map(requireGuide);

const TOOL_GUIDES_BY_SLUG = new Map(
  TOOL_GUIDES.map((guide) => [guide.slug, guide]),
);

export function findToolGuideByPath(path: string) {
  const slug = path.replace(/^\/+|\/+$/g, "");
  return TOOL_GUIDES_BY_SLUG.get(slug) ?? null;
}
