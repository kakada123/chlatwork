<script setup lang="ts">
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

definePageMeta({ layout: "creator" });
useSeoMeta({
  title: "Your credits | ChlatWork Creator",
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
          label: "Available",
          value: overview.value.balance,
          detail: "Ready to use now",
        },
        {
          label: "Received",
          value: overview.value.totals.received,
          detail: "Welcome grants and purchases",
        },
        {
          label: "Used",
          value: overview.value.totals.used,
          detail: "Completed generations",
        },
        {
          label: "Reserved",
          value: overview.value.totals.reserved,
          detail: "In progress; already held from your balance",
        },
        {
          label: "Returned",
          value: overview.value.totals.refunded,
          detail: "Refunds for failed generations",
        },
        {
          label: "Adjustments",
          value: overview.value.totals.adjustments,
          detail: "Admin changes and expired credits",
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
          Your credits
        </h1>
        <p class="mt-2 text-sm text-slate-600 dark:text-white/60">
          See what you have, what you have used, and every recent balance
          change.
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
        Refresh
      </button>
    </header>

    <p
      v-if="loading"
      role="status"
      class="rounded-2xl border border-slate-200 p-6 text-sm text-slate-500 dark:border-white/10 dark:text-white/50"
    >
      Loading your credits…
    </p>
    <section
      v-else-if="!user"
      class="rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/[0.04]"
    >
      <h2 class="text-lg font-semibold">Sign in to see your credits</h2>
      <p class="mt-2 text-sm text-slate-500 dark:text-white/50">
        Your balance and credit activity are private to your account.
      </p>
      <button
        type="button"
        class="mobile-pressable mt-4 min-h-11 rounded-xl bg-violet-600 px-5 font-semibold text-white"
        @click="showLogin = true"
      >
        Sign in
      </button>
    </section>
    <p
      v-else-if="errorMessage"
      role="alert"
      class="rounded-xl bg-red-50 p-4 text-sm text-red-700 dark:bg-red-400/10 dark:text-red-200"
    >
      {{ errorMessage }}
    </p>
    <template v-else-if="overview">
      <section
        aria-label="Credit totals"
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
        Totals cover all time. Credits are held when generation starts, and
        returned if it fails. Daily usage limits still apply.
      </p>

      <section aria-labelledby="credit-activity-title" class="space-y-3">
        <h2 id="credit-activity-title" class="text-lg font-semibold">
          Credit activity
        </h2>
        <p class="text-xs text-slate-500 dark:text-white/50">
          Latest {{ overview.transactionLimit }} transactions.
        </p>
        <CreatorCreditActivity :transactions="overview.transactions" />
      </section>

      <section aria-labelledby="credit-prices-title" class="space-y-3">
        <h2 id="credit-prices-title" class="text-lg font-semibold">
          How much does each tool cost?
        </h2>
        <p class="text-sm text-slate-500 dark:text-white/50">
          Video and audio tools charge per started minute: a 61-second clip
          counts as 2 minutes.
        </p>
        <ul class="grid gap-2 sm:grid-cols-2">
          <li v-for="price in overview.prices" :key="price.feature">
            <NuxtLink
              :to="creatorFeatureRoute(price.feature)"
              class="mobile-pressable flex min-h-16 items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 hover:border-violet-300 dark:border-white/10 dark:bg-white/[0.04]"
            >
              <span class="text-sm font-semibold">{{
                creatorFeatureLabel(price.feature)
              }}</span>
              <span
                class="shrink-0 text-right text-xs text-slate-500 dark:text-white/50"
                ><strong
                  class="text-base text-violet-700 dark:text-violet-300"
                  >{{ price.credits }}</strong
                >
                credits<br />per {{ price.unit }}</span
              >
            </NuxtLink>
          </li>
        </ul>
      </section>
      <div
        class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 p-4 dark:border-white/10"
      >
        <p class="text-sm text-slate-600 dark:text-white/60">
          Need more credits?
          <NuxtLink
            to="/contact"
            class="font-semibold text-violet-700 underline dark:text-violet-300"
            >Contact ChlatWork support</NuxtLink
          >.
        </p>
        <NuxtLink
          v-if="user?.role === 'ADMIN'"
          to="/creator/admin/credits"
          class="mobile-pressable inline-flex min-h-11 items-center rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white"
          >Manage user credits</NuxtLink
        >
      </div>
    </template>
    <AuthLoginDialog :open="showLogin" @close="showLogin = false" />
  </main>
</template>
