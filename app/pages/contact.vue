<script setup lang="ts">
useSeoMeta({
  title: "Contact — ChlatWork",
  description: "Get support or send feedback for ChlatWork.",
});

const email = "kakada127@gmail.com"; // change to your real email
</script>

<template>
  <main class="mx-auto w-full max-w-3xl px-4 py-10 space-y-6">
    <header class="space-y-2">
      <h1 class="text-2xl font-bold">Contact</h1>
      <p class="text-gray-600">
        Found a bug, have feedback, or want to suggest a tool? Reach out
        anytime.
      </p>
    </header>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">Email</h2>
      <p class="text-gray-700">
        You can contact us at:
        <a
          :href="`mailto:${email}`"
          class="font-semibold text-gray-900 underline"
        >
          {{ email }}
        </a>
      </p>
      <p class="text-sm text-gray-500">
        Please include the tool name and a short description of the issue (and a
        screenshot if possible).
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">What we can help with</h2>
      <ul class="list-disc pl-5 text-gray-700 space-y-1">
        <li>Bug reports and tool issues</li>
        <li>Feature requests and new tool ideas</li>
        <li>Privacy and policy questions</li>
      </ul>
    </section>
  </main>
</template>
