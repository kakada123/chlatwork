<script setup lang="ts">
import { computed } from "vue";
import type { BirthdayMemory } from "~/lib/birthday-story";
import type { MomentMedia } from "~/types/moment";
const props = withDefaults(defineProps<{ photos: MomentMedia[]; memories: BirthdayMemory[]; index: number; failed: string[]; locale?: "en" | "km" }>(), { locale: "en" });
defineEmits<{ change: [index: number]; error: [id: string] }>();
const photo = computed(() => props.photos[props.index]);
const memory = computed(() => props.memories[props.index]);
</script>

<template>
  <div class="memories-scene">
    <figure v-if="photo" class="memory-frame">
      <div :key="photo.id" class="memory-image">
        <img v-if="!failed.includes(photo.id)" :src="photo.url" :alt="memory?.caption || (locale === 'km' ? `អនុស្សាវរីយ៍ទី ${index + 1}` : `Memory ${index + 1}`)" @error="$emit('error', photo.id)" />
        <p v-else class="memory-unavailable">{{ locale === 'km' ? 'មិនអាចបង្ហាញរូបថតនេះបានទេ។' : 'This photo is unavailable. Your memory is still here.' }}</p>
      </div>
      <figcaption><p v-if="memory?.caption">{{ memory.caption }}</p><time v-if="memory?.date" :datetime="memory.date">{{ memory.date }}</time></figcaption>
    </figure>
    <div class="memory-navigation">
      <button type="button" class="story-action" data-action="previous-photo" :disabled="index <= 0" :aria-label="locale === 'km' ? 'រូបថតមុន' : 'Previous photo'" @click="$emit('change', index - 1)">←</button>
      <p role="status">{{ index + 1 }} / {{ photos.length }}</p>
      <button type="button" class="story-action" data-action="next-photo" :disabled="index >= photos.length - 1" :aria-label="locale === 'km' ? 'រូបថតបន្ទាប់' : 'Next photo'" @click="$emit('change', index + 1)">→</button>
    </div>
  </div>
</template>

<style scoped>
.memory-frame { margin: 1.5rem 0 0; padding: .65rem .65rem 1rem; border: 1px solid var(--moment-border); border-radius: 1rem; background: var(--moment-surface); box-shadow: 0 1rem 2rem var(--moment-shadow); }.memory-image { display: grid; min-height: 13rem; place-items: center; border-radius: .6rem; overflow: hidden; background: var(--moment-accent-soft); animation: memory-arrive .5s ease both; }.memory-image img { display: block; width: 100%; max-height: 24rem; object-fit: contain; }.memory-unavailable { padding: 2rem; color: var(--moment-muted); }.memory-frame figcaption { padding: .5rem .5rem 0; }.memory-frame figcaption p { white-space: pre-wrap; overflow-wrap: anywhere; line-height: 1.7; }.memory-frame time { display: block; margin-top: .3rem; color: var(--moment-muted); font-size: .8rem; }.memory-navigation { display: flex; justify-content: center; align-items: center; gap: 1rem; margin-top: 1rem; }
@keyframes memory-arrive { from { opacity: .2; transform: scale(.97); } to { opacity: 1; transform: scale(1); } }@media (prefers-reduced-motion: reduce) { .memory-image { animation: none; } }
</style>
