import { nextTick } from "vue";

const productionHostname = "chlatwork.com";

const getPagePath = (fullPath?: string) =>
  fullPath || `${window.location.pathname}${window.location.search}`;

const trackPageView = (measurementId: string, fullPath?: string) => {
  const pagePath = getPagePath(fullPath);

  window.gtag?.("config", measurementId, {
    page_path: pagePath,
    page_location: window.location.href,
    page_title: document.title,
  });
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

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(
    measurementId,
  )}`;
  document.head.appendChild(script);

  window.gtag("js", new Date());

  const router = useRouter();
  let lastTrackedPath = "";

  const trackRoute = (fullPath?: string) => {
    const pagePath = getPagePath(fullPath);

    if (pagePath === lastTrackedPath) {
      return;
    }

    lastTrackedPath = pagePath;
    trackPageView(measurementId, pagePath);
  };

  trackRoute(router.currentRoute.value.fullPath);

  router.afterEach((to) => {
    nextTick(() => {
      trackRoute(to.fullPath);
    });
  });
});
