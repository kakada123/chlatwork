import { PUBLIC_SITEMAP_PATHS } from "./app/data/site-routes";

const nodeEnv =
  (
    globalThis as typeof globalThis & {
      process?: { env?: Record<string, string | undefined> };
    }
  ).process?.env ?? {};

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
        : "dark";
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
    "camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), clipboard-read=(), clipboard-write=(self)",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Strict-Transport-Security": "max-age=31536000",
  "X-Content-Type-Options": "nosniff",
  "X-DNS-Prefetch-Control": "on",
  "X-Frame-Options": "DENY",
};

export default defineNuxtConfig({
  ssr: true,
  compatibilityDate: "2026-05-07",
  devServer: {
    port: 3001,
  },
  runtimeConfig: {
    narakeetApiKey: nodeEnv.NARAKEET_API_KEY || "",
  },
  modules: ["@nuxtjs/tailwindcss", "@nuxtjs/sitemap"],
  sitemap: {
    siteUrl: "https://chlatwork.com",
    urls: PUBLIC_SITEMAP_PATHS,
    exclude: ["/privacy"],
  },
  css: ["~/assets/css/main.css"],
  routeRules: {
    "/**": {
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
        { rel: "icon", href: "/favicon.ico" },
        { rel: "icon", type: "image/svg+xml", href: "/favicon.svg?v=2" },
        { rel: "icon", type: "image/png", href: "/favicon.png?v=2" },
        { rel: "apple-touch-icon", href: "/apple-touch-icon.png?v=2" },
      ],
      script: [
        {
          children: colorModeScript,
        },
        {
          async: true,
          src: "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3732801458368248",
          crossorigin: "anonymous",
        },
      ],
    },
  },

  nitro: { preset: "vercel" },
});
