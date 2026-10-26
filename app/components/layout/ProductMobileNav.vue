<script setup lang="ts">
import {
  BookOpen,
  CircleUserRound,
  Clock3,
  Coins,
  Home,
  List,
  Pencil,
  Plus,
  Share2,
} from "lucide-vue-next";
import {
  getProductMobileNavigation,
  isProductMobileItemActive,
  mobileProductTarget,
  type ProductMobileItem,
} from "~/lib/product-mobile-navigation";
import { QUICK_EXPENSE_OPEN_EVENT } from "~/composables/useQuickExpense";

const { product, config } = useProductDomain();
const route = useRoute();
const { isKhmer } = useLanguage();
const momentLanguage = product === "moment" ? useMomentLanguage() : undefined;
const khmer = computed(() => momentLanguage?.isKhmer.value ?? isKhmer.value);
const { user, isReady, fetchMe } = useAuth();
const { websiteEnabled } = useFeatureAvailability();
const keyboardActive = ref(false);
const linkPreview = product === "link"
  ? useState<boolean>("link:mobile-preview", () => false)
  : undefined;
const icons = {
  home: Home,
  edit: Pencil,
  share: Share2,
  account: CircleUserRound,
  recent: Clock3,
  credits: Coins,
  add: Plus,
  legacy: List,
  rules: BookOpen,
};
const items = computed(() =>
  product
    ? getProductMobileNavigation(product).filter(
        (item) => !item.action || websiteEnabled("expense-tracker"),
      )
    : [],
);

function target(item: ProductMobileItem) {
  return mobileProductTarget(
    product!,
    item.to || "/",
    momentLanguage?.locale.value || "en",
  );
}
function active(item: ProductMobileItem) {
  return (
    product && isProductMobileItemActive(product, item, route.path, route.hash)
  );
}
function focusDestination(item: ProductMobileItem) {
  // Reselecting Edit or Share must also reveal the form when the URL is unchanged.
  if (linkPreview && (item.key === "edit" || item.key === "share"))
    linkPreview.value = false;
}
async function addExpense() {
  if (!isReady.value) await fetchMe();
  if (!user.value)
    return navigateTo({ path: "/login", query: { redirect: route.fullPath } });
  // Reuse the existing authenticated form, validation and saved-entry events.
  window.dispatchEvent(new CustomEvent(QUICK_EXPENSE_OPEN_EVENT));
}
function syncKeyboard() {
  queueMicrotask(() => {
    keyboardActive.value =
      document.activeElement instanceof HTMLElement &&
      (document.activeElement.matches(
        "input:not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit]), textarea, select",
      ) ||
        document.activeElement.isContentEditable);
  });
}
onMounted(() => {
  document.addEventListener("focusin", syncKeyboard);
  document.addEventListener("focusout", syncKeyboard);
});
onBeforeUnmount(() => {
  document.removeEventListener("focusin", syncKeyboard);
  document.removeEventListener("focusout", syncKeyboard);
});
</script>

<template>
  <nav
    v-if="product && !keyboardActive"
    class="product-mobile-nav fixed inset-x-0 bottom-0 z-50 flex border-t border-slate-200 bg-white/95 px-2 pt-1 backdrop-blur dark:border-white/10 dark:bg-neutral-950/95 sm:hidden"
    :aria-label="khmer ? 'រុករកកម្មវិធី' : 'Product navigation'"
  >
    <template v-for="item in items" :key="item.key">
      <button
        v-if="item.action"
        type="button"
        class="product-mobile-nav-item text-sky-700 dark:text-cyan-300"
        aria-haspopup="dialog"
        @click="addExpense"
      >
        <component
          :is="icons[item.icon]"
          class="size-5"
          aria-hidden="true"
        /><span>{{ khmer ? item.labelKm : item.label }}</span>
      </button>
      <a
        v-else-if="item.externalPath"
        :href="`${config.mainOrigin}${item.externalPath}`"
        class="product-mobile-nav-item text-slate-500 dark:text-white/55"
      >
        <component
          :is="icons[item.icon]"
          class="size-5"
          aria-hidden="true"
        /><span>{{ khmer ? item.labelKm : item.label }}</span>
      </a>
      <NuxtLink
        v-else
        :to="target(item)"
        class="product-mobile-nav-item"
        :class="
          active(item)
            ? 'bg-sky-50 text-sky-700 dark:bg-cyan-300/10 dark:text-cyan-200'
            : 'text-slate-500 dark:text-white/55'
        "
        :aria-current="active(item) ? 'page' : undefined"
        @click="focusDestination(item)"
      >
        <component
          :is="icons[item.icon]"
          class="size-5"
          aria-hidden="true"
        /><span>{{ khmer ? item.labelKm : item.label }}</span>
      </NuxtLink>
    </template>
  </nav>
</template>

<style scoped>
.product-mobile-nav {
  padding-bottom: max(0.5rem, env(safe-area-inset-bottom));
}
.product-mobile-nav-item {
  display: flex;
  flex: 1;
  min-width: 0;
  min-height: 3.5rem;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 0.25rem;
  border-radius: 0.85rem;
  padding: 0.375rem 0.25rem;
  font-size: 0.6875rem;
  font-weight: 600;
  line-height: 1.4;
  text-align: center;
}
.product-mobile-nav-item:focus-visible {
  outline: 2px solid #0ea5e9;
  outline-offset: -2px;
}
</style>
