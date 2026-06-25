import { nextTick } from "vue";

const productionHostname = "chlatwork.com";
const googleTagScriptUrl = (measurementId: string) =>
  `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(
    measurementId,
  )}`;

const getPagePath = (fullPath?: string) =>
  fullPath || `${window.location.pathname}${window.location.search}`;

const trackPageView = (fullPath?: string) => {
  const pagePath = getPagePath(fullPath);

  window.gtag?.("event", "page_view", {
    page_path: pagePath,
    page_location: `${window.location.origin}${pagePath}`,
    page_title: document.title,
  });
};

const ensureGoogleTagScript = (measurementId: string) => {
  const scriptUrl = googleTagScriptUrl(measurementId);
  const hasGoogleTagScript = Array.from(document.scripts).some(
    (script) => script.src === scriptUrl,
  );

  if (hasGoogleTagScript) {
    return;
  }

  const script = document.createElement("script");
  script.async = true;
  script.src = scriptUrl;
  document.head.appendChild(script);
};

export default defineNuxtPlugin(() => {
  const measurementId = useRuntimeConfig().public.gaMeasurementId?.trim();

  if (
    import.meta.dev ||
    !measurementId ||
    window.location.hostname !== productionHostname
  ) {
    return;
  }

  window.dataLayer = window.dataLayer || [];
  const pushToDataLayer: GoogleTagFunction = (...args) => {
    window.dataLayer?.push(args);
  };

  window.gtag = window.gtag || pushToDataLayer;

  ensureGoogleTagScript(measurementId);
  window.gtag("js", new Date());
  window.gtag("config", measurementId, {
    send_page_view: false,
  });

  const router = useRouter();
  let lastTrackedPath = "";

  const trackRoute = (fullPath?: string) => {
    const pagePath = getPagePath(fullPath);

    if (pagePath === lastTrackedPath) {
      return;
    }

    lastTrackedPath = pagePath;
    trackPageView(pagePath);
  };

  nextTick(() => {
    trackRoute(router.currentRoute.value.fullPath);
  });

  router.afterEach((to) => {
    nextTick(() => {
      trackRoute(to.fullPath);
    });
  });
});
