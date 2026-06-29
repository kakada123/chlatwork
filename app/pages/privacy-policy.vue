<script setup lang="ts">
import { openPrivacyCookieSettings } from "~/lib/cookie-notice";
import { LOCAL_PROCESSING_PRIVACY_NOTE } from "~/lib/privacy-copy";

const title = "Privacy Policy - ChlatWork";
const description =
  "How ChlatWork handles browser-based processing, data collection, cookies, analytics, ads, and third-party services.";
const reviewedAt = "2026-06-29";

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogType: "website",
  ogUrl: "https://chlatwork.com/privacy-policy",
  twitterCard: "summary_large_image",
  twitterTitle: title,
  twitterDescription: description,
});

useHead({
  link: [{ rel: "canonical", href: "https://chlatwork.com/privacy-policy" }],
  script: [
    {
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: title,
        url: "https://chlatwork.com/privacy-policy",
        description,
        dateModified: reviewedAt,
        publisher: {
          "@type": "Organization",
          name: "ChlatWork",
          url: "https://chlatwork.com",
        },
      }),
    },
  ],
});
</script>

<template>
  <main class="mx-auto w-full max-w-[1440px] space-y-8">
    <header class="space-y-2">
      <h1 class="text-2xl font-bold">Privacy Policy</h1>
      <p class="max-w-3xl text-gray-600 dark:text-white/70">
        ChlatWork aims to collect as little data as practical while providing
        useful browser tools. This page explains local processing, cookies,
        analytics, advertising, third-party services, and your choices.
      </p>
      <p class="text-sm text-gray-500 dark:text-white/50">
        Last updated: June 29, 2026
      </p>
    </header>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">What data ChlatWork collects</h2>
      <p class="text-gray-700 dark:text-white/75">
        We may collect basic, non-identifying usage and reliability information
        such as page views, browser type, device type, referring pages,
        approximate location derived from IP address, and error information.
        This helps us understand which tools are useful and where the site needs
        improvement.
      </p>
      <p class="text-gray-700 dark:text-white/75">
        If you contact us by email, we receive the information you choose to
        send, such as your email address, message, screenshots, and bug details.
      </p>
      <p class="text-gray-700 dark:text-white/75">
        We do not sell personal information.
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">Browser-based tools and local processing</h2>
      <p class="text-gray-700 dark:text-white/75">
        Many ChlatWork tools are designed to run directly in your browser,
        including common PDF, image, QR, barcode, calculator, and developer
        tools.
      </p>
      <p class="text-gray-700 dark:text-white/75">
        {{ LOCAL_PROCESSING_PRIVACY_NOTE }}
      </p>
      <p class="text-gray-700 dark:text-white/75">
        Some features may require server-side processing when browser-only work
        is not practical, such as online text-to-voice generation or shared
        result links. In those cases, ChlatWork aims to process only what is
        needed to provide the feature.
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">Uploaded files and images</h2>
      <p class="text-gray-700 dark:text-white/75">
        For tools that process files locally, selected files are read by your
        browser so the tool can create the result on your device. We do not
        intentionally store those files or inputs on our server.
      </p>
      <p class="text-gray-700 dark:text-white/75">
        You should still review downloaded results before using them for
        business, school, customer, printing, payment, inventory, or public
        workflows.
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">Cookies, analytics, and ads</h2>
      <p class="text-gray-700 dark:text-white/75">
        ChlatWork may use cookies, local storage, pixels, web beacons, IP
        addresses, or similar technologies for site functionality, security,
        analytics, and advertising.
      </p>
      <p class="text-gray-700 dark:text-white/75">
        ChlatWork uses Vercel Web Analytics to understand general site usage and
        reliability. Vercel Web Analytics is designed to provide privacy-minded
        usage information and does not use tracking cookies.
      </p>
      <p class="text-gray-700 dark:text-white/75">
        ChlatWork may display ads using Google AdSense or other advertising
        partners. Third-party vendors, including Google, may use cookies, web
        beacons, IP addresses, or other identifiers to serve ads, limit repeated
        ads, measure ad performance, prevent fraud, and show personalized or
        non-personalized ads.
      </p>
      <p class="text-gray-700 dark:text-white/75">
        Google may use advertising cookies to serve ads based on your prior
        visits to ChlatWork or other websites. You can learn how Google uses
        information from partner sites at
        <a
          href="https://policies.google.com/technologies/partner-sites"
          target="_blank"
          rel="noopener noreferrer"
          class="font-medium text-gray-900 underline dark:text-white"
        >
          policies.google.com/technologies/partner-sites </a
        >.
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">Third-party services</h2>
      <p class="text-gray-700 dark:text-white/75">
        ChlatWork may use third-party services for hosting, analytics,
        advertising, code libraries, and optional tool features. These providers
        may process limited technical information according to their own
        policies.
      </p>
      <ul class="list-disc space-y-1 pl-5 text-gray-700 dark:text-white/75">
        <li>Vercel for hosting, deployment, and web analytics.</li>
        <li>Google AdSense or Google ad services for advertising.</li>
        <li>Browser-side JavaScript libraries for PDF, image, QR, barcode, and utility processing.</li>
        <li>API providers only where a specific feature cannot run fully in the browser.</li>
      </ul>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">Your choices</h2>
      <p class="text-gray-700 dark:text-white/75">
        You can block or delete cookies and local storage through your browser
        settings. Some preferences, such as color mode, language, or cookie
        notice state, may reset if local storage is cleared.
      </p>
      <p class="text-gray-700 dark:text-white/75">
        You can manage personalized Google advertising in
        <a
          href="https://myadcenter.google.com/"
          target="_blank"
          rel="noopener noreferrer"
          class="font-medium text-gray-900 underline dark:text-white"
        >
          Google My Ad Center
        </a>
        and learn more about Google advertising cookies at
        <a
          href="https://policies.google.com/technologies/ads"
          target="_blank"
          rel="noopener noreferrer"
          class="font-medium text-gray-900 underline dark:text-white"
        >
          Google Advertising Technologies </a
        >.
      </p>
      <p class="text-gray-700 dark:text-white/75">
        For more detail about cookies, read the
        <NuxtLink
          to="/cookies"
          class="font-medium text-gray-900 underline dark:text-white"
        >
          Cookie Policy </NuxtLink
        >.
      </p>
      <button
        type="button"
        class="inline-flex items-center justify-center rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-800 transition hover:bg-gray-50 dark:border-white/15 dark:text-white dark:hover:bg-white/10"
        @click="openPrivacyCookieSettings"
      >
        Privacy & cookie settings
      </button>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">Data retention</h2>
      <p class="text-gray-700 dark:text-white/75">
        For browser-only tools, ChlatWork does not receive the files or input,
        so there is no server copy to retain. For server-based features and
        operational logs, we aim to retain data only as long as needed for the
        feature, security, reliability, or legal requirements.
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">Children's privacy</h2>
      <p class="text-gray-700 dark:text-white/75">
        ChlatWork is not directed to children under 13. We do not knowingly
        collect personal information from children under 13.
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">Changes to this policy</h2>
      <p class="text-gray-700 dark:text-white/75">
        We may update this Privacy Policy as the site, tools, advertising setup,
        or legal requirements change. The latest version will be posted on this
        page with an updated date.
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">Contact</h2>
      <p class="text-gray-700 dark:text-white/75">
        If you have privacy questions, contact us through the
        <NuxtLink
          to="/contact"
          class="font-medium text-gray-900 underline dark:text-white"
        >
          Contact page </NuxtLink
        >.
      </p>
    </section>
  </main>
</template>
