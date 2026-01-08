export default defineNuxtConfig({
  ssr: true,
  modules: ["@nuxtjs/tailwindcss"],
  css: ["~/assets/css/main.css"],

  app: {
    head: {
      title: "ChlatWork",
      meta: [
        { name: "viewport", content: "width=device-width, initial-scale=1" },
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
    },
  },

  nitro: { preset: "vercel" },
});
