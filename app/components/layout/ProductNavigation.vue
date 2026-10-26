<script setup lang="ts">
import {
  Dices,
  Gamepad2,
  Heart,
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
const { product, config } = useProductDomain();
const { isKhmer } = useLanguage();
const momentLanguage = product === "moment" ? useMomentLanguage() : undefined;
const khmer = computed(() => momentLanguage?.isKhmer.value ?? isKhmer.value);
const { isDark, toggleColorMode, nextColorModeLabel } = useColorMode();
const { user, isReady } = useAuth();
const { enabled: quickExpenseEnabled } = useQuickExpense();
const { websiteEnabled } = useFeatureAvailability();
const canQuickExpense = computed(() =>
  product !== "creator" && product !== "expense" && isReady.value &&
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
  creator: Sparkles,
  link: Link2,
  moment: Heart,
  expense: Wallet,
  draw: Dices,
  games: Gamepad2,
};
const productInfo = computed(() => (product ? PRODUCTS[product] : null));
const links = computed(() => {
  if (product === "link")
    return [
      {
        to: "/account/link",
        label: isKhmer.value ? "កែទំព័រ" : "Edit your page",
      },
    ];
  if (product === "moment")
    return [
      { to: "/", label: isKhmer.value ? "បង្កើត Moment" : "Create a Moment" },
      {
        to: "/moments",
        label: isKhmer.value ? "Moments របស់ខ្ញុំ" : "My Moments",
      },
    ];
  if (product === "games")
    return [{ to: "/kla-klok", label: "ខ្លាឃ្លោក · Kla Klok" }];
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
            productInfo.name.replace("ChlatWork ", "")
          }}</span></span
        >
      </NuxtLink>
      <div class="flex shrink-0 items-center gap-1">
        <NuxtLink
          v-if="product === 'creator'"
          to="/creator/credits"
          class="inline-flex min-h-11 items-center rounded-xl px-2 text-xs font-semibold text-violet-700 dark:text-violet-300"
          >{{
            mobileCreditBalance === null
              ? khmer
                ? "ក្រេឌីត"
                : "Credits"
              : `${mobileCreditBalance.toLocaleString("en-US")} ${khmer ? "ក្រេឌីត" : "credits"}`
          }}</NuxtLink
        >
        <details
          ref="moreMenu"
          class="relative"
          @keydown.esc.stop.prevent="closeMore"
        >
          <summary
            class="grid size-11 cursor-pointer list-none place-items-center rounded-xl text-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500 dark:text-white/60 [&::-webkit-details-marker]:hidden"
            :aria-label="khmer ? 'ជម្រើសបន្ថែម' : 'More options'"
          >
            <MoreHorizontal class="size-5" aria-hidden="true" />
          </summary>
          <nav
            class="absolute right-0 top-full z-50 mt-2 grid max-h-[calc(100dvh-10rem)] w-60 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 text-sm shadow-xl dark:border-white/15 dark:bg-neutral-900"
            :aria-label="khmer ? 'ជម្រើសកម្មវិធី' : 'Product options'"
          >
            <button
              v-if="canQuickExpense"
              type="button"
              class="flex min-h-11 items-center gap-3 rounded-xl px-3 text-left"
              aria-haspopup="dialog"
              @click="openExpense"
            >
              <ReceiptText class="size-4" aria-hidden="true" />{{ khmer ? "បន្ថែមចំណាយ" : "Add expense" }}
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
              >{{ khmer ? "កម្មវិធីទាំងអស់" : "All apps" }}</a
            >
            <NuxtLink
              to="/privacy-policy"
              class="min-h-11 content-center rounded-xl px-3"
              >{{ khmer ? "ឯកជនភាព" : "Privacy" }}</NuxtLink
            >
            <NuxtLink
              to="/terms"
              class="min-h-11 content-center rounded-xl px-3"
              >{{ khmer ? "លក្ខខណ្ឌ" : "Terms" }}</NuxtLink
            >
            <template
              v-if="product === 'creator' && isReady && user?.role === 'ADMIN'"
            >
              <NuxtLink
                to="/creator/admin/credits"
                class="min-h-11 content-center rounded-xl px-3"
                >Credits & limits</NuxtLink
              >
              <NuxtLink
                to="/admin/bots"
                class="min-h-11 content-center rounded-xl px-3"
                >Bot Admin</NuxtLink
              >
              <NuxtLink
                to="/admin/tools"
                class="min-h-11 content-center rounded-xl px-3"
                >Tool availability</NuxtLink
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
        >{{ productInfo.name }}</NuxtLink
      >
      <nav
        class="flex flex-wrap items-center gap-3 text-sm"
        :aria-label="productInfo.name"
      >
        <NuxtLink
          v-for="link in links"
          :key="link.to"
          :to="link.to"
          class="min-h-11 content-center"
          >{{ link.label }}</NuxtLink
        >
        <NuxtLink to="/account" class="min-h-11 content-center">{{
          isKhmer ? "គណនី" : "Account"
        }}</NuxtLink>
        <a :href="config.mainOrigin" class="min-h-11 content-center">{{
          isKhmer ? "កម្មវិធីទាំងអស់" : "All apps"
        }}</a>
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
        isKhmer
          ? "ទិន្នន័យរក្សាទុកក្នុង browser តាម domain នីមួយៗ។"
          : "Saved lists and history belong to each browser origin."
      }}
      <a :href="`${config.mainOrigin}/tools/lucky-draw`" class="underline">{{
        isKhmer ? "បើកបញ្ជីចាស់" : "Open legacy saved lists"
      }}</a>
    </p>
  </header>
</template>
