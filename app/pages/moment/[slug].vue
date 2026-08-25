<script setup lang="ts">
const route = useRoute();
const languageQuery = route.query.lang === "km" ? "?lang=km" : "";
await navigateTo(`/m/${String(route.params.slug || "")}${languageQuery}`, {
  redirectCode: 301,
});
</script>

<template><div /></template>
