import {
  CERTIFIED_AD_CONSENT_READY_EVENT,
  listenForCertifiedAdConsent,
} from "~/lib/ad-consent";
import { isMonetizableRoute } from "~/data/site-routes";

const ADSENSE_SCRIPT_ID = "chlatwork-adsense";

export function useAdSense() {
  const route = useRoute();
  const { isKhmer } = useLanguage();
  const adsenseClientId = useRuntimeConfig().public.adsenseClientId;
  const hasCertifiedConsent = ref(false);

  const canLoadAds = computed(
    () =>
      hasCertifiedConsent.value &&
      Boolean(adsenseClientId) &&
      isMonetizableRoute(route.path, isKhmer.value ? "km" : "en"),
  );

  const removeAdScript = () => {
    document.getElementById(ADSENSE_SCRIPT_ID)?.remove();
  };

  const syncAdScript = () => {
    if (!canLoadAds.value) {
      removeAdScript();
      return;
    }

    if (document.getElementById(ADSENSE_SCRIPT_ID)) {
      return;
    }

    const script = document.createElement("script");
    script.id = ADSENSE_SCRIPT_ID;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.src =
      "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js" +
      `?client=${encodeURIComponent(adsenseClientId)}`;
    document.head.appendChild(script);
  };

  const markCertifiedConsentReady = () => {
    hasCertifiedConsent.value = true;
    syncAdScript();
  };

  onMounted(() => {
    window.addEventListener(
      CERTIFIED_AD_CONSENT_READY_EVENT,
      markCertifiedConsentReady,
    );
    listenForCertifiedAdConsent(markCertifiedConsentReady);
  });

  watch(
    () => [route.path, isKhmer.value, hasCertifiedConsent.value],
    () => syncAdScript(),
  );

  onBeforeUnmount(() => {
    window.removeEventListener(
      CERTIFIED_AD_CONSENT_READY_EVENT,
      markCertifiedConsentReady,
    );
    removeAdScript();
  });

  return {
    canLoadAds: readonly(canLoadAds),
  };
}
