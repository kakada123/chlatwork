import { createI18n } from "vue-i18n";
import english from "../locales/en/index.ts";
import khmer from "../locales/km/index.ts";

export type AppLanguage = "en" | "km";
export type TranslationKey = keyof typeof english;
export type TranslationValues = Record<string, unknown> | number;

const messages: Record<AppLanguage, Readonly<Record<string, string>>> = { en: english, km: khmer };

type MessageContext = {
  named: (name: string) => unknown;
  normalize: (parts: string[]) => string;
};

function prepareMessages(catalog: Readonly<Record<string, string>>) {
  return Object.fromEntries(Object.entries(catalog).map(([key, text]) => [key, (context: MessageContext) =>
    context.normalize(text.split(/(\{[A-Za-z_][\w]*\})/g).map(part => {
      if (!/^\{[A-Za-z_][\w]*\}$/.test(part)) return part;
      const value = context.named(part.slice(1, -1));
      return value === undefined ? part : String(value ?? "");
    })),
  ]));
}

const prepared = { en: prepareMessages(english), km: prepareMessages(khmer) };
function createComposer(locale: AppLanguage) {
  return createI18n({
    legacy: false,
    locale,
    fallbackLocale: "en",
    messages: prepared,
    // Flat semantic keys remain exact own-property lookups, including during fallback.
    messageResolver: (catalog, key) => catalog && typeof catalog === "object" && Object.hasOwn(catalog, key)
      ? (catalog as Record<string, (context: MessageContext) => string>)[key]!
      : null,
    missingWarn: false,
    fallbackWarn: false,
  }).global;
}

const composers = new Map<AppLanguage, ReturnType<typeof createComposer>>();

function composerFor(locale: AppLanguage) {
  let composer = composers.get(locale);
  if (!composer) {
    composer = createComposer(locale);
    composers.set(locale, composer);
  }
  return composer;
}

/** Resolve an explicit locale per call so concurrent server requests cannot share mutable language state. */
export function translateMessage(locale: AppLanguage, key: string, values?: TranslationValues): string {
  if (!hasTranslation(locale, key) && !hasTranslation("en", key)) return key;
  // Message functions preserve literal @, pipes and braces in existing copy without runtime code compilation.
  if (typeof values === "number") return composerFor(locale).t(key, values);
  return composerFor(locale).t(key, Object.fromEntries(Object.entries(values ?? {})));
}

export function localizeMessageTree<T>(tree: T, locale: AppLanguage): T {
  if (typeof tree === "string") return translateMessage(locale, tree) as T;
  if (Array.isArray(tree)) return tree.map(value => localizeMessageTree(value, locale)) as T;
  if (tree && typeof tree === "object") return Object.fromEntries(Object.entries(tree).map(([key, value]) => [key, localizeMessageTree(value, locale)])) as T;
  return tree;
}

export function hasTranslation(locale: AppLanguage, key: string): boolean {
  return Object.hasOwn(messages[locale], key);
}
