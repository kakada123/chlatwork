<script setup lang="ts">
import type { ToolGuide } from "~/data/tool-guides";
import { getRelatedToolsForToolKey } from "~/data/tool-categories";
import { getToolGuideRoute } from "~/data/tool-guide-routes";
import { ENABLED_TOOLS } from "~/lib/tool-registry";
import { LOCAL_PROCESSING_PRIVACY_NOTE } from "~/lib/privacy-copy";

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
const { isKhmer } = useLanguage();
const shouldUseKhmerExamples = computed(
  () => isKhmer.value || route.path.startsWith("/km/"),
);

const steps = computed(() => props.guide.steps.slice(0, 6));
const whyUse = computed(() => props.guide.whyUse.slice(0, 6));
const useCases = computed(() => props.guide.useCases.slice(0, 6));
const practicalExamples = computed(() =>
  shouldUseKhmerExamples.value
    ? ((
        props.guide.practicalExamplesKm ?? props.guide.practicalExamples
      )?.slice(0, 3) ?? [])
    : (props.guide.practicalExamples?.slice(0, 3) ?? []),
);
const tips = computed(() => props.guide.tips.slice(0, 6));
const commonMistakes = computed(() =>
  props.guide.commonMistakes?.length
    ? props.guide.commonMistakes.slice(0, 6)
    : [
        "Skipping the preview and sharing output without checking details.",
        "Using production data in screenshots or shared examples.",
        "Deleting originals before confirming the final output is correct.",
      ],
);
const faqs = computed(() => props.guide.faqs.slice(0, 6));
const privacyNotes = computed(() =>
  props.guide.privacy?.length
    ? props.guide.privacy
    : [
        LOCAL_PROCESSING_PRIVACY_NOTE,
        "Review the output before using it for business, school, customer, or public workflows.",
      ],
);
const relatedTools = computed(() =>
  getRelatedToolsForToolKey(props.guide.tool.key, 4),
);
const GUIDE_FALLBACK_LINKS: Record<string, string[]> = {
  qr: ["barcode"],
  barcode: ["qr"],
  "image-compress": ["image-to-pdf"],
  "image-to-pdf": ["image-compress"],
  "merge-pdf": ["split-pdf"],
  "split-pdf": ["merge-pdf"],
  "payback-calculator": ["expense-tracker"],
  "expense-tracker": ["payback-calculator"],
};

const relatedGuideLinks = computed(() => {
  const toolKey = props.guide.tool.key;
  const candidateKeys = [
    ...relatedTools.value.map((tool) => tool.key),
    ...(GUIDE_FALLBACK_LINKS[toolKey] ?? []),
  ];
  const uniqueKeys = [...new Set(candidateKeys)].filter(
    (key) => key !== toolKey,
  );

  return uniqueKeys
    .map((key) => {
      const route = getToolGuideRoute(key);
      const tool =
        relatedTools.value.find((item) => item.key === key) ??
        ENABLED_TOOLS.find((item) => item.key === key);

      if (!route || !tool) {
        return null;
      }

      return {
        key,
        path: route.path,
        name: tool.name,
      };
    })
    .filter((entry): entry is { key: string; path: string; name: string } =>
      Boolean(entry),
    )
    .slice(0, 4);
});
const practicalExamplesTitle = computed(() =>
  shouldUseKhmerExamples.value
    ? "ឧទាហរណ៍ប្រើប្រាស់ជាក់ស្តែង"
    : "Practical examples",
);
const practicalResultPrefix = computed(() =>
  shouldUseKhmerExamples.value ? "លទ្ធផល៖" : "Result:",
);
const relatedGuidesTitle = computed(() =>
  shouldUseKhmerExamples.value ? "មេរៀនពាក់ព័ន្ធ" : "Related guides",
);
const relatedGuidesDescription = computed(() =>
  shouldUseKhmerExamples.value
    ? "អានមេរៀនពាក់ព័ន្ធ ដើម្បីបានលទ្ធផលការងារល្អ និងត្រឹមត្រូវជាងមុន។"
    : "Read the matching how-to guides for similar tasks and better output quality.",
);
const guideChipSuffix = computed(() =>
  shouldUseKhmerExamples.value ? "មេរៀន" : "guide",
);
const reviewedDateLabel = "June 29, 2026";
const outputChecklist = [
  "Test at least one real sample before sharing or printing.",
  "Open the output on another device or app to confirm compatibility.",
  "Check names, numbers, dates, and links for typing mistakes.",
  "Keep the original file or text until the final output is accepted.",
];
</script>

<template>
  <section
    class="mx-auto mt-8 w-full max-w-[1180px] space-y-6 text-slate-950 dark:text-white"
    aria-label="Tool guide content"
  >
    <section
      class="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]"
    >
      <article
        class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.06]"
      >
        <p class="text-xs font-bold uppercase text-sky-700 dark:text-cyan-300">
          Tool introduction
        </p>
        <h2 class="mt-2 text-2xl font-black">
          What {{ guide.tool.name }} does
        </h2>
        <div
          class="mt-4 space-y-3 text-sm leading-7 text-slate-600 dark:text-white/65"
        >
          <p v-for="paragraph in guide.whatIs" :key="paragraph">
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
          Privacy and processing
        </p>
        <h2
          class="mt-2 text-xl font-black text-emerald-950 dark:text-emerald-50"
        >
          How your input is handled
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
        <h2 class="text-xl font-black">How to use {{ guide.tool.name }}</h2>
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
        <h2 class="text-xl font-black">Why people use this tool</h2>
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
        <h2 class="text-xl font-black">Practical use cases</h2>
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
        <h2 class="text-xl font-black">Output verification checklist</h2>
        <ul class="mt-4 space-y-3">
          <li
            v-for="item in outputChecklist"
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
      <h2 class="text-xl font-black">Tips and limitations</h2>
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
        Common mistakes to avoid
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
      <h2 class="text-xl font-black">FAQ</h2>
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
        Trust and transparency
      </h2>
      <p
        class="mt-3 text-sm leading-6 text-amber-900/90 dark:text-amber-100/80"
      >
        ChlatWork tool guides are educational. For money, legal, tax, medical,
        or compliance-critical decisions, verify details with qualified
        professionals and confirm final outputs before use.
      </p>
      <p
        class="mt-2 text-xs font-semibold text-amber-900/80 dark:text-amber-100/75"
      >
        Reviewed by ChlatWork editorial standards. Last reviewed:
        {{ reviewedDateLabel }}.
      </p>
      <p class="mt-1 text-xs text-amber-900/80 dark:text-amber-100/75">
        Author: Kakada. Reviewer: ChlatWork Editorial.
      </p>
      <div class="mt-4 flex flex-wrap gap-3 text-sm font-semibold">
        <NuxtLink
          to="/editorial-policy"
          class="rounded-full border border-amber-300/80 bg-white px-3 py-1.5 text-amber-900 transition hover:bg-amber-100 dark:border-amber-200/40 dark:bg-amber-100/10 dark:text-amber-100 dark:hover:bg-amber-100/20"
        >
          Editorial policy
        </NuxtLink>
        <NuxtLink
          to="/disclaimer"
          class="rounded-full border border-amber-300/80 bg-white px-3 py-1.5 text-amber-900 transition hover:bg-amber-100 dark:border-amber-200/40 dark:bg-amber-100/10 dark:text-amber-100 dark:hover:bg-amber-100/20"
        >
          Disclaimer
        </NuxtLink>
        <NuxtLink
          to="/contact"
          class="rounded-full border border-amber-300/80 bg-white px-3 py-1.5 text-amber-900 transition hover:bg-amber-100 dark:border-amber-200/40 dark:bg-amber-100/10 dark:text-amber-100 dark:hover:bg-amber-100/20"
        >
          Request a correction
        </NuxtLink>
      </div>
    </section>

    <section v-if="showRelated" class="space-y-3">
      <h2 class="text-xl font-black">Related tools</h2>
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <NuxtLink
          v-for="tool in relatedTools"
          :key="tool.key"
          :to="tool.route"
          class="rounded-2xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-md dark:border-white/10 dark:bg-white/[0.06] dark:hover:bg-white/[0.10]"
        >
          <h3 class="text-sm font-black">{{ tool.name }}</h3>
          <p
            class="mt-2 line-clamp-2 text-xs leading-5 text-slate-500 dark:text-white/55"
          >
            {{ tool.description }}
          </p>
        </NuxtLink>
      </div>

      <div
        v-if="relatedGuideLinks.length > 0"
        class="rounded-2xl border border-sky-200 bg-sky-50 p-4 dark:border-cyan-300/25 dark:bg-cyan-300/10"
      >
        <h3 class="text-sm font-black text-sky-900 dark:text-cyan-100">
          {{ relatedGuidesTitle }}
        </h3>
        <p class="mt-1 text-xs leading-5 text-sky-800/90 dark:text-cyan-100/80">
          {{ relatedGuidesDescription }}
        </p>
        <div class="mt-3 flex flex-wrap gap-2">
          <NuxtLink
            v-for="link in relatedGuideLinks"
            :key="link.key"
            :to="link.path"
            class="rounded-full border border-sky-300/80 bg-white px-3 py-1.5 text-xs font-semibold text-sky-900 transition hover:bg-sky-100 dark:border-cyan-200/40 dark:bg-cyan-100/10 dark:text-cyan-100 dark:hover:bg-cyan-100/20"
          >
            {{ link.name }} {{ guideChipSuffix }}
          </NuxtLink>
        </div>
      </div>
    </section>
  </section>
</template>
