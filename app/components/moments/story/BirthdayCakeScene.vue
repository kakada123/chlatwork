<script setup lang="ts">
import { computed } from "vue";
import type { BirthdayCakeDesign } from "~/lib/birthday-story";
const props = withDefaults(defineProps<{ design: BirthdayCakeDesign; candles: number; extinguished: number[]; locale?: "en" | "km" }>(), { locale: "en" });
defineEmits<{ blow: [index: number] }>();
const complete = computed(() => props.extinguished.length >= props.candles);
</script>

<template>
  <div class="cake-scene" :class="`cake-${design.toLowerCase()}`">
    <p class="story-description">{{ locale === 'km' ? 'បួងសួង ហើយចុចលើទៀននីមួយៗដើម្បីពន្លត់។' : 'Make a wish, then tap each candle to blow it out.' }}</p>
    <div class="birthday-cake">
      <div class="cake-candles">
        <button v-for="index in candles" :key="index" type="button" class="candle" :class="{ 'is-out': extinguished.includes(index - 1) }" :data-action="`candle-${index - 1}`" :aria-label="locale === 'km' ? `ពន្លត់ទៀនទី ${index}` : `Blow out candle ${index}`" :aria-pressed="extinguished.includes(index - 1)" :disabled="extinguished.includes(index - 1)" @click="$emit('blow', index - 1)">
          <span class="candle-flame" aria-hidden="true" /><span class="candle-wick" aria-hidden="true" /><span class="candle-stick" aria-hidden="true" />
        </button>
      </div>
      <div class="cake-top" aria-hidden="true">♥ · ♥ · ♥</div><div class="cake-base" aria-hidden="true" /><div class="cake-plate" aria-hidden="true" />
    </div>
    <p role="status" class="story-description">{{ complete ? (locale === 'km' ? 'បំណងរបស់អ្នកបានផ្ញើហើយ! រីករាយថ្ងៃកំណើត! 🎉' : 'Wish made! Happy birthday! 🎉') : (locale === 'km' ? `${extinguished.length} / ${candles} ទៀនបានពន្លត់` : `${extinguished.length} of ${candles} candles out`) }}</p>
  </div>
</template>

<style scoped>
.birthday-cake { --cake-base: #f6afc9; --cake-icing: #fff0df; width: min(100%, 24rem); margin: 1.5rem auto; padding-top: .5rem; }.cake-chocolate .birthday-cake { --cake-base: #70452f; --cake-icing: #e0b999; }.cake-pastel .birthday-cake { --cake-base: #b8a4e9; --cake-icing: #d1f2e3; }
.cake-candles { display: flex; justify-content: center; flex-wrap: wrap; column-gap: 0; row-gap: .5rem; padding-inline: .5rem; }
.candle { position: relative; display: flex; flex-direction: column; align-items: center; width: 2.75rem; height: 5rem; border: 0; border-radius: .5rem; background: transparent; cursor: pointer; }.candle:focus-visible { outline: 3px solid var(--moment-accent); outline-offset: 2px; }.candle:disabled { cursor: default; }
.candle-flame { width: .7rem; height: 1.15rem; margin: .25rem 0; border-radius: 75% 25% 65% 35%; background: #ffb42a; box-shadow: 0 0 .8rem #ffc74a; animation: candle-flicker .8s ease-in-out infinite alternate; }.is-out .candle-flame { visibility: hidden; animation: none; }.candle-wick { width: 2px; height: .3rem; background: #694d41; }.candle-stick { width: .65rem; flex: 1; background: repeating-linear-gradient(35deg,#fff 0 5px,#ec6687 5px 10px); border-radius: .2rem .2rem 0 0; }
.cake-top { height: 2.5rem; border-radius: 50% 50% .8rem .8rem; background: var(--cake-icing); color: #874b5a; letter-spacing: 1rem; padding: .5rem 0; }.cake-base { height: 5.5rem; background: var(--cake-base); border-radius: 0 0 45% 45%; box-shadow: inset 0 -1rem #00000012; }.cake-plate { height: .7rem; margin: 0 -.3rem; border-radius: 50%; background: var(--moment-border); }
@keyframes candle-flicker { to { transform: scale(.85,1.05) rotate(8deg); } }@media (prefers-reduced-motion: reduce) { .candle-flame { animation: none; } }
</style>
