<script setup lang="ts">
withDefaults(defineProps<{ opened: boolean; message: string; locale?: "en" | "km" }>(), { locale: "en" });
defineEmits<{ open: [] }>();
</script>

<template>
  <div class="letter-scene">
    <button v-if="!opened" type="button" class="letter-envelope" data-action="open-letter" @click="$emit('open')"><span aria-hidden="true">💌</span>{{ locale === 'km' ? 'បើកសំបុត្ររបស់អ្នក' : 'Open your letter' }}</button>
    <div v-else class="birthday-letter" role="region" :aria-label="locale === 'km' ? 'សារថ្ងៃកំណើត' : 'Birthday message'"><p>{{ message || (locale === 'km' ? 'រីករាយថ្ងៃកំណើត! សូមឱ្យអ្នកមានសុភមង្គលជានិច្ច។' : 'Happy birthday! Wishing you a day full of love and joy.') }}</p></div>
  </div>
</template>

<style scoped>
.letter-envelope { display: flex; flex-direction: column; align-items: center; gap: 1rem; width: 100%; min-height: 15rem; margin: 1.5rem 0; padding: 2rem; border: 1px solid var(--moment-border); border-radius: 1rem; background: var(--moment-accent-soft); color: var(--moment-ink); font: inherit; cursor: pointer; }.letter-envelope span { font-size: 5rem; }.letter-envelope:focus-visible { outline: 3px solid var(--moment-accent); outline-offset: 4px; }.birthday-letter { margin: 1.5rem 0; padding: clamp(1.5rem,5vw,2.5rem); border: 1px solid var(--moment-border); border-radius: .7rem; background: var(--moment-surface); box-shadow: 0 1rem 2rem var(--moment-shadow); animation: letter-unfold .5s ease both; }.birthday-letter p { white-space: pre-wrap; overflow-wrap: anywhere; line-height: 2; text-align: left; }
@keyframes letter-unfold { from { opacity: 0; transform: translateY(.8rem); } to { opacity: 1; transform: translateY(0); } }@media (prefers-reduced-motion: reduce) { .birthday-letter { animation: none; } }
</style>
