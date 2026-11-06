import { useLanguage } from "./useLanguage";
import { translateMessage, type TranslationValues } from "../lib/i18n";

type LocaleRef = { readonly value: boolean | "en" | "km" | undefined };

/** Components use semantic message keys while sharing the existing app-locale preference. */
export function useAppI18n(override?: LocaleRef) {
  const locale = override ?? useLanguage().locale;
  const t = (key: string, values?: TranslationValues) => translateMessage(
    locale.value === false || locale.value === "en" ? "en" : "km",
    key,
    values,
  );
  return { t };
}
