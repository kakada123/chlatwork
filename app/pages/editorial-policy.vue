<script setup lang="ts">
const title = "Editorial Policy - ChlatWork";
const description =
  "How ChlatWork plans, writes, reviews, and updates tool guides, policy pages, and financial workflow content.";

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogType: "website",
  ogUrl: "https://chlatwork.com/editorial-policy",
  twitterCard: "summary_large_image",
  twitterTitle: title,
  twitterDescription: description,
});

useHead({
  link: [{ rel: "canonical", href: "https://chlatwork.com/editorial-policy" }],
});
</script>

<template>
  <main class="mx-auto w-full max-w-[1440px] space-y-8">
    <header class="space-y-2">
      <h1 class="text-2xl font-bold">Editorial Policy</h1>
      <p class="max-w-3xl text-gray-600 dark:text-white/70">
        This page explains how ChlatWork creates and maintains tool guides,
        educational examples, policy pages, and practical workflow content.
      </p>
      <p class="text-sm text-gray-500 dark:text-white/50">
        Last updated: June 29, 2026
      </p>
    </header>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">Purpose of content</h2>
      <p class="text-gray-700 dark:text-white/75">
        ChlatWork content is designed to help users complete practical tasks
        with less confusion. Pages are written for clarity and speed: what the
        tool does, when to use it, how to avoid mistakes, and what to verify
        before using outputs in real workflows.
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">How content is created</h2>
      <ul class="list-disc space-y-1 pl-5 text-gray-700 dark:text-white/75">
        <li>
          Each guide starts from real tool behavior and user workflow needs.
        </li>
        <li>
          Explanations are written in plain language with practical examples for
          Cambodia and Khmer-English usage where relevant.
        </li>
        <li>
          Technical and financial examples are checked against current tool
          logic before publishing.
        </li>
        <li>
          Pages are updated when tool behavior, browser support, or policy
          requirements change.
        </li>
      </ul>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">Financial and YMYL content standard</h2>
      <p class="text-gray-700 dark:text-white/75">
        Pages related to money, expenses, budgeting, and payback calculations
        are treated as higher-risk topics. These pages include stronger
        limitations, validation reminders, and practical checks.
      </p>
      <ul class="list-disc space-y-1 pl-5 text-gray-700 dark:text-white/75">
        <li>
          Financial tools are educational utilities, not financial advice.
        </li>
        <li>
          Users are reminded to verify assumptions, fees, and final payment
          amounts before sending money.
        </li>
        <li>
          Content avoids promises of financial outcomes or guaranteed savings.
        </li>
      </ul>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">Corrections and updates</h2>
      <p class="text-gray-700 dark:text-white/75">
        If content is unclear, outdated, or incorrect, ChlatWork updates the
        page and improves examples to prevent repeated confusion.
      </p>
      <p class="text-gray-700 dark:text-white/75">
        You can send correction requests through the
        <NuxtLink
          to="/contact"
          class="font-medium text-gray-900 underline dark:text-white"
        >
          Contact page </NuxtLink
        >.
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">Editorial independence</h2>
      <p class="text-gray-700 dark:text-white/75">
        Content decisions are based on user usefulness and accuracy. Advertising
        does not determine the factual direction of tool guides or policy pages.
      </p>
    </section>
  </main>
</template>
