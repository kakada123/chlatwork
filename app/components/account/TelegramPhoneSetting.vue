<script setup lang="ts">
import { Phone } from "lucide-vue-next";

defineProps<{
  enabled: boolean;
  disabled: boolean;
  description: string;
  error: string;
  status: string;
  mobile?: boolean;
}>();
defineEmits<{ toggle: [] }>();
</script>

<template>
  <div
    class="items-center justify-between gap-3"
    :class="mobile
      ? 'flex min-h-[72px] border-b border-slate-200 px-4 py-3 dark:border-white/10'
      : 'hidden rounded-2xl border border-blue-200 bg-blue-50/70 p-4 dark:border-blue-300/20 dark:bg-blue-300/[0.06] sm:flex'"
  >
    <span class="grid size-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-300/10 dark:text-blue-200"><Phone class="size-5" aria-hidden="true" /></span>
    <span class="min-w-0 flex-1">
      <strong class="block text-sm">Share Telegram phone number</strong>
      <span class="mt-1 block text-xs text-slate-500 dark:text-white/50">{{ description }}</span>
      <span v-if="error" role="alert" class="mt-1 block text-xs font-semibold text-red-600 dark:text-red-300">{{ error }}</span>
      <span v-else-if="status" role="status" class="mt-1 block text-xs font-semibold text-emerald-700 dark:text-emerald-300">{{ status }}</span>
    </span>
    <button
      type="button"
      role="switch"
      :aria-checked="enabled"
      :disabled="disabled"
      aria-label="Share Telegram phone number"
      class="relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
      :class="enabled ? 'bg-sky-600 dark:bg-cyan-200' : 'bg-slate-300 dark:bg-white/20'"
      @click="$emit('toggle')"
    >
      <span class="ml-1 size-5 rounded-full bg-white shadow-sm transition" :class="enabled ? 'translate-x-5 dark:bg-slate-950' : ''" aria-hidden="true" />
    </button>
  </div>
</template>
