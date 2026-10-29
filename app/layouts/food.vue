<script setup lang="ts">
import { Moon, Sun, Utensils, Compass, ArrowLeft } from "lucide-vue-next";
import { useColorMode } from "~/composables/useColorMode";
import { useProductDomain } from "~/composables/useProductDomain";

const { isDark, toggleColorMode } = useColorMode();
const { config } = useProductDomain();

useHead({
  title: "ChlatWork Food - ញ៉ាំអី? ទៅណា? ធ្វើម្ហូបអី?",
  meta: [
    {
      name: "description",
      content: "ស្វែងរកភោជនីយដ្ឋានឆ្ងាញ់ៗជិតអ្នក ឬរូបមន្តម្ហូបខ្មែរឆ្ងាញ់ៗ តាមថវិកា និងឱកាសជួបជុំ ដោយឥតគិតថ្លៃ ១០០%",
    },
    { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
  ],
});
</script>

<template>
  <div class="food-shell min-h-dvh bg-[#fafaf9] text-stone-900 transition-colors duration-200 dark:bg-[#0c0f14] dark:text-stone-100" lang="km">
    <a href="#food-content" class="sr-only z-50 rounded-lg bg-white p-3 text-stone-950 focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
      ទៅកាន់ខ្លឹមសារស្វែងរកម្ហូប
    </a>

    <!-- Top Navigation Header -->
    <header class="sticky top-0 z-40 border-b border-stone-200/80 bg-white/80 backdrop-blur-md dark:border-stone-800/80 dark:bg-[#0c0f14]/85">
      <div class="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
        <div class="flex items-center gap-3">
          <div class="grid size-10 place-items-center rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-md shadow-orange-500/20">
            <Utensils class="size-5" aria-hidden="true" />
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h1 class="text-lg font-bold leading-none sm:text-xl text-stone-900 dark:text-stone-100">
                ChlatWork Food
              </h1>
              <span class="rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-semibold text-orange-700 dark:bg-orange-950/60 dark:text-orange-400">
                ឥតគិតថ្លៃ
              </span>
            </div>
            <p class="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
              ញ៉ាំអី? ទៅណា? ធ្វើម្ហូបអី?
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <a
            :href="config.mainOrigin"
            class="hidden items-center gap-1.5 rounded-full border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-600 transition hover:bg-stone-100 dark:border-stone-800 dark:text-stone-300 dark:hover:bg-stone-800 sm:inline-flex"
            title="ត្រឡប់ទៅទំព័រដើមឆ្លាតវើក"
          >
            <ArrowLeft class="size-3.5" aria-hidden="true" />
            <span>ឆ្លាតវើក</span>
          </a>

          <button
            type="button"
            class="grid size-10 place-items-center rounded-full border border-stone-200 bg-white text-stone-600 transition hover:border-orange-400 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300 dark:hover:border-orange-500"
            :aria-label="isDark ? 'ប្ដូរទៅពណ៌ភ្លឺ' : 'ប្ដូរទៅពណ៌ងងឹត'"
            @click="toggleColorMode"
          >
            <Sun v-if="isDark" class="size-4.5" aria-hidden="true" />
            <Moon v-else class="size-4.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>

    <!-- Main Content Area -->
    <main id="food-content" class="mx-auto max-w-5xl px-4 py-6 outline-none sm:px-6 sm:py-8" tabindex="-1">
      <slot />
    </main>

    <!-- Keep provider attribution and price limitations visible near discovery results. -->
    <footer class="mt-12 border-t border-stone-200 bg-white/50 px-4 py-8 text-center text-xs leading-6 text-stone-500 dark:border-stone-800 dark:bg-stone-950/50 dark:text-stone-400 sm:px-6">
      <div class="mx-auto max-w-5xl space-y-2">
        <p>
          ទិន្នន័យភោជនីយដ្ឋាន និងផែនទីបានមកពី
          <a
            href="https://maps.google.com"
            target="_blank"
            rel="noopener noreferrer"
            class="font-normal text-orange-600 underline underline-offset-4 hover:text-orange-700 dark:text-orange-400"
            translate="no"
          >
            Google Maps
          </a>
        </p>
        <p class="text-[11px] text-stone-400 dark:text-stone-500">
          AI ជួយរើសតាមលក្ខខណ្ឌរបស់អ្នក។ តម្លៃ និងព័ត៌មានហាងអាចផ្លាស់ប្តូរ សូមបញ្ជាក់ជាមួយហាងផ្ទាល់។
        </p>
        <div class="pt-2">
          <a
            :href="config.mainOrigin"
            class="inline-flex items-center gap-1 font-semibold text-stone-700 underline-offset-4 hover:underline dark:text-stone-300"
          >
            <span>កម្មវិធីទាំងអស់របស់ឆ្លាតវើក</span>
          </a>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.food-shell {
  position: relative;
  isolation: isolate;
  --food-background-image: url("/images/food/khmer-food-background-v1.jpg");
  --food-background-wash: rgb(250 250 249 / 86%);
  --app-font: "Hanuman", "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-family: var(--app-font);
  letter-spacing: 0;
  line-height: 1.7;
}

/* Keep the decorative image behind the page without affecting scrolling or pointer targets. */
.food-shell::before {
  content: "";
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background-image: linear-gradient(var(--food-background-wash), var(--food-background-wash)), var(--food-background-image);
  background-size: cover;
  background-position: center right;
}

:global(.dark) .food-shell {
  --food-background-wash: rgb(12 15 20 / 94%);
}

@media (max-width: 639px) {
  .food-shell {
    --food-background-image: url("/images/food/khmer-food-background-mobile-v1.jpg");
  }
}

.food-shell :deep(button:focus-visible),
.food-shell :deep(a:focus-visible),
.food-shell :deep(input:focus-visible),
.food-shell :deep(select:focus-visible) {
  outline: 2px solid #ea580c;
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  .food-shell :deep(*) {
    scroll-behavior: auto;
  }
}
</style>
