import { ref } from "vue";
import { createI18nStub } from "./i18n-stubs.ts";

// Component harnesses exercise canonical values without booting Nuxt.
export const productCopyStub = {
  useProductCopy: () => ({ productText: (text: string) => text, productCategoryText: (label: string) => label }),
};
export const appI18nStub = {
  useAppI18n: (locale?: { readonly value: boolean | "en" | "km" }) => createI18nStub(locale ?? ref(false)),
};
export const productCopyStubUrl = `data:text/javascript,${encodeURIComponent('export const useProductCopy = () => ({ productText: text => text, productCategoryText: label => label });')}`;
export const languageStubUrl = `data:text/javascript,${encodeURIComponent('export const useLanguage = () => ({ isKhmer: { value: false } });')}`;
const translatorUrl = new URL("../../app/lib/i18n.ts", import.meta.url).href;
export const appI18nStubUrl = `data:text/javascript,${encodeURIComponent(`import { translateMessage } from ${JSON.stringify(translatorUrl)};
export const useAppI18n = (locale = { value: false }) => ({ t: (key, params) => translateMessage(locale.value === false || locale.value === 'en' ? 'en' : 'km', key, params) });`)}`;
