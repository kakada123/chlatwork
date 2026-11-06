<script setup lang="ts">
import { useAppI18n } from "~/composables/useAppI18n";
import { openPrivacyCookieSettings } from "~/lib/cookie-notice";

const { t } = useAppI18n();

const { isKhmer } = useLanguage();

const title = computed(() => t("shared.pages_cookies.cookie_policy_chlat_work"));
const description = computed(() => t("shared.pages_cookies.how_chlat_work_uses_cookies_local_storage_analytics_advertising"));

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogType: "website",
  ogUrl: "https://chlatwork.com/cookies",
  twitterCard: "summary_large_image",
  twitterTitle: title,
  twitterDescription: description,
});

useHead({
  link: [{ rel: "canonical", href: "https://chlatwork.com/cookies" }],
});
</script>

<template>
  <main class="mx-auto w-full max-w-[1440px] space-y-8">
    <header class="space-y-2">
      <h1 class="text-2xl font-bold">{{ t("shared.pages_privacy_policy.cookie_policy") }}</h1>
      <p class="text-gray-600 dark:text-white/70">
        {{
          t("shared.pages_cookies.this_page_explains_how_chlat_work_may_use_cookies")
        }}
      </p>
      <p class="text-sm text-gray-500 dark:text-white/50">
        {{ t("shared.pages_privacy_policy.last_updated_october_1_2026") }}
      </p>
    </header>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">{{ t("shared.pages_cookies.what_cookies_are") }}</h2>
      <p class="text-gray-700 dark:text-white/75">
        {{
          t("shared.pages_cookies.cookies_are_small_files_stored_on_your_device_by")
        }}
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">{{ t("shared.pages_cookies.how_we_use_cookies") }}</h2>
      <ul class="list-disc space-y-1 pl-5 text-gray-700 dark:text-white/75">
        <li>{{ t("shared.pages_cookies.to_keep_site_features_working_correctly") }}</li>
        <li>{{ t("shared.pages_cookies.to_remember_basic_preferences_where_needed") }}</li>
        <li>{{ t("shared.pages_cookies.to_understand_site_usage_and_improve_reliability") }}</li>
        <li>{{ t("shared.pages_cookies.to_help_detect_abuse_fraud_or_security_issues") }}</li>
        <li>{{ t("shared.pages_cookies.to_display_measure_and_improve_ads") }}</li>
      </ul>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">{{ t("shared.pages_cookies.first_party_cookies_and_storage") }}</h2>
      <p class="text-gray-700 dark:text-white/75">
        {{
          t("shared.pages_cookies.chlat_work_may_store_small_preferences_directly_in_your")
        }}
      </p>
      <ul class="list-disc space-y-1 pl-5 text-gray-700 dark:text-white/75">
        <li>
          <code>app-locale</code>: {{ t("shared.pages_cookies.remembers_your_selected_language") }}
        </li>
        <li>
          <code>chlatwork-color-mode</code>: {{ t("shared.pages_cookies.remembers_light_or_dark_mode") }}
        </li>
        <li>
          <code>chlatwork_cookie_notice_closed</code>: {{ t("shared.pages_cookies.remembers_that_you_closed_the_cookie_notice") }}
        </li>
        <li>
          <code>chlatwork_access_token</code>: {{ t("shared.pages_cookies.an_essential_http_only_login_cookie_that_expires_after") }}
        </li>
        <li>
          <code>chlatwork_refresh_token</code>: {{ t("shared.pages_cookies.an_essential_http_only_session_cookie_that_expires_after") }}
        </li>
        <li>
          {{ t("shared.pages_cookies.temporary_http_only_telegram_state_and_pkce_cookies_protect") }}
        </li>
      </ul>
      <p class="text-gray-700 dark:text-white/75">
        {{
          t("shared.pages_cookies.authentication_cookies_are_strictly_necessary_when_you_choose_to")
        }}
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">{{ t("shared.pages_cookies.cookie_notice") }}</h2>
      <p class="text-gray-700 dark:text-white/75">
        {{
          t("shared.pages_cookies.chlat_work_shows_a_small_informational_cookie_notice_with")
        }}
      </p>
      <p class="text-gray-700 dark:text-white/75">
        {{
          t("shared.pages_cookies.the_notice_is_informational_only_and_does_not_include")
        }}
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">{{ t("shared.pages_cookies.analytics") }}</h2>
      <p class="text-gray-700 dark:text-white/75">
        {{
          t("shared.pages_cookies.chlat_work_uses_vercel_web_analytics_to_understand_site")
        }}
      </p>
      <p class="text-gray-700 dark:text-white/75">
        {{
          t("shared.pages_cookies.chlat_work_also_installs_the_google_tag_with_consent")
        }}
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">{{ t("shared.pages_cookies.advertising_cookies") }}</h2>
      <p class="text-gray-700 dark:text-white/75">
        {{
          t("shared.pages_cookies.chlat_work_may_use_third_party_advertising_partners_these")
        }}
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">{{ t("shared.pages_cookies.managing_cookies") }}</h2>
      <p class="text-gray-700 dark:text-white/75">
        {{ t("shared.pages_cookies.you_can_block_delete_or_limit_cookies_in_your") }}
      </p>
      <p class="text-gray-700 dark:text-white/75">
        {{ t("shared.pages_cookies.if_you_disable_cookies_or_local_storage_some_chlat") }}
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
      <h2 class="text-lg font-semibold">{{ t("shared.pages_cookies.regional_consent_requirements") }}</h2>
      <p class="text-gray-700 dark:text-white/75">
        {{
          t("shared.pages_cookies.some_regions_and_advertising_policies_require_additional_consent_controls")
        }}
      </p>
      <p class="text-gray-700 dark:text-white/75">
        {{
          t("shared.pages_cookies.closing_chlat_work_s_informational_cookie_notice_does_not")
        }}
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">{{ t("shared.common.contact") }}</h2>
      <p class="text-gray-700 dark:text-white/75">
        {{ t("shared.pages_cookies.if_you_have_questions_about_cookies_please_contact_us") }}
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
