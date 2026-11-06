<script setup lang="ts">
import { useAppI18n } from "~/composables/useAppI18n";
import { openPrivacyCookieSettings } from "~/lib/cookie-notice";
import { LOCAL_PROCESSING_PRIVACY_NOTE } from "~/lib/privacy-copy";

const { t } = useAppI18n();

const { isKhmer } = useLanguage();

const title = computed(() => t("shared.pages_privacy_policy.privacy_policy_chlat_work"));
const description = computed(() => t("shared.pages_privacy_policy.how_chlat_work_handles_browser_based_processing_data_collection"));
const reviewedAt = "2026-10-01";

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogType: "website",
  ogUrl: "https://chlatwork.com/privacy-policy",
  twitterCard: "summary_large_image",
  twitterTitle: title,
  twitterDescription: description,
});

useHead(() => ({
  link: [{ rel: "canonical", href: "https://chlatwork.com/privacy-policy" }],
  script: [
    {
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: title.value,
        url: "https://chlatwork.com/privacy-policy",
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
      <h1 class="text-2xl font-bold">{{ t("shared.pages_privacy_policy.privacy_policy") }}</h1>
      <p class="max-w-3xl text-gray-600 dark:text-white/70">
        {{
          t("shared.pages_privacy_policy.chlat_work_aims_to_collect_as_little_data_as")
        }}
      </p>
      <p class="text-sm text-gray-500 dark:text-white/50">
        {{ t("shared.pages_privacy_policy.last_updated_october_1_2026") }}
      </p>
    </header>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">{{ t("shared.pages_privacy_policy.what_data_chlat_work_collects") }}</h2>
      <template v-if="isKhmer">
        <p class="text-gray-700 dark:text-white/75">{{ t("shared.markup_app_pages_privacy_policy_vue.we_may_collect_basic_non_identifying_usage_and_reliability") }}</p>
        <p class="text-gray-700 dark:text-white/75">{{ t("shared.markup_app_pages_privacy_policy_vue.if_you_contact_us_by_email_we_receive_the") }}</p>
        <p class="text-gray-700 dark:text-white/75">{{ t("shared.markup_app_pages_privacy_policy_vue.if_you_sign_in_with_google_or_telegram_we") }}</p>
        <p class="text-gray-700 dark:text-white/75">{{ t("shared.markup_app_pages_privacy_policy_vue.while_you_are_signed_in_chlat_work_records_the") }}</p>
        <p class="text-gray-700 dark:text-white/75">{{ t("shared.markup_app_pages_privacy_policy_vue.favorite_tool_keys_and_favorite_developer_command_identifiers_are") }}</p>
        <p class="text-gray-700 dark:text-white/75">{{ t("shared.markup_app_pages_privacy_policy_vue.we_do_not_sell_personal_information") }}</p>
      </template>
      <template v-else lang="en">
        <p class="text-gray-700 dark:text-white/75">{{ t("shared.markup_app_pages_privacy_policy_vue.we_may_collect_basic_non_identifying_usage_and_reliability") }}</p>
        <p class="text-gray-700 dark:text-white/75">{{ t("shared.markup_app_pages_privacy_policy_vue.if_you_contact_us_by_email_we_receive_the") }}</p>
        <p class="text-gray-700 dark:text-white/75">{{ t("shared.markup_app_pages_privacy_policy_vue.if_you_sign_in_with_google_or_telegram_we") }}</p>
        <p class="text-gray-700 dark:text-white/75">{{ t("shared.markup_app_pages_privacy_policy_vue.while_you_are_signed_in_chlat_work_records_the") }}</p>
        <p class="text-gray-700 dark:text-white/75">{{ t("shared.markup_app_pages_privacy_policy_vue.favorite_tool_keys_and_favorite_developer_command_identifiers_are") }}</p>
        <p class="text-gray-700 dark:text-white/75">{{ t("shared.markup_app_pages_privacy_policy_vue.we_do_not_sell_personal_information") }}</p>
      </template>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">{{ t("shared.pages_privacy_policy.personal_assistant_data") }}</h2>
      <p class="text-gray-700 dark:text-white/75">
        {{
          t("shared.pages_privacy_policy.when_you_use_the_signed_in_telegram_personal_assistant")
        }}
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">{{ t("shared.pages_privacy_policy.accounts_and_authentication") }}</h2>
      <p class="text-gray-700 dark:text-white/75">
        {{
          t("shared.pages_privacy_policy.account_information_is_used_to_create_and_secure_your")
        }}
      </p>
      <p class="text-gray-700 dark:text-white/75">
        {{
          t("shared.pages_privacy_policy.google_and_telegram_process_the_sign_in_interaction_under")
        }}
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">
        {{ t("shared.pages_privacy_policy.browser_based_tools_and_local_processing") }}
      </h2>
      <p class="text-gray-700 dark:text-white/75">
        {{
          t("shared.pages_privacy_policy.many_chlat_work_tools_are_designed_to_run_directly")
        }}
      </p>
      <p class="text-gray-700 dark:text-white/75">
        {{ t("shared.privacy.local_processing_note") }}
      </p>
      <p class="text-gray-700 dark:text-white/75">
        {{
          t("shared.pages_privacy_policy.some_features_may_require_server_side_processing_when_browser")
        }}
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">{{ t("shared.pages_privacy_policy.expense_tracker_and_pay_back_data") }}</h2>
      <p class="text-gray-700 dark:text-white/75">
        {{
          t("shared.pages_privacy_policy.when_you_use_the_signed_in_expense_tracker_chlat")
        }}
      </p>
      <p class="text-gray-700 dark:text-white/75">
        {{
          t("shared.pages_privacy_policy.when_you_use_the_signed_in_pay_back_calculator")
        }}
      </p>
      <p class="text-gray-700 dark:text-white/75">
        {{
          t("shared.pages_privacy_policy.share_links_encode_their_contents_in_the_link_itself")
        }}
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">{{ t("shared.pages_privacy_policy.uploaded_files_and_images") }}</h2>
      <p class="text-gray-700 dark:text-white/75">
        {{
          t("shared.pages_privacy_policy.for_tools_that_process_files_locally_selected_files_are")
        }}
      </p>
      <p class="text-gray-700 dark:text-white/75">
        {{
          t("shared.pages_privacy_policy.you_should_still_review_downloaded_results_before_using_them")
        }}
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">{{ t("shared.pages_privacy_policy.cookies_analytics_and_ads") }}</h2>
      <p class="text-gray-700 dark:text-white/75">
        {{
          t("shared.pages_privacy_policy.chlat_work_may_use_cookies_local_storage_pixels_web")
        }}
      </p>
      <p class="text-gray-700 dark:text-white/75">
        {{
          t("shared.pages_privacy_policy.chlat_work_uses_vercel_web_analytics_to_understand_general")
        }}
      </p>
      <p class="text-gray-700 dark:text-white/75">
        {{
          t("shared.pages_privacy_policy.chlat_work_may_display_ads_using_third_party_advertising")
        }}
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">{{ t("shared.pages_privacy_policy.third_party_services") }}</h2>
      <p class="text-gray-700 dark:text-white/75">
        {{
          t("shared.pages_privacy_policy.chlat_work_may_use_third_party_services_for_hosting")
        }}
      </p>
      <ul class="list-disc space-y-1 pl-5 text-gray-700 dark:text-white/75">
        <li>{{ t("shared.pages_privacy_policy.vercel_for_hosting_deployment_and_web_analytics") }}</li>
        <li>{{ t("shared.pages_privacy_policy.third_party_advertising_partners_for_ads") }}</li>
        <li>{{ t("shared.pages_privacy_policy.google_identity_services_and_telegram_for_optional_account_login") }}</li>
        <li>
          {{
            t("shared.pages_privacy_policy.postgre_sql_and_the_infrastructure_provider_hosting_the_database")
          }}
        </li>
        <li>
          {{
            t("shared.pages_privacy_policy.browser_side_java_script_libraries_for_pdf_image_qr")
          }}
        </li>
        <li>
          {{
            t("shared.pages_privacy_policy.api_providers_only_where_a_specific_feature_cannot_run")
          }}
        </li>
      </ul>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">{{ t("shared.pages_privacy_policy.your_choices") }}</h2>
      <p class="text-gray-700 dark:text-white/75">
        {{
          t("shared.pages_privacy_policy.you_can_block_or_delete_cookies_and_local_storage")
        }}
      </p>
      <p class="text-gray-700 dark:text-white/75">
        {{
          t("shared.pages_privacy_policy.you_may_ask_to_access_correct_or_delete_your")
        }}
      </p>
      <p class="text-gray-700 dark:text-white/75">
        {{ t("shared.pages_privacy_policy.for_more_detail_about_cookies_read_the") }}
        <NuxtLink
          to="/cookies"
          class="font-medium text-gray-900 underline dark:text-white"
        >
          {{ t("shared.pages_privacy_policy.cookie_policy") }}
        </NuxtLink>
        {{ t("shared.pages_privacy_policy.message") }}
      </p>
      <button
        type="button"
        class="inline-flex items-center justify-center rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-800 transition hover:bg-gray-50 dark:border-white/15 dark:text-white dark:hover:bg-white/10"
        @click="openPrivacyCookieSettings"
      >
        {{ t("shared.pages_privacy_policy.privacy_cookie_settings") }}
      </button>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">{{ t("shared.pages_privacy_policy.data_retention") }}</h2>
      <p class="text-gray-700 dark:text-white/75">
        {{
          t("shared.pages_privacy_policy.for_browser_only_tools_chlat_work_does_not_receive")
        }}
      </p>
      <p class="text-gray-700 dark:text-white/75">
        {{
          t("shared.pages_privacy_policy.signed_in_tool_usage_history_remains_with_your_account")
        }}
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">{{ t("shared.pages_privacy_policy.children_s_privacy") }}</h2>
      <p class="text-gray-700 dark:text-white/75">
        {{
          t("shared.pages_privacy_policy.chlat_work_is_not_directed_to_children_under_13")
        }}
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">{{ t("shared.pages_privacy_policy.changes_to_this_policy") }}</h2>
      <p class="text-gray-700 dark:text-white/75">
        {{
          t("shared.pages_privacy_policy.we_may_update_this_privacy_policy_as_the_site")
        }}
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">{{ t("shared.common.contact") }}</h2>
      <p class="text-gray-700 dark:text-white/75">
        {{ t("shared.pages_privacy_policy.if_you_have_privacy_questions_contact_us_through_the") }}
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
