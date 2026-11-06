import type { LandingTool, LandingToolCategory } from "~/data/tools";
import type { ToolCategory } from "~/lib/tool-registry";

export type AppLocale = "en" | "km";

// Keep the unfinished Khmer shell dormant until every public tool page has complete localization.
// const ENABLE_KHMER_LOCALIZATION = false;
const ENABLE_KHMER_LOCALIZATION = true;

type LandingCopy = {
  metaTitle: string;
  metaDescription: string;
  tagline: string;
  toolsPage: {
    metaTitle: string;
    metaDescription: string;
    eyebrow: string;
    title: string;
    description: string;
    searchPlaceholder: string;
    emptyState: string;
  };
  nav: {
    home: string;
    tools: string;
    portfolio: string;
    allTools: string;
    searchTools: string;
    clear: string;
    noToolsFound: string;
    toolsHeading: string;
    switchToKhmer: string;
    switchToEnglish: string;
  };
  footer: {
    about: string;
    privacy: string;
    cookies: string;
    cookieNotice: string;
    terms: string;
    disclaimer: string;
    contact: string;
    coffee: string;
  };
  hero: {
    title: string;
    description: string;
  };
  heroSearch: {
    label: string;
    placeholder: string;
    clear: string;
    toolsLabel: string;
    guidesLabel: string;
    noResults: string;
  };
  categories: {
    eyebrow: string;
    title: string;
    toolsLabel: string;
    explore: string;
  };
  cta: {
    title: string;
    description: string;
    primaryAction: string;
    secondaryAction: string;
  };
};

const ENGLISH_FONT_STACK =
  '"-apple-system-body", "ui-sans-serif", "-apple-system", "system-ui", "Segoe UI", "Helvetica", "Apple Color Emoji", "Arial", "sans-serif", "Segoe UI Emoji", "Segoe UI Symbol"';
const KHMER_FONT_STACK = `"Hanuman", ${ENGLISH_FONT_STACK}`;

const COPY: Record<AppLocale, LandingCopy> = {
  en: {
    metaTitle: "Free Online Tools for Everyday Work - ChlatWork",
    metaDescription:
      "Search free tools for PDFs, images, QR codes, calculators, Khmer text, and developer tasks.",
    tagline: "Free online tools for everyday work.",
    toolsPage: {
      metaTitle: "Free Online Tools - ChlatWork",
      metaDescription:
        "Browse ChlatWork tools for PDF files, images, QR codes, barcodes, dates, calculators, productivity, and developer workflows.",
      eyebrow: "Tools",
      title: "Browse free online tools",
      description:
        "Choose a focused ChlatWork tool for documents, images, QR codes, barcodes, dates, calculators, productivity, or developer tasks.",
      searchPlaceholder: "Search by tool name, category, or task",
      emptyState: "No tools found.",
    },
    nav: {
      home: "Home",
      tools: "Tools",
      portfolio: "Portfolio",
      allTools: "All Tools",
      searchTools: "Search tools",
      clear: "Clear",
      noToolsFound: "No tools found.",
      toolsHeading: "Tools",
      switchToKhmer: "ភាសាខ្មែរ",
      switchToEnglish: "English",
    },
    footer: {
      about: "About",
      privacy: "Privacy Policy",
      cookies: "Cookie Policy",
      cookieNotice: "Privacy & cookie settings",
      terms: "Terms of Use",
      disclaimer: "Disclaimer",
      contact: "Contact",
      coffee: "Support ChlatWork",
    },
    hero: {
      title: "What do you want to do today?",
      description:
        "Search free tools for PDFs, images, QR codes, calculators, Khmer text, and developer tasks.",
    },
    heroSearch: {
      label: "Search all ChlatWork tools",
      placeholder: "Search PDF, image, QR, JSON, password...",
      clear: "Clear search",
      toolsLabel: "Tool",
      guidesLabel: "Guide",
      noResults: "No matching tools or guides found.",
    },
    categories: {
      eyebrow: "Tool Categories",
      title: "Browse by category.",
      toolsLabel: "tools",
      explore: "Explore",
    },
    cta: {
      title: "Need the full tool list?",
      description:
        "The homepage keeps things simple. Visit the tools directory when you want to browse every ChlatWork tool by category.",
      primaryAction: "Browse All Tools",
      secondaryAction: "Request a Tool",
    },
  },
  km: {
    metaTitle: "ChlatWork - ឧបករណ៍ងាយស្រួលសម្រាប់ការងារប្រចាំថ្ងៃ",
    metaDescription:
      "ឧបករណ៍លឿន ស្អាត និងងាយប្រើ សម្រាប់ការងារ អ្នកអភិវឌ្ឍន៍ និងអ្នកបង្កើតមាតិកា។",
    tagline: "ឧបករណ៍អនឡាញឥតគិតថ្លៃសម្រាប់ការងារប្រចាំថ្ងៃ។",
    toolsPage: {
      metaTitle: "ឧបករណ៍ - ChlatWork",
      metaDescription: "ស្វែងរកឧបករណ៍ និង developer tools ដែលផ្តោតលើភាពឯកជន។",
      eyebrow: "ឧបករណ៍",
      title: "មើលឧបករណ៍អនឡាញឥតគិតថ្លៃ",
      description:
        "ជ្រើសរើសឧបករណ៍ ChlatWork សម្រាប់ PDF រូបភាព QR barcode កាលបរិច្ឆេទ ការគណនា និងការងារប្រចាំថ្ងៃ។",
      searchPlaceholder: "ស្វែងរកតាមឈ្មោះ ប្រភេទ ឬការងារ",
      emptyState: "រកមិនឃើញឧបករណ៍។",
    },
    nav: {
      home: "ទំព័រដើម",
      tools: "ឧបករណ៍",
      portfolio: "Portfolio",
      allTools: "ឧបករណ៍ទាំងអស់",
      searchTools: "ស្វែងរកឧបករណ៍",
      clear: "សម្អាត",
      noToolsFound: "រកមិនឃើញឧបករណ៍។",
      toolsHeading: "ឧបករណ៍",
      switchToKhmer: "ភាសាខ្មែរ",
      switchToEnglish: "English",
    },
    footer: {
      about: "អំពីយើង",
      privacy: "គោលការណ៍ឯកជនភាព",
      cookies: "គោលការណ៍ Cookie",
      cookieNotice: "ការកំណត់ឯកជនភាព និង Cookie",
      terms: "លក្ខខណ្ឌប្រើប្រាស់",
      disclaimer: "ការបដិសេធទំនួលខុសត្រូវ",
      contact: "ទំនាក់ទំនង",
      coffee: "គាំទ្រ ChlatWork",
    },
    hero: {
      title: "ថ្ងៃនេះអ្នកចង់ធ្វើអ្វី?",
      description:
        "ស្វែងរកឧបករណ៍ឥតគិតថ្លៃសម្រាប់ PDF រូបភាព QR code ការគណនា អត្ថបទខ្មែរ និង developer tasks។",
    },
    heroSearch: {
      label: "ស្វែងរកឧបករណ៍ ChlatWork ទាំងអស់",
      placeholder: "សាកល្បង Wi-Fi QR, បង្រួមរូបភាព, JSON, ពាក្យសម្ងាត់...",
      clear: "សម្អាតការស្វែងរក",
      toolsLabel: "ឧបករណ៍",
      guidesLabel: "មេរៀន",
      noResults: "រកមិនឃើញឧបករណ៍ ឬមេរៀនដែលត្រូវគ្នា។",
    },
    categories: {
      eyebrow: "ប្រភេទឧបករណ៍",
      title: "មើលតាមប្រភេទ។",
      toolsLabel: "ឧបករណ៍",
      explore: "មើល",
    },
    cta: {
      title: "ចង់មើលឧបករណ៍ទាំងអស់?",
      description:
        "ទំព័រដើមបង្ហាញតែឧបករណ៍សំខាន់ៗ។ ទៅទំព័រ tools ដើម្បីមើលឧបករណ៍ ChlatWork ទាំងអស់តាមប្រភេទ។",
      primaryAction: "មើលឧបករណ៍ទាំងអស់",
      secondaryAction: "ស្នើសុំឧបករណ៍",
    },
  },
};

const TOOL_CATEGORY_TRANSLATIONS: Record<
  AppLocale,
  Record<ToolCategory, string>
> = {
  en: {
    Utilities: "Utilities",
    "PDF Tools": "PDF Tools",
    "Developer Tools": "Developer Tools",
  },
  km: {
    Utilities: "ឧបករណ៍ប្រើប្រាស់",
    "PDF Tools": "ឧបករណ៍ PDF",
    "Developer Tools": "ឧបករណ៍អ្នកអភិវឌ្ឍន៍",
  },
};

const DIRECTORY_CATEGORY_TRANSLATIONS: Record<AppLocale, Record<string, string>> = {
  en: {},
  km: {
    pdf: "ឧបករណ៍ PDF",
    image: "ឧបករណ៍រូបភាព",
    "qr-barcode": "QR និង Barcode",
    "date-time": "កាលបរិច្ឆេទ និងពេលវេលា",
    calculators: "ឧបករណ៍គណនា",
    productivity: "ឧបករណ៍ Productivity",
    "developer-tools": "ឧបករណ៍អ្នកអភិវឌ្ឍន៍",
    "security-encoding": "សុវត្ថិភាព និង Encoding",
    "khmer-tools": "ឧបករណ៍ភាសាខ្មែរ",
    scanners: "ឧបករណ៍ស្កេន",
    generators: "ឧបករណ៍បង្កើត Generator",
    "file-conversion": "ឧបករណ៍បម្លែងឯកសារ",
  },
};

const DIRECTORY_CATEGORY_SHORT_TITLE_TRANSLATIONS: Record<
  AppLocale,
  Record<string, string>
> = {
  en: {},
  km: {
    pdf: "PDF",
    image: "រូបភាព",
    "qr-barcode": "QR & Barcode",
    "date-time": "កាលបរិច្ឆេទ",
    calculators: "ការគណនា",
    productivity: "Productivity",
    "developer-tools": "Developer",
    "security-encoding": "សុវត្ថិភាព",
    "khmer-tools": "ភាសាខ្មែរ",
    scanners: "ស្កេន",
    generators: "បង្កើត",
    "file-conversion": "បម្លែងឯកសារ",
  },
};

const DIRECTORY_CATEGORY_DESCRIPTION_TRANSLATIONS: Record<
  AppLocale,
  Record<string, string>
> = {
  en: {},
  km: {
    pdf: "ឧបករណ៍សម្រាប់បម្លែង បញ្ចូល បំបែក បង្រួម និងបង្កើតឯកសារ PDF នៅក្នុង browser។",
    image:
      "ឧបករណ៍សម្រាប់បង្រួមរូបភាព និងបម្លែងរូបភាពទៅជាឯកសារ PDF សម្រាប់ផ្ញើ ឬ upload។",
    "qr-barcode":
      "បង្កើត QR code, Wi-Fi QR poster និង barcode សម្រាប់ហាង ការិយាល័យ ព្រឹត្តិការណ៍ និងការធ្វើតេស្ត។",
    "date-time":
      "គណនាថ្ងៃ បម្លែង Unix timestamp និងពន្យល់ cron schedule សម្រាប់ការរៀបចំការងារ។",
    calculators:
      "ជំនួយសម្រាប់គណនាកាលបរិច្ឆេទ ចែកចំណាយជាក្រុម និងតាមដានចំណាយប្រចាំថ្ងៃ។",
    productivity:
      "ឧបករណ៍តូចៗសម្រាប់ lucky draw អានអត្ថបទជាសំឡេង បង្កើតពាក្យសម្ងាត់ និងការងារការិយាល័យរហ័ស។",
    "developer-tools":
      "រៀបចំទិន្នន័យ ពិនិត្យ token សាកល្បង pattern និងដោះស្រាយការបម្លែងទូទៅរបស់ developer ក្នុង browser។",
    "security-encoding":
      "បកស្រាយ token, encode ទិន្នន័យ, បង្កើត hash និងពាក្យសម្ងាត់ខ្លាំងៗដោយសុវត្ថិភាព។",
    "khmer-tools":
      "កែសម្រួលអត្ថបទ Khmer Unicode និងស្តាប់សំឡេងអានជាភាសាខ្មែរ ឬអង់គ្លេស។",
    scanners:
      "អាន QR code និង barcode ពីរូបភាព ការ upload ស្លាក និងកាមេរ៉ាដោយផ្ទាល់។",
    generators:
      "បង្កើត QR code, barcode, ពាក្យសម្ងាត់, UUID និង hash សម្រាប់ការងារប្រចាំថ្ងៃ និងការអភិវឌ្ឍន៍។",
    "file-conversion":
      "បម្លែងរូបភាព និង PDF ឬរៀបចំឯកសារសម្រាប់ចែករំលែក និងការងារការិយាល័យ។",
  },
};

const DIRECTORY_CATEGORY_INTRO_TRANSLATIONS: Record<
  AppLocale,
  Record<string, string>
> = {
  en: {},
  km: {
    pdf: "ប្រើប្រាស់ឧបករណ៍ ChlatWork PDF សម្រាប់ការងារឯកសាររហ័ស ដូចជាបម្លែងរូបភាពទៅជា PDF បញ្ចូលឯកសារ ឬលុបទំព័រដែលមិនត្រូវការ។",
    image: "រៀបចំរូបថត screenshot រូបភាពផលិតផល និងឯកសារដោយមិនចាំបាច់ដំឡើងកម្មវិធីធំៗ។",
    "qr-barcode": "បង្កើត code ងាយស្រួលស្កេនសម្រាប់ហាង ការិយាល័យ ព្រឹត្តិការណ៍ ស្លាកទំនិញ Wi-Fi និង link។",
    "date-time": "ប្រើប្រាស់ឧបករណ៍ទាំងនេះនៅពេលដែលអ្នកត្រូវការពិនិត្យកាលបរិច្ឆេទ timestamp ឬ cron jobs យ៉ាងរហ័ស។",
    calculators: "ឧបករណ៍ទាំងនេះជួយដល់តួលេខជាក់ស្តែង៖ ការរៀបចំកាលបរិច្ឆេទ ការចែកលុយជាក្រុម ថវិកា និងការចំណាយប្រចាំថ្ងៃ។",
    productivity: "ឧបករណ៍ productivity ជួយឱ្យការងារការិយាល័យទូទៅដំណើរការទៅដោយរលូន មិនថាជាការចាប់ឆ្នោត ការបង្កើតពាក្យសម្ងាត់ ឬការកត់ត្រាផ្សេងៗ។",
    "developer-tools": "ប្រើប្រាស់ឧបករណ៍ជំនួយក្នុង browser សម្រាប់ JSON, JWT, encoding, regular expressions, identifiers, timestamps, schedules និង hashes។",
    "security-encoding": "ពិនិត្យ និងបម្លែងទម្រង់ពាក់ព័ន្ធនឹងសុវត្ថិភាពទូទៅ ដោយមិនចាំបាច់ផ្ញើតម្លៃដែលបានបញ្ចូលទៅ server ខាងក្រៅឡើយ។",
    "khmer-tools": "ជំនួយការភាសាស្រាលៗសម្រាប់សម្អាតអត្ថបទខ្មែរដែលបានចម្លង និងអានអត្ថបទជាសំឡេង។",
    scanners: "ស្រង់យកព័ត៌មានដែលបាន encode ចេញពីរូបភាពដោយមិនបាច់ដំឡើងកម្មវិធីស្កេនដាច់ដោយឡែក។",
    generators: "បង្កើត code, identifier និងតម្លៃសុវត្ថិភាពដែលត្រូវការញឹកញាប់ដោយផ្ទាល់នៅលើ browser។",
    "file-conversion": "រៀបចំឯកសារ និងរូបភាពទូទៅសម្រាប់ការចែករំលែក រក្សាទុក បញ្ចូល និងការងារការិយាល័យប្រចាំថ្ងៃ។",
  },
};

const TOOL_TRANSLATIONS: Record<
  AppLocale,
  Record<string, Pick<LandingTool, "name" | "description">>
> = {
  en: {},
  km: {
    "khmer-calendar": {
      name: "ប្រតិទិនខ្មែរ",
      description: "មើលចន្ទគតិ ថ្ងៃឈប់សម្រាកកម្ពុជា ថ្ងៃសីល និងឆ្នាំខ្មែរ។",
    },
    calculator: {
      name: "គណនាកាលបរិច្ឆេទ",
      description: "បូក ដក និងប្រៀបធៀបកាលបរិច្ឆេទសម្រាប់ការងារ។",
    },
    qr: {
      name: "បង្កើត QR",
      description: "បង្កើត QR សម្រាប់អត្ថបទ ឬ URL។",
    },
    "wifi-qr": {
      name: "បង្កើត Wi-Fi QR",
      description: "បង្កើត Wi-Fi QR ដើម្បីភ្ជាប់ដោយស្កេនភ្លាមៗ។",
    },
    "payback-calculator": {
      name: "គណនាចែកលុយ",
      description: "ចែកចំណាយជាក្រុម និងគណនាថានរណាត្រូវបង់ឲ្យនរណា។",
    },
    "expense-tracker": {
      name: "តាមដានចំណាយ",
      description: "តាមដានចំណាយប្រចាំថ្ងៃ ជាមួយថវិកា និងសង្ខេបច្បាស់។",
    },
    barcode: {
      name: "បង្កើត Barcode",
      description: "បង្កើត barcode ភ្លាមៗពីលេខ ឬអក្សរអង់គ្លេសមូលដ្ឋាន។",
    },
    "image-compress": {
      name: "បង្រួមរូបភាព",
      description: "បង្រួមរូបភាពលឿន ដោយមិន upload ឯកសារ។",
    },
    "image-to-pdf": {
      name: "បម្លែងរូបភាពទៅ PDF",
      description: "បម្លែង JPG, PNG និង WebP ជា PDF មួយឯកសារភ្លាមៗ។",
    },
    "lucky-draw": {
      name: "ចាប់ឆ្នោត",
      description: "បញ្ចូលអ្នកចូលរួម ហើយចាប់អ្នកឈ្នះដោយចៃដន្យ។",
    },
    "text-to-voice": {
      name: "អត្ថបទទៅជាសំឡេង",
      description: "អានអត្ថបទខ្មែរ ឬអង់គ្លេសជាសំឡេងដោយស្វ័យប្រវត្តិ។",
    },
    "khmer-unicode-fixer": {
      name: "កែអត្ថបទ Khmer Unicode",
      description: "សម្អាត និង normalize អត្ថបទខ្មែរដែលបានចម្លង។",
    },
    base64: {
      name: "Base64 Encoder / Decoder",
      description:
        "បម្លែង encode/decode និងបម្លែងឯកសារ Base64 នៅលើម៉ាស៊ីនអ្នក។",
    },
    "json-formatter": {
      name: "រៀបចំ JSON",
      description: "រៀបចំ បង្រួម និងពិនិត្យ JSON។",
    },
    "jwt-decoder": {
      name: "បកស្រាយ JWT",
      description: "បកស្រាយ JWT header, payload និងពេលវេលា token។",
    },
    "url-encoder": {
      name: "URL Encoder / Decoder",
      description: "Encode និង decode URL components និង query strings។",
    },
    "uuid-generator": {
      name: "បង្កើត UUID",
      description: "បង្កើត UUID v4 មួយៗ ឬច្រើនក្នុងពេលតែមួយ។",
    },
    "password-generator": {
      name: "បង្កើតពាក្យសម្ងាត់",
      description: "បង្កើតពាក្យសម្ងាត់ខ្លាំង ជាមួយការកំណត់ប្រវែង និងតួអក្សរ។",
    },
    "unix-timestamp": {
      name: "បម្លែង Unix Timestamp",
      description: "បម្លែង timestamp ទៅកាលបរិច្ឆេទ និងបម្លែងត្រឡប់វិញ។",
    },
    "cron-explainer": {
      name: "ពន្យល់ Cron",
      description: "ពន្យល់ cron expression និងបង្ហាញពេលរត់បន្ទាប់។",
    },
    "regex-tester": {
      name: "សាកល្បង Regex",
      description: "សាកល្បង regex pattern, flag, match និង group។",
    },
    "hash-generator": {
      name: "បង្កើត Hash",
      description: "បង្កើត MD5, SHA-1, SHA-256 និង SHA-512 hash។",
    },
    stopwatch: {
      name: "នាឡិកាវាស់ស្ទង់",
      description: "វាស់ស្ទង់ពេលវេលា ចាប់ជុំ និងតាមដានរយៈពេលយ៉ាងជាក់លាក់។",
    },
    "scan-qr": {
      name: "ស្កេន QR Code",
      description:
        "ស្កេន QR code ពីរូបភាព ឯកសារ ឬកាមេរ៉ាដោយផ្ទាល់នៅលើ browser។",
    },
    "scan-barcode": {
      name: "ស្កេន Barcode",
      description:
        "ស្កេន និងអានកូដ barcode ពីរូបភាព ឬកាមេរ៉ាដោយសុវត្ថិភាព។",
    },
    "kla-klok": {
      name: "បោករឡុក ខ្លាឃ្លោក",
      description:
        "ល្បែងកម្សាន្តប្រជាប្រិយខ្មែរ ខ្លាឃ្លោក បង្វិលគ្រាប់ឡុកឡាក់ដោយចៃដន្យ។",
    },
    "youtube-downloader": {
      name: "ទាញយកវីដេអូ YouTube",
      description:
        "ទាញយកវីដេអូ ឬសំឡេងពី YouTube ដែលអ្នកមានការអនុញ្ញាត។",
    },
    "chlatwork-link": {
      name: "ChlatWork Link",
      description:
        "បង្កើតទំព័រ Link-in-bio ផ្ទាល់ខ្លួន ស្អាត និងចែករំលែកបានយ៉ាងងាយស្រួល។",
    },
    "pdf-to-jpg": {
      name: "បម្លែង PDF ទៅជា JPG",
      description:
        "បម្លែងទំព័រឯកសារ PDF ទៅជារូបភាព JPG ច្បាស់ៗដោយឥតគិតថ្លៃ។",
    },
    "merge-pdf": {
      name: "បញ្ចូល PDF ចូលគ្នា",
      description:
        "បញ្ចូលឯកសារ PDF ច្រើនចូលទៅជាឯកសារតែមួយយ៉ាងរហ័ស។",
    },
    "split-pdf": {
      name: "បំបែកឯកសារ PDF",
      description:
        "បំបែកទំព័រ ឬជ្រើសរើសទំព័រជាក់លាក់ចេញពីឯកសារ PDF។",
    },
    "compress-pdf": {
      name: "បង្រួមទំហំ PDF",
      description:
        "កាត់បន្ថយទំហំឯកសារ PDF ដោយរក្សាគុណភាពច្បាស់ល្អ។",
    },
    "remove-pdf-pages": {
      name: "លុបទំព័រ PDF",
      description:
        "ជ្រើសរើស និងលុបទំព័រដែលមិនត្រូវការចេញពីឯកសារ PDF។",
    },
    "reorder-pdf-pages": {
      name: "តម្រៀបទំព័រ PDF",
      description:
        "រៀបចំលំដាប់លំដោយទំព័រ PDF ឡើងវិញតាមតម្រូវការ។",
    },
    "html-to-pdf": {
      name: "បម្លែង HTML ទៅ PDF",
      description:
        "បម្លែងកូដ HTML ឬទំព័រគេហទំព័រទៅជាឯកសារ PDF ស្អាត។",
    },
    "text-to-pdf": {
      name: "បម្លែងអត្ថបទទៅ PDF",
      description:
        "បម្លែងអត្ថបទសាមញ្ញទៅជាឯកសារ PDF ផ្លូវការយ៉ាងរហ័ស។",
    },
    "invoice-to-pdf": {
      name: "បង្កើតវិក្កយបត្រ PDF",
      description:
        "បំពេញទិន្នន័យ និងបង្កើតវិក្កយបត្រ PDF អាជីពភ្លាមៗ។",
    },
  },
};

function getInitialLocale(_routePath?: string): AppLocale {
  return "km";
}

function containsKhmerContent(value: string) {
  return /[\u1780-\u17FF\u19E0-\u19FF]/u.test(value);
}

function getTextLineHeight(value: string, kind: "heading" | "body") {
  if (containsKhmerContent(value)) {
    return kind === "heading" ? "1.35" : "1.55";
  }

  return kind === "heading" ? "1.5" : "1.7";
}

export function useLanguage() {
  const route = useRoute();
  const locale = useCookie<AppLocale>("app-locale", {
    default: () => getInitialLocale(route.path),
    sameSite: "lax",
  });
  const currentLocale = computed<AppLocale>(() =>
    locale.value === "en" ? "en" : "km",
  );

  const copy = computed(() => COPY[currentLocale.value]);
  const isKhmer = computed(() => currentLocale.value === "km");
  const homePath = computed(() => "/");
  const nextLocale = computed<AppLocale>(() => (isKhmer.value ? "en" : "km"));
  const languageLabel = computed(() =>
    isKhmer.value
      ? copy.value.nav.switchToEnglish
      : copy.value.nav.switchToKhmer,
  );

  const switchLanguage = () => {
    locale.value = currentLocale.value === "km" ? "en" : "km";
  };

  const localizeTool = <
    T extends Pick<LandingTool, "key" | "name" | "description">,
  >(
    tool: T,
  ): T => ({
    ...tool,
    ...(TOOL_TRANSLATIONS[currentLocale.value][tool.key] ?? {}),
  });

  const localizeCategory = (
    category: LandingToolCategory,
  ): LandingToolCategory => ({
    ...category,
    name:
      DIRECTORY_CATEGORY_TRANSLATIONS[currentLocale.value][category.key] ??
      category.name,
    description:
      DIRECTORY_CATEGORY_DESCRIPTION_TRANSLATIONS[currentLocale.value][
        category.key
      ] ??
      category.description,
    tools: category.tools.map(localizeTool),
  });

  const localizeDirectoryCategory = <
    T extends {
      key: string;
      name: string;
      shortTitle?: string;
      title?: string;
      description: string;
      intro?: string;
    },
  >(
    category: T,
  ): T => ({
    ...category,
    name:
      DIRECTORY_CATEGORY_TRANSLATIONS[currentLocale.value][category.key] ??
      category.name,
    shortTitle:
      DIRECTORY_CATEGORY_SHORT_TITLE_TRANSLATIONS[currentLocale.value][
        category.key
      ] ??
      category.shortTitle ??
      category.name,
    title:
      DIRECTORY_CATEGORY_TRANSLATIONS[currentLocale.value][category.key] ??
      category.title ??
      category.name,
    description:
      DIRECTORY_CATEGORY_DESCRIPTION_TRANSLATIONS[currentLocale.value][
        category.key
      ] ??
      category.description,
    intro:
      DIRECTORY_CATEGORY_INTRO_TRANSLATIONS[currentLocale.value][
        category.key
      ] ??
      category.intro ??
      category.description,
  });

  const categoryLabel = (category: ToolCategory) =>
    TOOL_CATEGORY_TRANSLATIONS[currentLocale.value][category];

  const fontFamilyForText = (value: string) =>
    containsKhmerContent(value) ? KHMER_FONT_STACK : ENGLISH_FONT_STACK;

  const lineHeightForText = (
    value: string,
    kind: "heading" | "body" = "body",
  ) => getTextLineHeight(value, kind);

  return {
    locale,
    copy,
    isKhmer,
    homePath,
    languageLabel,
    switchLanguage,
    localizeTool,
    localizeCategory,
    localizeDirectoryCategory,
    categoryLabel,
    fontFamilyForText,
    lineHeightForText,
  };
}
