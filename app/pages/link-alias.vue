<script setup lang="ts">
definePageMeta({ path: "/link/:slug", layout: false });
const route = useRoute();
await navigateTo({ path: `/u/${encodeURIComponent(String(route.params.slug))}`, query: route.query, hash: route.hash }, {
  redirectCode: 301,
});
</script>

<template><div /></template>
