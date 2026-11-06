<script setup lang="ts">import { computed } from "vue";

import { useAppI18n } from "~/composables/useAppI18n";

const { t } = useAppI18n();

const steps = computed(() => ([
  {
    number: "01",
    icon: "☝️",
    title: t("products.games.instructions.choose"),
    description: t("products.games.instructions.choose_help"),
  },
  {
    number: "02",
    icon: "🎲",
    title: t("products.games.instructions.roll"),
    description: t("products.games.instructions.roll_help"),
  },
  {
    number: "03",
    icon: "✨",
    title: t("products.games.instructions.match"),
    description: t("products.games.instructions.match_help"),
  },
]));
</script>

<template>
  <section id="how-to-play" class="px-5 py-14 sm:px-10 lg:px-16">
    <div class="mx-auto max-w-6xl">
      <div class="max-w-2xl">
        <p class="text-xs font-bold uppercase tracking-[0.18em] text-amber-300">{{ t("products.games.how_it_works") }}</p>
        <h2 class="mt-3 text-2xl font-bold text-white sm:text-3xl">{{ t("products.games.instructions.three_steps") }}</h2>
      </div>
      <ol class="mt-8 grid gap-4 md:grid-cols-3">
        <li
          v-for="step in steps"
          :key="step.number"
          class="rounded-2xl border border-white/10 bg-[#0e2138] p-5"
        >
          <div class="flex items-center justify-between">
            <span class="text-3xl" aria-hidden="true">{{ step.icon }}</span>
            <span class="font-mono text-xs font-bold tracking-widest text-amber-300/65">{{ step.number }}</span>
          </div>
          <h3 class="mt-5 text-lg font-bold text-white">{{ step.title }}</h3>
          <p class="mt-3 text-sm leading-6 text-white/50">{{ step.description }}</p>
        </li>
      </ol>
    </div>
  </section>
</template>
