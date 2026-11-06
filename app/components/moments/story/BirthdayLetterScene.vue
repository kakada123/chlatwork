<script setup lang="ts">import { computed } from "vue";

import { useAppI18n } from "~/composables/useAppI18n";


const props = withDefaults(defineProps<{ opened: boolean; message: string; locale?: "en" | "km" }>(), { locale: "en" });
const { t } = useAppI18n(computed(() => props.locale === "km"));
defineEmits<{ open: [] }>();
</script>

<template>
  <div class="letter-scene">
    <button v-if="!opened" type="button" class="letter-envelope" data-action="open-letter" @click="$emit('open')"><span aria-hidden="true">💌</span>{{ t("products.moments.open_your_letter") }}</button>
    <div v-else class="birthday-letter" role="region" :aria-label="t(&quot;products.moments.birthday_message&quot;)"><p>{{ message || (t("products.moments.happy_birthday_wishing_you_a_day_full_of_love_and_joy")) }}</p></div>
  </div>
</template>

<style scoped>
.letter-envelope { display: flex; flex-direction: column; align-items: center; gap: 1rem; width: 100%; min-height: 15rem; margin: 1.5rem 0; padding: 2rem; border: 1px solid var(--moment-border); border-radius: 1rem; background: var(--moment-accent-soft); color: var(--moment-ink); font: inherit; cursor: pointer; }.letter-envelope span { font-size: 5rem; }.letter-envelope:focus-visible { outline: 3px solid var(--moment-accent); outline-offset: 4px; }.birthday-letter { margin: 1.5rem 0; padding: clamp(1.5rem,5vw,2.5rem); border: 1px solid var(--moment-border); border-radius: .7rem; background: var(--moment-surface); box-shadow: 0 1rem 2rem var(--moment-shadow); animation: letter-unfold .5s ease both; }.birthday-letter p { white-space: pre-wrap; overflow-wrap: anywhere; line-height: 2; text-align: left; }
@keyframes letter-unfold { from { opacity: 0; transform: translateY(.8rem); } to { opacity: 1; transform: translateY(0); } }@media (prefers-reduced-motion: reduce) { .birthday-letter { animation: none; } }
</style>
