<script setup lang="ts">
import { useAppI18n } from "~/composables/useAppI18n";
import { useLanguage } from "~/composables/useLanguage";
import { localizeBusinessService } from "~/data/services-km";
import { BUSINESS_SERVICES, TELEGRAM_CONTACT } from "~/data/services";

const { t } = useAppI18n();

const { isKhmer } = useLanguage();
const services = computed(() => BUSINESS_SERVICES.map(service => localizeBusinessService(service, isKhmer.value ? "km" : "en")));

const title = computed(() =>
  t("shared.pages_pricing.chlat_work_pricing_invoice_tools"),
);
const description = computed(() =>
  t("shared.pages_pricing.simple_starter_pricing_for_chlat_work_business_services_with"),
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
        {{ t("shared.layouts_default.pricing") }}
      </p>
      <h1
        class="mt-3 max-w-4xl text-3xl font-black leading-tight text-slate-950 dark:text-white sm:text-4xl"
      >
        {{ t("shared.pages_pricing.small_business_tools_with_clear_starter_pricing") }}
      </h1>
      <p
        class="mt-4 max-w-3xl text-base leading-7 text-slate-600 dark:text-slate-300"
      >
        {{ t("shared.pages_pricing.choose_a_starter_service_send_the_details_on_telegram")
        }}
      </p>
      <div class="mt-6 flex flex-col gap-3 sm:flex-row">
        <a
          :href="TELEGRAM_CONTACT.href"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex h-12 items-center justify-center rounded-xl bg-slate-950 px-6 text-sm font-bold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-300 dark:!bg-white dark:text-slate-950 dark:hover:!bg-cyan-100"
        >
          {{ t("shared.components_business_business_cta.message_on_telegram") }}
        </a>
      </div>
    </header>

    <section class="grid gap-4 lg:grid-cols-3" :aria-label="t(&quot;shared.pages_pricing.service_pricing&quot;)">
      <article
        v-for="service in services"
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
            {{ t("shared.components_business_business_cta.message_on_telegram") }}
          </a>
          <NuxtLink
            :to="service.route"
            class="inline-flex h-11 w-full items-center justify-center rounded-xl border border-slate-200 bg-[#ffffff] px-5 text-sm font-bold text-slate-950 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-300 dark:!border-slate-800 dark:!bg-slate-900/70 dark:text-white dark:hover:!bg-slate-800"
          >
            {{ t("shared.pages_pricing.view_details") }}
          </NuxtLink>
        </div>
      </article>
    </section>

    <section
      class="rounded-2xl border border-slate-200 bg-[#ffffff] p-5 shadow-sm dark:!border-slate-800 dark:!bg-slate-900"
    >
      <h2 class="text-xl font-black text-slate-950 dark:text-white">
        {{ t("shared.pages_pricing.how_pricing_is_confirmed") }}
      </h2>
      <div class="mt-4 grid gap-3 md:grid-cols-3">
        <div
          class="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:!border-slate-800 dark:bg-slate-900/70"
        >
          <h3 class="text-sm font-black text-slate-950 dark:text-white">
            {{ t("shared.pages_pricing.1_send_the_workflow") }}
          </h3>
          <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            {{ t("shared.pages_pricing.share_your_menu_invoice_sample_spreadsheet_or_screenshots_on") }}
          </p>
        </div>
        <div
          class="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:!border-slate-800 dark:bg-slate-900/70"
        >
          <h3 class="text-sm font-black text-slate-950 dark:text-white">
            {{ t("shared.pages_pricing.2_confirm_the_scope") }}
          </h3>
          <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            {{ t("shared.pages_pricing.chlat_work_confirms_the_smallest_useful_version_delivery_time") }}
          </p>
        </div>
        <div
          class="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:!border-slate-800 dark:bg-slate-900/70"
        >
          <h3 class="text-sm font-black text-slate-950 dark:text-white">
            {{ t("shared.pages_pricing.3_build_and_hand_off") }}
          </h3>
          <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            {{ t("shared.pages_pricing.you_review_the_result_with_sample_data_before_the") }}
          </p>
        </div>
      </div>
    </section>
  </main>
</template>
