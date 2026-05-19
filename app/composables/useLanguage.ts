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
      "Fast, clean, and practical tools for daily work, developers, and creators.",
    tagline: "Simple tools that get things done.",
    toolsPage: {
      metaTitle: "Tools - ChlatWork",
      metaDescription:
        "Explore privacy-friendly utilities and developer tools.",
      eyebrow: "Tools",
      title: "Browse tools",
      description: "Pick a tool and get things done.",
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
      terms: "Terms",
      disclaimer: "Disclaimer",
      contact: "Contact",
      coffee: "Buy me a coffee ☕🤣",
    },
    hero: {
      titleStart: "Simple tools that get things",
      titleAccent: "done.",
      description:
        "Fast, clean, and practical tools for daily work, developers, and creators.",
      primaryAction: "Explore Tools",
      secondaryAction: "Developer Tools",
      stats: [
        { label: "Tools", caption: "And counting" },
        { label: "100% Browser Friendly", caption: "No installation required" },
        { label: "Fast & Secure", caption: "Works offline, stays private" },
      ],
    },
    categories: {
      eyebrow: "Tool Categories",
      title: "Pick the right lane.",
      toolsLabel: "tools",
      explore: "Explore",
    },
    cta: {
      title: "Pick a tool and get things done.",
      description:
        "Every tool is built to stay fast, focused, and easy to return to when work gets busy.",
      primaryAction: "View All Tools",
      secondaryAction: "Request a Tool",
    },
  },
  km: {
    metaTitle: "ChlatWork - ឧបករណ៍ងាយស្រួលសម្រាប់ការងារប្រចាំថ្ងៃ",
    metaDescription:
      "ឧបករណ៍លឿន ស្អាត និងងាយប្រើ សម្រាប់ការងារ អ្នកអភិវឌ្ឍន៍ និងអ្នកបង្កើតមាតិកា។",
    tagline: "ឧបករណ៍ងាយស្រួលសម្រាប់ធ្វើការងារឲ្យរួចរាល់។",
    toolsPage: {
      metaTitle: "ឧបករណ៍ - ChlatWork",
      metaDescription: "ស្វែងរកឧបករណ៍ និង developer tools ដែលផ្តោតលើភាពឯកជន។",
      eyebrow: "ឧបករណ៍",
      title: "មើលឧបករណ៍",
      description: "ជ្រើសរើសឧបករណ៍មួយ ហើយធ្វើការងារឲ្យរួចរាល់។",
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
      terms: "លក្ខខណ្ឌ",
      disclaimer: "ការបដិសេធទំនួលខុសត្រូវ",
      contact: "ទំនាក់ទំនង",
      coffee: "ប៉ាវកាហ្វេញុំ ☕🤣",
    },
    hero: {
      titleStart: "ឧបករណ៍សាមញ្ញៗ សម្រាប់ធ្វើការងារ",
      titleAccent: "ឲ្យរួចរាល់។",
      description:
        "ឧបករណ៍លឿន ស្អាត និងអនុវត្តបានពិត សម្រាប់ការងារប្រចាំថ្ងៃ អ្នកអភិវឌ្ឍន៍ និងអ្នកបង្កើតមាតិកា។",
      primaryAction: "មើលឧបករណ៍",
      secondaryAction: "ឧបករណ៍អ្នកអភិវឌ្ឍន៍",
      stats: [
        { label: "ឧបករណ៍", caption: "នឹងបន្ថែមបន្តទៀត" },
        { label: "ប្រើលើ Browser បាន 100%", caption: "មិនចាំបាច់ដំឡើង" },
        { label: "លឿន និងសុវត្ថិភាព", caption: "ទិន្នន័យនៅលើឧបករណ៍របស់អ្នក" },
      ],
    },
    categories: {
      eyebrow: "ប្រភេទឧបករណ៍",
      title: "ជ្រើសរើសឧបករណ៍ដែលត្រូវការ។",
      toolsLabel: "ឧបករណ៍",
      explore: "មើល",
    },
    cta: {
      title: "ជ្រើសរើសឧបករណ៍ ហើយធ្វើការងារឲ្យរួច។",
      description:
        "ឧបករណ៍នីមួយៗត្រូវបានបង្កើតឲ្យលឿន ច្បាស់ និងងាយត្រឡប់មកប្រើម្ដងទៀតពេលការងាររវល់។",
      primaryAction: "មើលឧបករណ៍ទាំងអស់",
      secondaryAction: "ស្នើសុំឧបករណ៍",
    },
  },
};

const CATEGORY_TRANSLATIONS: Record<AppLocale, Record<ToolCategory, string>> = {
  en: {
    Utilities: "Utilities",
    "Developer Tools": "Developer Tools",
  },
  km: {
    Utilities: "ឧបករណ៍ប្រើប្រាស់",
    "Developer Tools": "ឧបករណ៍អ្នកអភិវឌ្ឍន៍",
  },
};

const CATEGORY_DESCRIPTION_TRANSLATIONS: Record<
  AppLocale,
  Record<ToolCategory, string>
> = {
  en: {
    Utilities:
      "Daily helpers for calculations, QR codes, expenses, compression, and quick office tasks.",
    "Developer Tools":
      "Focused local-first utilities for encoding, validation, tokens, timestamps, regex, and hashes.",
  },
  km: {
    Utilities:
      "ជំនួយប្រចាំថ្ងៃសម្រាប់គណនា បង្កើត QR តាមដានចំណាយ បង្រួមរូបភាព និងការងារការិយាល័យរហ័ស។",
    "Developer Tools":
      "ឧបករណ៍សម្រាប់អ្នកអភិវឌ្ឍន៍ ដូចជា encode, validate, token, timestamp, regex និង hash។",
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
      description: "បង្កើត barcode ភ្លាមៗពីអត្ថបទ ឬលេខ។",
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
      description: "អានអត្ថបទខ្មែរជាសំឡេងតាម ChlatWork audio API។",
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
    name: CATEGORY_TRANSLATIONS[locale.value][category.name],
    description:
      CATEGORY_DESCRIPTION_TRANSLATIONS[locale.value][category.name] ??
      category.description,
    tools: category.tools.map(localizeTool),
  });

  const categoryLabel = (category: ToolCategory) =>
    CATEGORY_TRANSLATIONS[locale.value][category];

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
