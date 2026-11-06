<script setup lang="ts">
import { useAppI18n } from "~/composables/useAppI18n";

const { t } = useAppI18n();
const route = useRoute();
const { isKhmer } = useLanguage();
const siteUrl = "https://chlatwork.com";
const pageUrl = computed(() => `${siteUrl}${route.path === "/" ? "" : route.path}`);
const faqs = computed(() =>
  [{ question: t("shared.copy_app_components_landing_LandingFaq_vue.what_is_chlat_work"), answer: t("shared.copy_app_components_landing_LandingFaq_vue.chlat_work_is_a_free_online_tools_website_for") }, { question: t("shared.copy_app_components_landing_LandingFaq_vue.are_the_tools_free_to_use"), answer: t("shared.copy_app_components_landing_LandingFaq_vue.yes_chlat_work_tools_are_available_directly_in_the") }, { question: t("shared.copy_app_components_landing_LandingFaq_vue.do_files_upload_to_a_server"), answer: t("shared.copy_app_components_landing_LandingFaq_vue.many_tools_process_files_in_your_browser_where_possible") }, { question: t("shared.copy_app_components_landing_LandingFaq_vue.do_i_need_to_create_an_account"), answer: t("shared.copy_app_components_landing_LandingFaq_vue.you_can_open_a_tool_and_enter_data_without") }],
);

useHead(() => ({
  script: [
    {
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "@id": `${pageUrl.value}#faq`,
        mainEntity: faqs.value.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: faq.answer,
          },
        })),
      }),
    },
  ],
}));
</script>

<template>
  <section id="faq" class="pb-12 pt-8">
    <div class="w-full">
      <div>
        <h2 class="text-xl font-semibold tracking-tight text-slate-950 dark:text-white">
          {{ t("shared.components_landing_landing_faq.common_questions") }}
        </h2>
      </div>

      <div class="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.04]">
        <details
          v-for="faq in faqs"
          :key="faq.question"
          class="group border-b border-slate-200 last:border-b-0 dark:border-white/10"
        >
          <summary class="flex min-h-16 cursor-pointer list-none items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-500 dark:hover:bg-white/[0.04] [&::-webkit-details-marker]:hidden sm:px-5">
            <span class="min-w-0 flex-1 text-sm font-semibold text-slate-950 dark:text-white sm:text-base">
              {{ faq.question }}
            </span>
            <span
              aria-hidden="true"
              class="relative grid size-8 shrink-0 place-items-center rounded-full border border-slate-200 bg-slate-50 text-slate-700 transition-colors group-open:border-sky-200 group-open:bg-sky-50 group-open:text-sky-700 dark:border-white/10 dark:bg-white/[0.06] dark:text-white/75 dark:group-open:border-cyan-400/25 dark:group-open:bg-cyan-400/10 dark:group-open:text-cyan-300"
            >
              <span class="absolute h-px w-3 bg-current" />
              <span class="absolute h-3 w-px bg-current transition-opacity group-open:opacity-0" />
            </span>
          </summary>
          <div class="border-t border-slate-100 px-4 py-4 dark:border-white/[0.06] sm:px-5">
            <p class="max-w-3xl text-sm leading-6 text-slate-600 dark:text-white/65">
              {{ faq.answer }}
            </p>
          </div>
        </details>
      </div>
    </div>
  </section>
</template>
