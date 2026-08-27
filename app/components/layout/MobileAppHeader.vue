<script setup lang="ts">
import { ChevronLeft, Moon, Search, Sun } from "lucide-vue-next";

defineProps<{
  title: string;
  backTo: string;
}>();

const emit = defineEmits<{
  search: [];
}>();

const { isDark, nextColorModeLabel, toggleColorMode } = useColorMode();
</script>

<template>
  <header class="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-white/10 dark:bg-black/95 sm:hidden">
    <div class="mx-auto flex min-h-16 w-full max-w-[1200px] items-center gap-3 px-4">
      <NuxtLink
        :to="backTo"
        class="grid size-11 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-[#082552] shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
        aria-label="Go back"
      >
        <ChevronLeft class="size-5" aria-hidden="true" />
      </NuxtLink>

      <div class="min-w-0 flex-1">
        <p class="text-[10px] font-bold uppercase tracking-[0.14em] text-sky-600 dark:text-cyan-300">ChlatWork</p>
        <p class="mt-0.5 truncate text-base font-semibold text-[#082552] dark:text-white">{{ title }}</p>
      </div>

      <button
        type="button"
        class="grid size-11 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-[#082552] shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
        aria-label="Search ChlatWork"
        @click="emit('search')"
      >
        <Search class="size-5" aria-hidden="true" />
      </button>

      <button
        type="button"
        class="grid size-11 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-[#082552] shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
        :aria-label="nextColorModeLabel"
        :title="nextColorModeLabel"
        @click="toggleColorMode"
      >
        <Sun v-if="isDark" class="size-5" aria-hidden="true" />
        <Moon v-else class="size-5" aria-hidden="true" />
      </button>
    </div>
  </header>
</template>
