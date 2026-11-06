<script setup lang="ts">
import { useAppI18n } from "~/composables/useAppI18n";

const { t } = useAppI18n();
const { isKhmer } = useLanguage();

const title = "Editorial Policy - ChlatWork";
const description =
  "How ChlatWork plans, writes, reviews, and updates tool guides, policy pages, and financial workflow content.";
const reviewedAt = "2026-06-29";

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogType: "website",
  ogUrl: "https://chlatwork.com/editorial-policy",
  twitterCard: "summary_large_image",
  twitterTitle: title,
  twitterDescription: description,
});

useHead({
  link: [{ rel: "canonical", href: "https://chlatwork.com/editorial-policy" }],
  script: [
    {
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: title,
        url: "https://chlatwork.com/editorial-policy",
        description,
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
</script>

<template>
  <main class="mx-auto w-full max-w-[1440px] space-y-8">
    <header class="space-y-2">
      <h1 class="text-2xl font-bold">{{ t("shared.pages_editorial_policy.editorial_policy") }}</h1>
      <p class="max-w-3xl text-gray-600 dark:text-white/70">
        {{
          t("shared.pages_editorial_policy.this_page_explains_how_chlat_work_creates_and_maintains")
        }}
      </p>
      <p class="text-sm text-gray-500 dark:text-white/50">
        {{ t("shared.pages_editorial_policy.last_updated_june_29_2026") }}
      </p>
    </header>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">{{ t("shared.pages_editorial_policy.purpose_of_content") }}</h2>
      <p class="text-gray-700 dark:text-white/75">
        {{
          t("shared.pages_editorial_policy.chlat_work_content_is_designed_to_help_users_complete")
        }}
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">{{ t("shared.pages_editorial_policy.how_content_is_created") }}</h2>
      <ul class="list-disc space-y-1 pl-5 text-gray-700 dark:text-white/75">
        <li>
          {{
            t("shared.pages_editorial_policy.each_guide_starts_from_real_tool_behavior_and_user")
          }}
        </li>
        <li>
          {{
            t("shared.pages_editorial_policy.explanations_are_written_in_plain_language_with_practical_examples")
          }}
        </li>
        <li>
          {{
            t("shared.pages_editorial_policy.technical_and_financial_examples_are_checked_against_current_tool")
          }}
        </li>
        <li>
          {{
            t("shared.pages_editorial_policy.pages_are_updated_when_tool_behavior_browser_support_or")
          }}
        </li>
      </ul>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">{{ t("shared.pages_editorial_policy.financial_and_ymyl_content_standard") }}</h2>
      <p class="text-gray-700 dark:text-white/75">
        {{
          t("shared.pages_editorial_policy.pages_related_to_money_expenses_budgeting_and_payback_calculations")
        }}
      </p>
      <ul class="list-disc space-y-1 pl-5 text-gray-700 dark:text-white/75">
        <li>
          {{
            t("shared.pages_editorial_policy.financial_tools_are_educational_utilities_not_financial_advice")
          }}
        </li>
        <li>
          {{
            t("shared.pages_editorial_policy.users_are_reminded_to_verify_assumptions_fees_and_final")
          }}
        </li>
        <li>
          {{
            t("shared.pages_editorial_policy.content_avoids_promises_of_financial_outcomes_or_guaranteed_savings")
          }}
        </li>
      </ul>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">{{ t("shared.pages_editorial_policy.corrections_and_updates") }}</h2>
      <p class="text-gray-700 dark:text-white/75">
        {{
          t("shared.pages_editorial_policy.if_content_is_unclear_outdated_or_incorrect_chlat_work")
        }}
      </p>
      <p class="text-gray-700 dark:text-white/75">
        {{ t("shared.pages_editorial_policy.you_can_send_correction_requests_through_the") }}
        <NuxtLink
          to="/contact"
          class="font-medium text-gray-900 underline dark:text-white"
        >
          {{ t("shared.pages_privacy_policy.contact_page") }}
        </NuxtLink>
        {{ t("shared.pages_privacy_policy.message") }}
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">{{ t("shared.pages_editorial_policy.editorial_independence") }}</h2>
      <p class="text-gray-700 dark:text-white/75">
        {{
          t("shared.pages_editorial_policy.content_decisions_are_based_on_user_usefulness_and_accuracy")
        }}
      </p>
    </section>
  </main>
</template>
