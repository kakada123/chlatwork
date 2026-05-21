<script setup lang="ts">
import { LOCAL_PROCESSING_PRIVACY_NOTE } from "~/lib/privacy-copy";

useSeoMeta({
  title: "About — ChlatWork",
  description:
    "Learn what ChlatWork is, how its browser tools work, and why the site focuses on practical daily utilities.",
});
</script>

<template>
  <main class="mx-auto w-full max-w-[1440px] space-y-8">
    <header class="space-y-2">
      <h1 class="text-2xl font-bold">About ChlatWork</h1>
      <p class="max-w-3xl text-gray-600 dark:text-white/70">
        ChlatWork is an independent collection of focused browser tools for
        everyday work: PDFs, QR codes, image compression, text utilities,
        developer helpers, shared expenses, and small office tasks.
      </p>
      <p class="max-w-3xl text-gray-600 dark:text-white/70">
        The goal is simple: each page should help you complete one real task
        without installing heavy software, creating an account, or guessing
        where to click next.
      </p>
    </header>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">What you can do here</h2>
      <ul class="list-disc space-y-1 pl-5 text-gray-700 dark:text-white/75">
        <li>
          Generate barcodes, QR codes, and Wi-Fi QR posters for labels, shops,
          inventory, events, and quick sharing.
        </li>
        <li>
          Compress images and convert images or PDFs for forms, chat, printing,
          customer documents, and school or office submissions.
        </li>
        <li>
          Use developer helpers such as JSON formatting, JWT decoding, Base64,
          URL encoding, regex testing, timestamps, cron explanations, hashes,
          UUIDs, and password generation.
        </li>
        <li>
          Split shared expenses, track personal spending, run simple lucky
          draws, and convert Khmer or English text to voice.
        </li>
      </ul>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">How the tools are built</h2>
      <p class="text-gray-700 dark:text-white/75">
        ChlatWork tools are intentionally small and task-specific. A barcode
        page focuses on barcode output, a Wi-Fi QR page focuses on connection
        details and printable posters, and PDF pages focus on clear input,
        options, preview, and download steps.
      </p>
      <p class="text-gray-700 dark:text-white/75">
        Each tool is paired with a guide page where helpful, so users and search
        crawlers can understand what the tool does before opening it.
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">Privacy-first approach</h2>
      <p class="text-gray-700 dark:text-white/75">
        Many ChlatWork tools are designed to run directly in your browser.
        {{ LOCAL_PROCESSING_PRIVACY_NOTE }}
      </p>
      <p class="text-gray-700 dark:text-white/75">
        Some features may use a server when browser-only processing is not
        practical, such as API-backed audio generation or shared result links.
        In those cases, the site aims to process only what is needed for the
        feature and explains the behavior in the
        <NuxtLink
          to="/privacy"
          class="font-medium text-gray-900 underline dark:text-white"
        >
          Privacy Policy </NuxtLink
        >.
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">Why ChlatWork exists</h2>
      <p class="text-gray-700 dark:text-white/75">
        “Chlat” means smart—so ChlatWork means smart work. The goal is simple:
        provide tools that are easy to use, fast, and reliable.
      </p>
      <p class="text-gray-700 dark:text-white/75">
        The site is updated as new practical needs appear. If a tool is unclear,
        broken, or missing a common workflow, you can send feedback through the
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
