<script setup lang="ts">
useSeoMeta({
  title: "Cookie Policy — ChlatWork",
  description: "How ChlatWork uses cookies and similar technologies.",
});
</script>

<template>
  <main class="mx-auto w-full max-w-[1440px] space-y-8">
    <header class="space-y-2">
      <h1 class="text-2xl font-bold">Cookie Policy</h1>
      <p class="text-gray-600 dark:text-white/70">
        This page explains how ChlatWork may use cookies and similar
        technologies for functionality, analytics, security, and advertising.
      </p>
      <p class="text-sm text-gray-500 dark:text-white/50">
        Last updated: May 21, 2026
      </p>
    </header>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">What cookies are</h2>
      <p class="text-gray-700 dark:text-white/75">
        Cookies are small files stored on your device by your browser. Similar
        technologies include local storage, pixels, web beacons, IP addresses,
        and other identifiers.
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">How we use cookies</h2>
      <ul class="list-disc space-y-1 pl-5 text-gray-700 dark:text-white/75">
        <li>To keep site features working correctly.</li>
        <li>To remember basic preferences where needed.</li>
        <li>To understand site usage and improve reliability.</li>
        <li>To help detect abuse, fraud, or security issues.</li>
        <li>To display, measure, and improve ads.</li>
      </ul>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">First-party cookies and storage</h2>
      <p class="text-gray-700 dark:text-white/75">
        ChlatWork may store small preferences directly in your browser so the
        site feels consistent when you return.
      </p>
      <ul class="list-disc space-y-1 pl-5 text-gray-700 dark:text-white/75">
        <li>
          <code>app-locale</code>: remembers your selected language.
        </li>
        <li>
          <code>chlatwork-color-mode</code>: remembers light or dark mode.
        </li>
        <li>
          <code>chlatwork_cookie_notice_closed</code>: remembers that you closed
          the cookie notice.
        </li>
      </ul>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">Cookie notice</h2>
      <p class="text-gray-700 dark:text-white/75">
        ChlatWork shows a small informational cookie notice with links to this
        Cookie Policy and the Privacy Policy. Closing the notice stores the
        <code>chlatwork_cookie_notice_closed</code> flag in localStorage so the
        notice does not keep appearing.
      </p>
      <p class="text-gray-700 dark:text-white/75">
        The notice is informational only and does not include cookie preference
        controls.
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">Analytics</h2>
      <p class="text-gray-700 dark:text-white/75">
        ChlatWork uses Vercel Web Analytics to understand site usage and improve
        reliability. Vercel Web Analytics is designed to store anonymized data
        and does not use cookies.
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">Advertising cookies</h2>
      <p class="text-gray-700 dark:text-white/75">
        ChlatWork may use Google AdSense or other advertising partners.
        Third-party vendors, including Google, may use cookies, web beacons, IP
        addresses, or other identifiers to serve ads, measure ad performance,
        limit repeated ads, prevent fraud, and show personalized or
        non-personalized ads.
      </p>
      <p class="text-gray-700 dark:text-white/75">
        Google may use advertising cookies to serve ads based on your visits to
        this and other websites. Learn more about how Google uses data from
        partner sites at
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
      <h2 class="text-lg font-semibold">Managing cookies</h2>
      <p class="text-gray-700 dark:text-white/75">
        You can block, delete, or limit cookies in your browser settings. You
        can also manage personalized Google ads in
        <a
          href="https://myadcenter.google.com/"
          target="_blank"
          rel="noopener noreferrer"
          class="font-medium text-gray-900 underline dark:text-white"
        >
          Google My Ad Center </a
        >.
      </p>
      <p class="text-gray-700 dark:text-white/75">
        If you disable cookies or local storage, some ChlatWork features may not
        work as expected.
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">Regional consent requirements</h2>
      <p class="text-gray-700 dark:text-white/75">
        Some regions and advertising policies require additional consent controls
        before certain cookies, local storage, or personalized ads are used.
        Where those requirements apply, ChlatWork may use region-specific
        consent controls, non-personalized ads, limited ads, or other
        advertising platform settings.
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">Contact</h2>
      <p class="text-gray-700 dark:text-white/75">
        If you have questions about cookies, please contact us through the
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
