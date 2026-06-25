import { nextTick } from "vue";

const productionHostname = "chlatwork.com";
const metaPixelScriptUrl = "https://connect.facebook.net/en_US/fbevents.js";

const getPagePath = (fullPath?: string) =>
  fullPath || `${window.location.pathname}${window.location.search}`;

const installMetaPixelStub = () => {
  if (window.fbq) {
    return;
  }

  const fbq: MetaPixelFunction = (...args) => {
    if (fbq.callMethod) {
      fbq.callMethod(...args);
      return;
    }

    fbq.queue?.push(args);
  };

  window.fbq = fbq;

  if (!window._fbq) {
    window._fbq = fbq;
  }

  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = "2.0";
  fbq.queue = [];
};

const ensureMetaPixelScript = () => {
  const hasMetaPixelScript = Array.from(document.scripts).some(
    (script) => script.src === metaPixelScriptUrl,
  );

  if (hasMetaPixelScript) {
    return;
  }

  const script = document.createElement("script");
  script.async = true;
  script.src = metaPixelScriptUrl;

  const firstScript = document.getElementsByTagName("script")[0];

  if (firstScript?.parentNode) {
    firstScript.parentNode.insertBefore(script, firstScript);
    return;
  }

  document.head.appendChild(script);
};

export default defineNuxtPlugin((nuxtApp) => {
  const pixelId = useRuntimeConfig().public.metaPixelId?.trim();

  if (
    import.meta.dev ||
    !pixelId ||
    window.location.hostname !== productionHostname
  ) {
    return;
  }

  installMetaPixelStub();
  ensureMetaPixelScript();

  if (window.__chlatworkMetaPixelId !== pixelId) {
    window.fbq?.("init", pixelId);
    window.__chlatworkMetaPixelId = pixelId;
  }

  const router = useRouter();
  let lastTrackedPath = "";

  const trackRoute = (fullPath?: string) => {
    const pagePath = getPagePath(fullPath);

    if (pagePath === lastTrackedPath) {
      return;
    }

    lastTrackedPath = pagePath;
    window.fbq?.("track", "PageView");
  };

  nuxtApp.hook("app:mounted", () => {
    nextTick(() => {
      trackRoute(router.currentRoute.value.fullPath);
    });
  });

  router.afterEach((to) => {
    nextTick(() => {
      trackRoute(to.fullPath);
    });
  });
});
