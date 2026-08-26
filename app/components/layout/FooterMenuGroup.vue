<script setup lang="ts">
type FooterMenuItem = {
  label: string;
  to?: string;
  href?: string;
  action?: string;
};

defineProps<{
  title: string;
  ariaLabel: string;
  items: FooterMenuItem[];
}>();

const emit = defineEmits<{
  action: [action: string];
}>();
</script>

<template>
  <nav class="space-y-3" :aria-label="ariaLabel">
    <p class="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-white/35">
      {{ title }}
    </p>
    <div class="flex flex-col gap-2 text-gray-500 dark:text-white/55">
      <template v-for="item in items" :key="item.label">
        <button
          v-if="item.action"
          type="button"
          class="text-left hover:text-gray-900 dark:hover:text-white"
          @click="emit('action', item.action)"
        >
          {{ item.label }}
        </button>
        <a
          v-else-if="item.href"
          :href="item.href"
          class="hover:text-gray-900 dark:hover:text-white"
        >
          {{ item.label }}
        </a>
        <NuxtLink
          v-else
          :to="item.to"
          class="hover:text-gray-900 dark:hover:text-white"
        >
          {{ item.label }}
        </NuxtLink>
      </template>
    </div>
  </nav>
</template>
