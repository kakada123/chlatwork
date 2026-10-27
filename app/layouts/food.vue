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
  link: [
    {
      rel: "stylesheet",
      href: "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
      integrity: "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=",
      crossorigin: "",
    },
  ],
  script: [
    {
      src: "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js",
      integrity: "sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=",
      crossorigin: "",
      defer: true,
    },
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

    <!-- Footer with mandatory OSM & ODbL Attribution -->
    <footer class="mt-12 border-t border-stone-200 bg-white/50 px-4 py-8 text-center text-xs leading-6 text-stone-500 dark:border-stone-800 dark:bg-stone-950/50 dark:text-stone-400 sm:px-6">
      <div class="mx-auto max-w-5xl space-y-2">
        <p>
          ទិន្នន័យភោជនីយដ្ឋាន និងផែនទីបានមកពី
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noopener noreferrer"
            class="font-semibold text-orange-600 underline underline-offset-4 hover:text-orange-700 dark:text-orange-400"
          >
            &copy; OpenStreetMap contributors (ODbL 1.0)
          </a>
          ដោយឥតគិតថ្លៃ
        </p>
        <p class="text-[11px] text-stone-400 dark:text-stone-500">
          ChlatWork Food មិនគិតថ្លៃសេវា មិនប្រើប្រាស់ API បង់ប្រាក់ និងបង្ហាញតម្លៃជាក់ស្ដែងតាមភាពត្រឹមត្រូវនៃទិន្នន័យ។
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
  --app-font: "Hanuman", "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-family: var(--app-font);
  letter-spacing: 0;
  line-height: 1.7;
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
