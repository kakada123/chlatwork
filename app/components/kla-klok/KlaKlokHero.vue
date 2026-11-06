<script setup lang="ts">
import { useAppI18n } from "~/composables/useAppI18n";

const { t } = useAppI18n();

defineProps<{ compactMobile?: boolean }>();
</script>

<template>
  <section class="relative overflow-hidden px-5 pb-16 pt-12 sm:px-10 sm:pb-20 sm:pt-16 lg:px-16" :class="{ 'compact-mobile': compactMobile }">
    <div class="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1fr_0.9fr]">
      <div class="text-center lg:text-left">
        <p class="text-sm font-bold uppercase tracking-[0.18em] text-amber-300">
          {{ t("products.games.virtual_play") }}
        </p>
        <h1 class="mt-4 text-4xl font-black leading-tight text-white sm:text-5xl">
          {{ t("products.games.kla_klok") }}
        </h1>
        <p v-if="compactMobile" class="game-mobile-notice sm:hidden">{{ t("products.games.virtual_points") }}</p>
        <p class="mx-auto mt-5 max-w-xl text-lg leading-8 text-white/70 lg:mx-0">
          {{ t("products.games.hero.intro") }}
        </p>
        <p class="mx-auto mt-2 max-w-xl text-sm leading-6 text-white/45 lg:mx-0">
          {{ t("products.games.pick_your_symbols_roll_three_dice_and_collect_virtual_points") }}
        </p>

        <div class="mt-8 hidden flex-wrap justify-center gap-3 sm:flex lg:justify-start">
          <a
            href="#kla-klok-game"
            class="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#d64c4c] px-6 text-sm font-bold text-white transition hover:bg-[#bd3e3e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
          >
            {{ t("products.games.hero.play_now") }}
          </a>
          <a
            href="#kla-klok-rules"
            class="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/20 bg-white/[0.04] px-6 text-sm font-bold text-white transition hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
          >
            {{ t("products.games.hero.how_to_play") }}
          </a>
        </div>
      </div>

      <div class="relative mx-auto min-h-[17rem] w-full max-w-md">
        <KlaKlokBowl
          :covered="true"
          :rolling="false"
          :aria-label="t(&quot;products.games.hero.covered_bowl&quot;)"
        />
      </div>
    </div>

    <div class="sticky bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-30 mt-6 grid gap-2 sm:hidden">
      <a
        href="#kla-klok-game"
        class="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#d64c4c] px-6 text-sm font-bold text-white shadow-[0_12px_30px_rgba(0,0,0,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
      >
        {{ t("products.games.hero.play_now") }}
      </a>
      <a href="#kla-klok-rules" class="text-center text-sm font-semibold text-amber-200 underline decoration-amber-200/40 underline-offset-4">
        {{ t("products.games.hero.how_to_play") }}
      </a>
    </div>
  </section>
</template>

<style scoped>
@media (max-width: 639px) {
  .compact-mobile { padding-top: 1.25rem; padding-bottom: .5rem; }
  .compact-mobile > div:first-child { display: block; }
  .compact-mobile > div:first-child > div:last-child,
  .compact-mobile > div:last-child { display: none; }
  .compact-mobile h1 { margin-top: 0; font-size: 1.6rem; }
  .compact-mobile p { display: none; }
  .compact-mobile .game-mobile-notice { display: block; margin-top: .5rem; color: #fcd34d; font-size: .75rem; font-weight: 500; }
}
</style>
