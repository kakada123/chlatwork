<script setup lang="ts">
import { computed, ref } from "vue";
import { FOOD_QUICK_PRESETS } from "~/lib/food-quick-presets";
defineProps<{ active?: string | null; disabled?: boolean }>();
const emit = defineEmits<{ (event: "select", id: string): void }>();
const expanded = ref(false);
const visible = computed(() =>
  expanded.value ? FOOD_QUICK_PRESETS : FOOD_QUICK_PRESETS.slice(0, 6),
);
</script>

<template>
  <section class="min-w-0 space-y-3" aria-label="Quick food filters">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div>
        <h3 class="text-sm font-bold text-stone-900 dark:text-stone-100">
          ថ្ងៃនេះ ចង់ទៅបែបណា?
        </h3>
        <p class="mt-1 text-xs text-stone-500">
          ជ្រើសសិន កែថវិកា និងចំនួនមនុស្ស រួចចុច «ស្នើឱ្យខ្ញុំ»
        </p>
      </div>
      <button
        type="button"
        class="shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold text-orange-600 hover:bg-orange-50 dark:text-orange-300 dark:hover:bg-orange-950/40"
        :aria-expanded="expanded"
        @click="expanded = !expanded"
      >
        {{ expanded ? "បង្ហាញតិច" : "មើលបន្ថែម +" }}
      </button>
    </div>
    <div class="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
      <button
        v-for="preset in visible"
        :key="preset.id"
        type="button"
        :disabled="disabled"
        :aria-pressed="active === preset.id"
        class="flex min-w-0 items-start gap-2.5 rounded-2xl border p-3 text-left transition active:scale-[0.98] disabled:opacity-50 sm:p-3.5"
        :class="
          active === preset.id
            ? 'border-orange-400 bg-orange-50 shadow-sm ring-1 ring-orange-300 dark:border-orange-600 dark:bg-orange-950/40 dark:ring-orange-800'
            : 'border-stone-200 bg-white hover:border-orange-300 hover:bg-orange-50/50 dark:border-stone-700 dark:bg-stone-900 dark:hover:border-orange-800'
        "
        @click="emit('select', preset.id)"
      >
        <span
          class="grid size-9 shrink-0 place-items-center rounded-xl bg-stone-50 text-xl dark:bg-stone-800"
          aria-hidden="true"
          >{{ preset.icon }}</span
        >
        <span class="min-w-0"
          ><span
            class="block break-words text-xs font-bold leading-relaxed text-stone-800 dark:text-stone-100 sm:text-sm"
            >{{ preset.labelKm }}</span
          ><span class="mt-0.5 block break-words text-[11px] text-stone-500">{{
            preset.labelEn
          }}</span></span
        >
      </button>
    </div>
  </section>
</template>
