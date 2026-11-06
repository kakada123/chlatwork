<script setup lang="ts">
import { useAppI18n } from "~/composables/useAppI18n";
import { useLanguage } from "~/composables/useLanguage";
import { LOCAL_PROCESSING_PRIVACY_NOTE } from "~/lib/privacy-copy";

const { t } = useAppI18n();

const { isKhmer } = useLanguage();

const title = computed(() =>
  t("shared.pages_about.about_chlat_work_simple_online_tools"),
);
const description = computed(() =>
  t("shared.pages_about.learn_what_chlat_work_is_who_it_is_for"),
);
const maintainerName = "Kakada";
const maintainerEmail = "kakada127@gmail.com";

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogType: "website",
  ogUrl: "https://chlatwork.com/about",
  twitterCard: "summary_large_image",
  twitterTitle: title,
  twitterDescription: description,
});

useHead({
  link: [{ rel: "canonical", href: "https://chlatwork.com/about" }],
  script: [
    {
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "Organization",
            name: "ChlatWork",
            url: "https://chlatwork.com",
            contactPoint: [
              {
                "@type": "ContactPoint",
                contactType: "customer support",
                email: maintainerEmail,
              },
            ],
          },
          {
            "@type": "Person",
            name: maintainerName,
            email: maintainerEmail,
            worksFor: {
              "@type": "Organization",
              name: "ChlatWork",
            },
          },
        ],
      }),
    },
  ],
});
</script>

<template>
  <main class="content-page mx-auto w-full max-w-[960px] space-y-5">
    <header class="space-y-2">
      <h1 class="text-2xl font-bold">
        {{ t("shared.pages_about.about_chlat_work") }}
      </h1>
      <p class="max-w-3xl text-gray-600 dark:text-white/70">
        {{ t("shared.pages_about.chlat_work_is_an_independent_collection_of_focused_browser")
        }}
      </p>
      <p class="max-w-3xl text-gray-600 dark:text-white/70">
        {{ t("shared.pages_about.the_goal_is_simple_each_page_should_help_you")
        }}
      </p>
      <p class="text-sm text-gray-500 dark:text-white/50">
        {{ t("shared.pages_about.last_updated_august_21_2026") }}
      </p>
    </header>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">
        {{ t("shared.pages_about.who_runs_chlat_work") }}
      </h2>
      <p class="text-gray-700 dark:text-white/75">
        {{ t("shared.pages_about.chlat_work_is_maintained_by_an_independent_builder_focused", { maintainerName: maintainerName })
        }}
      </p>
      <p class="text-gray-700 dark:text-white/75">
        {{ t("shared.pages_about.for_corrections_bug_reports_or_policy_questions_you_can")
        }}
        <NuxtLink
          to="/contact"
          class="font-medium text-gray-900 underline dark:text-white"
        >
          {{ t("shared.pages_privacy_policy.contact_page") }}
        </NuxtLink>
        {{ t("shared.pages_about.or_email") }}
        <a
          :href="`mailto:${maintainerEmail}`"
          class="font-medium text-gray-900 underline dark:text-white"
        >
          {{ maintainerEmail }}</a>.
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">
        {{ t("shared.pages_about.who_chlat_work_is_for") }}
      </h2>
      <p class="text-gray-700 dark:text-white/75">
        {{ t("shared.pages_about.chlat_work_is_for_students_office_teams_developers_freelancers")
        }}
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">
        {{ t("shared.pages_about.why_cambodia_and_khmer_workflows_matter") }}
      </h2>
      <p class="text-gray-700 dark:text-white/75">
        {{ t("shared.pages_about.many_generic_tool_websites_work_technically_but_ignore_local")
        }}
      </p>
      <p class="text-gray-700 dark:text-white/75">
        {{ t("shared.pages_about.that_does_not_mean_every_tool_forces_a_cambodia")
        }}
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">
        {{ t("shared.pages_about.what_you_can_do_here") }}
      </h2>
      <ul class="list-disc space-y-1 pl-5 text-gray-700 dark:text-white/75">
        <li>
          {{ t("shared.pages_about.generate_barcodes_qr_codes_and_wi_fi_qr_posters")
          }}
        </li>
        <li>
          {{ t("shared.pages_about.compress_images_and_convert_images_or_pdfs_for_forms")
          }}
        </li>
        <li>
          {{ t("shared.pages_about.use_developer_helpers_such_as_json_formatting_jwt_decoding")
          }}
        </li>
        <li>
          {{ t("shared.pages_about.split_shared_expenses_track_personal_spending_run_simple_lucky")
          }}
        </li>
      </ul>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">
        {{ t("shared.pages_about.how_the_tools_are_built") }}
      </h2>
      <p class="text-gray-700 dark:text-white/75">
        {{ t("shared.pages_about.chlat_work_tools_are_intentionally_small_and_task_specific")
        }}
      </p>
      <p class="text-gray-700 dark:text-white/75">
        {{ t("shared.pages_about.content_quality_and_updates_follow_a_documented")
        }}
        <NuxtLink
          to="/editorial-policy"
          class="font-medium text-gray-900 underline dark:text-white"
        >
          {{ t("shared.pages_about.editorial_policy") }}
        </NuxtLink>
        {{ t("shared.pages_about.with_extra_care_for_money_related_pages") }}
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">
        {{ t("shared.pages_about.privacy_first_approach") }}
      </h2>
      <p class="text-gray-700 dark:text-white/75">
        {{ t("shared.pages_about.many_chlat_work_tools_are_designed_to_run_directly")
        }}
        {{ LOCAL_PROCESSING_PRIVACY_NOTE }}
      </p>
      <p class="text-gray-700 dark:text-white/75">
        {{ t("shared.pages_about.some_features_may_use_a_server_when_browser_only")
        }}
        <NuxtLink
          to="/privacy-policy"
          class="font-medium text-gray-900 underline dark:text-white"
        >
          {{ t("shared.layouts_default.privacy_policy") }}
        </NuxtLink>.
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">
        {{ t("shared.pages_about.why_chlat_work_exists") }}
      </h2>
      <p class="text-gray-700 dark:text-white/75">
        {{ t("shared.pages_about.chlat_means_smart_so_chlat_work_means_smart_work")
        }}
      </p>
      <p class="text-gray-700 dark:text-white/75">
        {{ t("shared.pages_about.the_site_is_updated_as_new_practical_needs_appear")
        }}
        <NuxtLink
          to="/contact"
          class="font-medium text-gray-900 underline dark:text-white"
        >
          {{ t("shared.pages_privacy_policy.contact_page") }}
        </NuxtLink>.
      </p>
    </section>
  </main>
</template>
