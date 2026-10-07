<script setup lang="ts">
// Keep previously shared game links usable after the route rename.
definePageMeta({
  layout: false,
  blankCanvas: true,
  pageTransition: false,
  redirect: "/dont-get-mad",
});
</script>

<template>
  <span aria-hidden="true" />
</template>
