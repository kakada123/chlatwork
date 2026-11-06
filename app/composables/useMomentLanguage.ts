import { useLanguage } from "~/composables/useLanguage";
import {
  MOMENT_COPY,
  type MomentLocale,
} from "~/data/moment-locales";

export function useMomentLanguage() {
  const route = useRoute();
  const { locale: appLocale } = useLanguage();
  const isPublicView = computed(() => /^\/(?:m|moment|i)\//.test(route.path));
  const locale = computed<MomentLocale>(() => {
    // Shared celebrations retain their link language; editor chrome follows the site switch.
    if (isPublicView.value && route.query.lang === "km") return "km";
    if (isPublicView.value && route.query.lang === "en") return "en";
    return appLocale.value === "en" ? "en" : "km";
  });
  const copy = computed(() => MOMENT_COPY[locale.value]);
  const isKhmer = computed(() => locale.value === "km");

  async function setMomentLocale(nextLocale: MomentLocale) {
    const query = { ...route.query };
    if (isPublicView.value) query.lang = nextLocale;
    else {
      appLocale.value = nextLocale;
      if (!query.lang) return;
      delete query.lang;
    }
    await navigateTo({ path: route.path, query }, { replace: true });
  }

  function localizeMomentPath(path: string) {
    // Both languages must be explicit now that the site's default is Khmer.
    const url = new URL(path, "https://moment.invalid");
    url.searchParams.set("lang", locale.value);
    return `${url.pathname}${url.search}${url.hash}`;
  }

  return { locale, copy, isKhmer, setMomentLocale, localizeMomentPath };
}
