<script setup lang="ts">
import { useAppI18n } from "~/composables/useAppI18n";
import { localizeBusinessService } from "~/data/services-km";
import {
  BUSINESS_SERVICE_BY_SLUG,
  TELEGRAM_CONTACT,
  type BusinessServiceSlug,
} from "~/data/services";

const { t } = useAppI18n();

const { isKhmer } = useLanguage();

const props = withDefaults(
  defineProps<{
    serviceSlug?: BusinessServiceSlug;
    title?: string;
    description?: string;
    compact?: boolean;
  }>(),
  {
    serviceSlug: "invoice-generator",
    title: "",
    description: "",
    compact: false,
  },
);

const service = computed(() => localizeBusinessService(BUSINESS_SERVICE_BY_SLUG[props.serviceSlug], isKhmer.value ? "km" : "en"));
const heading = computed(
  () => props.title || (t("shared.components_business_business_cta.need_a_business_ready", { serviceShortName: service.value.shortName })),
);
const body = computed(
  () =>
    props.description ||
    (t("shared.components_business_business_cta.the_free_tool_is_useful_for_quick_work_if")),
);
</script>

<template>
  <section
    class="mx-auto w-full max-w-[1180px] rounded-2xl border border-slate-200 bg-[#ffffff] p-5 shadow-sm shadow-sky-100/70 dark:!border-slate-800 dark:!bg-slate-900 dark:shadow-black/20"
    :class="compact ? 'space-y-4' : 'space-y-5 sm:p-6'"
    :aria-label="t(&quot;shared.components_business_business_cta.business_service_call_to_action&quot;)"
  >
    <div class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
      <div class="space-y-2">
        <p class="text-xs font-bold uppercase text-sky-700 dark:text-cyan-300">
          {{ t("shared.components_business_business_cta.chlat_work_services") }}
        </p>
        <h2 class="text-xl font-black text-slate-950 dark:text-white">
          {{ heading }}
        </h2>
        <p
          class="max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300"
        >
          {{ body }}
        </p>
        <p class="text-sm font-semibold text-slate-800 dark:text-slate-300">
          {{ service.startingPrice }} - {{ service.priceNote }}
        </p>
      </div>

      <div class="flex flex-col gap-3 sm:flex-row lg:flex-col">
        <a
          :href="TELEGRAM_CONTACT.href"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex h-11 items-center justify-center rounded-xl bg-slate-950 px-5 text-sm font-bold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-300 dark:!bg-white dark:text-slate-950 dark:hover:!bg-cyan-100"
        >
          {{ t("shared.components_business_business_cta.message_on_telegram") }}
        </a>
        <NuxtLink
          :to="service.route"
          class="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-[#ffffff] px-5 text-sm font-bold text-slate-950 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-300 dark:!border-slate-800 dark:!bg-slate-900/70 dark:text-white dark:hover:!bg-slate-800"
        >
          {{ t("shared.components_business_business_cta.view_service") }}
        </NuxtLink>
      </div>
    </div>
  </section>
</template>
