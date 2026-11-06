<script setup lang="ts">
import { useAppI18n } from "~/composables/useAppI18n";

const { t } = useAppI18n();
const { t: khmerText } = useAppI18n({ value: true });
const isKhmer = typeof useLanguage === "function" ? useLanguage().isKhmer : ref(true);
const { canonical, product } = useProductDomain();
const route = useRoute();
const mobileRulesOpen = ref(false);
async function revealRules() {
  if (route.hash !== "#kla-klok-rules") return;
  mobileRulesOpen.value = true;
  await nextTick();
  if (import.meta.client) document.getElementById("kla-klok-rules")?.scrollIntoView({ block: "start" });
}
watch(() => route.hash, revealRules);
onMounted(revealRules);
async function toggleMobileRules() {
  mobileRulesOpen.value = !mobileRulesOpen.value;
  // Clear the anchor when collapsing so the Rules tab can navigate to it again.
  if (!mobileRulesOpen.value && route.hash === "#kla-klok-rules")
    await navigateTo({ path: route.path, query: route.query }, { replace: true });
}
const benefits = [
  { icon: "◆", titleKey: "tools.klaKlok.benefits.design" },
  { icon: "⚡", titleKey: "tools.klaKlok.benefits.speed" },
  { icon: "▣", titleKey: "tools.klaKlok.benefits.mobile" },
  { icon: "○", titleKey: "tools.klaKlok.benefits.account" },
];




useSeoMeta({
  title: () => t("tools.klaKlok.metaTitle"),
  description: () => t("tools.klaKlok.metaDescription"),
  ogTitle: () => t("tools.klaKlok.metaOgTitle"),
  ogDescription: () => t("tools.klaKlok.metaOgDescription"),
  ogType: "website",
  ogUrl: canonical,
  twitterCard: "summary",
});
</script>

<template>
  <main class="kla-klok-page -mx-4 -my-6 overflow-hidden bg-[#071426] text-white sm:mx-0 sm:my-0 sm:rounded-3xl sm:border sm:border-white/10" :class="{ 'games-product-mobile': product === 'games' }">
    <KlaKlokHero class="games-product-hero" :compact-mobile="product === 'games'" />

    <div class="games-product-divider mx-5 h-px bg-white/10 sm:mx-10 lg:mx-16" />
    <KlaKlokHowToPlay class="games-product-help" :class="product === 'games' && !mobileRulesOpen ? 'hidden sm:block' : undefined" />

    <div class="games-product-divider mx-3 h-px bg-white/10 sm:mx-10 lg:mx-16" />
    <KlaKlokBoard class="games-product-board" />
    <button v-if="product === 'games'" type="button" class="games-product-help-toggle mx-4 my-4 flex min-h-12 items-center justify-between rounded-xl border border-white/15 px-4 text-sm font-semibold text-amber-200 sm:hidden" :aria-expanded="mobileRulesOpen" aria-controls="kla-klok-rules" @click="toggleMobileRules">{{ t("tools.klaKlok.howToPlayRules") }} <span aria-hidden="true">{{ mobileRulesOpen ? '−' : '+' }}</span></button>

    <section class="games-product-benefits px-5 py-14 sm:px-10 lg:px-16">
      <div class="mx-auto max-w-6xl">
        <div class="max-w-2xl">
          <p class="text-xs font-bold uppercase tracking-[0.18em] text-amber-300">{{ t("tools.klaKlok.whyPlay") }}</p>
          <h2 class="mt-3 text-2xl font-bold text-white sm:text-3xl">{{ t("tools.klaKlok.everywhere") }}</h2>
        </div>
        <div class="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <article
            v-for="benefit in benefits"
            :key="benefit.titleKey"
            class="rounded-2xl border border-white/10 bg-[#0e2138] p-4 sm:p-5"
          >
            <span class="grid size-9 place-items-center rounded-xl bg-[#d64c4c]/15 text-sm font-black text-[#ef7777]" aria-hidden="true">
              {{ benefit.icon }}
            </span>
            <h3 class="mt-4 text-sm font-bold leading-6 text-white sm:text-base">{{ t(benefit.titleKey) }}</h3>
            <p class="mt-1 text-xs leading-5 text-white/45 sm:text-sm">{{ benefit.titleEn }}</p>
          </article>
        </div>
      </div>
    </section>

    <div class="games-product-divider mx-5 h-px bg-white/10 sm:mx-10 lg:mx-16" />
    <KlaKlokRules class="games-product-rules" :class="product === 'games' && !mobileRulesOpen ? 'hidden sm:block' : undefined" />

    <section class="games-product-cta px-5 pb-16 pt-6 sm:px-10 sm:pb-20 lg:px-16">
      <div class="mx-auto max-w-6xl rounded-3xl border border-amber-300/25 bg-[#0e2138] px-5 py-10 text-center sm:px-10 sm:py-12">
        <p class="text-sm font-bold uppercase tracking-[0.16em] text-amber-300">{{ t("tools.klaKlok.ready") }}</p>
        <h2 class="mt-3 text-2xl font-bold text-white sm:text-3xl">{{ t("tools.klaKlok.readyToPlay") }}</h2>
        <p class="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/50">
          {{ t("tools.klaKlok.virtualPointsOnly") }}
        </p>
        <a
          href="#kla-klok-game"
          class="mt-7 inline-flex min-h-12 items-center justify-center rounded-xl bg-[#d64c4c] px-7 text-sm font-bold text-white transition hover:bg-[#bd3e3e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
        >
          {{ t("tools.klaKlok.startPlaying") }}
        </a>
      </div>
    </section>
  </main>
</template>

<style scoped>
@media (max-width: 639px) {
  .games-product-mobile { display: flex; flex-direction: column; margin-top: 0; margin-bottom: 0; }
  .games-product-mobile .games-product-hero { order: 1; }
  .games-product-mobile .games-product-board { order: 2; }
  .games-product-mobile .games-product-help-toggle { order: 3; }
  .games-product-mobile .games-product-help { order: 4; padding-top: 1rem; padding-bottom: 1rem; }
  .games-product-mobile .games-product-rules { order: 5; padding-top: 1rem; padding-bottom: 1.5rem; scroll-margin-top: 5rem; }
  .games-product-mobile .games-product-divider,
  .games-product-mobile .games-product-benefits,
  .games-product-mobile .games-product-cta { display: none; }
}
</style>
