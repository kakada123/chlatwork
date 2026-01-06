<template>
  <div class="space-y-2">
    <div
      v-if="error"
      class="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
    >
      {{ error }}
    </div>

    <div
      class="rounded-xl border bg-gray-50 p-3"
      :class="text ? 'border-gray-200' : 'border-dashed border-gray-200'"
    >
      <div class="flex items-center justify-between gap-2">
        <p class="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Result
        </p>

        <button
          v-if="text"
          type="button"
          @click="onCopy"
          class="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 border hover:bg-gray-50"
        >
          {{ copied ? "Copied ✅" : "Copy" }}
        </button>
      </div>

      <pre
        v-if="text"
        class="mt-2 whitespace-pre-wrap break-words text-sm text-gray-900"
        >{{ text }}</pre
      >
      <p v-else class="mt-2 text-sm text-gray-400">
        Nothing yet — run a calculation to see output here.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  text?: string;
  error?: string;
}>();

const emit = defineEmits<{
  (e: "copy"): void;
}>();

const copied = ref(false);

async function onCopy() {
  if (!props.text) return;

  emit("copy");
  copied.value = true;

  setTimeout(() => {
    copied.value = false;
  }, 1200);
}
</script>
