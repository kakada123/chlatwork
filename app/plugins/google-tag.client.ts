import { nextTick } from "vue";
import {
  GOOGLE_CONSENT_UPDATE_EVENT,
  type GoogleConsentUpdate,
  updateGoogleConsent,
} from "~/lib/google-consent";

const productionHostname = "chlatwork.com";

export default defineNuxtPlugin((nuxtApp) => {
  if (
    import.meta.dev ||
    window.location.hostname !== productionHostname
  ) {
    return;
  }

  const measurementId = useRuntimeConfig().public.googleMeasurementId;
  const router = useRouter();
  let lastTrackedPath = "";

  const trackRoute = (fullPath: string) => {
    if (!window.gtag || fullPath === lastTrackedPath) {
      return;
    }

    lastTrackedPath = fullPath;
    window.gtag("event", "page_view", {
      page_path: fullPath,
      page_location: `${window.location.origin}${fullPath}`,
      page_title: document.title,
      send_to: measurementId,
    });
  };

  const handleConsentUpdate = (event: Event) => {
    const consentEvent = event as CustomEvent<GoogleConsentUpdate>;

    if (consentEvent.detail) {
      updateGoogleConsent(consentEvent.detail);
    }
  };

  window.addEventListener(
    GOOGLE_CONSENT_UPDATE_EVENT,
    handleConsentUpdate,
  );

  nuxtApp.hook("app:mounted", () => {
    nextTick(() => trackRoute(router.currentRoute.value.fullPath));
  });

  router.afterEach((to) => {
    nextTick(() => trackRoute(to.fullPath));
  });
});
