<script setup lang="ts">
import { useCalendarLanguage } from "~/composables/useCalendarLanguage";
import { useAppI18n } from "~/composables/useAppI18n";
import {
  CalendarDays,
  ClipboardCheck,
  ListChecks,
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
  Utensils,
  Wallet,
  UserRound,
} from "lucide-vue-next";
import { PRODUCTS, type Product } from "~/lib/product-domains";
import {
  openQuickExpense,
  useQuickExpense,
} from "~/composables/useQuickExpense";
const props = defineProps<{ product?: Product }>();
const { product: domainProduct, config } = useProductDomain();
const product = props.product ?? domainProduct;
const preferredLanguage = useLanguage();
const { isKhmer, switchLanguage } =
  product === "calendar" ? useCalendarLanguage() : preferredLanguage;
const { t } = useAppI18n(isKhmer);
const languageLabel = computed(() =>
  t(
    isKhmer.value
      ? "catalog.shell.nav.switch_to_english"
      : "catalog.shell.nav.switch_to_khmer",
  ),
);
const { isDark, toggleColorMode, nextColorModeLabel } = useColorMode(),
  { user, isReady } = useAuth(),
  { enabled: quickExpenseEnabled } = useQuickExpense(),
  { websiteEnabled } = useFeatureAvailability();
const route = useRoute(),
  moreMenu = ref<HTMLDetailsElement | null>(null);
const productInfo = computed(() => (product ? PRODUCTS[product] : null));
const home = computed(() =>
  productInfo.value
    ? domainProduct === product
      ? productInfo.value.home
      : productInfo.value.entry
    : "/",
);
const icons = {
  jekluy: HandCoins,
  creator: Sparkles,
  link: Link2,
  moment: Heart,
  expense: Wallet,
  draw: Dices,
  games: Gamepad2,
  food: Utensils,
  calendar: CalendarDays,
  tasks: ListChecks,
  prep: ClipboardCheck,
};
const canQuickExpense = computed(
  () =>
    !["creator", "expense", "jekluy", "calendar"].includes(product ?? "") &&
    isReady.value &&
    Boolean(user.value) &&
    quickExpenseEnabled.value === true &&
    websiteEnabled("expense-tracker"),
);
const creditBalance =
  product === "creator"
    ? useState<number | null>("creator:credit-balance", () => null)
    : undefined;
const displayedCredits = computed(() => creditBalance?.value ?? null);
const links = computed(() =>
  product === "link"
    ? [
        {
          to: "/account/link",
          label: t(
            "shared.components_layout_product_navigation.edit_your_page",
          ),
        },
      ]
    : product === "moment"
      ? [
          {
            to: home.value,
            label: t(
              "shared.components_layout_product_navigation.create_a_moment",
            ),
          },
          {
            to: "/moments",
            label: t("shared.components_layout_product_navigation.my_moments"),
          },
        ]
      : product === "games"
        ? [{ to: "/kla-klok", label: t("shared.navigation.kla_klok") }]
        : [],
);
function closeMore() {
  if (moreMenu.value) moreMenu.value.open = false;
}
function openExpense() {
  if (!canQuickExpense.value) return;
  closeMore();
  openQuickExpense();
}
function outside(event: PointerEvent) {
  if (event.target instanceof Node && !moreMenu.value?.contains(event.target))
    closeMore();
}
watch(() => route.fullPath, closeMore);
onMounted(() => document.addEventListener("pointerdown", outside));
onBeforeUnmount(() => document.removeEventListener("pointerdown", outside));
</script>
<template>
  <header
    v-if="productInfo"
    data-product-header
    class="product-header sticky top-0 z-50 shrink-0 border-b border-slate-200 bg-white/95 text-slate-950 backdrop-blur dark:border-white/10 dark:bg-neutral-950/95 dark:text-white"
  >
    <div
      class="mx-auto flex h-16 max-w-[1400px] items-center justify-between gap-2 px-3 sm:px-6"
    >
      <NuxtLink
        :to="home"
        class="flex min-h-11 min-w-0 flex-1 items-center gap-2.5 rounded-xl font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500"
      >
        <span
          class="grid size-9 shrink-0 place-items-center rounded-xl bg-sky-50 text-sky-700 dark:bg-sky-400/10 dark:text-sky-300"
          ><component :is="icons[product!]" class="size-5" aria-hidden="true"
        /></span>
        <span class="min-w-0 leading-tight"
          ><span
            class="block text-[10px] font-semibold text-slate-500 dark:text-white/50"
            >ChlatWork</span
          ><span class="block truncate text-sm sm:text-base">{{
            t(productInfo.nameKey).replace("ChlatWork ", "")
          }}</span></span
        >
      </NuxtLink>
      <nav
        class="flex shrink-0 items-center gap-0.5 sm:gap-1"
        :aria-label="t(productInfo.nameKey)"
      >
        <button
          type="button"
          class="min-h-11 rounded-xl px-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500 dark:text-white/70 dark:hover:bg-white/10"
          :aria-label="languageLabel"
          @click="switchLanguage"
        >
          {{ isKhmer ? "EN" : "ខ្មែរ" }}
        </button>
        <button
          type="button"
          class="grid size-11 place-items-center rounded-xl text-slate-500 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500 dark:text-white/65 dark:hover:bg-white/10"
          :aria-label="nextColorModeLabel"
          @click="toggleColorMode"
        >
          <Sun v-if="isDark" class="size-5" aria-hidden="true" /><Moon
            v-else
            class="size-5"
            aria-hidden="true"
          />
        </button>
        <NuxtLink
          to="/account"
          class="grid size-11 place-items-center rounded-xl text-slate-500 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500 dark:text-white/65 dark:hover:bg-white/10"
          :aria-label="t('shared.common.account')"
          ><UserRound class="size-5" aria-hidden="true"
        /></NuxtLink>
        <details
          ref="moreMenu"
          class="relative"
          @keydown.esc.stop.prevent="closeMore"
        >
          <summary
            class="grid size-11 cursor-pointer list-none place-items-center rounded-xl text-slate-500 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500 dark:text-white/65 dark:hover:bg-white/10 [&::-webkit-details-marker]:hidden"
            :aria-label="
              t('shared.components_layout_product_navigation.more_options')
            "
          >
            <MoreHorizontal class="size-5" aria-hidden="true" />
          </summary>
          <nav
            class="absolute right-0 top-full mt-2 grid max-h-[calc(100dvh-6rem)] w-64 max-w-[calc(100vw-1.5rem)] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 text-sm shadow-xl dark:border-white/15 dark:bg-neutral-950"
            :aria-label="
              t('shared.components_layout_product_navigation.product_options')
            "
            @click="closeMore"
          >
            <NuxtLink
              v-for="link in links"
              :key="link.to"
              :to="link.to"
              class="min-h-11 content-center rounded-xl px-3 hover:bg-slate-100 dark:hover:bg-white/10"
              >{{ link.label }}</NuxtLink
            >
            <NuxtLink
              v-if="product === 'creator'"
              to="/creator/credits"
              class="min-h-11 content-center rounded-xl px-3 hover:bg-slate-100 dark:hover:bg-white/10"
              >{{ t("shared.components_layout_product_navigation.credits")
              }}<span v-if="displayedCredits !== null">
                · {{ displayedCredits!.toLocaleString("en-US") }}</span
              ></NuxtLink
            >
            <button
              v-if="canQuickExpense"
              type="button"
              class="flex min-h-11 items-center gap-2 rounded-xl px-3 text-left hover:bg-slate-100 dark:hover:bg-white/10"
              aria-haspopup="dialog"
              @click="openExpense"
            >
              <ReceiptText class="size-4" aria-hidden="true" />{{
                t("shared.components_layout_product_navigation.add_expense")
              }}
            </button>
            <a
              :href="config.mainOrigin"
              class="min-h-11 content-center rounded-xl px-3 hover:bg-slate-100 dark:hover:bg-white/10"
              >{{
                t("shared.components_layout_product_navigation.all_apps")
              }}</a
            >
            <NuxtLink
              to="/privacy-policy"
              class="min-h-11 content-center rounded-xl px-3 hover:bg-slate-100 dark:hover:bg-white/10"
              >{{
                t("shared.components_layout_product_navigation.privacy")
              }}</NuxtLink
            ><NuxtLink
              to="/terms"
              class="min-h-11 content-center rounded-xl px-3 hover:bg-slate-100 dark:hover:bg-white/10"
              >{{
                t("shared.components_layout_product_navigation.terms")
              }}</NuxtLink
            >
            <a
              v-if="product === 'draw'"
              :href="`${config.mainOrigin}/tools/lucky-draw`"
              class="min-h-11 content-center rounded-xl px-3"
              >{{
                t(
                  "shared.components_layout_product_navigation.open_legacy_saved_lists",
                )
              }}</a
            >
            <template
              v-if="product === 'creator' && isReady && user?.role === 'ADMIN'"
              ><NuxtLink
                to="/creator/admin/credits"
                class="min-h-11 content-center rounded-xl px-3"
                >{{
                  t(
                    "shared.components_layout_product_navigation.credits_limits",
                  )
                }}</NuxtLink
              ><NuxtLink
                to="/admin/bots"
                class="min-h-11 content-center rounded-xl px-3"
                >{{
                  t("shared.components_layout_product_navigation.bot_admin")
                }}</NuxtLink
              ><NuxtLink
                to="/admin/tools"
                class="min-h-11 content-center rounded-xl px-3"
                >{{
                  t("shared.components_layout_product_navigation.tools_ads")
                }}</NuxtLink
              ></template
            >
          </nav>
        </details>
      </nav>
    </div>
  </header>
</template>
