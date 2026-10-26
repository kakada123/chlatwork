<script setup lang="ts">
const route = useRoute();
await navigateTo({ path: `/m/${encodeURIComponent(String(route.params.slug || ""))}`, query: route.query, hash: route.hash }, {
  redirectCode: 301,
});
</script>

<template><div /></template>
