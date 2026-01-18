<!-- pages/index.vue -->
<script setup lang="ts">
useSeoMeta({
  title: "ChlatWork — Smart Tools for Everyday Work",
  description: "Simple, privacy-friendly tools that get things done.",
  ogTitle: "ChlatWork — Smart Tools for Everyday Work",
  ogDescription: "Simple, privacy-friendly tools that get things done.",
});
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div>
      <h1 class="text-lg font-bold">ChlatWork</h1>
      <p class="text-sm text-gray-500 max-w-2xl">
        Simple, privacy-friendly tools that get things done. New tools drop one
        by one—no bloat, just value.
      </p>
    </div>

    <!-- Actions (match tabs spacing behavior: full-width flex row) -->
    <div class="flex w-full flex-wrap items-center justify-start gap-2">
      <NuxtLink
        to="/tools"
        class="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
      >
        Browse Tools →
      </NuxtLink>

      <NuxtLink
        to="/"
        class="rounded-xl border bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50"
      >
        Learn more
      </NuxtLink>
    </div>

    <!-- Highlights -->
    <section class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <div class="rounded-2xl border bg-white p-4 shadow-sm space-y-1">
        <p class="text-sm font-semibold text-gray-900">Fast</p>
        <p class="text-sm text-gray-600">
          No sign-up required for most tools. Just open and use.
        </p>
      </div>

      <div class="rounded-2xl border bg-white p-4 shadow-sm space-y-1">
        <p class="text-sm font-semibold text-gray-900">Privacy-friendly</p>
        <p class="text-sm text-gray-600">
          Built to keep data minimal. Your stuff stays yours.
        </p>
      </div>

      <div class="rounded-2xl border bg-white p-4 shadow-sm space-y-1">
        <p class="text-sm font-semibold text-gray-900">Modular</p>
        <p class="text-sm text-gray-600">
          Tools ship one by one—small, focused, and reliable.
        </p>
      </div>
    </section>
  </div>
</template>
