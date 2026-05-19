<template>
  <svg
    :viewBox="viewBox"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path v-for="path in paths" :key="path" :d="path" />
  </svg>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    paths: string[];
    viewBox?: string;
  }>(),
  {
    viewBox: "0 0 24 24",
  },
);
</script>
