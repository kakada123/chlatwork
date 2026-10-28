<script setup lang="ts">
import { computed } from "vue";
import type { RankedPlace } from "~/composables/useFoodDiscovery";
import { foodMapEmbedUrl, foodMapSearchUrl } from "~/lib/food-maps";

const props = defineProps<{
  places: RankedPlace[];
  selectedPlace: RankedPlace | null;
  centerLat?: number;
  centerLng?: number;
}>();

const config = useRuntimeConfig();
const selected = computed(() => props.selectedPlace || props.places[0] || null);
const center = computed(() => ({
  lat: props.centerLat ?? 11.5564,
  lng: props.centerLng ?? 104.9282,
}));
const embedUrl = computed(() =>
  foodMapEmbedUrl(
    config.public.googleMapsEmbedApiKey,
    selected.value,
    center.value,
  ),
);
const externalUrl = computed(() =>
  foodMapSearchUrl(selected.value || center.value),
);
</script>

<template>
  <div
    class="relative w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-sm dark:border-slate-800 dark:bg-slate-900"
  >
    <iframe
      v-if="embedUrl"
      :src="embedUrl"
      :title="selected ? `Google Maps — ${selected.name}` : 'Google Maps'"
      class="h-72 w-full border-0 sm:h-96"
      loading="lazy"
      referrerpolicy="strict-origin-when-cross-origin"
      allowfullscreen
    />
    <div
      v-else
      class="flex h-72 flex-col items-center justify-center gap-3 px-6 text-center sm:h-96"
    >
      <p class="text-sm text-stone-600 dark:text-stone-300">
        មើលទីតាំង និងព័ត៌មានហាងនៅលើ Google Maps
      </p>
      <a
        :href="externalUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700"
      >
        បើក Google Maps
      </a>
    </div>
  </div>
</template>
