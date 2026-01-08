<!-- pages/index.vue -->
<script setup lang="ts">
useSeoMeta({
  title: "ChlatWork — Smart Tools for Everyday Work",
  description: "Simple, privacy-friendly tools that get things done.",
});
</script>

<template>
  <main class="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
    <div class="space-y-6">
      <!-- Hero -->
      <section class="space-y-3">
        <h1 class="text-2xl font-bold sm:text-3xl">Welcome 👋</h1>

        <p class="max-w-2xl text-gray-600">
          Simple, privacy-friendly tools that get things done. New tools drop
          one by one—no bloat, just value.
        </p>

        <div class="flex flex-wrap items-center gap-3 pt-1">
          <NuxtLink
            to="/tools"
            class="inline-flex items-center rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-800 active:scale-[0.99]"
          >
            Browse Tools →
          </NuxtLink>

          <NuxtLink
            to="/"
            class="inline-flex items-center rounded-xl border px-4 py-2 text-sm font-semibold text-gray-900 transition hover:bg-gray-50 active:scale-[0.99]"
          >
            Learn more
          </NuxtLink>
        </div>
      </section>

      <!-- Quick highlights -->
      <section class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div class="rounded-2xl border bg-white p-4">
          <p class="text-sm font-semibold text-gray-900">Fast</p>
          <p class="mt-1 text-sm text-gray-600">
            No sign-up required for most tools. Just open and use.
          </p>
        </div>

        <div class="rounded-2xl border bg-white p-4">
          <p class="text-sm font-semibold text-gray-900">Privacy-friendly</p>
          <p class="mt-1 text-sm text-gray-600">
            Built to keep data minimal. Your stuff stays yours.
          </p>
        </div>

        <div class="rounded-2xl border bg-white p-4">
          <p class="text-sm font-semibold text-gray-900">Modular</p>
          <p class="mt-1 text-sm text-gray-600">
            Tools ship one by one—small, focused, and reliable.
          </p>
        </div>
      </section>
    </div>
  </main>
</template>
