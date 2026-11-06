<script setup lang="ts">import { computed } from "vue";

import { useAppI18n } from "~/composables/useAppI18n";


const props = withDefaults(defineProps<{ opened: boolean; teaser: string; locale?: "en" | "km" }>(), { locale: "en" });
const { t } = useAppI18n(computed(() => props.locale === "km"));
defineEmits<{ open: [] }>();
</script>

<template>
  <div class="gift-scene" :class="{ 'is-open': opened }">
    <p class="story-description">{{ teaser || (t("products.moments.a_little_surprise_made_just_for_you")) }}</p>
    <button type="button" class="gift-box" data-action="open-gift" :aria-label="t(&quot;products.moments.open_your_gift&quot;)" :aria-pressed="opened" :disabled="opened" @click="$emit('open')">
      <span class="gift-lid" aria-hidden="true"><i /></span><span class="gift-base" aria-hidden="true"><i /></span>
      <span class="gift-sparkle" aria-hidden="true">✨</span>
    </button>
    <p class="story-description" role="status">{{ opened ? (t("products.moments.your_gift_is_open_lets_see_whats_inside")) : (t("products.moments.tap_the_ribbon_to_open_your_gift")) }}</p>
  </div>
</template>

<style scoped>
.gift-box { display: block; position: relative; width: 13rem; height: 15rem; margin: 1rem auto; border: 0; border-radius: 2rem; background: transparent; cursor: pointer; }
.gift-box:focus-visible { outline: 3px solid var(--moment-accent); outline-offset: 5px; }
.gift-base, .gift-lid { position: absolute; left: 1.5rem; right: 1.5rem; background: var(--moment-accent); box-shadow: 0 .6rem 1.6rem var(--moment-shadow); }
.gift-base { top: 6rem; height: 7rem; border-radius: 0 0 .8rem .8rem; }
.gift-lid { z-index: 1; top: 4.5rem; left: .8rem; right: .8rem; height: 2rem; border-radius: .5rem; transition: transform .65s ease; }
.gift-base i, .gift-lid i { display: block; width: 1.7rem; height: 100%; margin: auto; background: var(--moment-accent-soft); }
.gift-lid::before, .gift-lid::after { content: ''; position: absolute; bottom: 100%; width: 3rem; height: 2rem; border: .6rem solid var(--moment-accent-soft); border-radius: 100% 100% 0 100%; }
.gift-lid::before { right: 50%; transform: rotate(15deg); }.gift-lid::after { left: 50%; transform: scaleX(-1) rotate(15deg); }
.gift-sparkle { position: absolute; top: 5rem; left: 4.5rem; font-size: 3rem; opacity: 0; transition: opacity .5s; }
.is-open .gift-lid { transform: translate(-.5rem, -3.3rem) rotate(-14deg); }.is-open .gift-sparkle { opacity: 1; }.gift-box:disabled { cursor: default; }
@media (prefers-reduced-motion: reduce) { .gift-lid, .gift-sparkle { transition: none; } }
</style>
