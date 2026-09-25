<script setup lang="ts">
import type { KlaKlokSymbolId } from "~/lib/kla-klok";

defineProps<{
  symbol: {
    id: KlaKlokSymbolId;
    labelKm: string;
    labelEn: string;
    glyph: string;
  };
  selected: boolean;
  disabled?: boolean;
}>();

defineEmits<{ toggle: [symbolId: KlaKlokSymbolId] }>();
</script>

<template>
  <button
    type="button"
    class="group relative min-h-28 rounded-2xl border p-3 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
    :class="selected
      ? 'border-amber-300 bg-amber-300/15 shadow-[0_0_0_1px_rgba(252,211,77,0.25)]'
      : 'border-white/10 bg-white/[0.045] hover:border-white/25 hover:bg-white/[0.07]'"
    :aria-pressed="selected"
    :aria-label="`${symbol.labelKm}, ${symbol.labelEn}`"
    :disabled="disabled"
    @click="$emit('toggle', symbol.id)"
  >
    <span
      v-if="selected"
      class="absolute right-2 top-2 grid size-5 place-items-center rounded-full bg-amber-300 text-xs font-black text-[#401515]"
      aria-hidden="true"
    >✓</span>
    <span class="block text-4xl transition group-hover:scale-105" aria-hidden="true">{{ symbol.glyph }}</span>
    <strong class="mt-2 block text-base text-white">{{ symbol.labelKm }}</strong>
    <span class="mt-0.5 block text-xs text-white/55">{{ symbol.labelEn }}</span>
  </button>
</template>
