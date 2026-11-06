<script setup lang="ts">
import type { ToolGuide } from "~/data/tool-guides";
import { getToolGuideKm } from "~/data/tool-guides-km";
import { getRelatedToolsForToolKey } from "~/data/tool-categories";
import { EDITORIAL_BYLINE } from "~/data/editorial-identity";
import { LOCAL_PROCESSING_PRIVACY_NOTE } from "~/lib/privacy-copy";
import ToolDirectoryCard from "~/components/tools/ToolDirectoryCard.vue";

const props = withDefaults(
  defineProps<{
    guide: ToolGuide;
    showRelated?: boolean;
  }>(),
  {
    showRelated: true,
  },
);
const route = useRoute();
const { isKhmer, localizeTool } = useLanguage();
const { websiteEnabled } = useFeatureAvailability();
const localizedTool = computed(() => localizeTool(props.guide.tool));
const shouldUseKhmerExamples = computed(
  () => isKhmer.value || route.path.startsWith("/km/"),
);

const guideKm = computed(() =>
  getToolGuideKm(
    props.guide.tool.key,
    localizedTool.value.name,
    localizedTool.value.description,
  ),
);

const whatIs = computed(() =>
  isKhmer.value && guideKm.value ? guideKm.value.whatIs : props.guide.whatIs,
);

const steps = computed(() =>
  (isKhmer.value && guideKm.value ? guideKm.value.steps : props.guide.steps).slice(0, 6),
);
const whyUse = computed(() =>
  (isKhmer.value && guideKm.value ? guideKm.value.whyUse : props.guide.whyUse).slice(0, 6),
);
const useCases = computed(() =>
  (isKhmer.value && guideKm.value ? guideKm.value.useCases : props.guide.useCases).slice(0, 6),
);
const practicalExamples = computed(() =>
  shouldUseKhmerExamples.value
    ? ((
        props.guide.practicalExamplesKm ?? props.guide.practicalExamples
      )?.slice(0, 3) ?? [])
    : (props.guide.practicalExamples?.slice(0, 3) ?? []),
);
const tips = computed(() =>
  (isKhmer.value && guideKm.value ? guideKm.value.tips : props.guide.tips).slice(0, 6),
);
const commonMistakes = computed(() => {
  if (isKhmer.value && guideKm.value?.commonMistakes?.length) {
    return guideKm.value.commonMistakes.slice(0, 6);
  }
  if (isKhmer.value) {
    return [
      "មិនបានពិនិត្យផ្ទៀងផ្ទាត់លទ្ធផលមុនពេលចែករំលែក ឬយកទៅប្រើប្រាស់។",
      "ប្រើប្រាស់ទិន្នន័យផលិតកម្មពិតប្រាកដក្នុងរូបភាពគំរូ។",
      "លុបឯកសារដើមចោលមុនពេលបញ្ជាក់ថាទិន្នន័យចុងក្រោយត្រឹមត្រូវ។",
    ];
  }
  return props.guide.commonMistakes?.length
    ? props.guide.commonMistakes.slice(0, 6)
    : [
        "Skipping the preview and sharing output without checking details.",
        "Using production data in screenshots or shared examples.",
        "Deleting originals before confirming the final output is correct.",
      ];
});
const faqs = computed(() =>
  (isKhmer.value && guideKm.value ? guideKm.value.faqs : props.guide.faqs).slice(0, 6),
);

const outputChecklistKm = [
  "សាកល្បងគំរូជាក់ស្តែងយ៉ាងហោចមួយដង មុនពេលចែករំលែក ឬបោះពុម្ព។",
  "បើកផ្ទៀងផ្ទាត់លើឧបករណ៍ ឬកម្មវិធីផ្សេង ដើម្បីបញ្ជាក់ពីភាពត្រូវគ្នា។",
  "ពិនិត្យឈ្មោះ លេខ កាលបរិច្ឆេទ និងតំណភ្ជាប់ ក្រែងមានកំហុសអក្ខរាវិរុទ្ធ។",
  "រក្សាទុកឯកសារ ឬអត្ថបទដើម រហូតដល់លទ្ធផលចុងក្រោយត្រូវបានទទួលយក។",
];

const privacyNotesKm = [
  "ដំណើរការផ្ទាល់លើ browser របស់អ្នកដោយសុវត្ថិភាព គ្មានការបញ្ជូនទិន្នន័យឯកជនទៅ server ក្រៅឡើយ។",
  "ពិនិត្យផ្ទៀងផ្ទាត់លទ្ធផលមុនពេលយកទៅប្រើប្រាស់ក្នុងអាជីវកម្ម ការសិក្សា ឬកិច្ចការផ្លូវការ។",
];

const privacyNotes = computed(() =>
  isKhmer.value
    ? privacyNotesKm
    : props.guide.privacy?.length
      ? props.guide.privacy
      : [
          LOCAL_PROCESSING_PRIVACY_NOTE,
          "Review the output before using it for business, school, customer, or public workflows.",
        ],
);
const relatedTools = computed(() =>
  getRelatedToolsForToolKey(
    props.guide.tool.key,
    4,
    (tool) => websiteEnabled(tool.key),
  ),
);
const practicalExamplesTitle = computed(() =>
  shouldUseKhmerExamples.value
    ? "ឧទាហរណ៍ប្រើប្រាស់ជាក់ស្តែង"
    : "Practical examples",
);
const practicalResultPrefix = computed(() =>
  shouldUseKhmerExamples.value ? "លទ្ធផល៖" : "Result:",
);
const reviewedDateLabel = "July 31, 2026";
const outputChecklist = [
  "Test at least one real sample before sharing or printing.",
  "Open the output on another device or app to confirm compatibility.",
  "Check names, numbers, dates, and links for typing mistakes.",
  "Keep the original file or text until the final output is accepted.",
];
const displayedOutputChecklist = computed(() =>
  isKhmer.value ? outputChecklistKm : outputChecklist,
);
</script>

<template>
  <section
    class="mx-auto mt-5 w-full max-w-[1180px] space-y-6 text-slate-950 dark:text-white"
    aria-label="Tool guide content"
  >
    <section
      class="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]"
    >
      <article
        class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.06]"
      >
        <p class="text-xs font-bold uppercase text-sky-700 dark:text-cyan-300">
          {{ isKhmer ? "ការណែនាំអំពីឧបករណ៍" : "Tool introduction" }}
        </p>
        <h2 class="mt-2 text-2xl font-black">
          {{ isKhmer ? `លក្ខណៈពិសេសរបស់ ${localizedTool.name}` : `What ${guide.tool.name} does` }}
        </h2>
        <div
          class="mt-4 space-y-3 text-sm leading-7 text-slate-600 dark:text-white/65"
        >
          <p v-for="paragraph in whatIs" :key="paragraph">
            {{ paragraph }}
          </p>
        </div>
      </article>

      <article
        class="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm dark:border-emerald-300/20 dark:bg-emerald-300/10"
      >
        <p
          class="text-xs font-bold uppercase text-emerald-700 dark:text-emerald-200"
        >
          {{ isKhmer ? "ភាពឯកជន និងការដំណើរការ" : "Privacy and processing" }}
        </p>
        <h2
          class="mt-2 text-xl font-black text-emerald-950 dark:text-emerald-50"
        >
          {{ isKhmer ? "របៀបគ្រប់គ្រងទិន្នន័យរបស់អ្នក" : "How your input is handled" }}
        </h2>
        <ul
          class="mt-4 space-y-3 text-sm leading-6 text-emerald-900/85 dark:text-emerald-100/80"
        >
          <li v-for="note in privacyNotes" :key="note" class="flex gap-3">
            <span
              class="mt-2 h-2 w-2 shrink-0 rounded-full bg-emerald-500"
              aria-hidden="true"
            />
            <span>{{ note }}</span>
          </li>
        </ul>
      </article>
    </section>

    <section class="grid gap-4 lg:grid-cols-2">
      <article
        class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.06]"
      >
        <h2 class="text-xl font-black">{{ isKhmer ? `របៀបប្រើប្រាស់ ${localizedTool.name}` : `How to use ${guide.tool.name}` }}</h2>
        <ol class="mt-4 space-y-3">
          <li
            v-for="(step, index) in steps"
            :key="step"
            class="flex gap-3 text-sm leading-6 text-slate-600 dark:text-white/65"
          >
            <span
              class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-950 text-xs font-black text-white dark:bg-white dark:text-slate-950"
            >
              {{ index + 1 }}
            </span>
            <span class="pt-0.5">{{ step }}</span>
          </li>
        </ol>
      </article>

      <article
        class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.06]"
      >
        <h2 class="text-xl font-black">{{ isKhmer ? "ហេតុផលដែលគួរប្រើឧបករណ៍នេះ" : "Why people use this tool" }}</h2>
        <ul class="mt-4 space-y-3">
          <li
            v-for="reason in whyUse"
            :key="reason"
            class="flex gap-3 text-sm leading-6 text-slate-600 dark:text-white/65"
          >
            <span
              class="mt-2 h-2 w-2 shrink-0 rounded-full bg-fuchsia-500"
              aria-hidden="true"
            />
            <span>{{ reason }}</span>
          </li>
        </ul>
      </article>

      <article
        class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.06]"
      >
        <h2 class="text-xl font-black">{{ isKhmer ? "ករណីប្រើប្រាស់ជាក់ស្តែង" : "Practical use cases" }}</h2>
        <ul class="mt-4 space-y-3">
          <li
            v-for="useCase in useCases"
            :key="useCase"
            class="flex gap-3 text-sm leading-6 text-slate-600 dark:text-white/65"
          >
            <span
              class="mt-2 h-2 w-2 shrink-0 rounded-full bg-sky-500"
              aria-hidden="true"
            />
            <span>{{ useCase }}</span>
          </li>
        </ul>
      </article>

      <article
        class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.06]"
      >
        <h2 class="text-xl font-black">{{ isKhmer ? "បញ្ជីត្រួតពិនិត្យលទ្ធផល" : "Output verification checklist" }}</h2>
        <ul class="mt-4 space-y-3">
          <li
            v-for="item in displayedOutputChecklist"
            :key="item"
            class="flex gap-3 text-sm leading-6 text-slate-600 dark:text-white/65"
          >
            <span
              class="mt-2 h-2 w-2 shrink-0 rounded-full bg-emerald-500"
              aria-hidden="true"
            />
            <span>{{ item }}</span>
          </li>
        </ul>
      </article>
    </section>

    <section
      class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.06]"
    >
      <h2 class="text-xl font-black">{{ isKhmer ? "គន្លឹះ និងកម្រិតកំណត់" : "Tips and limitations" }}</h2>
      <div class="mt-4 grid gap-3 md:grid-cols-2">
        <p
          v-for="tip in tips"
          :key="tip"
          class="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-600 dark:border-white/10 dark:bg-white/[0.05] dark:text-white/65"
        >
          {{ tip }}
        </p>
      </div>
    </section>

    <section
      v-if="practicalExamples.length > 0"
      class="rounded-2xl border border-indigo-200 bg-indigo-50 p-5 shadow-sm dark:border-indigo-300/25 dark:bg-indigo-300/10"
    >
      <h2 class="text-xl font-black text-indigo-950 dark:text-indigo-100">
        {{ practicalExamplesTitle }}
      </h2>
      <div class="mt-4 grid gap-4 lg:grid-cols-3">
        <article
          v-for="example in practicalExamples"
          :key="example.title"
          class="space-y-3 rounded-xl border border-indigo-200/80 bg-white p-4 dark:border-indigo-200/20 dark:bg-indigo-100/10"
        >
          <h3 class="text-sm font-black text-indigo-950 dark:text-indigo-100">
            {{ example.title }}
          </h3>
          <p
            class="text-sm leading-6 text-indigo-900/85 dark:text-indigo-100/80"
          >
            {{ example.scenario }}
          </p>
          <ol class="space-y-2">
            <li
              v-for="(step, index) in example.steps"
              :key="step"
              class="flex gap-2 text-sm leading-6 text-indigo-900/85 dark:text-indigo-100/80"
            >
              <span class="font-semibold">{{ index + 1 }}.</span>
              <span>{{ step }}</span>
            </li>
          </ol>
          <p
            class="text-xs font-semibold text-indigo-900/85 dark:text-indigo-100/80"
          >
            {{ practicalResultPrefix }} {{ example.result }}
          </p>
        </article>
      </div>
    </section>

    <section
      class="rounded-2xl border border-rose-200 bg-rose-50 p-5 shadow-sm dark:border-rose-300/25 dark:bg-rose-300/10"
    >
      <h2 class="text-xl font-black text-rose-950 dark:text-rose-100">
        {{ isKhmer ? "កំហុសទូទៅដែលគួរជៀសវាង" : "Common mistakes to avoid" }}
      </h2>
      <ul class="mt-4 space-y-3">
        <li
          v-for="mistake in commonMistakes"
          :key="mistake"
          class="flex gap-3 text-sm leading-6 text-rose-900/85 dark:text-rose-100/80"
        >
          <span
            class="mt-2 h-2 w-2 shrink-0 rounded-full bg-rose-500"
            aria-hidden="true"
          />
          <span>{{ mistake }}</span>
        </li>
      </ul>
    </section>

    <section
      id="faq"
      class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.06]"
    >
      <h2 class="text-xl font-black">{{ isKhmer ? "សំណួរដែលសួរញឹកញាប់" : "FAQ" }}</h2>
      <div class="mt-4 grid gap-3 md:grid-cols-2">
        <details
          v-for="faq in faqs"
          :key="faq.question"
          class="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/[0.05]"
        >
          <summary class="cursor-pointer text-sm font-bold">
            {{ faq.question }}
          </summary>
          <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-white/65">
            {{ faq.answer }}
          </p>
        </details>
      </div>
    </section>

    <section
      class="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm dark:border-amber-300/25 dark:bg-amber-300/10"
      aria-label="Trust and transparency"
    >
      <h2 class="text-xl font-black text-amber-950 dark:text-amber-100">
        {{ isKhmer ? "ទំនុកចិត្ត និងតម្លាភាព" : "Trust and transparency" }}
      </h2>
      <p
        class="mt-3 text-sm leading-6 text-amber-900/90 dark:text-amber-100/80"
      >
        {{ isKhmer ? "មេរៀន និងការណែនាំឧបករណ៍របស់ ChlatWork គឺសម្រាប់ជាព័ត៌មានអប់រំ និងជំនួយការងារទូទៅ។ សម្រាប់ការសម្រេចចិត្តសំខាន់ៗលើផ្នែកហិរញ្ញវត្ថុ ច្បាប់ ពន្ធ ឬវេជ្ជសាស្ត្រ សូមផ្ទៀងផ្ទាត់ជាមួយអ្នកជំនាញដែលមានសមត្ថកិច្ច។" : "ChlatWork tool guides are educational. For money, legal, tax, medical, or compliance-critical decisions, verify details with qualified professionals and confirm final outputs before use." }}
      </p>
      <p
        class="mt-2 text-xs font-semibold text-amber-900/80 dark:text-amber-100/75"
      >
        Checked against the ChlatWork editorial policy. Last updated:
        {{ reviewedDateLabel }}.
      </p>
      <p class="mt-1 text-xs text-amber-900/80 dark:text-amber-100/75">
        {{ EDITORIAL_BYLINE }}.
      </p>
      <div class="mt-4 flex flex-wrap gap-3 text-sm font-semibold">
        <NuxtLink
          to="/editorial-policy"
          class="rounded-full border border-amber-300/80 bg-white px-3 py-1.5 text-amber-900 transition hover:bg-amber-100 dark:border-amber-200/40 dark:bg-amber-100/10 dark:text-amber-100 dark:hover:bg-amber-100/20"
        >
          {{ isKhmer ? "គោលការណ៍វិចារណកថា" : "Editorial policy" }}
        </NuxtLink>
        <NuxtLink
          to="/disclaimer"
          class="rounded-full border border-amber-300/80 bg-white px-3 py-1.5 text-amber-900 transition hover:bg-amber-100 dark:border-amber-200/40 dark:bg-amber-100/10 dark:text-amber-100 dark:hover:bg-amber-100/20"
        >
          {{ isKhmer ? "ការបដិសេធ" : "Disclaimer" }}
        </NuxtLink>
        <NuxtLink
          to="/contact"
          class="rounded-full border border-amber-300/80 bg-white px-3 py-1.5 text-amber-900 transition hover:bg-amber-100 dark:border-amber-200/40 dark:bg-amber-100/10 dark:text-amber-100 dark:hover:bg-amber-100/20"
        >
          {{ isKhmer ? "ស្នើសុំការកែសម្រួល" : "Request a correction" }}
        </NuxtLink>
      </div>
    </section>

    <section v-if="showRelated && relatedTools.length" class="space-y-3">
      <h2 class="text-xl font-black">{{ isKhmer ? "ឧបករណ៍ពាក់ព័ន្ធ" : "Related tools" }}</h2>
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ToolDirectoryCard
          v-for="tool in relatedTools"
          :key="tool.key"
          :tool-key="tool.key"
          :name="localizeTool(tool).name"
          :route="tool.route"
        />
      </div>

    </section>
  </section>
</template>
