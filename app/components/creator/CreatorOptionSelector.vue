<script setup lang="ts">
const props = defineProps<{
  id: string;
  label: string;
  modelValue: string;
  options: readonly string[];
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();
</script>

<template>
  <fieldset class="min-w-0">
    <legend class="text-sm font-semibold text-slate-900 dark:text-white">
      {{ label }}
    </legend>
    <div
      class="sidebar-scrollbar-hidden -mx-1 mt-2 flex gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap"
      :aria-label="label"
    >
      <button
        v-for="option in options"
        :id="`${id}-${option.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`"
        :key="option"
        type="button"
        class="mobile-pressable min-h-11 shrink-0 rounded-xl border px-3.5 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
        :class="
          props.modelValue === option
            ? 'border-[#082552] bg-[#082552] text-white dark:border-cyan-300 dark:bg-cyan-300 dark:text-slate-950'
            : 'border-slate-200 bg-white text-slate-600 hover:border-sky-300 hover:bg-sky-50 dark:border-white/10 dark:bg-white/[0.05] dark:text-white/65 dark:hover:border-cyan-300/40 dark:hover:bg-white/[0.08]'
        "
        :aria-pressed="props.modelValue === option"
        @click="emit('update:modelValue', option)"
      >
        {{ option }}
      </button>
    </div>
  </fieldset>
</template>
