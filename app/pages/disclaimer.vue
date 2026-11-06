<script setup lang="ts">
import { useAppI18n } from "~/composables/useAppI18n";

const { t } = useAppI18n();
const { isKhmer } = useLanguage();

const title = computed(() => t("shared.pages_disclaimer.disclaimer_chlat_work"));
const description = computed(() => t("shared.pages_disclaimer.important_information_about_checking_chlat_work_tool_outputs_browser"));

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogType: "website",
  ogUrl: "https://chlatwork.com/disclaimer",
  twitterCard: "summary_large_image",
  twitterTitle: title,
  twitterDescription: description,
});

useHead({
  link: [{ rel: "canonical", href: "https://chlatwork.com/disclaimer" }],
});
</script>

<template>
  <main class="mx-auto w-full max-w-[1440px] space-y-8">
    <header class="space-y-2">
      <h1 class="text-2xl font-bold">{{ t("shared.pages_terms.disclaimer") }}</h1>
      <p class="max-w-3xl text-gray-600 dark:text-white/70">
        {{
          t("shared.pages_disclaimer.chlat_work_provides_simple_tools_for_convenience_please_read")
        }}
      </p>
    </header>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">{{ t("shared.pages_disclaimer.general_information") }}</h2>
      <p class="text-gray-700 dark:text-white/75">
        {{
          t("shared.pages_disclaimer.all_tools_on_chlat_work_are_provided_as_is")
        }}
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">{{ t("shared.pages_disclaimer.verify_outputs") }}</h2>
      <p class="text-gray-700 dark:text-white/75">
        {{
          t("shared.pages_disclaimer.you_are_responsible_for_verifying_any_output_before_using")
        }}
      </p>
      <p class="text-gray-700 dark:text-white/75">
        {{
          t("shared.pages_disclaimer.if_a_result_will_be_used_for_customers_finance")
        }}
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">{{ t("shared.pages_disclaimer.file_handling_privacy") }}</h2>
      <p class="text-gray-700 dark:text-white/75">
        {{
          t("shared.pages_disclaimer.many_tools_are_designed_to_run_directly_in_your")
        }}
      </p>
      <p class="text-gray-700 dark:text-white/75">
        {{ t("shared.pages_disclaimer.for_details_please_review_our") }}
        <NuxtLink
          to="/privacy-policy"
          class="font-medium text-gray-900 underline dark:text-white"
        >
          {{ t("shared.pages_privacy_policy.privacy_policy") }}
        </NuxtLink>
        {{ t("shared.pages_terms.message") }}
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">{{ t("shared.pages_disclaimer.no_professional_advice") }}</h2>
      <p class="text-gray-700 dark:text-white/75">
        {{
          t("shared.pages_disclaimer.chlat_work_does_not_provide_legal_financial_medical_or")
        }}
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">{{ t("shared.pages_disclaimer.limitation_of_liability") }}</h2>
      <p class="text-gray-700 dark:text-white/75">
        {{
          t("shared.pages_disclaimer.to_the_maximum_extent_permitted_by_law_chlat_work")
        }}
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">{{ t("shared.common.contact") }}</h2>
      <p class="text-gray-700 dark:text-white/75">
        {{ t("shared.pages_disclaimer.if_you_have_questions_about_this_disclaimer_please_contact") }}
        <NuxtLink
          to="/contact"
          class="font-medium text-gray-900 underline dark:text-white"
        >
          {{ t("shared.pages_disclaimer.contact_page") }}
        </NuxtLink>
        {{ t("shared.pages_privacy_policy.message") }}
      </p>
    </section>
  </main>
</template>
