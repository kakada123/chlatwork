<script setup lang="ts">
import type { LandingToolCategory } from "~/data/tools";
import ToolIcon from "~/components/icons/ToolIcon.vue";
import { getToolIconTone } from "~/lib/tool-icon-tones";

const props = defineProps<{
  categories: LandingToolCategory[];
}>();

const { copy } = useLanguage();
const sectionEl = ref<HTMLElement | null>(null);
useLandingReveal(sectionEl);
</script>

<template>
  <section id="categories" ref="sectionEl" class="py-12">
    <div class="mx-auto w-full">
      <div class="mb-4 flex items-center justify-between gap-3" data-reveal>
        <h2 class="text-xl font-semibold tracking-tight text-slate-950 dark:text-white">
          What do you need to do?
        </h2>
      </div>

      <ul class="grid gap-3 md:grid-cols-2">
        <li
          v-for="(category, index) in props.categories"
          :key="category.name"
          data-reveal
          :style="{ '--reveal-delay': `${index * 70}ms` }"
        >
          <NuxtLink
            :to="category.route"
            class="group flex min-h-[112px] items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 transition-colors hover:border-sky-400 hover:bg-sky-50/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 dark:border-white/10 dark:bg-white/[0.05] dark:hover:border-cyan-300/40 dark:hover:bg-white/[0.08]"
            :aria-label="`${copy.categories.explore} ${category.name}`"
          >
            <span
              class="flex size-10 shrink-0 items-center justify-center rounded-xl transition-colors"
              :class="getToolIconTone(category.key)"
              aria-hidden="true"
            >
              <ToolIcon :name="category.key" class="size-6" />
            </span>
            <span class="min-w-0 flex-1">
              <span class="block text-base font-semibold text-slate-950 dark:text-white">
                {{ category.name }}
              </span>
              <span class="mt-1 line-clamp-2 text-sm leading-5 text-slate-600 dark:text-white/60">
                {{ category.description }}
              </span>
              <span class="mt-1.5 block text-xs font-medium text-slate-500 dark:text-white/45">
                {{ category.count }} {{ copy.categories.toolsLabel }}
              </span>
            </span>
          </NuxtLink>
        </li>
      </ul>
    </div>
  </section>
</template>
