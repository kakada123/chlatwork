<script setup lang="ts">
import { LOCAL_PROCESSING_PRIVACY_NOTE } from "~/lib/privacy-copy";

useSeoMeta({
  title: "Privacy Policy — ChlatWork",
  description: "How ChlatWork handles data, cookies, advertising, and privacy.",
});
</script>

<template>
  <main class="mx-auto w-full max-w-[1440px] space-y-8">
    <header class="space-y-2">
      <h1 class="text-2xl font-bold">Privacy Policy</h1>
      <p class="text-gray-600 dark:text-white/70">
        We aim to collect as little data as possible. This page explains what we
        do and do not collect, including how advertising and cookies may work on
        ChlatWork.
      </p>
      <p class="text-sm text-gray-500 dark:text-white/50">
        Last updated: May 21, 2026
      </p>
    </header>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">Local processing</h2>
      <p class="text-gray-700 dark:text-white/75">
        Many tools on ChlatWork run directly in your browser.
        {{ LOCAL_PROCESSING_PRIVACY_NOTE }}
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">Information we may collect</h2>
      <p class="text-gray-700 dark:text-white/75">
        We may collect basic, non-identifying usage data to improve performance
        and reliability. This may include page views, browser type, device type,
        approximate location derived from IP address, referring pages, and error
        logs.
      </p>
      <p class="text-gray-700 dark:text-white/75">
        If a tool requires a server-side feature, we may temporarily process the
        minimum data needed to provide that feature.
      </p>
      <p class="text-gray-700 dark:text-white/75">
        We do not sell personal information.
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">Site analytics</h2>
      <p class="text-gray-700 dark:text-white/75">
        ChlatWork uses Vercel Web Analytics to understand page views, referrers,
        device types, browsers, approximate locations, and general site
        performance. Vercel Web Analytics is designed to store anonymized data
        and does not use cookies.
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">Cookies, ads, and third parties</h2>
      <p class="text-gray-700 dark:text-white/75">
        ChlatWork may use cookies, local storage, pixels, web beacons, IP
        addresses, or similar technologies for site functionality, security,
        analytics, and advertising.
      </p>
      <p class="text-gray-700 dark:text-white/75">
        We use an informational cookie notice with links to the Privacy Policy
        and Cookie Policy. Closing that notice stores a localStorage flag so the
        notice does not keep appearing. The notice does not turn analytics or
        ads on or off.
      </p>
      <p class="text-gray-700 dark:text-white/75">
        We may display ads using Google AdSense or other advertising partners.
        As a result of ad serving, third-party vendors, including Google, may
        place and read cookies on your browser or use web beacons, IP addresses,
        or other identifiers to collect information. These technologies may be
        used to serve ads, limit how often you see an ad, measure ad
        performance, prevent fraud, and show personalized or non-personalized
        ads.
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
      <p class="text-gray-700 dark:text-white/75">
        You can manage personalized advertising in
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
          Google Advertising Policies </a
        >.
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">Your choices</h2>
      <p class="text-gray-700 dark:text-white/75">
        You can block or delete cookies through your browser settings. Some
        parts of the site may not work correctly if required cookies or local
        storage are disabled.
      </p>
      <p class="text-gray-700 dark:text-white/75">
        Some regions and advertising policies require additional consent controls
        before certain cookies, local storage, or personalized ads are used.
        Where those requirements apply, ChlatWork may use region-specific
        consent controls, non-personalized ads, limited ads, or other
        advertising platform settings.
      </p>
      <p class="text-gray-700 dark:text-white/75">
        For more detail, please read our
        <NuxtLink
          to="/cookies"
          class="font-medium text-gray-900 underline dark:text-white"
        >
          Cookie Policy </NuxtLink
        >.
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">Data retention</h2>
      <p class="text-gray-700 dark:text-white/75">
        For browser-only tools, we don’t receive your files—so there’s nothing
        to retain. For server-based features, we aim to retain data only as long
        as needed to provide the service and maintain security.
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">Children’s privacy</h2>
      <p class="text-gray-700 dark:text-white/75">
        ChlatWork is not directed to children under 13. We do not knowingly
        collect personal information from children under 13.
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">Changes to this policy</h2>
      <p class="text-gray-700 dark:text-white/75">
        We may update this Privacy Policy as the site, tools, or legal
        requirements change. The latest version will always be posted on this
        page.
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">Contact</h2>
      <p class="text-gray-700 dark:text-white/75">
        If you have privacy questions, contact us via the
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
