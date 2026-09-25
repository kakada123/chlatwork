<script setup lang="ts">
const heroDice = ["tiger", "gourd", "crab"] as const;
</script>

<template>
  <section class="relative overflow-hidden px-5 pb-16 pt-12 sm:px-10 sm:pb-20 sm:pt-16 lg:px-16">
    <div class="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1fr_0.9fr]">
      <div class="text-center lg:text-left">
        <p class="text-sm font-bold uppercase tracking-[0.18em] text-amber-300">
          ហ្គេមប្រពៃណីខ្មែរ · Virtual play
        </p>
        <h1 class="mt-4 text-4xl font-black leading-tight text-white sm:text-5xl">
          ខ្លាឃ្លោក — Kla Klok
        </h1>
        <p class="mx-auto mt-5 max-w-xl text-lg leading-8 text-white/70 lg:mx-0">
          លេងសប្បាយៗ ជាមួយហ្គេមប្រពៃណីខ្មែរ
        </p>
        <p class="mx-auto mt-2 max-w-xl text-sm leading-6 text-white/45 lg:mx-0">
          Pick your symbols, roll three dice, and collect virtual points.
        </p>

        <div class="mt-8 hidden flex-wrap justify-center gap-3 sm:flex lg:justify-start">
          <a
            href="#kla-klok-game"
            class="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#d64c4c] px-6 text-sm font-bold text-white transition hover:bg-[#bd3e3e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
          >
            លេងឥឡូវនេះ
          </a>
          <a
            href="#kla-klok-rules"
            class="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/20 bg-white/[0.04] px-6 text-sm font-bold text-white transition hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
          >
            របៀបលេង
          </a>
        </div>
      </div>

      <div class="relative mx-auto flex min-h-56 w-full max-w-md items-center justify-center" aria-label="Three Kla Klok dice">
        <KlaKlokDice class="-mr-3 rotate-[-10deg] sm:-mr-5" :symbol="heroDice[0]" size="hero" />
        <KlaKlokDice class="relative z-10 -translate-y-6 rotate-[4deg]" :symbol="heroDice[1]" size="hero" />
        <KlaKlokDice class="-ml-3 rotate-[12deg] sm:-ml-5" :symbol="heroDice[2]" size="hero" />
      </div>
    </div>

    <div class="sticky bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-30 mt-6 grid gap-2 sm:hidden">
      <a
        href="#kla-klok-game"
        class="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#d64c4c] px-6 text-sm font-bold text-white shadow-[0_12px_30px_rgba(0,0,0,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
      >
        លេងឥឡូវនេះ
      </a>
      <a href="#kla-klok-rules" class="text-center text-sm font-semibold text-amber-200 underline decoration-amber-200/40 underline-offset-4">
        របៀបលេង
      </a>
    </div>
  </section>
</template>
