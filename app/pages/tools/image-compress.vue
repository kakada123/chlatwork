<script setup lang="ts">
useSeoMeta({
  title: "Image Compressor — ChlatWork",
  description:
    "Compress images instantly without uploading. Reduce file size while keeping quality.",
  ogTitle: "Image Compressor — ChlatWork",
  ogDescription:
    "Compress images instantly without uploading — fast, private, and secure.",
});
</script>

<template>
  <main class="max-w-5xl mx-auto p-6">
    <NuxtLink to="/tools" class="text-sm text-gray-500 hover:text-gray-900">
      ← Back to tools
    </NuxtLink>

    <div class="mt-4">
      <ImageCompressor />
    </div>
  </main>
</template>
