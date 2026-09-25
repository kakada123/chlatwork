<script setup lang="ts">
import { getKlaKlokSymbol, type KlaKlokSymbolId } from "~/lib/kla-klok";

const props = defineProps<{
  symbol: KlaKlokSymbolId;
  rolling?: boolean;
  size?: "hero" | "game";
}>();

const symbol = computed(() => getKlaKlokSymbol(props.symbol));
</script>

<template>
  <div
    class="kla-die grid place-items-center border border-amber-300/60 bg-[#fff8e8] text-center shadow-[0_14px_40px_rgba(0,0,0,0.28)]"
    :class="[
      size === 'hero' ? 'size-24 rounded-[1.65rem] sm:size-32' : 'size-20 rounded-2xl sm:size-24',
      { 'kla-die--rolling': rolling },
    ]"
    :aria-label="`${symbol.labelKm} · ${symbol.labelEn}`"
  >
    <span class="text-4xl leading-none sm:text-5xl" aria-hidden="true">{{ symbol.glyph }}</span>
    <span class="mt-1 text-[11px] font-bold text-[#7c2d2d] sm:text-xs">
      {{ symbol.labelKm }}
    </span>
  </div>
</template>

<style scoped>
.kla-die--rolling {
  animation: kla-die-roll 220ms ease-in-out infinite alternate;
}

@keyframes kla-die-roll {
  from { transform: rotate(-5deg) translateY(2px) scale(0.96); }
  to { transform: rotate(5deg) translateY(-3px) scale(1.02); }
}

@media (prefers-reduced-motion: reduce) {
  .kla-die--rolling { animation: none; }
}
</style>
