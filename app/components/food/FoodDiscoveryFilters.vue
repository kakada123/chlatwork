<script setup lang="ts">
import { computed, ref } from "vue";
import type { FoodFilterDefinition } from "~/composables/useFoodResults";
const props = defineProps<{ modelValue: Record<string, string | string[]>; definitions: FoodFilterDefinition[] }>();
const emit = defineEmits<{ (event: "update:modelValue", value: Record<string, string | string[]>): void }>();
const search = ref("");
const visible = computed(() => props.definitions.map((field) => ({ ...field, groups: field.groups.map((group) => ({ ...group, options: group.options.filter((option) => !search.value.trim() || `${field.label} ${field.labelKm} ${group.label} ${option.label}`.toLowerCase().includes(search.value.trim().toLowerCase())) })).filter((group) => group.options.length) })).filter((field) => field.groups.length));
function selected(key: string): string[] { const value = props.modelValue[key]; return Array.isArray(value) ? value : typeof value === "string" ? [value] : []; }
function change(key: string, value: string) {
  const next = { ...props.modelValue };
  if (value) next[key] = value; else delete next[key];
  emit("update:modelValue", next);
}
function toggle(key: string, value: string) {
  const values = selected(key);
  const updated = values.includes(value) ? values.filter((entry) => entry !== value) : values.length < 8 ? [...values, value] : values;
  const next = { ...props.modelValue };
  if (updated.length) next[key] = updated; else delete next[key];
  emit("update:modelValue", next);
}
</script>

<template>
  <div class="min-w-0 space-y-3">
    <label class="block space-y-1 text-xs font-semibold text-stone-600 dark:text-stone-300">
      <span>ស្វែងរកតម្រង / Find a filter</span>
      <input v-model="search" type="search" class="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-base dark:border-stone-700 dark:bg-stone-800 sm:text-sm" placeholder="Who, birthday, street food, KHQR…" />
    </label>
    <div class="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2">
      <details v-for="field in visible" :key="field.key" class="min-w-0 rounded-2xl border border-stone-200 bg-white p-3 dark:border-stone-700 dark:bg-stone-900">
        <summary class="cursor-pointer break-words text-sm font-semibold text-stone-800 dark:text-stone-100">
          {{ field.labelKm }} <span class="font-normal text-stone-500">({{ field.label }})</span>
          <span v-if="selected(field.key).length" class="ml-1 text-orange-600">· {{ selected(field.key).length }}</span>
        </summary>
        <div class="mt-3 min-w-0">
          <select v-if="!field.multiple" :value="modelValue[field.key] || ''" :aria-label="field.label" class="w-full min-w-0 rounded-xl border border-stone-200 bg-stone-50 px-2 py-2 text-base text-stone-800 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100 sm:text-sm" @change="change(field.key, ($event.target as HTMLSelectElement).value)">
            <option value="">មិនកំណត់ / Any</option>
            <optgroup v-for="group in field.groups" :key="group.label" :label="group.label">
              <option v-for="option in group.options" :key="option.value" :value="option.value" :disabled="option.disabled">{{ option.label }}{{ option.disabled ? ' — unavailable' : '' }}</option>
            </optgroup>
          </select>
          <div v-else class="max-h-64 space-y-3 overflow-y-auto overscroll-contain pr-1">
            <p class="text-xs text-stone-500">ជ្រើសបានដល់ 8 / Up to 8</p>
            <fieldset v-for="group in field.groups" :key="group.label" class="space-y-1">
              <legend class="mb-1 text-xs font-bold text-stone-500">{{ group.label }}</legend>
              <label v-for="option in group.options" :key="option.value" class="flex min-h-9 cursor-pointer items-start gap-2 rounded-lg px-1 py-1.5 text-sm text-stone-700 dark:text-stone-200">
                <input type="checkbox" class="mt-1 shrink-0 accent-orange-600" :checked="selected(field.key).includes(option.value)" :disabled="option.disabled || (!selected(field.key).includes(option.value) && selected(field.key).length >= 8)" @change="toggle(field.key, option.value)" />
                <span class="min-w-0 break-words">{{ option.label }}</span>
              </label>
            </fieldset>
          </div>
        </div>
      </details>
    </div>
    <p class="text-xs leading-relaxed text-stone-500">ពេលញ៉ាំគឺជាចំណូលចិត្តស្វែងរក មិនមែនម៉ោងបើកហាងទេ។ បរិក្ខារ តម្លៃ របបអាហារ និងអាលែកហ្ស៊ីត្រូវបញ្ជាក់ជាមួយហាងផ្ទាល់។</p>
  </div>
</template>
