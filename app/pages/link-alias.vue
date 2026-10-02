<script setup lang="ts">
definePageMeta({ path: "/link/:slug", layout: false });
const route = useRoute();
await navigateTo(`/u/${encodeURIComponent(String(route.params.slug))}`, {
  redirectCode: 301,
});
</script>

<template><div /></template>
