<script setup lang="ts">
import { Moon, Sun } from "lucide-vue-next";

const { isDark, toggleColorMode } = useColorMode();
const { config } = useProductDomain();
</script>

<template>
  <div class="jekluy-shell min-h-dvh bg-[#f4f8fb] text-[#102a43] dark:bg-[#0b1524] dark:text-slate-100" lang="km">
    <a href="#jekluy-content" class="sr-only z-50 rounded-lg bg-white p-3 text-slate-950 focus:not-sr-only focus:fixed focus:left-4 focus:top-4">ទៅកាន់កន្លែងគណនា</a>
    <header class="mx-auto flex max-w-5xl items-start justify-between gap-3 px-4 pb-6 pt-6 sm:px-6 sm:pb-8 sm:pt-10">
      <div>
        <h1 class="text-2xl font-bold leading-relaxed tracking-normal sm:text-3xl">ចែកលុយ 💸</h1>
        <p class="mt-1 text-sm leading-7 text-slate-500 dark:text-slate-400">គណនាលុយដែលត្រូវសងគ្នា ងាយៗ</p>
      </div>
      <button
        type="button"
        class="mt-1 grid size-11 shrink-0 place-items-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-blue-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
        :aria-label="isDark ? 'ប្ដូរទៅពណ៌ភ្លឺ' : 'ប្ដូរទៅពណ៌ងងឹត'"
        @click="toggleColorMode"
      >
        <Sun v-if="isDark" class="size-5" aria-hidden="true" />
        <Moon v-else class="size-5" aria-hidden="true" />
      </button>
    </header>
    <main id="jekluy-content" class="mx-auto max-w-5xl px-4 outline-none sm:px-6" tabindex="-1">
      <slot />
    </main>
    <footer class="mx-auto max-w-5xl px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-7 text-center text-xs leading-7 text-slate-500 dark:text-slate-400 sm:px-6">
      <p>ទិន្នន័យរក្សាទុកតែលើឧបករណ៍នេះ · មិនបាច់ចូលគណនី</p>
      <a :href="config.mainOrigin" class="inline-flex min-h-11 items-center font-semibold text-blue-700 underline-offset-4 hover:underline dark:text-blue-300">កម្មវិធីរបស់ឆ្លាតវើក</a>
    </footer>
  </div>
</template>

<style scoped>
.jekluy-shell {
  --app-font: "Hanuman", "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-family: var(--app-font);
  letter-spacing: 0;
  line-height: 1.8;
}
.jekluy-shell :deep(button:focus-visible),
.jekluy-shell :deep(a:focus-visible),
.jekluy-shell :deep(summary:focus-visible) {
  outline: 2px solid #2563eb;
  outline-offset: 3px;
}
@media (prefers-reduced-motion: reduce) {
  .jekluy-shell :deep(*) { scroll-behavior: auto; }
}
</style>
