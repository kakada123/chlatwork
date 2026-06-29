<script setup lang="ts">
import type { ToolGuide } from "~/data/tool-guides";
import { getRelatedToolsForToolKey } from "~/data/tool-categories";
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

const steps = computed(() => props.guide.steps.slice(0, 6));
const useCases = computed(() => props.guide.useCases.slice(0, 6));
const tips = computed(() => props.guide.tips.slice(0, 6));
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
    </section>
  </section>
</template>
