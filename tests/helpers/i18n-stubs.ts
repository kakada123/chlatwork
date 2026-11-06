import { ref } from "vue";
import { translateMessage, type TranslationValues } from "../../app/lib/i18n.ts";

export function createI18nStub(locale = ref<boolean | "en" | "km">(false)) {
  return {
    t: (key: string, values?: TranslationValues) => translateMessage(locale.value === false || locale.value === "en" ? "en" : "km", key, values),
  };
}
