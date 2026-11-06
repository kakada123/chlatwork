<script setup lang="ts">
import { useAppI18n } from "~/composables/useAppI18n";
import { useProductCopy } from "~/composables/useProductCopy";
const { languageLabel, switchLanguage } = useLanguage();
import { Moon, Sparkles, Sun, UserRound } from "lucide-vue-next";
import { getCreatorCredits } from "~/services/creator-ai.service";
import {
  CREATOR_CATEGORIES,
  getCreatorToolByRoute,
} from "~/data/creator-tools";

const { t } = useAppI18n();

const { productText } = useProductCopy();

const route = useRoute();
const { linkTo, product: domainProduct } = useProductDomain();
const { isDark, nextColorModeLabel, toggleColorMode } = useColorMode();
const { user, isReady, fetchMe } = useAuth();
const showLogin = ref(false);
const creditBalance = useState<number | null>(
  "creator:credit-balance",
  () => null,
);
let balanceRequest = 0;
// Match the shared shell's hydration boundary and reuse its cached session.
const signedIn = computed(() => isReady.value && Boolean(user.value));
const activeCategory = computed(() => {
  const tool = getCreatorToolByRoute(route.path);
  if (tool) return tool.category;
  return CREATOR_CATEGORIES.find(
    (category) => route.hash === `#creator-${category.id}-title`,
  )?.id;
});

onMounted(() => {
  watch(
    [isReady, () => user.value?.id],
    async () => {
      const version = ++balanceRequest;
      creditBalance.value = null;
      const userId = user.value?.id;
      if (!isReady.value || !userId) return;
      try {
        const result = await getCreatorCredits();
        if (
          version === balanceRequest &&
          user.value?.id === userId &&
          creditBalance.value === null
        ) {
          creditBalance.value = result.balance;
        }
      } catch {
        /* The credits page provides a retry without inventing a zero balance. */
      }
    },
    { immediate: true },
  );
  if (!isReady.value) void fetchMe();
});
onBeforeUnmount(() => {
  balanceRequest++;
});
</script>

<template>
  <!-- Creator owns its navigation so general utilities never enter this workspace. -->
  <div
    class="flex min-h-[100dvh] flex-col bg-[var(--app-color-page-bg)] text-slate-950 dark:bg-black dark:text-white"
  >
    <NuxtLoadingIndicator color="#7c3aed" />
    <a
      href="#creator-content"
      class="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-xl focus:bg-white focus:px-4 focus:py-3 focus:text-slate-950"
      >{{ t("products.creator.skip_to_creator_content") }}</a
    >

    <LayoutProductNavigation v-if="domainProduct" class="sm:hidden" />
    <header
      :class="domainProduct ? 'hidden sm:block' : undefined"
      class="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-white/10 dark:bg-black/95"
    >
      <div
        class="mx-auto flex min-h-16 max-w-[1244px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8"
      >
        <NuxtLink
          :to="linkTo('/creator')"
          class="mobile-pressable flex min-h-11 min-w-0 items-center gap-2.5 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
          :aria-label="t(&quot;products.common.chlat_work_creator_home&quot;)"
        >
          <span
            class="tool-icon-tone tool-icon-tone-violet grid size-10 shrink-0 place-items-center rounded-xl"
          >
            <Sparkles class="size-5" aria-hidden="true" />
          </span>
          <span class="min-w-0 leading-tight">
            <span
              class="block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-white/50"
              >ChlatWork</span
            >
            <span class="block text-lg font-bold text-[#082552] dark:text-white"
              >{{ t("products.creator.creator") }}</span
            >
          </span>
        </NuxtLink>

        <div class="flex shrink-0 items-center gap-2">
          <button
            type="button"
            class="mobile-pressable min-h-11 rounded-xl border border-slate-200 px-3 text-sm font-semibold focus-visible:ring-2 focus-visible:ring-violet-500 dark:border-white/15"
            :aria-label="languageLabel"
            @click="switchLanguage"
          >
            {{ languageLabel }}
          </button>
          <button
            type="button"
            class="mobile-pressable grid size-11 place-items-center rounded-xl border border-slate-200 text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:border-white/15 dark:text-white/70"
            :aria-label="nextColorModeLabel"
            :title="nextColorModeLabel"
            @click="toggleColorMode"
          >
            <Sun v-if="isDark" class="size-5" aria-hidden="true" />
            <Moon v-else class="size-5" aria-hidden="true" />
          </button>
          <NuxtLink
            v-if="signedIn"
            to="/account"
            class="mobile-pressable inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:border-white/15"
            :aria-label="t(&quot;products.common.open_account&quot;)"
          >
            <UserRound class="size-5" aria-hidden="true" />
            <span class="hidden sm:inline">{{ t("products.common.account") }}</span>
          </NuxtLink>
          <button
            v-else
            type="button"
            class="mobile-pressable min-h-11 rounded-xl bg-violet-600 px-3 text-sm font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 dark:bg-violet-500"
            @click="showLogin = true"
          >
            {{ t("products.common.sign_in") }}
          </button>
        </div>
      </div>
      <nav
        class="mx-auto flex max-w-[1244px] gap-1 overflow-x-auto px-4 pb-2 sm:px-6 lg:px-8"
        :aria-label="t(&quot;products.common.creator_navigation&quot;)"
      >
        <NuxtLink
          to="/creator/credits"
          class="mobile-pressable inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-violet-700 focus-visible:ring-2 focus-visible:ring-violet-500 dark:text-violet-200"
          :aria-current="route.path === '/creator/credits' ? 'page' : undefined"
          >{{ t("products.creator.credits_alternative") }}
          <span
            v-if="signedIn && creditBalance !== null"
            class="rounded-lg bg-violet-100 px-2 py-0.5 tabular-nums dark:bg-violet-300/15"
            >{{ creditBalance.toLocaleString("en-US") }}</span
          ></NuxtLink
        >
        <NuxtLink
          v-if="signedIn && user?.role === 'ADMIN'"
          to="/creator/admin/credits"
          class="mobile-pressable inline-flex min-h-11 shrink-0 items-center rounded-xl px-3 text-sm font-semibold text-slate-500 dark:text-white/60"
          :aria-current="
            route.path === '/creator/admin/credits' ? 'page' : undefined
          "
          >{{ t("products.creator.credits_limits") }}</NuxtLink
        >
        <NuxtLink
          v-if="signedIn && user?.role === 'ADMIN'"
          to="/admin/bots"
          class="mobile-pressable inline-flex min-h-11 shrink-0 items-center rounded-xl px-3 text-sm font-semibold text-slate-500 dark:text-white/60"
          >{{ t("products.creator.bot_admin") }}</NuxtLink
        >
        <NuxtLink
          v-if="signedIn && user?.role === 'ADMIN'"
          to="/admin/tools"
          class="mobile-pressable inline-flex min-h-11 shrink-0 items-center rounded-xl px-3 text-sm font-semibold text-slate-500 dark:text-white/60"
        >{{ t("products.creator.tool_availability") }}</NuxtLink>
        <NuxtLink
          v-for="category in CREATOR_CATEGORIES"
          :key="category.id"
          :to="linkTo(`/creator#creator-${category.id}-title`)"
          class="mobile-pressable inline-flex min-h-11 shrink-0 items-center rounded-xl px-3 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
          :class="
            activeCategory === category.id
              ? 'bg-violet-50 text-violet-700 dark:bg-violet-300/10 dark:text-violet-200'
              : 'text-slate-500 hover:bg-slate-50 dark:text-white/60 dark:hover:bg-white/[0.06]'
          "
          :aria-current="
            activeCategory === category.id ? 'location' : undefined
          "
          >{{ productText(category.title) }}</NuxtLink
        >
      </nav>
    </header>

    <div
      id="creator-content"
      tabindex="-1"
      class="site-content mx-auto w-full max-w-[1244px] min-w-0 flex-1 px-4 py-6 outline-none sm:px-6 sm:py-8 lg:px-8"
      :class="domainProduct ? 'pb-[calc(6rem+env(safe-area-inset-bottom))] sm:pb-8' : undefined"
    >
      <slot />
    </div>

    <footer
      :class="domainProduct ? 'hidden sm:block' : undefined"
      class="border-t border-slate-200 px-4 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-xs text-slate-500 dark:border-white/10 dark:text-white/45"
    >
      <div
        class="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-3"
      >
        <p>ChlatWork Creator</p>
        <nav class="flex gap-4" :aria-label="t(&quot;products.common.creator_policies&quot;)">
          <NuxtLink
            to="/privacy-policy"
            class="underline-offset-4 hover:underline"
            >{{ t("products.moments.birthday_wish_generator.privacy") }}</NuxtLink
          >
          <NuxtLink to="/terms" class="underline-offset-4 hover:underline"
            >{{ t("products.creator.terms") }}</NuxtLink
          >
        </nav>
      </div>
    </footer>
    <AuthLoginDialog :open="showLogin" @close="showLogin = false" />
    <LayoutProductMobileNav v-if="domainProduct" />
  </div>
</template>
