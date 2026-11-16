import { computed } from "vue";
import { useLanguage } from "./useLanguage";

/** Explicit calendar language links override the preference without mutating cookies during rendering. */
export function useCalendarLanguage() {
  const { locale, isKhmer: preferredKhmer } = useLanguage();
  const route = useRoute(),
    router = useRouter();
  const isKhmer = computed({
    get: () =>
      route.query.lang === "en"
        ? false
        : route.query.lang === "km"
          ? true
          : preferredKhmer.value,
    set: (value: boolean) => {
      const next = value ? "km" : "en";
      locale.value = next;
      // Keep an explicit language link aligned with the header switch and browser history.
      if (route.query.lang === "en" || route.query.lang === "km") {
        void router.replace({ query: { ...route.query, lang: next } });
      }
    },
  });
  return {
    isKhmer,
    switchLanguage: () => {
      isKhmer.value = !isKhmer.value;
    },
  };
}
