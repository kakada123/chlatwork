<template>
  <button
    type="button"
    class="inline-flex h-10 items-center justify-center rounded-lg border px-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40"
    :class="
      variant === 'primary'
        ? 'border-gray-900 bg-gray-900 text-white hover:bg-gray-800'
        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
    "
    :disabled="disabled || !text"
    @click="copy"
  >
    {{ copied ? "Copied" : label }}
  </button>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    text?: string;
    label?: string;
    disabled?: boolean;
    variant?: "primary" | "secondary";
  }>(),
  {
    text: "",
    label: "Copy",
    disabled: false,
    variant: "secondary",
  },
);

const copied = ref(false);

async function copy() {
  if (!props.text || !import.meta.client) return;

  try {
    await navigator.clipboard.writeText(props.text);
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = props.text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
  }

  copied.value = true;
  window.setTimeout(() => {
    copied.value = false;
  }, 1200);
}
</script>
