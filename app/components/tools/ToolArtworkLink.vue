<script setup lang="ts">
defineProps<{
  src: string;
  name: string;
  route: string;
}>();
</script>

<template>
  <NuxtLink
    :to="route"
    :aria-label="name"
    :title="name"
    class="group mobile-pressable mx-auto block w-full max-w-40 rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
  >
    <img
      :src="src"
      alt=""
      class="block aspect-square w-full object-contain transition-transform group-hover:scale-[1.03] motion-reduce:transition-none"
      loading="lazy"
      decoding="async"
    />
  </NuxtLink>
</template>
