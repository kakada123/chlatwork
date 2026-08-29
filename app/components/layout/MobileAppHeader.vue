<script setup lang="ts">
import { ChevronLeft, Search } from "lucide-vue-next";

const props = defineProps<{
  title: string;
  backTo: string;
  backAriaLabel?: string;
}>();

const emit = defineEmits<{
  search: [];
}>();
</script>

<template>
  <header class="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-white/10 dark:bg-black/95 sm:hidden">
    <div class="mx-auto flex min-h-16 w-full max-w-[1200px] items-center gap-3 px-4">
      <NuxtLink
        :to="backTo"
        class="mobile-pressable grid size-11 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-[#082552] shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
        :aria-label="props.backAriaLabel ?? 'Go back'"
      >
        <ChevronLeft class="size-5" aria-hidden="true" />
      </NuxtLink>

      <div class="min-w-0 flex-1 text-center">
        <p class="truncate text-base font-semibold text-[#082552] dark:text-white">{{ title }}</p>
      </div>

      <button
        type="button"
        class="mobile-pressable grid size-11 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-[#082552] shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
        aria-label="Search ChlatWork"
        @click="emit('search')"
      >
        <Search class="size-5" aria-hidden="true" />
      </button>
    </div>
  </header>
</template>
