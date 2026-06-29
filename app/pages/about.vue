<script setup lang="ts">
import { LOCAL_PROCESSING_PRIVACY_NOTE } from "~/lib/privacy-copy";

const title = "About ChlatWork - Simple Online Tools";
const description =
  "Learn what ChlatWork is, who it is for, and how its simple privacy-friendly browser tools help with documents, images, QR codes, barcodes, dates, and productivity.";
const maintainerName = "Kakada";
const maintainerEmail = "kakada127@gmail.com";

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogType: "website",
  ogUrl: "https://chlatwork.com/about",
  twitterCard: "summary_large_image",
  twitterTitle: title,
  twitterDescription: description,
});

useHead({
  link: [{ rel: "canonical", href: "https://chlatwork.com/about" }],
  script: [
    {
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "Organization",
            name: "ChlatWork",
            url: "https://chlatwork.com",
            contactPoint: [
              {
                "@type": "ContactPoint",
                contactType: "customer support",
                email: maintainerEmail,
              },
            ],
          },
          {
            "@type": "Person",
            name: maintainerName,
            email: maintainerEmail,
            worksFor: {
              "@type": "Organization",
              name: "ChlatWork",
            },
          },
        ],
      }),
    },
  ],
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
        where to click next. The site gives extra attention to workflows common
        for Cambodian and Khmer users, such as Khmer text handling, Telegram
        sharing, restaurant menus, QR codes, and USD/KHR money tasks.
      </p>
      <p class="text-sm text-gray-500 dark:text-white/50">
        Last updated: June 29, 2026
      </p>
    </header>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">Who runs ChlatWork</h2>
      <p class="text-gray-700 dark:text-white/75">
        ChlatWork is maintained by {{ maintainerName }}, an independent builder
        focused on practical web tooling for Cambodia and Khmer-English
        workflows.
      </p>
      <p class="text-gray-700 dark:text-white/75">
        For corrections, bug reports, or policy questions, you can use the
        <NuxtLink
          to="/contact"
          class="font-medium text-gray-900 underline dark:text-white"
        >
          Contact page
        </NuxtLink>
        or email
        <a
          :href="`mailto:${maintainerEmail}`"
          class="font-medium text-gray-900 underline dark:text-white"
        >
          {{ maintainerEmail }}</a
        >.
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">Who ChlatWork is for</h2>
      <p class="text-gray-700 dark:text-white/75">
        ChlatWork is for students, office teams, developers, freelancers, shop
        owners, support staff, and anyone who needs a quick tool for a practical
        task. The site is built for repeat use: open a page, finish the work,
        and come back when the next small task appears.
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">
        Why Cambodia and Khmer workflows matter
      </h2>
      <p class="text-gray-700 dark:text-white/75">
        Many generic tool websites work technically but ignore local details:
        Khmer text readability, mixed Khmer-English content, Telegram sharing,
        USD and KHR amounts, QR sharing links for restaurants, and
        small-business document workflows. ChlatWork is built to make those
        everyday tasks feel normal, not like edge cases.
      </p>
      <p class="text-gray-700 dark:text-white/75">
        That does not mean every tool forces a Cambodia example. A hash
        generator should stay technical, while tools such as QR codes, PayBack,
        Wi-Fi posters, Text to Voice, and Khmer Unicode cleanup should reflect
        how people actually work here.
      </p>
    </section>

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
          draws, clean Khmer Unicode text, and convert Khmer or English text to
          voice.
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
      <p class="text-gray-700 dark:text-white/75">
        Content quality and updates follow a documented
        <NuxtLink
          to="/editorial-policy"
          class="font-medium text-gray-900 underline dark:text-white"
        >
          Editorial Policy
        </NuxtLink>
        with extra care for money-related pages.
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
          to="/privacy-policy"
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
        provide tools that are easy to use, fast, reliable, and practical for
        the kinds of documents, links, labels, dates, and text that people deal
        with every day.
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
