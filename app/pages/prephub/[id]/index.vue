<script setup lang="ts">
import PrepWorkspace from "~/components/prephub/PrepWorkspace.vue";
definePageMeta({ middleware: "auth" });
useSeoMeta({ title: "PrepHub — ChlatWork", robots: "noindex, nofollow" });
const route = useRoute();
</script>
<template><PrepWorkspace :id="String(route.params.id)" /></template>
