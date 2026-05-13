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
    const systemPreference = window.matchMedia?.("(prefers-color-scheme: dark)");
    const prefersDark = Boolean(systemPreference?.matches);
    const mode =
      storedMode === "light" || storedMode === "dark"
        ? storedMode
        : prefersDark
          ? "dark"
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

export default defineNuxtConfig({
  ssr: true,
  compatibilityDate: "2026-05-07",
  runtimeConfig: {
    narakeetApiKey: nodeEnv.NARAKEET_API_KEY || "",
  },
  modules: ["@nuxtjs/tailwindcss", "@nuxtjs/sitemap"],
  sitemap: {
    siteUrl: "https://chlatwork.com",
  },
  css: ["~/assets/css/main.css"],

  app: {
    head: {
      title: "ChlatWork",
      meta: [
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        { name: "color-scheme", content: "light dark" },
        { name: "theme-color", content: "#f9fafb" },
        { name: "description", content: "Smart tools for everyday work." },

        // Open Graph (FB / Zalo / Telegram previews)
        { property: "og:site_name", content: "ChlatWork" },
        { property: "og:type", content: "website" },
        { property: "og:title", content: "ChlatWork" },
        {
          property: "og:description",
          content: "Smart tools for everyday work.",
        },

        // Twitter
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: "ChlatWork" },
        {
          name: "twitter:description",
          content: "Smart tools for everyday work.",
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
          src: "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4280865455316436",
          crossorigin: "anonymous",
        },
      ],
    },
  },

  nitro: { preset: "vercel" },
});
