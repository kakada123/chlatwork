import {
  ENABLED_TOOLS,
  TOOL_ICON_CLASSES,
  TOOL_ICON_PATHS,
  type ToolDef,
} from "~/lib/tool-registry";
import { getToolIconImagePath } from "~/lib/icon-assets";
import { LOCAL_PROCESSING_PRIVACY_NOTE } from "~/lib/privacy-copy";
import { getToolGuideRoute } from "./tool-guide-routes";

export type ToolGuideFaq = {
  question: string;
  answer: string;
};

export type ToolGuideExample = {
  title: string;
  scenario: string;
  steps: string[];
  result: string;
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
  practicalExamples?: ToolGuideExample[];
  practicalExamplesKm?: ToolGuideExample[];
  tips: string[];
  commonMistakes?: string[];
  privacy?: string[];
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
  iconPath: string;
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
    commonMistakes: [
      "Uploading the wrong version of the file and replacing the wrong document.",
      "Skipping the final preview and sharing a file with missing pages or bad layout.",
      "Overwriting important originals instead of keeping a backup copy.",
      "Ignoring upload size limits on destination systems until the last minute.",
    ],
    privacy: [
      `${options.toolName} reads your ${options.inputLabel} in the browser and creates the ${options.outputLabel} locally.`,
      "The selected file is not intentionally uploaded to ChlatWork for this PDF workflow.",
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
        answer:
          "Yes. You can use the ChlatWork PDF tool directly in your browser.",
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
      "The calculator is for educational planning and practical coordination. It is not financial, tax, legal, or accounting advice.",
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
      "Before sending money, confirm the final numbers, currency, and any transfer or exchange fees with the group.",
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
    practicalExamples: [
      {
        title: "Weekend trip with mixed payers",
        scenario:
          "Five friends take a two-day trip. Different people pay fuel, hotel, and food in separate transactions.",
        steps: [
          "Add all five names first, then enter each expense with the real payer.",
          "Keep all values in one currency and note any transfer fee separately.",
          "Review the final settlement map and confirm amounts in group chat before payment.",
        ],
        result:
          "The group gets one clear list of who pays whom, instead of arguing over receipt screenshots.",
      },
      {
        title: "Office snack and supply reimbursements",
        scenario:
          "A small office buys snacks, printer paper, and drinking water during one week from different pockets.",
        steps: [
          "Enter each purchase at the end of day so receipts are not forgotten.",
          "Tag optional notes for non-routine expenses for later manager review.",
          "Use the generated summary when finance reimburses staff.",
        ],
        result:
          "Reimbursements are faster because everyone can trace each expense line and final balance.",
      },
      {
        title: "Shared apartment utility settlement",
        scenario:
          "Three roommates split electricity, water, internet, and one shared grocery run with different payers.",
        steps: [
          "Create one expense row per bill with the person who actually paid.",
          "Add the grocery receipt as a shared item and include all roommates.",
          "Check the final payback list before sending transfer requests.",
        ],
        result:
          "Utility settlement becomes transparent and nobody pays twice for the same month.",
      },
    ],
    practicalExamplesKm: [
      {
        title: "ចែកថ្លៃធ្វើដំណើរជាមួយមិត្តភក្តិ",
        scenario:
          "មិត្ត ៥ នាក់ទៅលេងខេត្ត ហើយម្នាក់ៗចេញលុយខុសគ្នា សម្រាប់សាំង អាហារ និងសណ្ឋាគារ។",
        steps: [
          "បញ្ចូលឈ្មោះអ្នកទាំងអស់ រួចបញ្ចូលចំណាយតាមអ្នកដែលបានបង់ពិតប្រាកដ។",
          "ប្រើរូបិយប័ណ្ណតែមួយ និងកត់ថ្លៃផ្ទេរប្រាក់ដាច់ដោយឡែក។",
          "ពិនិត្យលទ្ធផលចុងក្រោយជាក្រុម មុនផ្ទេរប្រាក់។",
        ],
        result: "គ្រប់គ្នាដឹងច្បាស់ថា ត្រូវបង់ឱ្យនរណា និងប៉ុន្មាន ដោយមិនច្រឡំ។",
      },
      {
        title: "ចែកថ្លៃវិក្កយបត្រផ្ទះជួល",
        scenario:
          "អ្នករស់នៅរួម ៣ នាក់ត្រូវចែកថ្លៃភ្លើង ទឹក អ៊ីនធឺណិត និងទំនិញប្រើប្រាស់ប្រចាំខែ។",
        steps: [
          "បញ្ចូលវិក្កយបត្រនីមួយៗជាមួយអ្នកដែលបានបង់មុន។",
          "បន្ថែមចំណាយផ្សារចូលរួមជាក្រុមសម្រាប់អ្នកទាំងអស់។",
          "បញ្ជាក់លទ្ធផលម្តងចុងក្រោយ មុនស្នើឱ្យផ្ទេរ។",
        ],
        result: "ការចែកលុយប្រចាំខែមានតម្លាភាព និងបញ្ចៀសការបង់ស្ទួន។",
      },
    ],
    tips: [
      "Enter expenses as soon as possible so nobody forgets who paid.",
      "Use clear names that everyone in the group recognizes.",
      "Round only at the final payment step, not while entering receipts.",
      "If people pay by different channels, account for bank transfer fees or exchange differences before collecting money.",
      "Keep receipts or screenshots for larger amounts.",
      "Share the final result before collecting money so people can confirm it.",
    ],
    commonMistakes: [
      "Leaving a person out of one expense row, which shifts all balances.",
      "Mixing USD and KHR without agreeing on exchange rate first.",
      "Rounding each item instead of rounding only the final settlement.",
      "Collecting money before everyone confirms the final list.",
      "Using unclear nicknames so people cannot tell who should pay whom.",
    ],
    privacy: [
      "Normal PayBack calculations run in your browser from the names and amounts you enter.",
      "If you create a share link, ChlatWork first tries to store a compressed payload with the PayBack share API so the URL stays short.",
      "Stored PayBack share links expire after 90 days in the current implementation. Use short names or sample labels if the group data is sensitive.",
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
        question: "Does this tool provide financial advice?",
        answer:
          "No. It provides a practical split calculation only. You should verify assumptions and final amounts before any real payment.",
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
      "Batch compress JPG, PNG, and WebP images in your browser without uploading them to a server.",
    heroTitle: "How to Compress an Image Without Uploading It",
    heroDescription:
      "Reduce image size before sending, posting, or uploading, while keeping the file private on your own device.",
    ctaLabel: "Compress Image",
    whatIs: [
      "The Image Compressor is a browser-based image tool that reduces file size for common web images. You can choose one image or a batch, adjust compression settings, and download smaller copies.",
      "Because the work happens in the browser, it is a practical choice for documents, product photos, and social posts that do not need to leave your device just to become smaller.",
    ],
    whyUse: [
      "It helps websites, forms, and chats load faster with smaller images.",
      "It avoids sending private images to a remote compression service.",
      "It is useful when a government, bank, school, or marketplace form has a file-size limit.",
      "It lets small businesses prepare product photos before posting online.",
      "It saves mobile data when images need to be sent from a phone hotspot or slow connection.",
      "It can compress multiple product photos, menu images, or screenshots in one batch.",
    ],
    steps: [
      "Open the ChlatWork Image Compressor.",
      "Choose one image or multiple images you want to reduce.",
      "Adjust the quality or size options if you need a specific output.",
      "Click Compress and wait for the batch results.",
      "Compare the original and compressed sizes before downloading.",
      "Download one compressed file or download all compressed files for upload, chat, or web publishing.",
    ],
    useCases: [
      "A shop owner in Cambodia compresses product photos before posting them on Facebook Marketplace.",
      "A student reduces a scanned document image before submitting it to an online school form.",
      "A developer compresses screenshot assets before adding them to a landing page.",
      "A support team sends smaller issue screenshots through Telegram or email.",
      "A restaurant prepares menu images that load faster on mobile data.",
    ],
    practicalExamples: [
      {
        title: "Marketplace product upload limit",
        scenario:
          "A seller needs to upload 20 product photos, but each image is above platform size limits.",
        steps: [
          "Batch-select all photos and use medium quality compression first.",
          "Check one zoomed product photo to ensure labels and details remain readable.",
          "Download the compressed set and upload the accepted files to the listing.",
        ],
        result:
          "All listing photos upload successfully while preserving enough visual quality for buyers.",
      },
      {
        title: "School form with strict file cap",
        scenario:
          "A student must submit scanned pages under a small attachment limit.",
        steps: [
          "Compress each scanned page image before combining or uploading.",
          "Compare text clarity on headings and signatures after compression.",
          "Keep original scans until the submission is accepted.",
        ],
        result:
          "The submission fits the file-size requirement without becoming unreadable.",
      },
      {
        title: "Website performance cleanup",
        scenario:
          "A business landing page loads slowly because hero and gallery images are too large.",
        steps: [
          "Compress homepage and gallery images in one batch before deployment.",
          "Keep quality slightly higher for hero banners than thumbnails.",
          "Re-test page speed and visual clarity after replacing assets.",
        ],
        result:
          "The page loads faster on mobile data while keeping product visuals acceptable.",
      },
    ],
    practicalExamplesKm: [
      {
        title: "បង្ហោះរូបទំនិញឱ្យឆាប់ជាប់",
        scenario: "អ្នកលក់មានរូបទំនិញច្រើន តែទំហំឯកសារធំពេក មិនអាចបង្ហោះបាន។",
        steps: [
          "ជ្រើសរូបទាំងអស់ ហើយបង្រួមដោយកម្រិតគុណភាពមធ្យមជាមុន។",
          "ពិនិត្យរូបគំរូមួយ ដើម្បីឱ្យអក្សរ និងពណ៌នៅតែច្បាស់។",
          "ទាញយករូបដែលបានបង្រួម រួចបង្ហោះឡើងវិញ។",
        ],
        result: "រូបទំនិញអាចបង្ហោះបានរលូន ដោយគុណភាពមើលឃើញនៅល្អ។",
      },
      {
        title: "កាត់ទំហំរូបសម្រាប់គេហទំព័រ",
        scenario: "ទំព័រលក់អនឡាញបើកយឺត ព្រោះរូប Banner និង Gallery ធំពេក។",
        steps: [
          "បង្រួមរូបទំព័រមុខ និងរូបក្នុង Gallery ជាក្រុម។",
          "រក្សាគុណភាពខ្ពស់ជាងសម្រាប់រូបសំខាន់ៗ។",
          "សាកល្បងល្បឿនទំព័រឡើងវិញបន្ទាប់ពីប្តូររូប។",
        ],
        result: "ទំព័របើកលឿនឡើងលើទូរស័ព្ទ ដោយរូបនៅតែសមរម្យសម្រាប់អតិថិជន។",
      },
    ],
    tips: [
      "Keep the original file until you confirm the compressed image still looks good.",
      "Use a lower quality setting for screenshots and a higher setting for photos with people or products.",
      "Resize very large camera photos before uploading them to a website.",
      "Check text-heavy images after compression so labels remain readable.",
      "Avoid recompressing the same image many times because quality can drop each round.",
    ],
    commonMistakes: [
      "Compressing the same image repeatedly until text and logos become blurry.",
      "Using very low quality for product photos where details matter.",
      "Forgetting to compare before and after dimensions before upload.",
      "Sending compressed files without checking whether orientation changed.",
      "Deleting originals before confirming all uploads are accepted.",
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
    practicalExamples: [
      {
        title: "Monthly receipts in one file",
        scenario:
          "A shop owner has many receipt photos from Telegram and needs one clean PDF for bookkeeping.",
        steps: [
          "Add all receipt photos, then reorder by date before conversion.",
          "Use portrait layout and small margins to keep text visible.",
          "Generate the PDF and verify that each receipt is readable.",
        ],
        result:
          "Bookkeeping receives one organized PDF instead of many scattered image files.",
      },
      {
        title: "Client document packet",
        scenario:
          "A freelancer must send ID, signed page, and supporting screenshots as one attachment.",
        steps: [
          "Place the most important pages first in the image list.",
          "Set consistent page size so the packet looks professional.",
          "Download and quickly scan the final PDF before email sending.",
        ],
        result:
          "The client gets a structured document packet that is easier to review and approve.",
      },
      {
        title: "School assignment photo bundle",
        scenario:
          "A student captures assignment pages by phone and must submit a single PDF in order.",
        steps: [
          "Retake any blurred pages before adding files to the tool.",
          "Arrange pages in assignment order and use A4 portrait settings.",
          "Generate the PDF and verify page numbering before upload.",
        ],
        result:
          "The teacher receives one complete, correctly ordered submission document.",
      },
    ],
    practicalExamplesKm: [
      {
        title: "បង្កើត PDF ពីវិក្កយបត្រប្រចាំខែ",
        scenario: "ម្ចាស់ហាងមានរូបវិក្កយបត្រច្រើន ហើយចង់ផ្ញើជាឯកសារ PDF តែមួយ។",
        steps: [
          "បន្ថែមរូបទាំងអស់ ហើយរៀបតាមកាលបរិច្ឆេទ។",
          "ជ្រើសទ្រង់ទ្រាយទំព័រសមស្រប ដើម្បីឱ្យអក្សរមើលឃើញច្បាស់។",
          "បង្កើត PDF ហើយពិនិត្យម្តងមុនផ្ញើ។",
        ],
        result: "ទទួលបានឯកសារតែមួយ ស្អាត និងងាយរក្សាទុកសម្រាប់គណនេយ្យ។",
      },
      {
        title: "បញ្ចូលរូបកិច្ចការសិស្សជាឯកសារតែមួយ",
        scenario: "សិស្សថតកិច្ចការជាច្រើនទំព័រ ហើយត្រូវដាក់ស្នើជា PDF តែមួយ។",
        steps: [
          "ពិនិត្យរូបមិនឱ្យព្រិល មុនបន្ថែមចូលឧបករណ៍។",
          "រៀបលំដាប់ទំព័រត្រឹមត្រូវ ហើយជ្រើស A4 បញ្ឈរ។",
          "ទាញយក PDF រួចពិនិត្យលំដាប់ទំព័រមុនបង្ហោះ។",
        ],
        result: "ការដាក់ស្នើមានរបៀបរៀបរយ និងបំពេញតាមលក្ខខណ្ឌគ្រូ។",
      },
    ],
    tips: [
      "Take photos in good light so the PDF stays readable.",
      "Crop or rotate images before converting if the source photo is messy.",
      "Use portrait orientation for documents and landscape for wide screenshots.",
      "Put cover pages or important pages first before generating the PDF.",
      "Compress large photos first if the final PDF must stay under an upload limit.",
    ],
    commonMistakes: [
      "Leaving pages in the wrong order before converting to PDF.",
      "Using dark or tilted photos that become unreadable in the final PDF.",
      "Choosing landscape for portrait forms and cutting important content.",
      "Combining too many huge photos and hitting upload limits later.",
      "Skipping final review before sending to school, clients, or offices.",
    ],
    privacy: [
      "Selected images are prepared, previewed, reordered, and converted in your browser.",
      "HEIC files are converted to JPEG in the browser before the PDF is generated.",
      "The tool creates temporary local preview URLs and clears them when you remove files or leave the page.",
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
        answer: "Yes. You can create image PDFs with ChlatWork for free.",
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
  "pdf-to-jpg": {
    ...createPdfGuide({
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
      extraStep:
        "Choose a render quality and scale that fits your file size and sharpness needs.",
      limitation:
        "ZIP download is not included yet, so download each rendered JPG page individually.",
      keywords: [
        "PDF to JPG",
        "convert PDF to image",
        "PDF page image",
        "browser PDF renderer",
      ],
    }),
    practicalExamples: [
      {
        title: "Share one brochure page on Telegram",
        scenario:
          "A sales team needs to share page 2 of a product brochure as an image in a chat group.",
        steps: [
          "Upload the brochure PDF and render pages at medium quality.",
          "Download only the page image needed for the promotion post.",
          "Verify text remains readable on mobile before sharing.",
        ],
        result:
          "The team sends a lightweight image that previews directly in chat without forcing users to open a PDF app.",
      },
      {
        title: "Extract visual proof for support ticket",
        scenario:
          "A support agent needs screenshot-style evidence from a customer PDF invoice.",
        steps: [
          "Convert the invoice PDF to JPG pages.",
          "Download the page containing the disputed line item.",
          "Attach the image to the support system with clear annotation.",
        ],
        result:
          "Investigation is faster because reviewers can see the exact invoice section immediately.",
      },
    ],
  },
  "merge-pdf": {
    ...createPdfGuide({
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
      extraStep:
        "Use the file order controls to place the PDFs in the correct sequence.",
      limitation:
        "Interactive form behavior can vary because the tool copies page content into a new PDF.",
      keywords: [
        "merge PDF",
        "combine PDF files",
        "join PDF online",
        "browser PDF merge",
      ],
    }),
    practicalExamples: [
      {
        title: "Client submission packet",
        scenario:
          "A freelancer needs one file containing proposal, signed agreement, and invoice.",
        steps: [
          "Upload three PDFs and order them as proposal, agreement, then invoice.",
          "Generate the merged file and check page transitions.",
          "Rename the file with project name and date before sending.",
        ],
        result:
          "The client receives one professional, chronological document instead of multiple attachments.",
      },
      {
        title: "Office report compilation",
        scenario:
          "An admin combines department reports into one monthly leadership document.",
        steps: [
          "Gather final PDFs from each department and verify versions.",
          "Arrange sections in the agreed reporting order.",
          "Merge and review the final page count before distribution.",
        ],
        result:
          "Leadership gets one complete monthly report package that is easier to archive.",
      },
      {
        title: "Application document consolidation",
        scenario:
          "A job applicant has CV, portfolio, and certificates as separate PDFs but needs one upload file.",
        steps: [
          "Place CV first, portfolio second, and certificates last.",
          "Merge the files and confirm no pages are missing.",
          "Use a clear filename before submitting on the job portal.",
        ],
        result:
          "The application appears complete and organized in one easy-to-review document.",
      },
    ],
    practicalExamplesKm: [
      {
        title: "រួមឯកសារសំណើអតិថិជន",
        scenario:
          "អ្នកឯករាជ្យចង់រួម Proposal, Agreement និង Invoice ជា PDF តែមួយ។",
        steps: [
          "បញ្ចូលឯកសារទាំងអស់ ហើយរៀបលំដាប់ឱ្យត្រឹមត្រូវ។",
          "ចុច Merge ហើយពិនិត្យទំព័រចាប់ផ្តើមដល់ចុងក្រោយ។",
          "ប្តូរឈ្មោះឯកសារតាមគម្រោង មុនផ្ញើអតិថិជន។",
        ],
        result: "អតិថិជនទទួលបានឯកសារតែមួយ មានរបៀបរៀបរយ និងងាយពិនិត្យ។",
      },
      {
        title: "រួមរបាយការណ៍ការងារប្រចាំខែ",
        scenario: "Admin ត្រូវរួម PDF ពីផ្នែកផ្សេងៗ ដើម្បីផ្ញើជូនគ្រប់គ្រង។",
        steps: [
          "ប្រមូលឯកសារចុងក្រោយពីគ្រប់ផ្នែក។",
          "រៀបលំដាប់តាមផែនការរបាយការណ៍។",
          "Merge និងពិនិត្យចំនួនទំព័រមុនចែកចាយ។",
        ],
        result: "បានឯកសាររបាយការណ៍ពេញលេញមួយ ដែលងាយរក្សាទុក និងតាមដាន។",
      },
    ],
  },
  "split-pdf": {
    ...createPdfGuide({
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
      keywords: [
        "split PDF",
        "extract PDF pages",
        "PDF page range",
        "browser PDF splitter",
      ],
    }),
    practicalExamples: [
      {
        title: "Extract signature pages only",
        scenario:
          "A long contract PDF has 40 pages, but only 2 signature pages are needed for quick review.",
        steps: [
          "Check page numbers in preview and enter only the signature ranges.",
          "Generate a split copy with those pages.",
          "Send the smaller file for approval.",
        ],
        result:
          "Reviewers handle a lightweight file focused only on signing sections.",
      },
      {
        title: "Assignment section extraction",
        scenario:
          "A student has a combined class PDF and needs only chapter 3 pages for submission.",
        steps: [
          "Identify the required page range from the full PDF.",
          "Enter the exact range in split format.",
          "Download and verify that no extra pages are included.",
        ],
        result:
          "Submission stays compliant with teacher instructions and smaller upload size.",
      },
      {
        title: "HR policy section sharing",
        scenario:
          "An HR team needs to send only leave-policy pages from a full employee handbook.",
        steps: [
          "Find exact leave-policy page numbers in the full handbook.",
          "Split only those pages into a separate PDF.",
          "Share the extracted file for onboarding instead of the full handbook.",
        ],
        result:
          "New hires receive focused policy content with less reading friction.",
      },
    ],
    practicalExamplesKm: [
      {
        title: "ដកទំព័រហត្ថលេខាចេញពីឯកសារធំ",
        scenario:
          "កិច្ចសន្យាមានទំព័រច្រើន ប៉ុន្តែត្រូវការតែទំព័រហត្ថលេខាសម្រាប់ពិនិត្យ។",
        steps: [
          "ពិនិត្យលេខទំព័រដែលត្រូវការ។",
          "បញ្ចូល Range ទំព័រត្រឹមត្រូវក្នុងឧបករណ៍ Split។",
          "ទាញយកឯកសារថ្មី និងផ្ញើសម្រាប់អនុម័ត។",
        ],
        result: "អ្នកពិនិត្យទទួលបានឯកសារខ្លី ងាយមើល និងសំខាន់តែចំណុចត្រូវការ។",
      },
      {
        title: "បំបែកផ្នែកឯកសារសម្រាប់បណ្តុះបណ្តាល",
        scenario: "ក្រុម HR ចង់ផ្ញើតែផ្នែកច្បាប់ឈប់សម្រាកពី Handbook ទាំងមូល។",
        steps: [
          "កំណត់លេខទំព័រផ្នែកឈប់សម្រាក។",
          "បំបែកទំព័រទាំងនោះជាឯកសារថ្មី។",
          "ចែករំលែកឯកសារខ្លីនេះសម្រាប់ onboarding។",
        ],
        result: "បុគ្គលិកថ្មីអាចអានតែផ្នែកពាក់ព័ន្ធ ដោយមិនច្របូកច្របល់។",
      },
    ],
  },
  "compress-pdf": {
    ...createPdfGuide({
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
      keywords: [
        "compress PDF",
        "reduce PDF size",
        "PDF optimizer",
        "browser PDF compression",
      ],
    }),
    practicalExamples: [
      {
        title: "Job application upload limit",
        scenario:
          "An applicant must submit a resume PDF under a strict portal size cap.",
        steps: [
          "Compress the resume PDF and compare before/after file size.",
          "Open the compressed file to confirm fonts and alignment are intact.",
          "Upload only after verifying the final file meets the portal limit.",
        ],
        result:
          "The resume is accepted by the portal without sacrificing legibility.",
      },
      {
        title: "Monthly report email attachment",
        scenario:
          "A manager needs to send a report PDF to many recipients with mailbox size restrictions.",
        steps: [
          "Compress the report and check charts remain readable.",
          "Validate that page count and pagination remain unchanged.",
          "Send the reduced file as the official version.",
        ],
        result:
          "Email delivery succeeds more reliably and recipients open the file faster.",
      },
    ],
  },
  "remove-pdf-pages": {
    ...createPdfGuide({
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
      keywords: [
        "remove PDF pages",
        "delete PDF pages",
        "PDF page remover",
        "edit PDF pages",
      ],
    }),
    practicalExamples: [
      {
        title: "Trim appendix before client send",
        scenario:
          "A consultant must remove internal appendix pages before sharing a proposal PDF with a client.",
        steps: [
          "Identify appendix page numbers in the original document.",
          "Remove those ranges and generate a clean external copy.",
          "Review the final PDF to ensure references still make sense.",
        ],
        result:
          "The client receives only relevant pages, reducing accidental disclosure of internal notes.",
      },
      {
        title: "Delete blank scan pages",
        scenario:
          "A scanned form PDF includes many blank pages from feeder misalignment.",
        steps: [
          "Locate blank page numbers quickly from preview.",
          "Remove all blank ranges in one pass.",
          "Save the cleaned copy for archive and submission.",
        ],
        result:
          "The final file is shorter, cleaner, and easier for reviewers to navigate.",
      },
    ],
  },
  "reorder-pdf-pages": {
    ...createPdfGuide({
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
      keywords: [
        "reorder PDF pages",
        "arrange PDF pages",
        "move PDF pages",
        "PDF page order",
      ],
    }),
    practicalExamples: [
      {
        title: "Fix wrong scan order",
        scenario:
          "A scanned contract has signature pages in the middle due to scanner feeder order issues.",
        steps: [
          "Inspect current page sequence and note intended order.",
          "Enter a corrected custom page order.",
          "Generate and verify that clauses and signatures now align.",
        ],
        result:
          "The contract becomes logically readable and acceptable for approval workflow.",
      },
      {
        title: "Prepare training handout flow",
        scenario:
          "A trainer wants summary pages first and reference pages last in a PDF handout.",
        steps: [
          "Identify priority pages for session opening.",
          "Reorder the document to match teaching sequence.",
          "Export and share the new training copy.",
        ],
        result:
          "Participants follow the session more easily because the handout now matches presentation flow.",
      },
    ],
  },
  "html-to-pdf": {
    ...createPdfGuide({
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
      extraStep:
        "Preview the rendered HTML and adjust simple styles before generating.",
      limitation:
        "Complex scripts, remote assets, and advanced CSS may not render exactly like a full browser print engine.",
      keywords: [
        "HTML to PDF",
        "convert HTML to PDF",
        "print HTML PDF",
        "browser HTML renderer",
      ],
    }),
    practicalExamples: [
      {
        title: "Generate printable policy memo",
        scenario:
          "An operations manager drafts a styled HTML memo and needs a printable PDF for staff notice boards.",
        steps: [
          "Paste memo HTML with basic heading and list styles.",
          "Preview layout and fix page-break-sensitive sections.",
          "Export PDF and test print one copy before distribution.",
        ],
        result:
          "The memo keeps consistent structure across devices and prints cleanly.",
      },
      {
        title: "Template invoice preview export",
        scenario:
          "A developer validates a static invoice HTML template by exporting a PDF sample for stakeholder review.",
        steps: [
          "Insert sample invoice data in HTML template.",
          "Preview for alignment issues and overflow text.",
          "Convert to PDF and send for non-technical approval.",
        ],
        result:
          "Stakeholders can review a realistic output format before engineering final integration.",
      },
    ],
  },
  "text-to-pdf": {
    ...createPdfGuide({
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
      extraStep:
        "Choose font size, page size, and margin before generating the PDF.",
      limitation:
        "This tool is for plain text; use HTML to PDF when you need basic formatting.",
      keywords: [
        "text to PDF",
        "plain text PDF",
        "create PDF from text",
        "browser PDF writer",
      ],
    }),
    practicalExamples: [
      {
        title: "Meeting minutes handoff",
        scenario:
          "A team lead has plain text meeting notes and needs a clean PDF for formal record sharing.",
        steps: [
          "Paste minutes text and review paragraph breaks.",
          "Set readable font size and margin for printing.",
          "Export PDF and send to participants as official notes.",
        ],
        result:
          "The team gets a stable, printable record that looks consistent across devices.",
      },
      {
        title: "Draft SOP distribution",
        scenario:
          "An operations assistant prepares plain-text procedure steps for new staff onboarding.",
        steps: [
          "Convert SOP text into PDF with simple formatting.",
          "Check page flow so each section remains readable.",
          "Share the PDF with HR for onboarding packs.",
        ],
        result:
          "The SOP is easier to distribute and less likely to be edited accidentally.",
      },
    ],
  },
  "invoice-to-pdf": {
    ...createPdfGuide({
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
      extraStep:
        "Add line items, discount, tax, and notes before generating the invoice.",
      limitation:
        "The invoice template is intentionally simple, so review totals and notes before sending it to a customer.",
      keywords: [
        "invoice PDF generator",
        "create invoice PDF",
        "free invoice tool",
        "browser invoice PDF",
      ],
    }),
    practicalExamples: [
      {
        title: "Freelancer monthly billing",
        scenario:
          "A freelancer bills a recurring client for design and revision work each month.",
        steps: [
          "Fill customer details and invoice date.",
          "Add line items for each service with clear descriptions.",
          "Apply tax/discount rules and export finalized PDF.",
        ],
        result:
          "The client receives a professional invoice with transparent totals and fewer payment questions.",
      },
      {
        title: "Small shop custom order invoice",
        scenario:
          "A local shop needs same-day invoice PDFs for custom order pickups.",
        steps: [
          "Enter product quantities and unit prices from order sheet.",
          "Include pickup note and payment due date.",
          "Generate invoice PDF and send via Telegram.",
        ],
        result:
          "Customers receive clear billing records quickly, improving trust and payment speed.",
      },
    ],
  },
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
    practicalExamples: [
      {
        title: "Table service menu access",
        scenario:
          "A cafe wants customers to open the current menu quickly without reprinting full paper menus.",
        steps: [
          "Create one QR code for the live menu URL.",
          "Print and place the code on each table with enough white space around it.",
          "Test scanning from seated distance on different phones.",
        ],
        result:
          "Customers access the menu instantly, and staff can update menu content via the destination page.",
      },
      {
        title: "Event check-in shortcut",
        scenario:
          "An organizer needs quick registration at entrance without manual URL typing.",
        steps: [
          "Generate a QR code linked to the registration form.",
          "Place the printed code at gate and information desk.",
          "Scan-test before event start and keep one backup print.",
        ],
        result:
          "Check-in becomes faster with fewer queue delays and fewer broken link complaints.",
      },
      {
        title: "Printed product guide shortcut",
        scenario:
          "A seller includes setup instructions online and wants buyers to access them from packaging.",
        steps: [
          "Generate a QR code pointing to the product guide page.",
          "Print the code on packaging insert with short scan instructions.",
          "Scan-test from different lighting conditions before mass printing.",
        ],
        result:
          "Customers can open setup help instantly, reducing repetitive support messages.",
      },
    ],
    practicalExamplesKm: [
      {
        title: "QR ម៉ឺនុយសម្រាប់តុភ្ញៀវ",
        scenario:
          "ហាងកាហ្វេចង់ឱ្យភ្ញៀវស្កេនមើលម៉ឺនុយបានភ្លាម ដោយមិនចាំបាច់វាយ URL។",
        steps: [
          "បង្កើត QR មួយសម្រាប់តំណម៉ឺនុយបច្ចុប្បន្ន។",
          "បោះពុម្ពដាក់គ្រប់តុ និងទុកចន្លោះសស្អាតជុំវិញ QR។",
          "សាកស្កេនលើទូរស័ព្ទមុនប្រើប្រាស់ពិត។",
        ],
        result: "ភ្ញៀវបើកម៉ឺនុយបានលឿន ហើយហាងអាចអាប់ដេតមាតិកាតាមតំណបាន។",
      },
      {
        title: "QR ចូលរួមព្រឹត្តិការណ៍",
        scenario: "អ្នករៀបចំព្រឹត្តិការណ៍ត្រូវការចុះឈ្មោះឱ្យលឿននៅច្រកចូល។",
        steps: [
          "បង្កើត QR ទៅកាន់ Form ចុះឈ្មោះ។",
          "ដាក់ស្លាក QR នៅច្រកចូល និងតុព័ត៌មាន។",
          "សាកស្កេនជាមុន ហើយរៀបចំច្បាប់បម្រុង។",
        ],
        result: "កាត់បន្ថយជួររង់ចាំ និងធ្វើឱ្យការចុះឈ្មោះមានល្បឿនល្អ។",
      },
    ],
    tips: [
      "Use the full URL, including https, for website links.",
      "Leave enough white space around the QR code when printing.",
      "Avoid placing the code on a busy background.",
      "Print a test copy and scan it from the expected viewing distance.",
      "Update the destination page instead of reprinting the QR code when possible.",
    ],
    commonMistakes: [
      "Encoding a broken URL or missing https in links.",
      "Printing QR codes too small for normal phone cameras.",
      "Placing codes on reflective or patterned backgrounds.",
      "Changing the destination page without re-testing printed materials.",
      "Publishing a code without scanning it on both iPhone and Android first.",
    ],
    privacy: [
      "The QR text is rendered to a canvas in your browser with the QR code library.",
      "Generating and downloading the PNG does not call a ChlatWork API.",
      "Anyone who scans the final QR code can see or open whatever text or link you encoded, so check the destination before printing.",
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
        answer: "Yes. ChlatWork lets you generate QR codes for free.",
      },
    ],
    keywords: [
      "generate QR code",
      "free QR generator",
      "QR code PNG",
      "online QR tool",
    ],
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
    practicalExamples: [
      {
        title: "Cafe guest Wi-Fi onboarding",
        scenario:
          "A cafe wants to reduce cashier interruptions from repeated Wi-Fi password requests.",
        steps: [
          "Create a Wi-Fi QR code for the guest network only.",
          "Print and place the code near tables and cashier counter.",
          "Test scan flow on both iPhone and Android before opening hours.",
        ],
        result:
          "Guests connect faster and staff can focus more on service instead of repeating password instructions.",
      },
      {
        title: "Meeting room visitor access",
        scenario:
          "An office hosts external partners and needs easy temporary Wi-Fi access in meeting rooms.",
        steps: [
          "Generate QR for visitor network with separate credentials.",
          "Display poster in room and include fallback text for support.",
          "Replace QR poster whenever guest password rotates.",
        ],
        result:
          "Visitors join quickly while internal office network stays isolated.",
      },
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
    practicalExamples: [
      {
        title: "Khmer announcement quality check",
        scenario:
          "A support team drafts a Khmer service announcement and wants to catch awkward phrasing before publishing.",
        steps: [
          "Paste the draft and let the tool detect Khmer automatically.",
          "Listen in both online and browser voice modes.",
          "Refine punctuation and sentence length where pronunciation sounds unnatural.",
        ],
        result:
          "The final announcement sounds clearer and more natural to customers.",
      },
      {
        title: "Bilingual script rehearsal",
        scenario:
          "A creator prepares short Khmer-English narration for a product demo reel.",
        steps: [
          "Split script sections by language to improve voice matching.",
          "Adjust speed and pitch for each section.",
          "Download approved clips and combine in video editor.",
        ],
        result:
          "The creator gets consistent draft narration quickly without booking a studio session.",
      },
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
  "khmer-unicode-fixer": {
    metaTitle: "How to Use Khmer Unicode Fixer | ChlatWork",
    metaDescription:
      "Use ChlatWork Khmer Unicode Fixer to normalize copied Khmer text, spacing, invisible marks, and Khmer or Latin digits.",
    heroTitle: "How to Use Khmer Unicode Fixer",
    heroDescription:
      "Clean Khmer text copied from PDFs, websites, chats, and documents so it is easier to read, paste, and reuse.",
    ctaLabel: "Open Khmer Unicode Fixer",
    whatIs: [
      "The Khmer Unicode Fixer cleans text that is already Khmer Unicode but has messy spacing, invisible characters, mixed digit styles, or normalization issues after copying from another source.",
      "It is not a legacy-font converter for Limon, ABC, or other old font encodings. If the text is not real Khmer Unicode characters, the tool explains that limitation instead of pretending to convert it.",
    ],
    whyUse: [
      "It helps make copied Khmer text easier to paste into documents, captions, Telegram messages, forms, and CMS fields.",
      "It removes common hidden characters that can break search, line wrapping, or copy/paste behavior.",
      "It can normalize text before publishing bilingual Khmer and English content.",
      "It supports optional Khmer digit and Latin digit conversion for practical local workflows.",
      "It keeps the process simple without installing a desktop text utility.",
    ],
    steps: [
      "Open the Khmer Unicode Fixer tool.",
      "Paste Khmer text copied from a PDF, website, chat, document, or old note.",
      "Choose whether to normalize Unicode, clean invisible characters, normalize spacing, and convert digits.",
      "Review the cleaned output and the change summary.",
      "Copy the fixed text into your document, CMS, Telegram post, or form.",
      "If the output still looks wrong, check whether the original text came from a legacy Khmer font instead of Unicode.",
    ],
    useCases: [
      "A content editor cleans Khmer copy before adding it to a restaurant menu page.",
      "A shop owner fixes copied Khmer text before posting a Telegram promotion.",
      "A support team removes hidden spacing from Khmer instructions before sending them to customers.",
      "A developer normalizes Khmer sample text before using it in UI testing.",
      "A student cleans Khmer paragraphs copied from a PDF before editing them in a document.",
    ],
    practicalExamples: [
      {
        title: "Telegram promo cleanup",
        scenario:
          "A shop copies Khmer text from a PDF flyer, but pasted content in Telegram looks broken and uneven.",
        steps: [
          "Paste source text into the fixer and enable spacing/invisible-character cleanup.",
          "Review output line breaks and digit format.",
          "Copy cleaned text into Telegram draft and preview on mobile.",
        ],
        result:
          "The promotion message becomes readable and professional across chat devices.",
      },
      {
        title: "Website content normalization",
        scenario:
          "A content editor merges Khmer paragraphs from multiple sources with inconsistent Unicode patterns.",
        steps: [
          "Run each paragraph through the fixer before CMS entry.",
          "Keep digit style consistent with site language policy.",
          "Validate final rendering on desktop and mobile pages.",
        ],
        result:
          "Published pages have consistent Khmer rendering and fewer copy-paste defects.",
      },
    ],
    tips: [
      "Keep a copy of the original text until you confirm the cleaned version is correct.",
      "Use Khmer digit conversion only when the target document expects Khmer numerals.",
      "If every Khmer word appears as Latin symbols, the source may be a legacy font that this tool does not convert.",
      "Review line breaks after cleaning because copied PDF text can split sentences in awkward places.",
      "For public content, paste the fixed text into the final app and check it on mobile too.",
    ],
    commonMistakes: [
      "Expecting legacy font text (Limon/ABC) to be auto-converted as real Unicode.",
      "Cleaning text and publishing without checking line breaks on mobile.",
      "Using Khmer digit conversion in documents that require Latin numerals.",
      "Pasting confidential data into quick cleanup tests.",
      "Replacing the original source before confirming the cleaned output.",
    ],
    privacy: [
      "The fixer processes pasted text in your browser and does not call a ChlatWork API.",
      "Copying the result uses your browser clipboard only after you press the copy button.",
      "Avoid pasting private identity numbers, passwords, or confidential customer data into any online tool.",
    ],
    faqs: [
      {
        question:
          "Can this convert Limon or ABC legacy Khmer fonts to Unicode?",
        answer:
          "No. This tool cleans text that is already Khmer Unicode. Legacy font conversion needs a separate mapping because the plain copied characters are different.",
      },
      {
        question: "Why does copied Khmer text contain invisible characters?",
        answer:
          "PDFs, websites, editors, and chat apps can insert zero-width or non-breaking characters during copy and paste.",
      },
      {
        question: "Will the meaning of my text change?",
        answer:
          "The tool is designed for cleanup, not rewriting. You should still review the output before publishing.",
      },
      {
        question: "Can I convert Khmer digits to Latin digits?",
        answer:
          "Yes. You can choose Khmer-to-Latin or Latin-to-Khmer digit conversion from the options.",
      },
      {
        question: "Is the pasted text uploaded?",
        answer:
          "No. The cleanup runs in your browser and the tool does not send the text to a ChlatWork API.",
      },
    ],
    keywords: [
      "Khmer Unicode fixer",
      "fix Khmer text",
      "clean Khmer Unicode",
      "Khmer copy paste fix",
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
    practicalExamples: [
      {
        title: "Invoice due-date planning",
        scenario:
          "A small business issues invoices with net-30 terms and wants consistent due-date communication.",
        steps: [
          "Select the invoice issue date as start date.",
          "Add 30 days using calendar-day mode.",
          "Share the resulting due date in invoice notes and reminders.",
        ],
        result:
          "Finance and customers reference the same due date, reducing late-payment disputes.",
      },
      {
        title: "Exam countdown planning",
        scenario:
          "A student prepares a revision plan for an exam scheduled next month.",
        steps: [
          "Use date difference to calculate remaining days.",
          "Split study goals across weekly milestones.",
          "Re-check remaining days each week to adjust plan.",
        ],
        result:
          "The study plan stays realistic and deadline-aware instead of last-minute cramming.",
      },
    ],
    tips: [
      "Confirm whether your business counts calendar days or working days.",
      "Be careful around month ends because adding one month can behave differently than adding 30 days.",
      "Use the date difference mode when checking contract periods.",
      "Write down the starting date so teammates can reproduce the result.",
      "Check timezone-sensitive deadlines separately if an exact time also matters.",
    ],
    privacy: [
      "Date calculations run in your browser from the dates and numbers you enter.",
      "The tool does not send selected dates or calculation results to a ChlatWork API.",
      "For legal, finance, or HR deadlines, confirm the result against your official policy before relying on it.",
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
        answer: "Yes. The ChlatWork Date Calculator is free to use online.",
      },
    ],
    keywords: [
      "date calculator",
      "add days to date",
      "date difference calculator",
      "deadline calculator",
    ],
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
    practicalExamples: [
      {
        title: "Internal SKU shelf labeling",
        scenario:
          "A small store tracks inventory with internal SKU values that are not official retail codes.",
        steps: [
          "Use CODE128 format for flexible alphanumeric SKU values.",
          "Generate labels and print one sample sheet first.",
          "Scan-test labels at shelf distance with the real POS scanner.",
        ],
        result:
          "Inventory lookup becomes faster and manual typing mistakes drop in daily operations.",
      },
      {
        title: "Warehouse receiving tests",
        scenario:
          "A dev team tests barcode scanning logic before integrating with live supplier codes.",
        steps: [
          "Generate multiple sample barcodes covering expected formats.",
          "Run scan tests on mobile and handheld scanner devices.",
          "Adjust format/print settings based on failed scan cases.",
        ],
        result:
          "The receiving flow is validated early, reducing risk during production rollout.",
      },
      {
        title: "Promotion sticker code set",
        scenario:
          "A store runs a short campaign and needs scannable codes for bundled promo products.",
        steps: [
          "Generate one barcode per promo SKU with consistent naming.",
          "Print sample stickers and test scans at checkout speed.",
          "Export final labels only after scanner validation passes.",
        ],
        result:
          "Checkout remains smooth during promotions with fewer manual SKU entries.",
      },
    ],
    practicalExamplesKm: [
      {
        title: "បង្កើត Barcode សម្រាប់ SKU ខាងក្នុង",
        scenario: "ហាងតូចមួយប្រើលេខ SKU ខាងក្នុង ហើយចង់ស្កេនបានលឿននៅធ្នើ។",
        steps: [
          "ជ្រើស CODE128 សម្រាប់កូដអក្សរ-លេខ។",
          "បង្កើត barcode និងបោះពុម្ពសាកល្បងមួយសន្លឹកជាមុន។",
          "សាកស្កេនជាមួយម៉ាស៊ីនពិត មុនបោះពុម្ពច្រើន។",
        ],
        result: "ការស្វែងរកទំនិញលឿនឡើង និងកាត់បន្ថយកំហុសវាយដៃ។",
      },
      {
        title: "សាកល្បង Barcode សម្រាប់ប្រព័ន្ធឃ្លាំង",
        scenario:
          "ក្រុមអភិវឌ្ឍន៍ចង់សាក Flow ស្កេន មុនភ្ជាប់ទិន្នន័យផ្គត់ផ្គង់ពិត។",
        steps: [
          "បង្កើត barcode ជាច្រើន format តាមករណីត្រូវប្រើ។",
          "សាកល្បងលើទូរស័ព្ទ និង scanner ចល័ត។",
          "កែទ្រង់ទ្រាយបោះពុម្ពតាមករណីស្កេនមិនជាប់។",
        ],
        result: "Flow ទទួលទំនិញត្រូវបានពិនិត្យរួច មុនដាក់ប្រើក្នុងប្រព័ន្ធពិត។",
      },
    ],
    tips: [
      "Use EAN or UPC only when your code length matches the format rules.",
      "Use CODE128 for flexible internal codes.",
      "Print at a readable size with enough quiet space around the barcode.",
      "Avoid stretching the barcode image after downloading.",
      "Test with the same scanner or phone app your team will use.",
    ],
    commonMistakes: [
      "Choosing EAN13 or UPC with the wrong number length.",
      "Trying to encode Khmer or Unicode text in 1D barcode formats.",
      "Stretching barcode graphics in design tools after export.",
      "Printing on low-contrast labels that scanners cannot read.",
      "Skipping scanner tests before bulk label printing.",
    ],
    privacy: [
      "The barcode is generated as SVG in your browser with the selected format and value.",
      "Generating and downloading the SVG does not call a ChlatWork API.",
      "Barcodes are machine-readable labels, so avoid encoding private data on labels that customers or visitors can scan.",
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
        answer: "Yes. ChlatWork Barcode Generator is free to use.",
      },
    ],
    keywords: [
      "barcode generator",
      "generate barcode free",
      "CODE128 barcode",
      "EAN13 barcode",
    ],
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
      "The tracker is an educational money-planning tool and does not replace tax, legal, or professional accounting advice.",
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
      "Validate important totals against your receipts, statements, or accounting process before making decisions.",
      "Copy or export the result when you need to share it with someone else.",
    ],
    useCases: [
      "A family tracks grocery, transport, school, and utility expenses for the month.",
      "A small shop records daily cash purchases such as bags, tape, and cleaning supplies.",
      "A project team tracks snacks, printing, delivery, and event costs.",
      "A freelancer watches daily food, fuel, coffee, and mobile data spending.",
      "A student compares weekly spending with a fixed allowance.",
    ],
    practicalExamples: [
      {
        title: "Family monthly budget control",
        scenario:
          "A household wants to stop overspending on food delivery and transport.",
        steps: [
          "Set a monthly budget target and daily category entries.",
          "Review category totals every weekend and adjust next-week spending.",
          "Compare planned vs actual at month end.",
        ],
        result:
          "The family identifies spending leaks early and keeps monthly costs within target range.",
      },
      {
        title: "Small business petty cash monitoring",
        scenario:
          "A shop manager wants visibility into recurring small purchases that are hard to audit later.",
        steps: [
          "Record each petty cash item with category and short note.",
          "Attach receipt references in notes for larger entries.",
          "Use weekly summaries before reimbursement approval.",
        ],
        result:
          "Petty cash discussions shift from guesswork to traceable category-based decisions.",
      },
      {
        title: "Freelancer cash-flow awareness",
        scenario:
          "A freelancer wants to avoid end-of-month surprises by tracking daily work and living costs.",
        steps: [
          "Log every expense at day end with clear categories.",
          "Review weekly totals against expected client payment dates.",
          "Reduce optional spending when the month projects negative cash flow.",
        ],
        result:
          "The freelancer makes earlier spending adjustments and keeps bills on schedule.",
      },
    ],
    practicalExamplesKm: [
      {
        title: "គ្រប់គ្រងថវិកាគ្រួសារប្រចាំខែ",
        scenario:
          "គ្រួសារមួយចង់ដឹងច្បាស់ថាចំណាយច្រើនលើម្ហូប និងធ្វើដំណើរត្រង់ណា។",
        steps: [
          "កំណត់ថវិកាប្រចាំខែ ហើយកត់ចំណាយរៀងរាល់ថ្ងៃ។",
          "ពិនិត្យតាម Category រៀងរាល់សប្តាហ៍។",
          "ប្រៀបធៀបគម្រោងនិងចំណាយពិតនៅចុងខែ។",
        ],
        result: "គ្រួសារអាចកែសម្រួលការចំណាយបានទាន់ពេល និងកាត់បន្ថយការលើសថវិកា។",
      },
      {
        title: "តាមដានប្រាក់ចំណាយហាងតូច",
        scenario:
          "អ្នកគ្រប់គ្រងហាងចង់ឃើញចំណាយតូចៗប្រចាំថ្ងៃ ដើម្បីត្រួតពិនិត្យ petty cash។",
        steps: [
          "កត់ទុករាល់ចំណាយជាមួយ Category និងកំណត់ចំណាំខ្លី។",
          "ភ្ជាប់លេខវិក្កយបត្រសម្រាប់ចំណាយសំខាន់។",
          "ប្រើសង្ខេបប្រចាំសប្តាហ៍ មុនអនុម័តសងប្រាក់។",
        ],
        result:
          "ការអនុម័តចំណាយមានភស្តុតាងច្បាស់ និងសម្រួលការគ្រប់គ្រងសាច់ប្រាក់។",
      },
    ],
    tips: [
      "Add expenses on the same day so the record stays accurate.",
      "Use consistent categories like food, transport, rent, supplies, and bills.",
      "Write short notes for unusual or one-time expenses.",
      "Review the summary at the end of each week, not only at month end.",
      "If the data is used for reporting, reconcile totals with receipts or bank records.",
      "Set a realistic budget so the tracker becomes useful instead of stressful.",
    ],
    commonMistakes: [
      "Entering expenses without category labels, making summaries less useful.",
      "Updating entries late and forgetting cash payments.",
      "Treating tracker totals as audited accounting records.",
      "Using inconsistent currency labels in the same period.",
      "Ignoring recurring expenses when setting monthly budget limits.",
    ],
    privacy: [
      "Expense entries and category calculations run in your browser for day-to-day use.",
      "When creating share links, avoid including sensitive personal details in notes or labels.",
      "Before using shared results for formal reporting, validate totals with original receipts and statements.",
    ],
    faqs: [
      {
        question: "Is this a full accounting system?",
        answer:
          "No. It is a simple expense tracker for quick budgeting and insight, not a replacement for formal accounting software.",
      },
      {
        question: "Can I rely on this for tax filing or audited reports?",
        answer:
          "Use it as a helper for daily tracking, then confirm numbers with your accounting records or advisor before filing or reporting.",
      },
      {
        question: "Can I use it for a small business?",
        answer:
          "Yes, for simple day-to-day expense visibility. For tax or formal reports, confirm records with your accounting process.",
      },
      {
        question: "Can I track categories?",
        answer: "Yes. Categories help you see where the money is going.",
      },
      {
        question: "Should I record every small expense?",
        answer:
          "If your goal is accurate budgeting, yes. Small daily amounts can become large over a month.",
      },
      {
        question: "Is it free?",
        answer: "Yes. The ChlatWork Expense Tracker is free to use.",
      },
    ],
    keywords: [
      "expense tracker",
      "track expenses online",
      "budget tracker",
      "Cambodia expense tracker",
    ],
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
    practicalExamples: [
      {
        title: "Livestream giveaway transparency",
        scenario:
          "An online seller runs a live giveaway and needs visible, fair winner selection to avoid complaints.",
        steps: [
          "Import participant names from the final comment list.",
          "Remove duplicate entries according to campaign rules.",
          "Spin the wheel live and capture winner screenshot for proof post.",
        ],
        result:
          "Audience trust improves because winner selection is visibly random and documented.",
      },
      {
        title: "Classroom participation picker",
        scenario:
          "A teacher wants to choose presenters fairly from a full class roster.",
        steps: [
          "Add all student names once at session start.",
          "Run one draw per activity round.",
          "Record winners and remove selected names when repeats are not allowed.",
        ],
        result:
          "Class participation feels fairer, and quieter students get equal selection chance.",
      },
    ],
    tips: [
      "Clean the participant list before starting the draw.",
      "Remove duplicate names unless your rules allow multiple entries.",
      "Announce the rules before spinning.",
      "Keep a screenshot or copy of the winner list for transparency.",
      "Test the draw before going live in front of customers.",
    ],
    privacy: [
      "Participant parsing, random winner selection, wheel animation, and fullscreen mode run in your browser.",
      "The share button stores the participant list in the page URL query so another person can open the same list.",
      "Do not put phone numbers, private customer details, or sensitive staff data in a public draw link.",
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
        answer: "Yes. The ChlatWork Lucky Draw tool is free to use.",
      },
    ],
    keywords: [
      "lucky draw online",
      "random winner picker",
      "spin wheel giveaway",
      "Cambodia lucky draw",
    ],
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
    commonMistakes: [
      "Pasting JavaScript object literals and expecting strict JSON validation to pass.",
      "Leaving trailing commas after the last key or array item.",
      "Using single quotes in JSON keys or string values.",
      "Formatting and sharing payloads without removing sensitive tokens.",
      "Minifying invalid JSON before fixing syntax errors.",
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
    keywords: [
      "JSON formatter",
      "format JSON online",
      "JSON validator",
      "minify JSON",
    ],
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
    commonMistakes: [
      "Treating decoded payload values as verified/trusted identity.",
      "Debugging with expired tokens and assuming auth guards are broken.",
      "Sharing full production JWTs in screenshots or bug tickets.",
      "Mixing seconds and milliseconds when checking exp and iat claims.",
      "Ignoring issuer/audience mismatch while focusing only on role claim.",
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
    commonMistakes: [
      "Sending data URL prefixes where the API expects raw Base64 only.",
      "Treating Base64 as a security layer instead of plain encoding.",
      "Uploading huge files as Base64 when multipart upload is required.",
      "Using the wrong text encoding and getting unreadable output.",
      "Posting decoded sensitive values in public debug channels.",
    ],
    faqs: [
      {
        question: "Is Base64 encryption?",
        answer: "No. Base64 is encoding, not encryption. Anyone can decode it.",
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
    keywords: [
      "Base64 encoder",
      "Base64 decoder",
      "file to Base64",
      "encode decode Base64",
    ],
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
    commonMistakes: [
      "Encoding the entire URL repeatedly and causing double-encoded links.",
      "Decoding then editing parameters without re-encoding before use.",
      "Sending plain spaces and symbols in query values.",
      "Mixing encoded and unencoded fragments in one redirect value.",
      "Sharing payment links without verifying final destination URL.",
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
    keywords: [
      "URL encoder",
      "URL decoder",
      "encode query string",
      "decode URL online",
    ],
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
    commonMistakes: [
      "Testing regex with only one happy-path sample string.",
      "Forgetting anchors and matching text fragments unintentionally.",
      "Using greedy groups that swallow too much input.",
      "Ignoring Unicode cases when validating Khmer-English mixed text.",
      "Replacing full validation logic with one regex rule.",
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
        answer: "Yes. The tool includes copy support for matched output.",
      },
    ],
    keywords: [
      "regex tester",
      "test regular expression",
      "JavaScript regex",
      "regex match groups",
    ],
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
    commonMistakes: [
      "Reusing one UUID across many test rows and hiding uniqueness issues.",
      "Treating UUIDs as secure authentication tokens.",
      "Mixing uppercase/lowercase formatting in systems with strict comparisons.",
      "Using fake UUID format strings that are not valid v4 values.",
      "Copying UUIDs with hidden spaces/newlines from text editors.",
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
        answer: "Yes. Choose the quantity and generate a bulk list.",
      },
      {
        question: "Can I use UUIDs as secure tokens?",
        answer:
          "Do not treat normal UUIDs as secure secrets. Use a proper cryptographic token for security-sensitive flows.",
      },
      {
        question: "Is the UUID Generator free?",
        answer: "Yes. It is free to use on ChlatWork.",
      },
    ],
    keywords: [
      "UUID generator",
      "generate UUID online",
      "v4 UUID",
      "bulk UUID generator",
    ],
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
    commonMistakes: [
      "Treating milliseconds timestamps as seconds and getting wrong dates.",
      "Comparing local timezone output with UTC logs without conversion.",
      "Assuming JWT exp values are milliseconds by default.",
      "Copying timestamp values with comma separators from spreadsheets.",
      "Ignoring daylight-saving behavior in regional schedule discussions.",
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
    keywords: [
      "Unix timestamp converter",
      "timestamp to date",
      "date to timestamp",
      "epoch converter",
    ],
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
    commonMistakes: [
      "Deploying cron expressions without checking server timezone.",
      "Using day-of-week and day-of-month rules incorrectly together.",
      "Running heavy jobs every minute by mistake from bad wildcard usage.",
      "Copying cron syntax between systems that use different field counts.",
      "Skipping preview and discovering schedule issues only in production.",
    ],
    faqs: [
      {
        question: "What does */5 * * * * mean?",
        answer: "It usually means every five minutes.",
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
    keywords: [
      "cron expression explainer",
      "explain cron",
      "cron schedule",
      "next cron run",
    ],
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
    commonMistakes: [
      "Using MD5/SHA-1 for new security-sensitive password storage.",
      "Comparing hashes generated from text with hidden newline differences.",
      "Expecting hash outputs to be reversible like encryption.",
      "Mixing file checksum workflows with plain text hash checks.",
      "Sharing secret input text in screenshots when reporting hash mismatches.",
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
    keywords: [
      "hash generator",
      "SHA-256 hash",
      "MD5 generator",
      "text hash online",
    ],
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
    keywords: [
      "password generator",
      "generate strong password",
      "random password",
      "secure password tool",
    ],
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
    iconPath: getToolIconImagePath(tool.key),
    iconPaths: TOOL_ICON_PATHS[tool.key] ?? TOOL_ICON_PATHS.calculator ?? [],
    iconClass:
      TOOL_ICON_CLASSES[tool.key] ?? TOOL_ICON_CLASSES.calculator ?? "",
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

export function findToolGuideByToolRoute(route: string) {
  const normalizedRoute = route.endsWith("/") ? route.slice(0, -1) : route;

  return (
    TOOL_GUIDES.find((guide) => guide.tool.route === normalizedRoute) ?? null
  );
}
