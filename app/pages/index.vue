<!-- pages/index.vue -->
<script setup lang="ts">
useSeoMeta({
  title: "ChlatWork — Smart Tools for Everyday Work",
});
</script>

<template>
  <main class="p-6">
    <h1 class="text-2xl font-bold">ChlatWork</h1>
    <p class="text-gray-500 mt-2">Smart tools for everyday work.</p>

    <NuxtLink to="/tools" class="text-blue-600 underline mt-4 inline-block">
      Go to tools
    </NuxtLink>
  </main>
</template>
