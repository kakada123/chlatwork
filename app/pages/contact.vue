<script setup lang="ts">
import { useAppI18n } from "~/composables/useAppI18n";
import { useLanguage } from "~/composables/useLanguage";

const { t } = useAppI18n();

const { isKhmer } = useLanguage();

const title = computed(() =>
  t("shared.pages_contact.contact_chlat_work"),
);
const description = computed(() =>
  t("shared.pages_contact.contact_chlat_work_to_report_bugs_request_tools_share"),
);
const reviewedAt = "2026-06-29";

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogType: "website",
  ogUrl: "https://chlatwork.com/contact",
  twitterCard: "summary_large_image",
  twitterTitle: title,
  twitterDescription: description,
});

useHead({
  link: [{ rel: "canonical", href: "https://chlatwork.com/contact" }],
  script: [
    {
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: "Contact ChlatWork",
        url: "https://chlatwork.com/contact",
        description:
          "Contact ChlatWork to report bugs, request tools, share feedback, or ask privacy and cookie questions.",
        dateModified: reviewedAt,
        publisher: {
          "@type": "Organization",
          name: "ChlatWork",
          url: "https://chlatwork.com",
        },
      }),
    },
  ],
});

const email = "support@chlatwork.com";
</script>

<template>
  <main class="content-page mx-auto w-full max-w-[960px] space-y-5">
    <header class="space-y-2">
      <h1 class="text-2xl font-bold">
        {{ t("shared.common.contact") }}
      </h1>
      <p class="max-w-3xl text-gray-600 dark:text-white/70">
        {{ t("shared.pages_contact.use_this_page_for_chlat_work_feedback_bug_reports")
        }}
      </p>
    </header>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">
        {{ t("shared.pages_contact.email") }}
      </h2>
      <p class="text-gray-700 dark:text-white/75">
        {{ t("shared.pages_contact.you_can_contact_us_at") }}
        <a
          :href="`mailto:${email}`"
          class="font-semibold text-gray-900 underline dark:text-white"
        >
          {{ email }}
        </a>
      </p>
      <p class="max-w-3xl text-sm text-gray-500 dark:text-white/55">
        {{ t("shared.pages_contact.please_include_the_tool_name_the_page_url_your")
        }}
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">
        {{ t("shared.pages_contact.what_we_can_help_with") }}
      </h2>
      <ul class="list-disc space-y-1 pl-5 text-gray-700 dark:text-white/75">
        <li>{{ t("shared.pages_contact.bug_reports_and_broken_tool_behavior") }}</li>
        <li>
          {{ t("shared.pages_contact.feature_requests_for_pdf_qr_image_utility_and_developer") }}
        </li>
        <li>{{ t("shared.pages_contact.privacy_cookie_advertising_and_data_handling_questions") }}</li>
        <li>{{ t("shared.pages_contact.corrections_for_guide_pages_tool_descriptions_or_examples") }}</li>
      </ul>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">
        {{ t("shared.pages_contact.before_sending_private_data") }}
      </h2>
      <p class="max-w-3xl text-gray-700 dark:text-white/75">
        {{ t("shared.pages_contact.do_not_email_passwords_private_keys_payment_details_identity")
        }}
      </p>
    </section>
  </main>
</template>
