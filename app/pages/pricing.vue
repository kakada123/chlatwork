<script setup lang="ts">
import { BUSINESS_SERVICES, TELEGRAM_CONTACT } from "~/data/services";

const title = "ChlatWork Pricing - QR Menus, Invoice Tools, Custom Tools";
const description =
  "Simple starter pricing for ChlatWork business services: QR menu websites, invoice and receipt generators, and custom business tools. Message on Telegram first to confirm scope.";

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogType: "website",
  ogUrl: "https://chlatwork.com/pricing",
  twitterCard: "summary_large_image",
  twitterTitle: title,
  twitterDescription: description,
});

useHead({
  link: [{ rel: "canonical", href: "https://chlatwork.com/pricing" }],
});
</script>

<template>
  <main class="mx-auto w-full max-w-[1180px] space-y-8">
    <header
      class="rounded-2xl border border-sky-100/90 bg-white/85 p-5 shadow-sm shadow-sky-100/80 dark:border-white/10 dark:bg-white/[0.07] dark:shadow-black/20 sm:p-8"
    >
      <p class="text-xs font-bold uppercase text-sky-700 dark:text-cyan-300">
        Pricing
      </p>
      <h1
        class="mt-3 max-w-4xl text-3xl font-black leading-tight text-slate-950 dark:text-white sm:text-4xl"
      >
        Small business tools with clear starter pricing.
      </h1>
      <p class="mt-4 max-w-3xl text-base leading-7 text-slate-600 dark:text-white/65">
        Choose a starter service, send the details on Telegram, and confirm the
        scope before any payment. ChlatWork does not use online checkout for
        these services yet.
      </p>
      <div class="mt-6 flex flex-col gap-3 sm:flex-row">
        <a
          :href="TELEGRAM_CONTACT.href"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex h-12 items-center justify-center rounded-xl bg-slate-950 px-6 text-sm font-bold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-300 dark:bg-white dark:text-slate-950 dark:hover:bg-cyan-100"
        >
          Message on Telegram
        </a>
        <NuxtLink
          to="/services/custom-business-tool"
          class="inline-flex h-12 items-center justify-center rounded-xl border border-slate-200 bg-white px-6 text-sm font-bold text-slate-950 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-300 dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/[0.10]"
        >
          Request a custom tool
        </NuxtLink>
      </div>
    </header>

    <section class="grid gap-4 lg:grid-cols-3" aria-label="Service pricing">
      <article
        v-for="service in BUSINESS_SERVICES"
        :key="service.slug"
        class="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.06]"
      >
        <div class="space-y-3">
          <p class="text-xs font-bold uppercase text-sky-700 dark:text-cyan-300">
            {{ service.name }}
          </p>
          <h2 class="text-3xl font-black text-slate-950 dark:text-white">
            {{ service.startingPrice }}
          </h2>
          <p class="text-sm leading-6 text-slate-600 dark:text-white/65">
            {{ service.priceNote }}
          </p>
          <p class="text-sm font-semibold text-slate-800 dark:text-white/75">
            {{ service.deliveryTime }}
          </p>
        </div>

        <ul class="mt-5 flex-1 space-y-3">
          <li
            v-for="highlight in service.highlights"
            :key="highlight"
            class="flex gap-3 text-sm leading-6 text-slate-600 dark:text-white/65"
          >
            <span
              class="mt-2 h-2 w-2 shrink-0 rounded-full bg-sky-500"
              aria-hidden="true"
            />
            <span>{{ highlight }}</span>
          </li>
        </ul>

        <div class="mt-6 space-y-3">
          <a
            :href="TELEGRAM_CONTACT.href"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex h-11 w-full items-center justify-center rounded-xl bg-slate-950 px-5 text-sm font-bold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-300 dark:bg-white dark:text-slate-950 dark:hover:bg-cyan-100"
          >
            Message on Telegram
          </a>
          <NuxtLink
            :to="service.demoRoute"
            class="inline-flex h-11 w-full items-center justify-center rounded-xl border border-sky-200 bg-sky-50 px-5 text-sm font-bold text-sky-800 transition hover:bg-sky-100 focus:outline-none focus:ring-2 focus:ring-sky-300 dark:border-cyan-300/20 dark:bg-cyan-300/10 dark:text-cyan-100 dark:hover:bg-cyan-300/15"
          >
            View demo
          </NuxtLink>
          <NuxtLink
            :to="service.route"
            class="inline-flex h-11 w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-950 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-300 dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/[0.10]"
          >
            View details
          </NuxtLink>
        </div>
      </article>
    </section>

    <section
      class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.06]"
    >
      <h2 class="text-xl font-black text-slate-950 dark:text-white">
        How pricing is confirmed
      </h2>
      <div class="mt-4 grid gap-3 md:grid-cols-3">
        <div class="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.05]">
          <h3 class="text-sm font-black text-slate-950 dark:text-white">
            1. Send the workflow
          </h3>
          <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-white/65">
            Share your menu, invoice sample, spreadsheet, or screenshots on
            Telegram.
          </p>
        </div>
        <div class="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.05]">
          <h3 class="text-sm font-black text-slate-950 dark:text-white">
            2. Confirm the scope
          </h3>
          <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-white/65">
            ChlatWork confirms the smallest useful version, delivery time, and
            final price.
          </p>
        </div>
        <div class="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.05]">
          <h3 class="text-sm font-black text-slate-950 dark:text-white">
            3. Build and hand off
          </h3>
          <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-white/65">
            You review the result with sample data before the final handoff.
          </p>
        </div>
      </div>
    </section>
  </main>
</template>
