<script setup lang="ts">
import {
  ArrowRight,
  Download,
  PenLine,
  RotateCcw,
  Sparkles,
} from "lucide-vue-next";
import CopyButton from "~/components/developer-tools/CopyButton.vue";
import type { CreatorGenerationState } from "~/composables/useCreatorTool";
import type { CreatorToolDefinition } from "~/data/creator-tools";
import type {
  CreatorGenerationResult,
  CreatorResultSection,
} from "~/services/creator-ai.service";

const props = defineProps<{
  tool: CreatorToolDefinition;
  state: CreatorGenerationState;
  result: CreatorGenerationResult | null;
}>();

const emit = defineEmits<{
  regenerate: [];
  variation: [];
  replace: [];
  downloadSrt: [];
  useIdea: [target: "post" | "script", topic: string];
}>();

const activeSectionId = ref("");
const editing = ref(false);
const editableSections = ref<CreatorResultSection[]>([]);

watch(
  () => props.result,
  (result) => {
    editableSections.value =
      result?.sections.map((section) => ({ ...section })) ?? [];
    activeSectionId.value = result?.sections[0]?.id ?? "";
    editing.value = false;
  },
  { immediate: true },
);

const usesTabs = computed(
  () =>
    props.tool.resultKind === "platforms" ||
    props.tool.resultKind === "content-pack",
);
const activeSection = computed(
  () =>
    editableSections.value.find(
      (section) => section.id === activeSectionId.value,
    ) ??
    editableSections.value[0] ??
    null,
);
const allText = computed(() => {
  if (props.result?.items?.length) {
    return props.result.items
      .map((item) => `${item.title}\n${item.content}`)
      .join("\n\n");
  }
  return editableSections.value
    .map((section) => `${section.label}\n${section.content}`)
    .join("\n\n");
});
</script>

<template>
  <div class="min-w-0">
    <section
      v-if="state === 'generating'"
      class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.06] sm:p-5"
      aria-live="polite"
      aria-busy="true"
    >
      <div class="flex items-center gap-3">
        <span
          class="tool-icon-tone tool-icon-tone-cyan grid size-11 place-items-center rounded-xl"
          ><Sparkles
            class="size-5 animate-pulse motion-reduce:animate-none"
            aria-hidden="true"
        /></span>
        <div>
          <h2 class="text-base font-semibold text-slate-900 dark:text-white">
            Creating your result
          </h2>
          <p class="mt-1 text-xs text-slate-500 dark:text-white/50">
            Keep this page open. Duplicate submissions are disabled.
          </p>
        </div>
      </div>
      <div class="mt-5 space-y-3">
        <div class="mobile-skeleton h-4 w-2/3 rounded" />
        <div class="mobile-skeleton h-4 w-full rounded" />
        <div class="mobile-skeleton h-4 w-11/12 rounded" />
        <div class="mobile-skeleton h-28 w-full rounded-2xl" />
      </div>
    </section>

    <section
      v-else-if="result"
      class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.06]"
      aria-live="polite"
    >
      <header
        class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3.5 dark:border-white/10 sm:px-5"
      >
        <div>
          <p
            class="text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-600 dark:text-emerald-300"
          >
            Ready
          </p>
          <h2 class="mt-1 text-lg font-semibold text-slate-950 dark:text-white">
            {{ result.title }}
          </h2>
        </div>
        <CopyButton :text="allText" label="Copy all" variant="primary" />
      </header>

      <div
        v-if="usesTabs && editableSections.length"
        class="border-b border-slate-200 px-3 pt-3 dark:border-white/10"
      >
        <div
          class="sidebar-scrollbar-hidden flex gap-1 overflow-x-auto"
          role="tablist"
          aria-label="Result sections"
        >
          <button
            v-for="section in editableSections"
            :key="section.id"
            type="button"
            role="tab"
            class="min-h-10 shrink-0 rounded-t-xl border-b-2 px-3 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            :class="
              activeSection?.id === section.id
                ? 'border-sky-600 text-sky-700 dark:border-cyan-300 dark:text-cyan-200'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-white/45 dark:hover:text-white/75'
            "
            :aria-selected="activeSection?.id === section.id"
            @click="activeSectionId = section.id"
          >
            {{ section.label }}
          </button>
        </div>
      </div>

      <div class="space-y-4 p-4 sm:p-5">
        <template v-if="result.items?.length">
          <article
            v-for="(item, index) in result.items"
            :key="item.id"
            class="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 dark:border-white/10 dark:bg-white/[0.04]"
          >
            <div class="flex items-start gap-3">
              <span
                class="grid size-8 shrink-0 place-items-center rounded-lg bg-sky-100 text-xs font-semibold text-sky-700 dark:bg-cyan-300/10 dark:text-cyan-200"
                >{{ index + 1 }}</span
              >
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <h3
                    class="text-sm font-semibold text-slate-900 dark:text-white"
                  >
                    {{ item.title }}
                  </h3>
                  <CopyButton :text="item.content" />
                </div>
                <p
                  class="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-white/75"
                >
                  {{ item.content }}
                </p>
                <p
                  v-if="item.description"
                  class="mt-2 text-xs leading-5 text-slate-500 dark:text-white/50"
                >
                  {{ item.description }}
                </p>
                <div
                  v-if="tool.resultKind === 'ideas'"
                  class="mt-3 flex flex-wrap gap-2"
                >
                  <button
                    type="button"
                    class="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-[#082552] px-3 text-xs font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:bg-cyan-300 dark:text-slate-950"
                    @click="emit('useIdea', 'script', item.content)"
                  >
                    Create Script
                    <ArrowRight class="size-3.5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    class="min-h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-white/10 dark:bg-white/[0.06] dark:text-white/70"
                    @click="emit('useIdea', 'post', item.content)"
                  >
                    Create Post
                  </button>
                </div>
              </div>
            </div>
          </article>
        </template>

        <template v-else-if="usesTabs && activeSection">
          <div class="flex items-center justify-between gap-3">
            <h3 class="text-sm font-semibold text-slate-900 dark:text-white">
              {{ activeSection.label }}
            </h3>
            <CopyButton :text="activeSection.content" />
          </div>
          <textarea
            v-if="editing"
            v-model="activeSection.content"
            rows="12"
            class="min-h-56 w-full resize-y rounded-2xl border border-sky-300 bg-white p-3.5 text-base leading-7 text-slate-950 outline-none ring-2 ring-sky-100 dark:border-cyan-300/40 dark:bg-white/[0.05] dark:text-white dark:ring-cyan-300/10"
          />
          <p
            v-else
            class="min-h-44 whitespace-pre-wrap break-words rounded-2xl bg-slate-50 p-4 text-sm leading-7 text-slate-700 dark:bg-white/[0.04] dark:text-white/75"
          >
            {{ activeSection.content }}
          </p>
        </template>

        <template v-else>
          <article
            v-for="section in editableSections"
            :key="section.id"
            class="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.04]"
          >
            <div class="flex items-center justify-between gap-3">
              <h3 class="text-sm font-semibold text-slate-900 dark:text-white">
                {{ section.label }}
              </h3>
              <CopyButton :text="section.content" />
            </div>
            <textarea
              v-if="editing"
              v-model="section.content"
              rows="7"
              class="mt-3 min-h-36 w-full resize-y rounded-xl border border-sky-300 bg-white p-3 text-base leading-7 text-slate-950 outline-none ring-2 ring-sky-100 dark:border-cyan-300/40 dark:bg-white/[0.05] dark:text-white dark:ring-cyan-300/10"
            />
            <p
              v-else
              class="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-slate-700 dark:text-white/75"
            >
              {{ section.content }}
            </p>
          </article>
        </template>
      </div>

      <footer
        class="border-t border-slate-200 px-4 py-3.5 dark:border-white/10 sm:px-5"
      >
        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            class="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-white/10 dark:bg-white/[0.06] dark:text-white/70 dark:hover:bg-white/[0.10]"
            @click="editing = !editing"
          >
            <PenLine class="size-4" aria-hidden="true" />{{
              editing ? "Done editing" : "Edit"
            }}
          </button>
          <button
            type="button"
            class="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-white/10 dark:bg-white/[0.06] dark:text-white/70 dark:hover:bg-white/[0.10]"
            @click="emit('regenerate')"
          >
            <RotateCcw class="size-4" aria-hidden="true" />Regenerate
          </button>
          <button
            v-if="tool.resultKind === 'text' || tool.resultKind === 'script'"
            type="button"
            class="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-white/10 dark:bg-white/[0.06] dark:text-white/70 dark:hover:bg-white/[0.10]"
            @click="emit('variation')"
          >
            <Sparkles class="size-4" aria-hidden="true" />New variation
          </button>
          <button
            v-if="tool.id === 'khmer-grammar'"
            type="button"
            class="min-h-11 rounded-xl bg-[#082552] px-3.5 text-sm font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:bg-cyan-300 dark:text-slate-950"
            @click="emit('replace')"
          >
            Replace original
          </button>
          <button
            v-if="result.srt"
            type="button"
            class="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#082552] px-3.5 text-sm font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:bg-cyan-300 dark:text-slate-950"
            @click="emit('downloadSrt')"
          >
            <Download class="size-4" aria-hidden="true" />Download .srt
          </button>
        </div>
      </footer>
    </section>
  </div>
</template>
