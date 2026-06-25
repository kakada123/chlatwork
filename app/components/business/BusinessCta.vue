<script setup lang="ts">
import {
  BUSINESS_SERVICE_BY_SLUG,
  TELEGRAM_CONTACT,
  type BusinessServiceSlug,
} from "~/data/services";

const props = withDefaults(
  defineProps<{
    serviceSlug?: BusinessServiceSlug;
    title?: string;
    description?: string;
    compact?: boolean;
  }>(),
  {
    serviceSlug: "custom-business-tool",
    title: "",
    description: "",
    compact: false,
  },
);

const service = computed(() => BUSINESS_SERVICE_BY_SLUG[props.serviceSlug]);
const heading = computed(
  () =>
    props.title ||
    `Need a business-ready ${service.value.shortName}?`,
);
const body = computed(
  () =>
    props.description ||
    `The free tool is useful for quick work. If you need branded setup, custom fields, or a workflow your team can reuse, message ChlatWork on Telegram first.`,
);
</script>

<template>
  <section
    class="mx-auto w-full max-w-[1180px] rounded-2xl border border-sky-200/80 bg-white/85 p-5 shadow-sm shadow-sky-100/70 dark:border-cyan-300/15 dark:bg-white/[0.07] dark:shadow-black/20"
    :class="compact ? 'space-y-4' : 'space-y-5 sm:p-6'"
    aria-label="Business service call to action"
  >
    <div class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
      <div class="space-y-2">
        <p class="text-xs font-bold uppercase text-sky-700 dark:text-cyan-300">
          ChlatWork services
        </p>
        <h2 class="text-xl font-black text-slate-950 dark:text-white">
          {{ heading }}
        </h2>
        <p class="max-w-3xl text-sm leading-6 text-slate-600 dark:text-white/65">
          {{ body }}
        </p>
        <p class="text-sm font-semibold text-slate-800 dark:text-white/75">
          {{ service.startingPrice }} - {{ service.priceNote }}
        </p>
      </div>

      <div class="flex flex-col gap-3 sm:flex-row lg:flex-col">
        <a
          :href="TELEGRAM_CONTACT.href"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex h-11 items-center justify-center rounded-xl bg-slate-950 px-5 text-sm font-bold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-300 dark:bg-white dark:text-slate-950 dark:hover:bg-cyan-100"
        >
          Message on Telegram
        </a>
        <NuxtLink
          :to="service.route"
          class="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-950 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-300 dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/[0.10]"
        >
          View service
        </NuxtLink>
      </div>
    </div>
  </section>
</template>
