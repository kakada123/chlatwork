<script setup lang="ts">
const benefits = [
  { icon: "◆", titleKm: "រចនាបែបខ្មែរ", titleEn: "Khmer-inspired design" },
  { icon: "⚡", titleKm: "លឿន និងងាយស្រួល", titleEn: "Fast and simple" },
  { icon: "▣", titleKm: "ល្អសម្រាប់ទូរសព្ទ", titleEn: "Mobile friendly" },
  { icon: "○", titleKm: "មិនបាច់បង្កើតគណនី", titleEn: "No account for casual mode" },
];

useSeoMeta({
  title: "ខ្លាឃ្លោក — Kla Klok | ChlatWork",
  description:
    "Play Kla Klok, a Khmer-inspired three-dice game using entertainment-only virtual points. No account needed.",
  ogTitle: "ខ្លាឃ្លោក — Kla Klok",
  ogDescription:
    "Choose classic symbols, roll three dice, and play with virtual points.",
  ogType: "website",
  ogUrl: "https://chlatwork.com/tools/kla-klok",
  twitterCard: "summary",
});
</script>

<template>
  <main class="kla-klok-page -mx-4 -my-6 overflow-hidden bg-[#071426] text-white sm:mx-0 sm:my-0 sm:rounded-3xl sm:border sm:border-white/10">
    <KlaKlokHero />

    <div class="mx-5 h-px bg-white/10 sm:mx-10 lg:mx-16" />
    <KlaKlokHowToPlay />

    <div class="mx-3 h-px bg-white/10 sm:mx-10 lg:mx-16" />
    <KlaKlokBoard />

    <section class="px-5 py-14 sm:px-10 lg:px-16">
      <div class="mx-auto max-w-6xl">
        <div class="max-w-2xl">
          <p class="text-xs font-bold uppercase tracking-[0.18em] text-amber-300">Why play</p>
          <h2 class="mt-3 text-2xl font-bold text-white sm:text-3xl">សប្បាយ ងាយ និងលេងបានគ្រប់ទីកន្លែង</h2>
        </div>
        <div class="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <article
            v-for="benefit in benefits"
            :key="benefit.titleEn"
            class="rounded-2xl border border-white/10 bg-[#0e2138] p-4 sm:p-5"
          >
            <span class="grid size-9 place-items-center rounded-xl bg-[#d64c4c]/15 text-sm font-black text-[#ef7777]" aria-hidden="true">
              {{ benefit.icon }}
            </span>
            <h3 class="mt-4 text-sm font-bold leading-6 text-white sm:text-base">{{ benefit.titleKm }}</h3>
            <p class="mt-1 text-xs leading-5 text-white/45 sm:text-sm">{{ benefit.titleEn }}</p>
          </article>
        </div>
      </div>
    </section>

    <div class="mx-5 h-px bg-white/10 sm:mx-10 lg:mx-16" />
    <KlaKlokRules />

    <section class="px-5 pb-16 pt-6 sm:px-10 sm:pb-20 lg:px-16">
      <div class="mx-auto max-w-6xl rounded-3xl border border-amber-300/25 bg-[#0e2138] px-5 py-10 text-center sm:px-10 sm:py-12">
        <p class="text-sm font-bold uppercase tracking-[0.16em] text-amber-300">Ready?</p>
        <h2 class="mt-3 text-2xl font-bold text-white sm:text-3xl">ត្រៀមលេងខ្លាឃ្លោកហើយឬនៅ?</h2>
        <p class="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/50">
          លេងសម្រាប់ការកម្សាន្តដោយប្រើពិន្ទុសិប្បនិម្មិតតែប៉ុណ្ណោះ។
        </p>
        <a
          href="#kla-klok-game"
          class="mt-7 inline-flex min-h-12 items-center justify-center rounded-xl bg-[#d64c4c] px-7 text-sm font-bold text-white transition hover:bg-[#bd3e3e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
        >
          ចាប់ផ្តើមលេង
        </a>
      </div>
    </section>
  </main>
</template>
