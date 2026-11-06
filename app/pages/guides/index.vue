<script setup lang="ts">
import { useAppI18n } from "~/composables/useAppI18n";
import { STARTER_GUIDES } from "~/data/guides";
import { getStarterGuideKm } from "~/data/starter-guides-km";
import { BookOpen } from "lucide-vue-next";

const { t } = useAppI18n();

const { isKhmer } = useLanguage();
const title = computed(() => t("shared.pages_guides_index.chlat_work_guides_practical_tool_workflows"));
const description = computed(() => t("shared.pages_guides_index.practical_guides_for_qr_codes_barcodes_pdf_workflows_khmer"));

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogType: "website",
  ogUrl: "https://chlatwork.com/guides",
  twitterCard: "summary_large_image",
  twitterTitle: title,
  twitterDescription: description,
});

useHead({
  link: [{ rel: "canonical", href: "https://chlatwork.com/guides" }],
});
</script>

<template>
  <main class="mx-auto w-full max-w-[1200px] space-y-8 text-slate-950 dark:text-white">
    <header class="border-b border-slate-200 pb-5 dark:border-white/10">
      <h1 class="text-3xl font-black sm:text-4xl">
        {{ t("shared.pages_guides_index.guides") }}
      </h1>
      <p class="mt-2 text-xs text-slate-500 dark:text-white/50">
        {{ t("shared.pages_guides_index.practical_workflows", { STARTERGUIDESLength: STARTER_GUIDES.length }) }}
      </p>
    </header>

    <section class="grid gap-4 sm:grid-cols-2">
      <NuxtLink
        v-for="guide in STARTER_GUIDES"
        :key="guide.slug"
        :to="guide.path"
        class="group flex gap-4 rounded-2xl border border-slate-200 bg-white p-4 transition-colors hover:border-sky-400 hover:bg-sky-50/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-white/10 dark:bg-white/[0.05] dark:hover:border-cyan-300/40 dark:hover:bg-white/[0.08]"
      >
        <span class="tool-icon-tone tool-icon-tone-blue flex size-11 shrink-0 items-center justify-center rounded-xl" aria-hidden="true"><BookOpen class="size-6" /></span>
        <div class="min-w-0">
          <p class="text-xs font-semibold text-sky-700 dark:text-cyan-300">
            {{ isKhmer && getStarterGuideKm(guide.slug) ? getStarterGuideKm(guide.slug)!.primaryToolLabel : guide.primaryTool.label }}
          </p>
          <h2 class="mt-1 text-lg font-semibold group-hover:text-sky-700 dark:group-hover:text-cyan-200">
            {{ isKhmer && getStarterGuideKm(guide.slug) ? getStarterGuideKm(guide.slug)!.title : guide.title }}
          </h2>
          <p class="mt-2 line-clamp-2 text-sm leading-5 text-slate-600 dark:text-white/60">
            {{ isKhmer && getStarterGuideKm(guide.slug)?.metaDescription ? getStarterGuideKm(guide.slug)!.metaDescription : guide.metaDescription }}
          </p>
        </div>
      </NuxtLink>
    </section>
  </main>
</template>
