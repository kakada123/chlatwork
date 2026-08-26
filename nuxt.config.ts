import { PUBLIC_SITEMAP_PATHS } from "./app/data/site-routes";
import { TOOL_GUIDE_ROUTES } from "./app/data/tool-guide-routes";

const nodeEnv =
  (
    globalThis as typeof globalThis & {
      process?: { env?: Record<string, string | undefined> };
    }
  ).process?.env ?? {};

const googleMeasurementId = "G-Y3CGX9GBQN";
const isProduction = nodeEnv.NODE_ENV === "production";

const googleTagConsentScript = `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
window.gtag = window.gtag || gtag;
gtag("consent", "default", {
  ad_storage: "denied",
  ad_user_data: "denied",
  ad_personalization: "denied",
  analytics_storage: "denied",
  wait_for_update: 500
});
gtag("js", new Date());
gtag("config", "${googleMeasurementId}", { send_page_view: false });
`;

const colorModeScript = `
(() => {
  const storageKey = "chlatwork-color-mode";
  const lightThemeColor = "#f9fafb";
  const darkThemeColor = "#1c1c1e";

  try {
    const root = document.documentElement;
    const storedMode = window.localStorage.getItem(storageKey);
    const mode =
      storedMode === "light" || storedMode === "dark"
        ? storedMode
        : "light";
    const isDark = mode === "dark";

    root.classList.toggle("dark", isDark);
    root.dataset.theme = mode;
    root.style.colorScheme = mode;

    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", isDark ? darkThemeColor : lightThemeColor);
  } catch (_) {}
})();
`;

const securityHeaders = {
  "Permissions-Policy":
    "camera=(self), microphone=(), geolocation=(), payment=(), usb=(), serial=(), clipboard-read=(), clipboard-write=(self)",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Strict-Transport-Security": "max-age=31536000",
  "X-Content-Type-Options": "nosniff",
  "X-DNS-Prefetch-Control": "on",
  "X-Frame-Options": "DENY",
};

const apiHeaders = {
  ...securityHeaders,
  "X-Robots-Tag": "noindex, nofollow",
};

const legacyToolGuideRedirectRules = Object.fromEntries(
  TOOL_GUIDE_ROUTES.map((route) => [
    route.path,
    {
      redirect: {
        to: route.toolPath,
        statusCode: 301,
      },
      headers: securityHeaders,
    },
  ]),
);

export default defineNuxtConfig({
  ssr: true,
  // CI and restricted workspaces can isolate generated artifacts from shared caches.
  buildDir: nodeEnv.CHLATWORK_NUXT_BUILD_DIR || undefined,
  compatibilityDate: "2026-05-07",
  hooks: {
    "prepare:types"(options) {
      options.tsConfig.compilerOptions ||= {};
      options.tsConfig.compilerOptions.allowImportingTsExtensions = true;
    },
  },
  devServer: {
    port: 3001,
  },
  runtimeConfig: {
    authApiBaseUrl: nodeEnv.NUXT_AUTH_API_BASE_URL || "",
    narakeetApiKey: nodeEnv.NARAKEET_API_KEY || "",
    public: {
      adsenseClientId: "ca-pub-3732801458368248",
      googleClientId: nodeEnv.NUXT_PUBLIC_GOOGLE_CLIENT_ID || "",
      googleMeasurementId,
      telegramClientId: nodeEnv.NUXT_PUBLIC_TELEGRAM_CLIENT_ID || "",
    },
  },
  modules: ["@nuxtjs/tailwindcss", "@nuxtjs/sitemap", "@vercel/speed-insights"],
  sitemap: {
    siteUrl: "https://chlatwork.com",
    // Keep sitemap discovery explicit so redirect-only and catch-all pages do not leak into Google.
    excludeAppSources: ["nuxt:pages"],
    urls: PUBLIC_SITEMAP_PATHS,
    exclude: ["/privacy"],
  },
  css: ["~/assets/css/main.css"],
  routeRules: {
    "/**": {
      headers: securityHeaders,
    },
    "/api/**": {
      headers: apiHeaders,
    },
    ...legacyToolGuideRedirectRules,
    "/km": {
      redirect: {
        to: "/",
        statusCode: 301,
      },
      headers: securityHeaders,
    },
    "/tools/jpg-to-pdf": {
      redirect: {
        to: "/tools/image-to-pdf",
        statusCode: 301,
      },
      headers: securityHeaders,
    },
    "/how-to-convert-jpg-to-pdf": {
      redirect: {
        to: "/tools/image-to-pdf",
        statusCode: 301,
      },
      headers: securityHeaders,
    },
    "/privacy": {
      redirect: {
        to: "/privacy-policy",
        statusCode: 301,
      },
      headers: securityHeaders,
    },
  },

  app: {
    head: {
      title: "ChlatWork",
      meta: [
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        { name: "color-scheme", content: "dark light" },
        { name: "theme-color", content: "#1c1c1e" },
        {
          name: "description",
          content:
            "Free online tools for documents, images, QR codes, barcodes, dates, calculators, and productivity.",
        },
        {
          name: "google-adsense-account",
          content: "ca-pub-3732801458368248",
        },

        // Open Graph (FB / Zalo / Telegram previews)
        { property: "og:site_name", content: "ChlatWork" },
        { property: "og:type", content: "website" },
        { property: "og:title", content: "ChlatWork" },
        {
          property: "og:description",
          content:
            "Free online tools for documents, images, QR codes, barcodes, dates, calculators, and productivity.",
        },

        // Twitter
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: "ChlatWork" },
        {
          name: "twitter:description",
          content:
            "Free online tools for documents, images, QR codes, barcodes, dates, calculators, and productivity.",
        },
      ],
      link: [
        { rel: "icon", href: "/favicon.ico?v=3" },
        { rel: "icon", type: "image/svg+xml", href: "/favicon.svg?v=3" },
        {
          rel: "icon",
          type: "image/png",
          sizes: "512x512",
          href: "/favicon.png?v=3",
        },
        {
          rel: "apple-touch-icon",
          sizes: "180x180",
          href: "/apple-touch-icon.png?v=3",
        },
      ],
      script: [
        {
          key: "color-mode-init",
          innerHTML: colorModeScript,
          tagPriority: "critical",
        },
        ...(isProduction
          ? [
              {
                key: "google-consent-default",
                children: googleTagConsentScript,
                tagPriority: "critical",
              },
              {
                key: "google-tag",
                async: true,
                src: `https://www.googletagmanager.com/gtag/js?id=${googleMeasurementId}`,
              },
            ]
          : []),
      ],
    },
  },

  nitro: {
    preset: "vercel",
    output: nodeEnv.CHLATWORK_NITRO_OUTPUT_DIR
      ? { dir: nodeEnv.CHLATWORK_NITRO_OUTPUT_DIR }
      : undefined,
  },
});
