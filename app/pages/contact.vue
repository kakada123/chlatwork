<script setup lang="ts">
const title = "Contact ChlatWork";
const description =
  "Contact ChlatWork to report bugs, request tools, share feedback, or ask privacy and cookie questions.";
const reviewedAt = "2026-06-29";

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogType: "website",
  ogUrl: "https://chlatwork.com/contact",
  twitterCard: "summary_large_image",
  twitterTitle: title,
  twitterDescription: description,
});

useHead({
  link: [{ rel: "canonical", href: "https://chlatwork.com/contact" }],
  script: [
    {
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: title,
        url: "https://chlatwork.com/contact",
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

const email = "kakada127@gmail.com";
</script>

<template>
  <main class="mx-auto w-full max-w-[1440px] space-y-8">
    <header class="space-y-2">
      <h1 class="text-2xl font-bold">Contact</h1>
      <p class="max-w-3xl text-gray-600 dark:text-white/70">
        Use this page for ChlatWork feedback, bug reports, privacy questions,
        and practical tool ideas. Clear reports help us find the right page,
        reproduce the issue, and improve the tool faster.
      </p>
    </header>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">Email</h2>
      <p class="text-gray-700 dark:text-white/75">
        You can contact us at:
        <a
          :href="`mailto:${email}`"
          class="font-semibold text-gray-900 underline dark:text-white"
        >
          {{ email }}
        </a>
      </p>
      <p class="max-w-3xl text-sm text-gray-500 dark:text-white/55">
        Please include the tool name, the page URL, your browser or device, what
        you expected to happen, and what happened instead. Screenshots are
        helpful when the issue is visual.
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">What we can help with</h2>
      <ul class="list-disc space-y-1 pl-5 text-gray-700 dark:text-white/75">
        <li>Bug reports and broken tool behavior.</li>
        <li>
          Feature requests for PDF, QR, image, utility, and developer tools.
        </li>
        <li>Privacy, cookie, advertising, and data-handling questions.</li>
        <li>Corrections for guide pages, tool descriptions, or examples.</li>
      </ul>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">Before sending private data</h2>
      <p class="max-w-3xl text-gray-700 dark:text-white/75">
        Do not email passwords, private keys, payment details, identity
        documents, or confidential customer files. If a tool output looks wrong,
        describe the steps and use sample data where possible.
      </p>
    </section>
  </main>
</template>
