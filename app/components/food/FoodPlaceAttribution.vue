<script setup lang="ts">
import { foodMapSearchUrl } from "~/lib/food-maps";
import type { RankedPlace } from "~/composables/useFoodDiscovery";

defineProps<{ place: RankedPlace }>();
</script>

<template>
  <div class="space-y-1 text-xs text-stone-600 dark:text-stone-300">
    <a
      :href="place.googleMapsUri || foodMapSearchUrl(place)"
      target="_blank"
      rel="noopener noreferrer"
      class="font-normal underline underline-offset-2"
      translate="no"
      @click.stop
      >Google Maps</a
    >
    <template
      v-for="(attribution, index) in place.attributions || []"
      :key="index"
    >
      <a
        v-if="attribution.providerUri"
        :href="attribution.providerUri"
        target="_blank"
        rel="noopener noreferrer"
        class="ml-2 underline underline-offset-2"
        @click.stop
        >{{ attribution.provider }}</a
      >
      <span v-else class="ml-2">{{ attribution.provider }}</span>
    </template>
  </div>
</template>
