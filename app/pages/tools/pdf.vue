<script setup lang="ts">
import {
  TOOL_DIRECTORY_CATEGORIES,
  getToolsForDirectoryCategory,
} from "~/data/tool-categories";
import { LOCAL_PROCESSING_PRIVACY_NOTE } from "~/lib/privacy-copy";
import ToolDirectoryCard from "~/components/tools/ToolDirectoryCard.vue";
import { useLanguage } from "~/composables/useLanguage";

const { isKhmer, localizeTool } = useLanguage();

const pdfCategory = TOOL_DIRECTORY_CATEGORIES.find(
  (category) => category.key === "pdf",
);
const { websiteEnabled } = useFeatureAvailability();
const pdfTools = computed(() =>
  pdfCategory
    ? getToolsForDirectoryCategory(pdfCategory).filter((tool) => websiteEnabled(tool.key)).map(localizeTool)
    : [],
);

useSeoMeta({
  title: computed(() => isKhmer.value ? "ឧបករណ៍ PDF - ChlatWork" : "PDF Tools Online - ChlatWork"),
  description: computed(() => isKhmer.value ? "ឧបករណ៍ PDF ក្នុង browser ឥតគិតថ្លៃសម្រាប់បម្លែង បញ្ចូល បំបែក លុបទំព័រ តម្រៀបទំព័រ និងបង្កើតវិក្កយបត្រ។" : "Free browser-side PDF tools for converting, merging, splitting, removing pages, reordering pages, and generating invoices."),
  ogTitle: computed(() => isKhmer.value ? "ឧបករណ៍ PDF - ChlatWork" : "PDF Tools Online - ChlatWork"),
  ogDescription: computed(() => isKhmer.value ? "ឧបករណ៍ PDF ក្នុង browser ឥតគិតថ្លៃសម្រាប់បម្លែង បញ្ចូល បំបែក លុបទំព័រ តម្រៀបទំព័រ និងបង្កើតវិក្កយបត្រ។" : "Free browser-side PDF tools for converting, merging, splitting, removing pages, reordering pages, and generating invoices."),
  ogType: "website",
  ogUrl: "https://chlatwork.com/tools/pdf",
  twitterCard: "summary_large_image",
});

useHead({
  link: [
    {
      rel: "canonical",
      href: "https://chlatwork.com/tools/pdf",
    },
  ],
});
</script>

<template>
  <main class="mx-auto w-full max-w-[1440px] space-y-8">
    <header class="space-y-3">
      <NuxtLink
        to="/tools"
        class="hidden text-sm font-semibold text-sky-700 hover:text-sky-900 dark:text-cyan-300 dark:hover:text-cyan-200 sm:inline-flex"
      >
        {{ isKhmer ? "← ឧបករណ៍ទាំងអស់" : "← All tools" }}
      </NuxtLink>

      <div class="space-y-2">
        <p class="text-xs font-semibold uppercase text-sky-600 dark:text-cyan-300">
          {{ isKhmer ? "ឧបករណ៍ឯកសារដំណើរការលើ Browser" : "Local-first document tools" }}
        </p>
        <h1 class="text-3xl font-black text-slate-950 dark:text-white sm:text-4xl">
          {{ isKhmer ? "ឧបករណ៍ PDF" : "PDF Tools" }}
        </h1>
        <p class="max-w-3xl text-sm leading-6 text-slate-600 dark:text-white/65">
          {{ isKhmer
            ? "បម្លែង បញ្ចូល បំបែក លុបទំព័រ តម្រៀបទំព័រ និងបង្កើតឯកសារ PDF ដោយផ្ទាល់ក្នុង browser របស់អ្នក។ ឯកសារស្ថិតនៅលើឧបករណ៍របស់អ្នកប្រកបដោយសុវត្ថិភាព។"
            : "Convert, merge, split, remove pages, reorder pages, and create simple PDFs directly in your browser. Files stay on your device whenever the browser can process them safely."
          }}
        </p>
      </div>
    </header>

    <section
      class="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-300/20 dark:bg-emerald-300/10 dark:text-emerald-100"
    >
      <p class="font-semibold">{{ isKhmer ? "ដំណើរការ PDF ប្រកបដោយភាពឯកជនខ្ពស់" : "Privacy-first PDF processing" }}</p>
      <p class="mt-1 text-xs opacity-80">
        {{ isKhmer ? "ទិន្នន័យរបស់អ្នកត្រូវបានដំណើរការនៅក្នុង browser របស់អ្នកតាមដែលអាចធ្វើទៅបាន។ យើងមិនរក្សាទុកឯកសារ ឬព័ត៌មានរបស់អ្នកនៅលើ Server របស់យើងឡើយ។" : LOCAL_PROCESSING_PRIVACY_NOTE }}
      </p>
    </section>

    <p v-if="!pdfTools.length" class="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600 dark:border-white/10 dark:bg-white/[0.06] dark:text-white/65">
      {{ isKhmer ? "ឧបករណ៍ PDF មិនអាចប្រើប្រាស់បានជាបណ្តោះអាសន្ន។" : "PDF tools are temporarily unavailable." }}
    </p>

    <section v-else class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <ToolDirectoryCard
        v-for="tool in pdfTools"
        :key="tool.key"
        :tool-key="tool.key"
        :name="tool.name"
        :route="tool.route"
      />
    </section>
  </main>
</template>
