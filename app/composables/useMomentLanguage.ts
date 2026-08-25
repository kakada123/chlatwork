import {
  MOMENT_COPY,
  type MomentLocale,
} from "~/data/moment-locales";

export function useMomentLanguage() {
  const route = useRoute();
  const cookie = useCookie<MomentLocale>("moment-locale", {
    default: () => (route.query.lang === "km" ? "km" : "en"),
    sameSite: "lax",
  });
  const locale = computed<MomentLocale>(() => {
    if (route.query.lang === "km") return "km";
    if (route.query.lang === "en") return "en";
    return cookie.value === "km" ? "km" : "en";
  });
  const copy = computed(() => MOMENT_COPY[locale.value]);
  const isKhmer = computed(() => locale.value === "km");

  watch(
    () => route.query.lang,
    (value) => {
      if (value === "km") cookie.value = "km";
      if (value === "en") cookie.value = "en";
    },
    { immediate: true },
  );

  async function setMomentLocale(nextLocale: MomentLocale) {
    cookie.value = nextLocale;
    const query = { ...route.query };
    if (nextLocale === "km") query.lang = "km";
    else delete query.lang;
    await navigateTo({ path: route.path, query }, { replace: true });
  }

  function localizeMomentPath(path: string) {
    if (locale.value !== "km") return path;
    return `${path}${path.includes("?") ? "&" : "?"}lang=km`;
  }

  return { locale, copy, isKhmer, setMomentLocale, localizeMomentPath };
}
