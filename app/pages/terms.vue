<script setup lang="ts">
import { useAppI18n } from "~/composables/useAppI18n";

const { t } = useAppI18n();
const { isKhmer } = useLanguage();

const title = computed(() => t("shared.pages_terms.terms_of_use_chlat_work"));
const description = computed(() => t("shared.pages_terms.terms_for_using_chlat_work_online_tools_guide_pages"));
const reviewedAt = "2026-10-01";

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogType: "website",
  ogUrl: "https://chlatwork.com/terms",
  twitterCard: "summary_large_image",
  twitterTitle: title,
  twitterDescription: description,
});

useHead(() => ({
  link: [{ rel: "canonical", href: "https://chlatwork.com/terms" }],
  script: [
    {
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: title.value,
        url: "https://chlatwork.com/terms",
        description: description.value,
        dateModified: reviewedAt,
        publisher: {
          "@type": "Organization",
          name: "ChlatWork",
          url: "https://chlatwork.com",
        },
      }),
    },
  ],
}));
</script>

<template>
  <main class="mx-auto w-full max-w-[1440px] space-y-8">
    <header class="space-y-2">
      <h1 class="text-2xl font-bold">{{ t("shared.pages_terms.terms_of_use") }}</h1>
      <p class="max-w-3xl text-gray-600 dark:text-white/70">
        {{
          t("shared.pages_terms.by_using_chlat_work_you_agree_to_these_terms")
        }}
      </p>
      <p class="text-sm text-gray-500 dark:text-white/50">
        {{ t("shared.pages_privacy_policy.last_updated_october_1_2026") }}
      </p>
    </header>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">{{ t("shared.pages_terms.use_of_the_service") }}</h2>
      <p class="text-gray-700 dark:text-white/75">
        {{
          t("shared.pages_terms.you_may_use_chlat_work_tools_for_personal_and")
        }}
      </p>
      <ul class="list-disc space-y-1 pl-5 text-gray-700 dark:text-white/75">
        <li>{{ t("shared.pages_terms.no_illegal_content_or_harmful_activity") }}</li>
        <li>{{ t("shared.pages_terms.no_attempts_to_bypass_security_or_exploit_vulnerabilities") }}</li>
        <li>{{ t("shared.pages_terms.no_automated_scraping_that_impacts_performance") }}</li>
        <li>
          {{ t("shared.pages_terms.no_use_of_the_tools_to_mislead_users_customers") }}
        </li>
      </ul>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">{{ t("shared.pages_terms.accounts") }}</h2>
      <p class="text-gray-700 dark:text-white/75">
        {{
          t("shared.pages_terms.you_may_sign_in_using_a_supported_google_or")
        }}
      </p>
      <p class="text-gray-700 dark:text-white/75">
        {{
          t("shared.pages_terms.you_may_open_tool_pages_and_enter_data_without")
        }}
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">{{ t("shared.pages_terms.shared_links_and_stored_content") }}</h2>
      <p class="text-gray-700 dark:text-white/75">
        {{
          t("shared.pages_terms.signed_in_favorites_expense_tracker_and_pay_back_data")
        }}
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">{{ t("shared.pages_terms.prohibited_usage") }}</h2>
      <p class="text-gray-700 dark:text-white/75">
        {{
          t("shared.pages_terms.you_must_not_use_chlat_work_to_create_process")
        }}
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">{{ t("shared.pages_terms.tool_outputs") }}</h2>
      <p class="text-gray-700 dark:text-white/75">
        {{
          t("shared.pages_terms.outputs_generated_by_tools_barcodes_qr_codes_conversions_etc")
        }}
      </p>
      <p class="text-gray-700 dark:text-white/75">
        {{
          t("shared.pages_terms.for_example_check_barcode_readability_pdf_layout_qr_destination")
        }}
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">{{ t("shared.pages_terms.availability") }}</h2>
      <p class="text-gray-700 dark:text-white/75">
        {{
          t("shared.pages_terms.we_may_update_remove_or_change_tools_at_any")
        }}
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">{{ t("shared.pages_terms.intellectual_property") }}</h2>
      <p class="text-gray-700 dark:text-white/75">
        {{
          t("shared.pages_terms.chlat_work_owns_or_licenses_the_site_design_text")
        }}
      </p>
      <p class="text-gray-700 dark:text-white/75">
        {{
          t("shared.pages_terms.tool_outputs_are_provided_for_your_use_but_you")
        }}
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">{{ t("shared.pages_terms.advertising") }}</h2>
      <p class="text-gray-700 dark:text-white/75">
        {{
          t("shared.pages_terms.chlat_work_may_display_ads_from_third_party_advertising")
        }}
      </p>
      <p class="text-gray-700 dark:text-white/75">
        {{ t("shared.pages_terms.advertising_and_cookie_practices_are_described_in_our") }}
        <NuxtLink
          to="/privacy-policy"
          class="font-medium text-gray-900 underline dark:text-white"
        >
          {{ t("shared.layouts_default.privacy_policy") }}
        </NuxtLink>
        {{ t("shared.pages_terms.and") }}
        <NuxtLink
          to="/cookies"
          class="font-medium text-gray-900 underline dark:text-white"
        >
          {{ t("shared.pages_terms.cookie_policy") }}
        </NuxtLink>
        {{ t("shared.pages_terms.message") }}
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">
        {{ t("shared.pages_terms.no_warranty_and_limitation_of_liability") }}
      </h2>
      <p class="text-gray-700 dark:text-white/75">
        {{
          t("shared.pages_terms.chlat_work_is_provided_without_warranties_of_any_kind")
        }}
      </p>
      <p class="text-gray-700 dark:text-white/75">
        {{ t("shared.pages_terms.see_the") }}
        <NuxtLink
          to="/disclaimer"
          class="font-medium text-gray-900 underline dark:text-white"
        >
          {{ t("shared.pages_terms.disclaimer") }}
        </NuxtLink>
        {{ t("shared.pages_terms.for_more_detail") }}
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">{{ t("shared.common.contact") }}</h2>
      <p class="text-gray-700 dark:text-white/75">
        {{ t("shared.pages_terms.if_you_have_questions_about_these_terms_contact_us") }}
        <NuxtLink
          to="/contact"
          class="font-medium text-gray-900 underline dark:text-white"
        >
          {{ t("shared.pages_privacy_policy.contact_page") }}
        </NuxtLink>
        {{ t("shared.pages_privacy_policy.message") }}
      </p>
    </section>
  </main>
</template>
