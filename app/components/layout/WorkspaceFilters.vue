<script setup lang="ts">
import { SlidersHorizontal, ChevronDown } from "lucide-vue-next";
defineProps<{ title?: string; count?: number; description?: string }>();
const { t } = useAppI18n(),
  open = ref(false),
  contentId = useId();
</script>
<template>
  <section class="workspace-filters min-w-0">
    <button
      type="button"
      class="flex min-h-11 w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-left text-sm font-semibold text-slate-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500 dark:border-white/15 dark:bg-neutral-950 dark:text-white/70 sm:hidden"
      :aria-expanded="open"
      :aria-controls="contentId"
      @click="open = !open"
    >
      <SlidersHorizontal class="size-4 shrink-0" aria-hidden="true" /><span
        class="min-w-0 flex-1"
        ><span
          >{{ title || t("ui.filters")
          }}<span
            v-if="count"
            class="ml-2 rounded-md bg-sky-50 px-1.5 text-xs text-sky-700 dark:bg-sky-900/40 dark:text-sky-200"
            >{{ count }}</span
          ></span
        ><span
          v-if="description"
          class="mt-0.5 block truncate text-xs font-normal"
          >{{ description }}</span
        ></span
      ><ChevronDown
        class="size-4 shrink-0 transition-transform"
        :class="{ 'rotate-180': open }"
        aria-hidden="true"
      />
    </button>
    <div :id="contentId" :class="open ? 'mt-3 sm:mt-0' : 'hidden sm:block'">
      <slot />
    </div>
  </section>
</template>
