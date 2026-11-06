import { localizeMessageTree } from "../lib/i18n";
import type { LandingTool, LandingToolCategory } from "~/data/tools";
import type { ToolCategory } from "~/lib/tool-registry";

export type AppLocale = "en" | "km";

// Khmer is the default; the shared preference drives tool and product interfaces.
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

const COPY: Record<AppLocale, LandingCopy> = { en: localizeMessageTree({
  "metaTitle": "catalog.shell.meta_title",
  "metaDescription": "catalog.shell.meta_description",
  "tagline": "catalog.shell.tagline",
  "toolsPage": {
    "metaTitle": "catalog.shell.tools_page.meta_title",
    "metaDescription": "catalog.shell.tools_page.meta_description",
    "eyebrow": "catalog.shell.tools_page.eyebrow",
    "title": "catalog.shell.tools_page.title",
    "description": "catalog.shell.tools_page.description",
    "searchPlaceholder": "catalog.shell.tools_page.search_placeholder",
    "emptyState": "catalog.shell.tools_page.empty_state"
  },
  "nav": {
    "home": "catalog.shell.nav.home",
    "tools": "catalog.shell.nav.tools",
    "portfolio": "catalog.shell.nav.portfolio",
    "allTools": "catalog.shell.nav.all_tools",
    "searchTools": "catalog.shell.nav.search_tools",
    "clear": "catalog.shell.nav.clear",
    "noToolsFound": "catalog.shell.nav.no_tools_found",
    "toolsHeading": "catalog.shell.nav.tools_heading",
    "switchToKhmer": "catalog.shell.nav.switch_to_khmer",
    "switchToEnglish": "catalog.shell.nav.switch_to_english"
  },
  "footer": {
    "about": "catalog.shell.footer.about",
    "privacy": "catalog.shell.footer.privacy",
    "cookies": "catalog.shell.footer.cookies",
    "cookieNotice": "catalog.shell.footer.cookie_notice",
    "terms": "catalog.shell.footer.terms",
    "disclaimer": "catalog.shell.footer.disclaimer",
    "contact": "catalog.shell.footer.contact",
    "coffee": "catalog.shell.footer.coffee"
  },
  "hero": {
    "title": "catalog.shell.hero.title",
    "description": "catalog.shell.hero.description"
  },
  "heroSearch": {
    "label": "catalog.shell.hero_search.label",
    "placeholder": "catalog.shell.hero_search.placeholder",
    "clear": "catalog.shell.hero_search.clear",
    "toolsLabel": "catalog.shell.hero_search.tools_label",
    "guidesLabel": "catalog.shell.hero_search.guides_label",
    "noResults": "catalog.shell.hero_search.no_results"
  },
  "categories": {
    "eyebrow": "catalog.shell.categories.eyebrow",
    "title": "catalog.shell.categories.title",
    "toolsLabel": "catalog.shell.categories.tools_label",
    "explore": "catalog.shell.categories.explore"
  },
  "cta": {
    "title": "catalog.shell.cta.title",
    "description": "catalog.shell.cta.description",
    "primaryAction": "catalog.shell.cta.primary_action",
    "secondaryAction": "catalog.shell.cta.secondary_action"
  }
}, "en"), km: localizeMessageTree({
  "metaTitle": "catalog.shell.meta_title",
  "metaDescription": "catalog.shell.meta_description",
  "tagline": "catalog.shell.tagline",
  "toolsPage": {
    "metaTitle": "catalog.shell.tools_page.meta_title",
    "metaDescription": "catalog.shell.tools_page.meta_description",
    "eyebrow": "catalog.shell.tools_page.eyebrow",
    "title": "catalog.shell.tools_page.title",
    "description": "catalog.shell.tools_page.description",
    "searchPlaceholder": "catalog.shell.tools_page.search_placeholder",
    "emptyState": "catalog.shell.tools_page.empty_state"
  },
  "nav": {
    "home": "catalog.shell.nav.home",
    "tools": "catalog.shell.nav.tools",
    "portfolio": "catalog.shell.nav.portfolio",
    "allTools": "catalog.shell.nav.all_tools",
    "searchTools": "catalog.shell.nav.search_tools",
    "clear": "catalog.shell.nav.clear",
    "noToolsFound": "catalog.shell.nav.no_tools_found",
    "toolsHeading": "catalog.shell.nav.tools_heading",
    "switchToKhmer": "catalog.shell.nav.switch_to_khmer",
    "switchToEnglish": "catalog.shell.nav.switch_to_english"
  },
  "footer": {
    "about": "catalog.shell.footer.about",
    "privacy": "catalog.shell.footer.privacy",
    "cookies": "catalog.shell.footer.cookies",
    "cookieNotice": "catalog.shell.footer.cookie_notice",
    "terms": "catalog.shell.footer.terms",
    "disclaimer": "catalog.shell.footer.disclaimer",
    "contact": "catalog.shell.footer.contact",
    "coffee": "catalog.shell.footer.coffee"
  },
  "hero": {
    "title": "catalog.shell.hero.title",
    "description": "catalog.shell.hero.description"
  },
  "heroSearch": {
    "label": "catalog.shell.hero_search.label",
    "placeholder": "catalog.shell.hero_search.placeholder",
    "clear": "catalog.shell.hero_search.clear",
    "toolsLabel": "catalog.shell.hero_search.tools_label",
    "guidesLabel": "catalog.shell.hero_search.guides_label",
    "noResults": "catalog.shell.hero_search.no_results"
  },
  "categories": {
    "eyebrow": "catalog.shell.categories.eyebrow",
    "title": "catalog.shell.categories.title",
    "toolsLabel": "catalog.shell.categories.tools_label",
    "explore": "catalog.shell.categories.explore"
  },
  "cta": {
    "title": "catalog.shell.cta.title",
    "description": "catalog.shell.cta.description",
    "primaryAction": "catalog.shell.cta.primary_action",
    "secondaryAction": "catalog.shell.cta.secondary_action"
  }
}, "km") };

const TOOL_CATEGORY_TRANSLATIONS: Record<
  AppLocale,
  Record<ToolCategory, string>
> = { en: localizeMessageTree({
  "Utilities": "catalog.tool_category.utilities",
  "PDF Tools": "catalog.tool_category.pdf_tools",
  "Developer Tools": "catalog.tool_category.developer_tools"
}, "en"), km: localizeMessageTree({
  "Utilities": "catalog.tool_category.utilities",
  "PDF Tools": "catalog.tool_category.pdf_tools",
  "Developer Tools": "catalog.tool_category.developer_tools"
}, "km") };

const DIRECTORY_CATEGORY_TRANSLATIONS: Record<AppLocale, Record<string, string>> = { en: {}, km: localizeMessageTree({
  "pdf": "catalog.directory_category.pdf",
  "image": "catalog.directory_category.image",
  "qr-barcode": "catalog.directory_category.qr_barcode",
  "date-time": "catalog.directory_category.date_time",
  "calculators": "catalog.directory_category.calculators",
  "productivity": "catalog.directory_category.productivity",
  "developer-tools": "catalog.directory_category.developer_tools",
  "security-encoding": "catalog.directory_category.security_encoding",
  "khmer-tools": "catalog.directory_category.khmer_tools",
  "scanners": "catalog.directory_category.scanners",
  "generators": "catalog.directory_category.generators",
  "file-conversion": "catalog.directory_category.file_conversion"
}, "km") };

const DIRECTORY_CATEGORY_SHORT_TITLE_TRANSLATIONS: Record<
  AppLocale,
  Record<string, string>
> = { en: {}, km: localizeMessageTree({
  "pdf": "catalog.directory_category_short_title.pdf",
  "image": "catalog.directory_category_short_title.image",
  "qr-barcode": "catalog.directory_category_short_title.qr_barcode",
  "date-time": "catalog.directory_category_short_title.date_time",
  "calculators": "catalog.directory_category_short_title.calculators",
  "productivity": "catalog.directory_category_short_title.productivity",
  "developer-tools": "catalog.directory_category_short_title.developer_tools",
  "security-encoding": "catalog.directory_category_short_title.security_encoding",
  "khmer-tools": "catalog.directory_category_short_title.khmer_tools",
  "scanners": "catalog.directory_category_short_title.scanners",
  "generators": "catalog.directory_category_short_title.generators",
  "file-conversion": "catalog.directory_category_short_title.file_conversion"
}, "km") };

const DIRECTORY_CATEGORY_DESCRIPTION_TRANSLATIONS: Record<
  AppLocale,
  Record<string, string>
> = { en: {}, km: localizeMessageTree({
  "pdf": "catalog.directory_category_description.pdf",
  "image": "catalog.directory_category_description.image",
  "qr-barcode": "catalog.directory_category_description.qr_barcode",
  "date-time": "catalog.directory_category_description.date_time",
  "calculators": "catalog.directory_category_description.calculators",
  "productivity": "catalog.directory_category_description.productivity",
  "developer-tools": "catalog.directory_category_description.developer_tools",
  "security-encoding": "catalog.directory_category_description.security_encoding",
  "khmer-tools": "catalog.directory_category_description.khmer_tools",
  "scanners": "catalog.directory_category_description.scanners",
  "generators": "catalog.directory_category_description.generators",
  "file-conversion": "catalog.directory_category_description.file_conversion"
}, "km") };

const DIRECTORY_CATEGORY_INTRO_TRANSLATIONS: Record<
  AppLocale,
  Record<string, string>
> = { en: {}, km: localizeMessageTree({
  "pdf": "catalog.directory_category_intro.pdf",
  "image": "catalog.directory_category_intro.image",
  "qr-barcode": "catalog.directory_category_intro.qr_barcode",
  "date-time": "catalog.directory_category_intro.date_time",
  "calculators": "catalog.directory_category_intro.calculators",
  "productivity": "catalog.directory_category_intro.productivity",
  "developer-tools": "catalog.directory_category_intro.developer_tools",
  "security-encoding": "catalog.directory_category_intro.security_encoding",
  "khmer-tools": "catalog.directory_category_intro.khmer_tools",
  "scanners": "catalog.directory_category_intro.scanners",
  "generators": "catalog.directory_category_intro.generators",
  "file-conversion": "catalog.directory_category_intro.file_conversion"
}, "km") };

export const TOOL_TRANSLATIONS: Record<
  AppLocale,
  Record<string, Pick<LandingTool, "name" | "description">>
> = { en: {}, km: localizeMessageTree({
  "khmer-calendar": {
    "name": "catalog.tool.khmer_calendar.name",
    "description": "catalog.tool.khmer_calendar.description"
  },
  "calculator": {
    "name": "catalog.tool.calculator.name",
    "description": "catalog.tool.calculator.description"
  },
  "qr": {
    "name": "catalog.tool.qr.name",
    "description": "catalog.tool.qr.description"
  },
  "wifi-qr": {
    "name": "catalog.tool.wifi_qr.name",
    "description": "catalog.tool.wifi_qr.description"
  },
  "payback-calculator": {
    "name": "catalog.tool.payback_calculator.name",
    "description": "catalog.tool.payback_calculator.description"
  },
  "expense-tracker": {
    "name": "catalog.tool.expense_tracker.name",
    "description": "catalog.tool.expense_tracker.description"
  },
  "barcode": {
    "name": "catalog.tool.barcode.name",
    "description": "catalog.tool.barcode.description"
  },
  "image-compress": {
    "name": "catalog.tool.image_compress.name",
    "description": "catalog.tool.image_compress.description"
  },
  "image-to-pdf": {
    "name": "catalog.tool.image_to_pdf.name",
    "description": "catalog.tool.image_to_pdf.description"
  },
  "lucky-draw": {
    "name": "catalog.tool.lucky_draw.name",
    "description": "catalog.tool.lucky_draw.description"
  },
  "text-to-voice": {
    "name": "catalog.tool.text_to_voice.name",
    "description": "catalog.tool.text_to_voice.description"
  },
  "khmer-unicode-fixer": {
    "name": "catalog.tool.khmer_unicode_fixer.name",
    "description": "catalog.tool.khmer_unicode_fixer.description"
  },
  "base64": {
    "name": "catalog.tool.base64.name",
    "description": "catalog.tool.base64.description"
  },
  "json-formatter": {
    "name": "catalog.tool.json_formatter.name",
    "description": "catalog.tool.json_formatter.description"
  },
  "jwt-decoder": {
    "name": "catalog.tool.jwt_decoder.name",
    "description": "catalog.tool.jwt_decoder.description"
  },
  "url-encoder": {
    "name": "catalog.tool.url_encoder.name",
    "description": "catalog.tool.url_encoder.description"
  },
  "uuid-generator": {
    "name": "catalog.tool.uuid_generator.name",
    "description": "catalog.tool.uuid_generator.description"
  },
  "password-generator": {
    "name": "catalog.tool.password_generator.name",
    "description": "catalog.tool.password_generator.description"
  },
  "unix-timestamp": {
    "name": "catalog.tool.unix_timestamp.name",
    "description": "catalog.tool.unix_timestamp.description"
  },
  "cron-explainer": {
    "name": "catalog.tool.cron_explainer.name",
    "description": "catalog.tool.cron_explainer.description"
  },
  "regex-tester": {
    "name": "catalog.tool.regex_tester.name",
    "description": "catalog.tool.regex_tester.description"
  },
  "hash-generator": {
    "name": "catalog.tool.hash_generator.name",
    "description": "catalog.tool.hash_generator.description"
  },
  "stopwatch": {
    "name": "catalog.tool.stopwatch.name",
    "description": "catalog.tool.stopwatch.description"
  },
  "scan-qr": {
    "name": "catalog.tool.scan_qr.name",
    "description": "catalog.tool.scan_qr.description"
  },
  "scan-barcode": {
    "name": "catalog.tool.scan_barcode.name",
    "description": "catalog.tool.scan_barcode.description"
  },
  "kla-klok": {
    "name": "catalog.tool.kla_klok.name",
    "description": "catalog.tool.kla_klok.description"
  },
  "youtube-downloader": {
    "name": "catalog.tool.youtube_downloader.name",
    "description": "catalog.tool.youtube_downloader.description"
  },
  "chlatwork-link": {
    "name": "catalog.tool.chlatwork_link.name",
    "description": "catalog.tool.chlatwork_link.description"
  },
  "pdf-to-jpg": {
    "name": "catalog.tool.pdf_to_jpg.name",
    "description": "catalog.tool.pdf_to_jpg.description"
  },
  "merge-pdf": {
    "name": "catalog.tool.merge_pdf.name",
    "description": "catalog.tool.merge_pdf.description"
  },
  "split-pdf": {
    "name": "catalog.tool.split_pdf.name",
    "description": "catalog.tool.split_pdf.description"
  },
  "compress-pdf": {
    "name": "catalog.tool.compress_pdf.name",
    "description": "catalog.tool.compress_pdf.description"
  },
  "remove-pdf-pages": {
    "name": "catalog.tool.remove_pdf_pages.name",
    "description": "catalog.tool.remove_pdf_pages.description"
  },
  "reorder-pdf-pages": {
    "name": "catalog.tool.reorder_pdf_pages.name",
    "description": "catalog.tool.reorder_pdf_pages.description"
  },
  "html-to-pdf": {
    "name": "catalog.tool.html_to_pdf.name",
    "description": "catalog.tool.html_to_pdf.description"
  },
  "text-to-pdf": {
    "name": "catalog.tool.text_to_pdf.name",
    "description": "catalog.tool.text_to_pdf.description"
  },
  "invoice-to-pdf": {
    "name": "catalog.tool.invoice_to_pdf.name",
    "description": "catalog.tool.invoice_to_pdf.description"
  }
}, "km") };

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
