<script setup lang="ts">
defineProps<{ modelValue: string }>();
const emit = defineEmits<{ "update:modelValue": [value: string] }>();
</script>

<template>
  <div>
    <label for="developer-command-search" class="sr-only">Search developer commands</label>
    <div class="relative">
      <span class="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400 dark:text-slate-500" aria-hidden="true">⌕</span>
      <input
        id="developer-command-search"
        type="search"
        :value="modelValue"
        autocomplete="off"
        class="h-11 w-full rounded-xl border border-slate-200/80 bg-white/90 pl-10 pr-20 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-2 focus:ring-sky-200/60 dark:border-slate-700 dark:bg-slate-950/80 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-cyan-500 dark:focus:ring-cyan-500/20"
        placeholder="restart docker container, undo git commit, check port 3000..."
        @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      />
      <button
        v-if="modelValue"
        type="button"
        class="absolute inset-y-0 right-2 my-auto h-8 rounded-lg px-2.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
        @click="emit('update:modelValue', '')"
      >Clear</button>
    </div>
  </div>
</template>
