<script setup lang="ts">
import { useAppI18n } from "~/composables/useAppI18n";
import {
  CalendarDays,
  Dices,
  Gamepad2,
  Heart,
  HandCoins,
  Link2,
  Moon,
  MoreHorizontal,
  ReceiptText,
  Sparkles,
  Sun,
  Wallet,
} from "lucide-vue-next";
import { PRODUCTS } from "~/lib/product-domains";
import { openQuickExpense, useQuickExpense } from "~/composables/useQuickExpense";

const { t } = useAppI18n();

const { product, config } = useProductDomain();
const { isKhmer, languageLabel, switchLanguage } = useLanguage();
const khmer = isKhmer;
const { isDark, toggleColorMode, nextColorModeLabel } = useColorMode();
const { user, isReady } = useAuth();
const { enabled: quickExpenseEnabled } = useQuickExpense();
const { websiteEnabled } = useFeatureAvailability();
const canQuickExpense = computed(() =>
  product !== "creator" && product !== "expense" && product !== "jekluy" && product !== "calendar" && isReady.value &&
  Boolean(user.value) && quickExpenseEnabled.value === true &&
  websiteEnabled("expense-tracker"),
);
const route = useRoute();
const moreMenu = ref<HTMLDetailsElement | null>(null);
const creditBalance =
  product === "creator"
    ? useState<number | null>("creator:credit-balance", () => null)
    : undefined;
const mobileCreditBalance = computed(() => creditBalance?.value ?? null);
const icons = {
  jekluy: HandCoins,
  creator: Sparkles,
  link: Link2,
  moment: Heart,
  expense: Wallet,
  draw: Dices,
  games: Gamepad2,
  calendar: CalendarDays,
};
const productInfo = computed(() => (product ? PRODUCTS[product] : null));
const links = computed(() => {
  if (product === "link")
    return [
      {
        to: "/account/link",
        label: t("shared.components_layout_product_navigation.edit_your_page"),
      },
    ];
  if (product === "moment")
    return [
      { to: "/", label: t("shared.components_layout_product_navigation.create_a_moment") },
      {
        to: "/moments",
        label: t("shared.components_layout_product_navigation.my_moments"),
      },
    ];
  if (product === "games")
    return [{ to: "/kla-klok", label: t("shared.navigation.kla_klok") }];
  return [];
});
function closeMore() {
  if (moreMenu.value) moreMenu.value.open = false;
}
function openExpense() {
  if (!canQuickExpense.value) return;
  closeMore();
  openQuickExpense();
}
function closeOutside(event: PointerEvent) {
  if (event.target instanceof Node && !moreMenu.value?.contains(event.target))
    closeMore();
}
watch(() => route.fullPath, closeMore);
onMounted(() => document.addEventListener("pointerdown", closeOutside));
onBeforeUnmount(() =>
  document.removeEventListener("pointerdown", closeOutside),
);
</script>

<template>
  <header
    v-if="productInfo"
    class="sticky top-0 z-50 border-b border-black/10 bg-white/95 px-4 py-2 backdrop-blur dark:border-white/10 dark:bg-neutral-950/95 sm:py-3"
  >
    <div
      class="mx-auto flex min-h-12 max-w-[1244px] items-center justify-between gap-2 sm:hidden"
    >
      <NuxtLink
        :to="productInfo.home"
        class="flex min-h-11 min-w-0 items-center gap-2 font-bold text-sky-700 dark:text-cyan-300"
      >
        <span
          class="grid size-9 shrink-0 place-items-center rounded-xl bg-sky-50 dark:bg-cyan-300/10"
          ><component
            :is="icons[product || 'link']"
            class="size-5"
            aria-hidden="true"
        /></span>
        <span class="min-w-0 leading-tight"
          ><span
            class="block text-[10px] font-semibold tracking-wide text-slate-500 dark:text-white/45"
            >ChlatWork</span
          ><span class="block truncate text-base">{{
            t(productInfo.nameKey).replace("ChlatWork ", "")
          }}</span></span
        >
      </NuxtLink>
      <div class="flex shrink-0 items-center gap-1">
        <button type="button" class="min-h-11 rounded-xl px-2 text-xs font-semibold text-slate-600 dark:text-white/70" :aria-label="languageLabel" @click="switchLanguage">{{ languageLabel }}</button>
        <NuxtLink
          v-if="product === 'creator'"
          to="/creator/credits"
          class="inline-flex min-h-11 items-center rounded-xl px-2 text-xs font-semibold text-violet-700 dark:text-violet-300"
          >{{
            mobileCreditBalance === null
              ? t("shared.components_layout_product_navigation.credits")
              : `${mobileCreditBalance.toLocaleString("en-US")} ${t("shared.components_layout_product_navigation.credits_2")}`
          }}</NuxtLink
        >
        <details
          ref="moreMenu"
          class="relative"
          @keydown.esc.stop.prevent="closeMore"
        >
          <summary
            class="grid size-11 cursor-pointer list-none place-items-center rounded-xl text-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500 dark:text-white/60 [&::-webkit-details-marker]:hidden"
            :aria-label="t(&quot;shared.components_layout_product_navigation.more_options&quot;)"
          >
            <MoreHorizontal class="size-5" aria-hidden="true" />
          </summary>
          <nav
            class="absolute right-0 top-full z-50 mt-2 grid max-h-[calc(100dvh-10rem)] w-60 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 text-sm shadow-xl dark:border-white/15 dark:bg-neutral-900"
            :aria-label="t(&quot;shared.components_layout_product_navigation.product_options&quot;)"
          >
            <button
              v-if="canQuickExpense"
              type="button"
              class="flex min-h-11 items-center gap-3 rounded-xl px-3 text-left"
              aria-haspopup="dialog"
              @click="openExpense"
            >
              <ReceiptText class="size-4" aria-hidden="true" />{{ t("shared.components_layout_product_navigation.add_expense") }}
            </button>
            <button
              type="button"
              class="flex min-h-11 items-center gap-3 rounded-xl px-3 text-left"
              @click="toggleColorMode"
            >
              <Sun v-if="isDark" class="size-4" aria-hidden="true" /><Moon
                v-else
                class="size-4"
                aria-hidden="true"
              />{{ nextColorModeLabel }}
            </button>
            <a
              :href="config.mainOrigin"
              class="min-h-11 content-center rounded-xl px-3"
              >{{ t("shared.components_layout_product_navigation.all_apps") }}</a
            >
            <NuxtLink
              to="/privacy-policy"
              class="min-h-11 content-center rounded-xl px-3"
              >{{ t("shared.components_layout_product_navigation.privacy") }}</NuxtLink
            >
            <NuxtLink
              to="/terms"
              class="min-h-11 content-center rounded-xl px-3"
              >{{ t("shared.components_layout_product_navigation.terms") }}</NuxtLink
            >
            <template
              v-if="product === 'creator' && isReady && user?.role === 'ADMIN'"
            >
              <NuxtLink
                to="/creator/admin/credits"
                class="min-h-11 content-center rounded-xl px-3"
                >{{ t("shared.components_layout_product_navigation.credits_limits") }}</NuxtLink
              >
              <NuxtLink
                to="/admin/bots"
                class="min-h-11 content-center rounded-xl px-3"
                >{{ t("shared.components_layout_product_navigation.bot_admin") }}</NuxtLink
              >
              <NuxtLink
                to="/admin/tools"
                class="min-h-11 content-center rounded-xl px-3"
                >{{ t("shared.components_layout_product_navigation.tools_ads") }}</NuxtLink
              >
            </template>
          </nav>
        </details>
      </div>
    </div>
    <div
      class="mx-auto hidden max-w-[1244px] flex-wrap items-center justify-between gap-3 sm:flex"
    >
      <NuxtLink
        :to="productInfo.home"
        class="min-h-11 content-center font-bold text-sky-700 dark:text-cyan-300"
        >{{ t(productInfo.nameKey) }}</NuxtLink
      >
      <nav
        class="flex flex-wrap items-center gap-3 text-sm"
        :aria-label="t(productInfo.nameKey)"
      >
        <NuxtLink
          v-for="link in links"
          :key="link.to"
          :to="link.to"
          class="min-h-11 content-center"
          >{{ link.label }}</NuxtLink
        >
        <NuxtLink to="/account" class="min-h-11 content-center">{{
          t("shared.common.account")
        }}</NuxtLink>
        <a :href="config.mainOrigin" class="min-h-11 content-center">{{
          t("shared.components_layout_product_navigation.all_apps")
        }}</a>
        <button type="button" class="min-h-11 rounded-xl px-2 font-semibold" :aria-label="languageLabel" @click="switchLanguage">{{ languageLabel }}</button>
        <button
          type="button"
          class="min-h-11 px-2"
          :aria-label="nextColorModeLabel"
          @click="toggleColorMode"
        >
          {{ isDark ? "☀" : "☾" }}
        </button>
      </nav>
    </div>
    <p
      v-if="product === 'draw'"
      class="mx-auto mt-1 hidden max-w-[1244px] text-xs text-slate-600 dark:text-slate-300 sm:block"
    >
      {{
        t("shared.components_layout_product_navigation.saved_lists_and_history_belong_to_each_browser_origin")
      }}
      <a :href="`${config.mainOrigin}/tools/lucky-draw`" class="underline">{{
        t("shared.components_layout_product_navigation.open_legacy_saved_lists")
      }}</a>
    </p>
  </header>
</template>
