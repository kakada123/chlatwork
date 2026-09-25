<script setup lang="ts">
const steps = [
  {
    number: "01",
    icon: "☝️",
    titleKm: "ជ្រើសរើសរូប",
    titleEn: "Choose symbols",
    description: "ជ្រើសរើសរូបមួយ ឬច្រើនដែលអ្នកពេញចិត្ត។",
  },
  {
    number: "02",
    icon: "🎲",
    titleKm: "ចាក់គ្រាប់ ៣",
    titleEn: "Roll 3 dice",
    description: "ចុចប៊ូតុង ហើយមើលគ្រាប់ទាំងបីវិល។",
  },
  {
    number: "03",
    icon: "✨",
    titleKm: "ផ្គូផ្គងដើម្បីឈ្នះ",
    titleEn: "Match to win",
    description: "រូបដែលត្រូវគ្នានឹងបន្ថែមពិន្ទុសិប្បនិម្មិត។",
  },
];
</script>

<template>
  <section id="how-to-play" class="px-5 py-14 sm:px-10 lg:px-16">
    <div class="mx-auto max-w-6xl">
      <div class="max-w-2xl">
        <p class="text-xs font-bold uppercase tracking-[0.18em] text-amber-300">How it works</p>
        <h2 class="mt-3 text-2xl font-bold text-white sm:text-3xl">ងាយលេង ត្រឹមតែ ៣ ជំហាន</h2>
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
          <h3 class="mt-5 text-lg font-bold text-white">{{ step.titleKm }}</h3>
          <p class="mt-1 text-sm font-semibold text-amber-200/75">{{ step.titleEn }}</p>
          <p class="mt-3 text-sm leading-6 text-white/50">{{ step.description }}</p>
        </li>
      </ol>
    </div>
  </section>
</template>
