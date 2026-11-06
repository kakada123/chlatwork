<script setup lang="ts">
import { useLanguage } from "~/composables/useLanguage";
import { BUSINESS_SERVICES, TELEGRAM_CONTACT } from "~/data/services";

const { isKhmer } = useLanguage();

const title = computed(() =>
  isKhmer.value ? "តម្លៃសេវាកម្ម - វិក្កយបត្រ ChlatWork" : "ChlatWork Pricing - Invoice Tools",
);
const description = computed(() =>
  isKhmer.value
    ? "តម្លៃចាប់ផ្តើមសមរម្យសម្រាប់សេវាកម្មអាជីវកម្ម ChlatWork រួមមានកម្មវិធីបង្កើតវិក្កយបត្រ និងបង្កាន់ដៃ។ សូមផ្ញើសារតាម Telegram ជាមុនដើម្បីបញ្ជាក់ទំហំការងារ។"
    : "Simple starter pricing for ChlatWork business services with invoice and receipt generators. Message on Telegram first to confirm scope.",
);

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
      class="rounded-2xl border border-slate-200 bg-[#ffffff] p-5 shadow-sm shadow-sky-100/80 dark:!border-slate-800 dark:!bg-slate-900 dark:shadow-black/20 sm:p-8"
    >
      <p class="text-xs font-bold uppercase text-sky-700 dark:text-cyan-300">
        {{ isKhmer ? "តម្លៃសេវាកម្ម" : "Pricing" }}
      </p>
      <h1
        class="mt-3 max-w-4xl text-3xl font-black leading-tight text-slate-950 dark:text-white sm:text-4xl"
      >
        {{ isKhmer ? "ឧបករណ៍សម្រាប់អាជីវកម្មខ្នាតតូច ជាមួយនឹងតម្លៃចាប់ផ្តើមច្បាស់លាស់។" : "Small business tools with clear starter pricing." }}
      </h1>
      <p
        class="mt-4 max-w-3xl text-base leading-7 text-slate-600 dark:text-slate-300"
      >
        {{ isKhmer
          ? "ជ្រើសរើសសេវាកម្មចាប់ផ្តើម ផ្ញើព័ត៌មានលម្អិតតាម Telegram និងបញ្ជាក់ទំហំការងារមុនពេលទូទាត់។ ChlatWork មិនទាន់ប្រើប្រព័ន្ធទូទាត់អនឡាញសម្រាប់សេវាកម្មទាំងនេះនៅឡើយទេ។"
          : "Choose a starter service, send the details on Telegram, and confirm the scope before any payment. ChlatWork does not use online checkout for these services yet."
        }}
      </p>
      <div class="mt-6 flex flex-col gap-3 sm:flex-row">
        <a
          :href="TELEGRAM_CONTACT.href"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex h-12 items-center justify-center rounded-xl bg-slate-950 px-6 text-sm font-bold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-300 dark:!bg-white dark:text-slate-950 dark:hover:!bg-cyan-100"
        >
          {{ isKhmer ? "ផ្ញើសារតាម Telegram" : "Message on Telegram" }}
        </a>
      </div>
    </header>

    <section class="grid gap-4 lg:grid-cols-3" aria-label="Service pricing">
      <article
        v-for="service in BUSINESS_SERVICES"
        :key="service.slug"
        class="flex flex-col rounded-2xl border border-slate-200 bg-[#ffffff] p-5 shadow-sm dark:!border-slate-800 dark:!bg-slate-900"
      >
        <div class="space-y-3">
          <p
            class="text-xs font-bold uppercase text-sky-700 dark:text-cyan-300"
          >
            {{ service.name }}
          </p>
          <h2 class="text-3xl font-black text-slate-950 dark:text-white">
            {{ service.startingPrice }}
          </h2>
          <p class="text-sm leading-6 text-slate-600 dark:text-slate-300">
            {{ service.priceNote }}
          </p>
          <p class="text-sm font-semibold text-slate-800 dark:text-slate-300">
            {{ service.deliveryTime }}
          </p>
        </div>

        <ul class="mt-5 flex-1 space-y-3">
          <li
            v-for="highlight in service.highlights"
            :key="highlight"
            class="flex gap-3 text-sm leading-6 text-slate-600 dark:text-slate-300"
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
            class="inline-flex h-11 w-full items-center justify-center rounded-xl bg-slate-950 px-5 text-sm font-bold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-300 dark:!bg-white dark:text-slate-950 dark:hover:!bg-cyan-100"
          >
            {{ isKhmer ? "ផ្ញើសារតាម Telegram" : "Message on Telegram" }}
          </a>
          <NuxtLink
            :to="service.route"
            class="inline-flex h-11 w-full items-center justify-center rounded-xl border border-slate-200 bg-[#ffffff] px-5 text-sm font-bold text-slate-950 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-300 dark:!border-slate-800 dark:!bg-slate-900/70 dark:text-white dark:hover:!bg-slate-800"
          >
            {{ isKhmer ? "មើលព័ត៌មានលម្អិត" : "View details" }}
          </NuxtLink>
        </div>
      </article>
    </section>

    <section
      class="rounded-2xl border border-slate-200 bg-[#ffffff] p-5 shadow-sm dark:!border-slate-800 dark:!bg-slate-900"
    >
      <h2 class="text-xl font-black text-slate-950 dark:text-white">
        {{ isKhmer ? "របៀបបញ្ជាក់តម្លៃ" : "How pricing is confirmed" }}
      </h2>
      <div class="mt-4 grid gap-3 md:grid-cols-3">
        <div
          class="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:!border-slate-800 dark:bg-slate-900/70"
        >
          <h3 class="text-sm font-black text-slate-950 dark:text-white">
            {{ isKhmer ? "១. ផ្ញើព័ត៌មានការងារ" : "1. Send the workflow" }}
          </h3>
          <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            {{ isKhmer ? "ចែករំលែក menu គំរូវិក្កយបត្រ តារាង ឬ screenshot របស់អ្នកតាម Telegram។" : "Share your menu, invoice sample, spreadsheet, or screenshots on Telegram." }}
          </p>
        </div>
        <div
          class="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:!border-slate-800 dark:bg-slate-900/70"
        >
          <h3 class="text-sm font-black text-slate-950 dark:text-white">
            {{ isKhmer ? "២. បញ្ជាក់ទំហំការងារ" : "2. Confirm the scope" }}
          </h3>
          <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            {{ isKhmer ? "ChlatWork នឹងបញ្ជាក់អំពីទំហំការងារ រយៈពេលបញ្ចប់ និងតម្លៃចុងក្រោយ។" : "ChlatWork confirms the smallest useful version, delivery time, and final price." }}
          </p>
        </div>
        <div
          class="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:!border-slate-800 dark:bg-slate-900/70"
        >
          <h3 class="text-sm font-black text-slate-950 dark:text-white">
            {{ isKhmer ? "៣. បង្កើត និងប្រគល់ជូន" : "3. Build and hand off" }}
          </h3>
          <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            {{ isKhmer ? "អ្នកពិនិត្យមើលលទ្ធផលជាមួយទិន្នន័យគំរូ មុនពេលប្រគល់ការងារចុងក្រោយ។" : "You review the result with sample data before the final handoff." }}
          </p>
        </div>
      </div>
    </section>
  </main>
</template>
