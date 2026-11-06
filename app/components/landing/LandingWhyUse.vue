<script setup lang="ts">
import { useAppI18n } from "~/composables/useAppI18n";

const { t } = useAppI18n();
const { isKhmer } = useLanguage();
const benefits = computed(() => [t("shared.extra_app_components_landing_LandingWhyUse_vue.simple_to_use"), t("shared.extra_app_components_landing_LandingWhyUse_vue.works_on_mobile"), t("shared.extra_app_components_landing_LandingWhyUse_vue.khmer_and_english")]);
</script>

<template>
  <section class="border-y border-slate-200 py-6 dark:border-white/10" :aria-label="t(&quot;shared.components_landing_landing_why_use.chlat_work_benefits&quot;)">
    <ul class="grid gap-4 sm:grid-cols-3">
      <li v-for="benefit in benefits" :key="benefit" class="flex items-center justify-center gap-2 text-sm font-medium text-slate-600 dark:text-white/60">
        <svg viewBox="0 0 24 24" class="size-4 text-sky-700 dark:text-cyan-300" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="m5 12 4 4L19 6" />
        </svg>
        {{ benefit }}
      </li>
    </ul>
  </section>
</template>
