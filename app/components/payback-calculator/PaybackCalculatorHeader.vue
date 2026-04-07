<script setup lang="ts">
defineProps<{
  shareCopied: boolean;
}>();

const emit = defineEmits<{
  (e: "reset"): void;
  (e: "share"): void;
}>();
</script>

<template>
  <div
    class="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between"
  >
    <div>
      <h1 class="text-xl font-bold leading-tight">PayBack Calculator</h1>
      <p class="mt-2 max-w-xl text-gray-600">
        Paste names + amounts. We’ll calculate who owes who (minimal
        transfers).
      </p>
    </div>

    <div class="flex flex-col gap-2 sm:flex-row sm:justify-end">
      <button
        class="w-full rounded-lg border bg-white px-4 py-2 hover:bg-gray-100 sm:w-auto"
        type="button"
        @click="emit('reset')"
      >
        Reset
      </button>

      <button
        class="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-black px-4 py-2 text-white hover:opacity-90 sm:w-auto"
        type="button"
        :aria-label="shareCopied ? 'Link copied' : 'Share link'"
        @click="emit('share')"
      >
        <svg
          v-if="!shareCopied"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          class="h-4 w-4"
        >
          <path
            fill="currentColor"
            d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7a2.5 2.5 0 0 0 0-1.39l7-4.11A2.99 2.99 0 1 0 14 5a2.9 2.9 0 0 0 .05.52l-7 4.11a3 3 0 1 0 0 4.74l7.05 4.11c-.03.17-.05.34-.05.52a3 3 0 1 0 3-2.92Z"
          />
        </svg>
        <svg
          v-else
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          class="h-4 w-4"
        >
          <path
            fill="currentColor"
            d="M9.55 18.2 4.8 13.45l1.4-1.4 3.35 3.35 8.25-8.25 1.4 1.4-9.65 9.65Z"
          />
        </svg>

        <span class="text-sm font-medium">
          {{ shareCopied ? "Link copied" : "Share link" }}
        </span>
      </button>
    </div>
  </div>
</template>
