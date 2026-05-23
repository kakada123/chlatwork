import type { LandingTool, LandingToolCategory } from "~/data/tools";
import type { ToolCategory } from "~/lib/tool-registry";

export type AppLocale = "en" | "km";

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
    titleStart: string;
    titleAccent: string;
    description: string;
    primaryAction: string;
    secondaryAction: string;
    stats: Array<{
      label: string;
      caption: string;
    }>;
  };
  heroSearch: {
    label: string;
    placeholder: string;
    clear: string;
    toolsLabel: string;
    guidesLabel: string;
    noResults: string;
    examplesLabel: string;
    examples: string[];
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
    metaTitle: "ChlatWork - Simple tools that get things done",
    metaDescription:
      "Free online tools for documents, images, QR codes, barcodes, dates, calculators, and productivity.",
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
      titleStart: "Free online tools for",
      titleAccent: "everyday work.",
      description:
        "ChlatWork provides simple browser-based tools for documents, images, QR codes, barcodes, dates, calculators, and productivity.",
      primaryAction: "Explore Tools",
      secondaryAction: "View Categories",
      stats: [
        { label: "Tools", caption: "And counting" },
        { label: "Browser-based", caption: "No unnecessary signup" },
        { label: "Privacy-friendly", caption: "Local processing where possible" },
      ],
    },
    heroSearch: {
      label: "Search all ChlatWork tools",
      placeholder: "Try Wi-Fi QR, compress image, JSON, password...",
      clear: "Clear search",
      toolsLabel: "Tool",
      guidesLabel: "Guide",
      noResults: "No matching tools or guides found.",
      examplesLabel: "Popular:",
      examples: ["Wi-Fi QR", "compress image", "JSON", "password"],
    },
    categories: {
      eyebrow: "Tool Categories",
      title: "Choose the right tool category.",
      toolsLabel: "tools",
      explore: "Explore",
    },
    cta: {
      title: "Simple tools, useful results.",
      description:
        "Open a tool, complete the task, and keep moving without installing extra software or creating an account for basic work.",
      primaryAction: "View All Tools",
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
      titleStart: "ឧបករណ៍អនឡាញឥតគិតថ្លៃ",
      titleAccent: "សម្រាប់ការងារប្រចាំថ្ងៃ។",
      description:
        "ChlatWork ផ្តល់ឧបករណ៍ browser-based សាមញ្ញៗសម្រាប់ឯកសារ រូបភាព QR barcode កាលបរិច្ឆេទ ការគណនា និង productivity។",
      primaryAction: "មើលឧបករណ៍",
      secondaryAction: "មើលប្រភេទ",
      stats: [
        { label: "ឧបករណ៍", caption: "នឹងបន្ថែមបន្តទៀត" },
        { label: "Browser-based", caption: "មិនចាំបាច់បង្កើតគណនីសម្រាប់ការងារមូលដ្ឋាន" },
        { label: "គិតពីភាពឯកជន", caption: "ដំណើរការលើឧបករណ៍អ្នកនៅពេលអាចធ្វើបាន" },
      ],
    },
    heroSearch: {
      label: "ស្វែងរកឧបករណ៍ ChlatWork ទាំងអស់",
      placeholder: "សាកល្បង Wi-Fi QR, បង្រួមរូបភាព, JSON, ពាក្យសម្ងាត់...",
      clear: "សម្អាតការស្វែងរក",
      toolsLabel: "ឧបករណ៍",
      guidesLabel: "មេរៀន",
      noResults: "រកមិនឃើញឧបករណ៍ ឬមេរៀនដែលត្រូវគ្នា។",
      examplesLabel: "ពេញនិយម:",
      examples: ["Wi-Fi QR", "បង្រួមរូបភាព", "JSON", "ពាក្យសម្ងាត់"],
    },
    categories: {
      eyebrow: "ប្រភេទឧបករណ៍",
      title: "ជ្រើសរើសប្រភេទឧបករណ៍ដែលត្រូវការ។",
      toolsLabel: "ឧបករណ៍",
      explore: "មើល",
    },
    cta: {
      title: "ឧបករណ៍សាមញ្ញៗ សម្រាប់លទ្ធផលមានប្រយោជន៍។",
      description:
        "បើកឧបករណ៍ ធ្វើការងារឲ្យរួច ហើយបន្តទៅការងារផ្សេង ដោយមិនចាំបាច់ដំឡើងកម្មវិធីធំៗ។",
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
  },
};

const TOOL_TRANSLATIONS: Record<
  AppLocale,
  Record<string, Pick<LandingTool, "name" | "description">>
> = {
  en: {},
  km: {
    calculator: {
      name: "ម៉ាស៊ីនគិតលេខ",
      description: "គណនារហ័សជាមួយប្រវត្តិ។",
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
  },
};

function getInitialLocale(routePath: string): AppLocale {
  return routePath === "/km" || routePath.startsWith("/km/") ? "km" : "en";
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
    locale.value === "km" ? "km" : "en",
  );

  watch(
    () => route.path,
    (path) => {
      if (path === "/km" || path.startsWith("/km/")) {
        locale.value = "km";
      }
    },
    { immediate: true },
  );

  const copy = computed(() => COPY[currentLocale.value]);
  const isKhmer = computed(() => currentLocale.value === "km");
  const homePath = computed(() => (isKhmer.value ? "/km" : "/"));
  const nextLocale = computed<AppLocale>(() => (isKhmer.value ? "en" : "km"));
  const languageLabel = computed(() =>
    isKhmer.value
      ? copy.value.nav.switchToEnglish
      : copy.value.nav.switchToKhmer,
  );

  const switchLanguage = () => {
    const targetLocale = nextLocale.value;
    const targetPath = targetLocale === "km" ? "/km" : "/";

    locale.value = targetLocale;

    if (route.path === "/" || route.path === "/km") {
      return navigateTo(targetPath);
    }
  };

  const localizeTool = <
    T extends Pick<LandingTool, "key" | "name" | "description">,
  >(
    tool: T,
  ): T => ({
    ...tool,
    ...(TOOL_TRANSLATIONS[locale.value][tool.key] ?? {}),
  });

  const localizeCategory = (
    category: LandingToolCategory,
  ): LandingToolCategory => ({
    ...category,
    name:
      DIRECTORY_CATEGORY_TRANSLATIONS[locale.value][category.key] ??
      category.name,
    description:
      DIRECTORY_CATEGORY_DESCRIPTION_TRANSLATIONS[locale.value][category.key] ??
      category.description,
    tools: category.tools.map(localizeTool),
  });

  const categoryLabel = (category: ToolCategory) =>
    TOOL_CATEGORY_TRANSLATIONS[locale.value][category];

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
    categoryLabel,
    fontFamilyForText,
    lineHeightForText,
  };
}
