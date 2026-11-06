<script setup lang="ts">
import { useAppI18n } from "~/composables/useAppI18n";
import { useProductCopy } from "~/composables/useProductCopy";
import { Coins, RefreshCw } from "lucide-vue-next";
import {
  getCreatorCreditOverview,
  type CreatorCreditOverview,
} from "~/services/creator-ai.service";
import {
  creatorCreditRequestError,
  creatorFeatureLabel,
  creatorFeatureRoute,
} from "~/lib/creator-credit-display";
import { useLanguage } from "~/composables/useLanguage";

const { t } = useAppI18n();

const { productText } = useProductCopy();

const { isKhmer } = useLanguage();
definePageMeta({ layout: "creator" });
useSeoMeta({
  title: () => t("products.creator.your_credits_chlat_work_creator"),
  robots: "noindex, nofollow",
});

const { user, isReady, fetchMe } = useAuth();
const overview = shallowRef<CreatorCreditOverview | null>(null);
const creditBalance = useState<number | null>(
  "creator:credit-balance",
  () => null,
);
const loading = ref(true);
const errorMessage = ref("");
const showLogin = ref(false);
let requestVersion = 0;

async function refresh() {
  const version = ++requestVersion;
  overview.value = null;
  errorMessage.value = "";
  if (!isReady.value) return;
  const userId = user.value?.id;
  if (!userId) {
    loading.value = false;
    return;
  }
  loading.value = true;
  try {
    const result = await getCreatorCreditOverview();
    // A late response must never restore another account's credit history.
    if (version !== requestVersion || user.value?.id !== userId) return;
    overview.value = result;
    creditBalance.value = result.balance;
  } catch (error) {
    if (version === requestVersion)
      errorMessage.value = creatorCreditRequestError(
        error,
        "Could not load your credits. Please try again.",
      );
  } finally {
    if (version === requestVersion) loading.value = false;
  }
}

onMounted(() => {
  watch([isReady, () => user.value?.id], () => void refresh(), {
    immediate: true,
  });
  if (!isReady.value) void fetchMe();
});
onBeforeUnmount(() => {
  requestVersion++;
});

const cards = computed(() =>
  overview.value
    ? [
        {
          label: t("products.creator.available"),
          value: overview.value.balance,
          detail: t("products.creator.ready_to_use_now"),
        },
        {
          label: t("products.creator.received"),
          value: overview.value.totals.received,
          detail: t("products.creator.welcome_grants_and_purchases"),
        },
        {
          label: t("products.creator.used"),
          value: overview.value.totals.used,
          detail: t("products.creator.completed_generations"),
        },
        {
          label: t("products.creator.reserved"),
          value: overview.value.totals.reserved,
          detail: t("products.creator.in_progress_already_held_from_your_balance"),
        },
        {
          label: t("products.creator.returned"),
          value: overview.value.totals.refunded,
          detail: t("products.creator.refunds_for_failed_generations"),
        },
        {
          label: t("products.creator.adjustments"),
          value: overview.value.totals.adjustments,
          detail: t("products.creator.admin_changes_and_expired_credits"),
        },
      ]
    : [],
);
</script>

<template>
  <main class="mx-auto max-w-[1180px] space-y-6">
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="flex items-center gap-3 text-[#082552] dark:text-white">
          <Coins
            class="size-7 text-violet-600 dark:text-violet-300"
            aria-hidden="true"
          />
          {{ t("products.creator.your_credits") }}
        </h1>
        <p class="mt-2 text-sm text-slate-600 dark:text-white/60">
          {{ t("products.creator.see_what_you_have_what_you_have_used_and_every_recent_balance_change") }}
        </p>
      </div>
      <button
        v-if="user"
        type="button"
        class="mobile-pressable inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold disabled:opacity-50 dark:border-white/15"
        :disabled="loading"
        @click="refresh"
      >
        <RefreshCw
          class="size-4"
          :class="{ 'animate-spin motion-reduce:animate-none': loading }"
          aria-hidden="true"
        />
        {{ t("products.common.refresh") }}
      </button>
    </header>

    <p
      v-if="loading"
      role="status"
      class="rounded-2xl border border-slate-200 p-6 text-sm text-slate-500 dark:border-white/10 dark:text-white/50"
    >
      {{ t("products.creator.loading_your_credits") }}
    </p>
    <section
      v-else-if="!user"
      class="rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/[0.04]"
    >
      <h2 class="text-lg font-semibold">{{ t("products.creator.sign_in_to_see_your_credits") }}</h2>
      <p class="mt-2 text-sm text-slate-500 dark:text-white/50">
        {{ t("products.creator.your_balance_and_credit_activity_are_private_to_your_account") }}
      </p>
      <button
        type="button"
        class="mobile-pressable mt-4 min-h-11 rounded-xl bg-violet-600 px-5 font-semibold text-white"
        @click="showLogin = true"
      >
        {{ t("products.common.sign_in") }}
      </button>
    </section>
    <p
      v-else-if="errorMessage"
      role="alert"
      class="rounded-xl bg-red-50 p-4 text-sm text-red-700 dark:bg-red-400/10 dark:text-red-200"
    >
      {{ productText(errorMessage) }}
    </p>
    <template v-else-if="overview">
      <section
        :aria-label="t(&quot;products.common.credit_totals&quot;)"
        class="grid grid-cols-2 gap-3 lg:grid-cols-3"
      >
        <div
          v-for="(card, index) in cards"
          :key="card.label"
          class="rounded-2xl border p-4 sm:p-5"
          :class="
            index === 0
              ? 'border-violet-200 bg-violet-50 dark:border-violet-300/20 dark:bg-violet-300/10'
              : 'border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.04]'
          "
        >
          <p class="text-xs font-semibold text-slate-500 dark:text-white/55">
            {{ card.label }}
          </p>
          <p class="mt-2 text-3xl font-bold tabular-nums">
            {{ card.value.toLocaleString("en-US") }}
          </p>
          <p class="mt-2 text-xs leading-5 text-slate-500 dark:text-white/50">
            {{ card.detail }}
          </p>
        </div>
      </section>
      <p class="text-xs text-slate-500 dark:text-white/50">
        {{ t("products.creator.totals_cover_all_time_credits_are_held_when_generation_starts_and_returned_if_it_fails_daily_usage_limits_still_apply") }}
      </p>

      <section aria-labelledby="credit-activity-title" class="space-y-3">
        <h2 id="credit-activity-title" class="text-lg font-semibold">
          {{ t("products.creator.credit_activity") }}
        </h2>
        <p class="text-xs text-slate-500 dark:text-white/50">
          {{ t("products.creator.latest_transaction_limit_transactions", { transaction_limit: overview.transactionLimit }) }}
        </p>
        <CreatorCreditActivity :transactions="overview.transactions" />
      </section>

      <section aria-labelledby="credit-prices-title" class="space-y-3">
        <h2 id="credit-prices-title" class="text-lg font-semibold">
          {{ t("products.creator.how_much_does_each_tool_cost") }}
        </h2>
        <p class="text-sm text-slate-500 dark:text-white/50">
          {{ t("products.creator.video_and_audio_tools_charge_per_started_minute_a_61_second_clip_counts_as_2_minutes") }}
        </p>
        <ul class="grid gap-2 sm:grid-cols-2">
          <li v-for="price in overview.prices" :key="price.feature">
            <NuxtLink
              :to="creatorFeatureRoute(price.feature)"
              class="mobile-pressable flex min-h-16 items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 hover:border-violet-300 dark:border-white/10 dark:bg-white/[0.04]"
            >
              <span class="text-sm font-semibold">{{
                productText(creatorFeatureLabel(price.feature))
              }}</span>
              <span
                class="shrink-0 text-right text-xs text-slate-500 dark:text-white/50"
                ><strong
                  class="text-base text-violet-700 dark:text-violet-300"
                  >{{ price.credits }}</strong
                >
                {{ t("products.creator.credits") }}<br />{{ t("products.creator.per_unit", { unit: price.unit }) }}</span
              >
            </NuxtLink>
          </li>
        </ul>
      </section>
      <div
        class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 p-4 dark:border-white/10"
      >
        <p class="text-sm text-slate-600 dark:text-white/60">
          {{ t("products.creator.need_more_credits") }}
          <NuxtLink
            to="/contact"
            class="font-semibold text-violet-700 underline dark:text-violet-300"
            >{{ t("products.creator.contact_chlat_work_support") }}</NuxtLink
          >.
        </p>
        <NuxtLink
          v-if="user?.role === 'ADMIN'"
          to="/creator/admin/credits"
          class="mobile-pressable inline-flex min-h-11 items-center rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white"
          >{{ t("products.creator.manage_user_credits") }}</NuxtLink
        >
      </div>
    </template>
    <AuthLoginDialog :open="showLogin" @close="showLogin = false" />
  </main>
</template>
