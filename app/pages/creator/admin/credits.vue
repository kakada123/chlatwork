<script setup lang="ts">
import {
  getCreatorCreditAccounts,
  getCreatorCreditAccount,
  adjustCreatorCredits,
  updateCreatorUsageLimit,
  type CreatorUsageLimitUpdate,
  type CreatorCreditAccountDetails,
  type CreatorCreditAdjustment,
} from "~/services/creator-ai.service";
import {
  creatorCreditRequestError,
  formatCreditChange,
} from "~/lib/creator-credit-display";

definePageMeta({ layout: "creator", middleware: ["auth", "admin"] });
useSeoMeta({
  title: "Manage credits & usage limits | ChlatWork Creator",
  robots: "noindex, nofollow",
});

const { user } = useAuth();
const creditBalance = useState<number | null>(
  "creator:credit-balance",
  () => null,
);
const search = ref("");
const accounts = shallowRef<Awaited<
  ReturnType<typeof getCreatorCreditAccounts>
> | null>(null);
const details = shallowRef<CreatorCreditAccountDetails | null>(null);
const loading = ref(false);
const loadingDetails = ref(false);
const saving = ref(false);
const errorMessage = ref("");
const successMessage = ref("");
const direction = ref<"add" | "remove">("add");
const amount = ref<number | string>("");
const reason = ref("");
const useDefaultLimit = ref(true);
const dailyLimit = ref<number | string>("");
const limitReason = ref("");
const usageReview = shallowRef<{
  input: CreatorUsageLimitUpdate;
  key: string;
  actorId: string;
} | null>(null);
const review = shallowRef<{
  input: CreatorCreditAdjustment;
  key: string;
  actorId: string;
} | null>(null);
const attempted = ref(false);
let listVersion = 0;
let detailVersion = 0;
const locked = computed(
  () => Boolean(review.value || usageReview.value) || saving.value,
);
const validLimit = computed(
  () =>
    Boolean(details.value) &&
    !loadingDetails.value &&
    (useDefaultLimit.value ||
      (dailyLimit.value !== "" &&
        Number.isInteger(Number(dailyLimit.value)) &&
        Number(dailyLimit.value) >= 0 &&
        Number(dailyLimit.value) <= 100000)) &&
    (useDefaultLimit.value ? null : Number(dailyLimit.value)) !==
      details.value?.usage.override &&
    limitReason.value.trim().length >= 3 &&
    limitReason.value.trim().length <= 240,
);
const change = computed(
  () => Number(amount.value) * (direction.value === "add" ? 1 : -1),
);
const resultingBalance = computed(
  () => (details.value?.user.balance ?? 0) + change.value,
);
const valid = computed(
  () =>
    Boolean(details.value) &&
    !loadingDetails.value &&
    Number.isInteger(Number(amount.value)) &&
    Number(amount.value) >= 1 &&
    Number(amount.value) <= 100000 &&
    resultingBalance.value >= 0 &&
    resultingBalance.value <= 2147483647 &&
    reason.value.trim().length >= 3 &&
    reason.value.trim().length <= 240,
);
const authorized = (actorId: string | undefined) =>
  Boolean(actorId) &&
  user.value?.id === actorId &&
  user.value?.role === "ADMIN";

async function loadAccounts(page = 1) {
  const actorId = user.value?.id;
  if (!authorized(actorId)) return;
  const version = ++listVersion;
  loading.value = true;
  errorMessage.value = "";
  try {
    const result = await getCreatorCreditAccounts(search.value.trim(), page);
    if (version === listVersion && authorized(actorId)) accounts.value = result;
  } catch (error) {
    if (version === listVersion && authorized(actorId))
      errorMessage.value = creatorCreditRequestError(
        error,
        "Could not load accounts. Please try again.",
      );
  } finally {
    if (version === listVersion) loading.value = false;
  }
}

async function selectAccount(id: string, preserveMessage = false) {
  if (locked.value) return;
  const actorId = user.value?.id;
  if (!authorized(actorId)) return;
  const version = ++detailVersion;
  details.value = null;
  loadingDetails.value = true;
  if (!preserveMessage) {
    errorMessage.value = "";
    successMessage.value = "";
  }
  amount.value = "";
  reason.value = "";
  direction.value = "add";
  try {
    const result = await getCreatorCreditAccount(id);
    if (version === detailVersion && authorized(actorId)) {
      details.value = result;
      useDefaultLimit.value = result.usage.override === null;
      dailyLimit.value = result.usage.limit;
      limitReason.value = "";
    }
  } catch (error) {
    if (version === detailVersion && authorized(actorId))
      errorMessage.value = creatorCreditRequestError(
        error,
        "Could not load this account. Select it to try again.",
      );
  } finally {
    if (version === detailVersion) loadingDetails.value = false;
  }
}

function startUsageReview() {
  if (
    !validLimit.value ||
    locked.value ||
    !details.value ||
    !authorized(user.value?.id)
  )
    return;
  errorMessage.value = "";
  successMessage.value = "";
  attempted.value = false;
  usageReview.value = {
    actorId: user.value!.id,
    key: crypto.randomUUID(),
    input: {
      userId: details.value.user.id,
      dailyCreditLimit: useDefaultLimit.value ? null : Number(dailyLimit.value),
      expectedLimit: details.value.usage.override,
      reason: limitReason.value.trim(),
    },
  };
}

async function confirmUsageLimit() {
  const confirmation = usageReview.value;
  if (!confirmation || saving.value || !authorized(confirmation.actorId))
    return;
  saving.value = true;
  attempted.value = true;
  errorMessage.value = "";
  try {
    await updateCreatorUsageLimit(confirmation.input, confirmation.key);
    if (!authorized(confirmation.actorId) || usageReview.value !== confirmation)
      return;
    successMessage.value = "Daily usage limit saved.";
    usageReview.value = null;
    saving.value = false;
    attempted.value = false;
    await selectAccount(confirmation.input.userId, true);
  } catch (error) {
    if (!authorized(confirmation.actorId) || usageReview.value !== confirmation)
      return;
    const failure = error as { statusCode?: number; status?: number };
    const status = failure.statusCode ?? failure.status;
    // Preserve the reviewed intent after an uncertain outcome for safe retries.
    if (
      status !== undefined &&
      [400, 401, 403, 404, 409, 422, 429].includes(status)
    ) {
      usageReview.value = null;
      attempted.value = false;
      saving.value = false;
      await selectAccount(confirmation.input.userId, true);
      errorMessage.value = creatorCreditRequestError(
        error,
        "The limit change was rejected. Review the account and try again.",
      );
    } else {
      errorMessage.value =
        "The save could not be confirmed. Retry this same limit change; it will only be applied once.";
    }
  } finally {
    saving.value = false;
  }
}

function startReview() {
  if (
    !valid.value ||
    locked.value ||
    !details.value ||
    !authorized(user.value?.id)
  )
    return;
  errorMessage.value = "";
  successMessage.value = "";
  attempted.value = false;
  // Freeze both the financial intent and retry key until its outcome is known.
  review.value = {
    actorId: user.value!.id,
    key: crypto.randomUUID(),
    input: {
      userId: details.value.user.id,
      amount: change.value,
      expectedBalance: details.value.user.balance,
      reason: reason.value.trim(),
    },
  };
}

async function confirmAdjustment() {
  const confirmation = review.value;
  if (!confirmation || saving.value || !authorized(confirmation.actorId))
    return;
  saving.value = true;
  attempted.value = true;
  errorMessage.value = "";
  try {
    const result = await adjustCreatorCredits(
      confirmation.input,
      confirmation.key,
    );
    if (!authorized(confirmation.actorId) || review.value !== confirmation)
      return;
    if (confirmation.input.userId === confirmation.actorId)
      creditBalance.value = result.balance;
    successMessage.value = `Saved ${formatCreditChange(confirmation.input.amount)} credits. Balance after this adjustment: ${result.balance.toLocaleString("en-US")}.`;
    review.value = null;
    saving.value = false;
    attempted.value = false;
    await loadAccounts(accounts.value?.page ?? 1);
    await selectAccount(confirmation.input.userId, true);
  } catch (error) {
    if (!authorized(confirmation.actorId) || review.value !== confirmation)
      return;
    const failure = error as {
      data?: { code?: string };
      statusCode?: number;
      status?: number;
    };
    const status = failure.statusCode ?? failure.status;
    // Only a definite rejection releases the review. A lost response retries the
    // same intent so an adjustment that already committed cannot be applied twice.
    if (
      failure.data?.code === "CREDIT_BALANCE_CHANGED" ||
      (status !== undefined &&
        [400, 401, 403, 404, 409, 422, 429].includes(status))
    ) {
      review.value = null;
      attempted.value = false;
      saving.value = false;
      await selectAccount(confirmation.input.userId, true);
      errorMessage.value = creatorCreditRequestError(
        error,
        "The adjustment was rejected. Review the current account and try again.",
      );
    } else {
      errorMessage.value =
        "The save could not be confirmed. Keep this review open and retry the same adjustment; it will only be applied once.";
    }
  } finally {
    saving.value = false;
  }
}

onMounted(() => {
  watch(
    [() => user.value?.id, () => user.value?.role],
    () => {
      listVersion++;
      detailVersion++;
      accounts.value = null;
      details.value = null;
      review.value = null;
      usageReview.value = null;
      errorMessage.value = "";
      successMessage.value = "";
      if (user.value?.role === "ADMIN") void loadAccounts();
    },
    { immediate: true },
  );
});
onBeforeUnmount(() => {
  listVersion++;
  detailVersion++;
  review.value = null;
  usageReview.value = null;
});
</script>

<template>
  <main v-if="user?.role === 'ADMIN'" class="mx-auto max-w-[1180px] space-y-6">
    <header>
      <h1 class="text-[#082552] dark:text-white">
        Manage Creator credits & usage limits
      </h1>
      <p class="mt-2 text-sm text-slate-500 dark:text-white/60">
        Find an account, review its balance and daily usage, then confirm your
        changes.
      </p>
      <NuxtLink
        to="/creator/credits"
        class="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-violet-700 dark:text-violet-300"
        >View my credits</NuxtLink
      >
    </header>
    <p
      v-if="errorMessage"
      role="alert"
      class="rounded-xl bg-red-50 p-4 text-sm text-red-700 dark:bg-red-400/10 dark:text-red-200"
    >
      {{ errorMessage }}
    </p>
    <p
      v-if="successMessage"
      role="status"
      class="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-200"
    >
      {{ successMessage }}
    </p>

    <div
      class="grid items-start gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]"
    >
      <section class="min-w-0 space-y-4" aria-label="Find an account">
        <form
          class="flex items-end gap-2"
          @submit.prevent="!locked && loadAccounts(1)"
        >
          <label class="min-w-0 flex-1 text-sm font-semibold"
            >Name or email
            <input
              v-model="search"
              type="search"
              maxlength="100"
              :disabled="locked"
              placeholder="Search accounts"
              class="mt-2 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 font-normal dark:border-white/15 dark:bg-white/[0.04]"
            />
          </label>
          <button
            type="submit"
            :disabled="locked || loading"
            class="min-h-11 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white disabled:opacity-50"
          >
            Search
          </button>
        </form>
        <p
          v-if="loading"
          role="status"
          class="text-sm text-slate-500 dark:text-white/50"
        >
          Loading accounts…
        </p>
        <template v-else-if="accounts">
          <p class="text-xs text-slate-500 dark:text-white/50">
            {{ accounts.total.toLocaleString("en-US") }} active accounts
          </p>
          <p
            v-if="!accounts.items.length"
            class="text-sm text-slate-500 dark:text-white/50"
          >
            No matching accounts.
          </p>
          <ul class="space-y-2">
            <li v-for="account in accounts.items" :key="account.id">
              <button
                type="button"
                :disabled="locked"
                :aria-pressed="details?.user.id === account.id"
                class="mobile-pressable w-full rounded-xl border bg-white p-4 text-left disabled:opacity-50 dark:bg-white/[0.04]"
                :class="
                  details?.user.id === account.id
                    ? 'border-violet-500'
                    : 'border-slate-200 dark:border-white/10'
                "
                @click="selectAccount(account.id)"
              >
                <span class="flex items-start justify-between gap-3"
                  ><strong class="min-w-0 break-words text-sm">{{
                    account.name || "Unnamed account"
                  }}</strong
                  ><span class="shrink-0 text-sm font-semibold tabular-nums"
                    >{{ account.balance.toLocaleString("en-US") }} credits</span
                  ></span
                >
                <span
                  class="mt-1 block break-all text-xs text-slate-500 dark:text-white/50"
                  >{{ account.email || account.id }}</span
                >
                <span
                  v-if="!account.hasWallet"
                  class="mt-2 block text-xs text-amber-700 dark:text-amber-300"
                  >Creator wallet not started</span
                >
              </button>
            </li>
          </ul>
          <div class="flex items-center justify-between gap-2 text-sm">
            <button
              type="button"
              :disabled="locked || accounts.page <= 1"
              class="min-h-11 rounded-xl border border-slate-200 px-3 disabled:opacity-40 dark:border-white/15"
              @click="loadAccounts(accounts.page - 1)"
            >
              Previous
            </button>
            <span
              >Page {{ accounts.page }} of
              {{
                Math.max(1, Math.ceil(accounts.total / accounts.pageSize))
              }}</span
            >
            <button
              type="button"
              :disabled="
                locked || accounts.page * accounts.pageSize >= accounts.total
              "
              class="min-h-11 rounded-xl border border-slate-200 px-3 disabled:opacity-40 dark:border-white/15"
              @click="loadAccounts(accounts.page + 1)"
            >
              Next
            </button>
          </div>
        </template>
      </section>

      <section class="min-w-0 space-y-5" aria-label="Account credits">
        <p
          v-if="loadingDetails"
          role="status"
          class="rounded-2xl border border-slate-200 p-6 text-sm dark:border-white/10"
        >
          Loading credit activity…
        </p>
        <p
          v-else-if="!details"
          class="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500 dark:border-white/15 dark:text-white/50"
        >
          Select an account to manage its credits and daily usage limit.
        </p>
        <template v-else>
          <div
            class="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.04]"
          >
            <header>
              <h2 class="break-words text-lg font-semibold">
                {{ details.user.name || "Unnamed account" }}
              </h2>
              <p
                class="mt-1 break-all text-sm text-slate-500 dark:text-white/50"
              >
                {{ details.user.email || "No email address" }}
              </p>
              <p
                class="mt-1 break-all text-xs text-slate-500 dark:text-white/50"
              >
                Account: {{ details.user.id }}
              </p>
              <p class="mt-4 text-sm">
                Available balance
                <strong class="ml-2 text-2xl tabular-nums">{{
                  details.user.balance.toLocaleString("en-US")
                }}</strong>
              </p>
            </header>
            <p
              v-if="!details.user.hasWallet"
              class="rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-300/10 dark:text-amber-200"
            >
              The first confirmed adjustment sets this account's starting
              credits. No additional welcome grant will be added later.
            </p>
            <form
              v-if="!review && !usageReview"
              class="space-y-4"
              @submit.prevent="startReview"
            >
              <div class="grid grid-cols-2 gap-3">
                <label class="text-sm font-semibold"
                  >Action<select
                    v-model="direction"
                    class="mt-2 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 dark:border-white/15 dark:bg-slate-900"
                  >
                    <option value="add">Add credits</option>
                    <option value="remove">Remove credits</option>
                  </select></label
                >
                <label class="text-sm font-semibold"
                  >Credits<input
                    v-model="amount"
                    type="number"
                    inputmode="numeric"
                    min="1"
                    max="100000"
                    step="1"
                    required
                    class="mt-2 min-h-11 w-full rounded-xl border border-slate-200 bg-transparent px-3 dark:border-white/15"
                /></label>
              </div>
              <label class="block text-sm font-semibold"
                >Reason<textarea
                  v-model="reason"
                  minlength="3"
                  maxlength="240"
                  required
                  rows="3"
                  placeholder="Why are these credits being changed?"
                  class="mt-2 w-full rounded-xl border border-slate-200 bg-transparent p-3 font-normal dark:border-white/15"
                />
              </label>
              <p
                v-if="amount !== ''"
                class="text-sm"
                :class="
                  resultingBalance < 0
                    ? 'text-red-600 dark:text-red-300'
                    : 'text-slate-500 dark:text-white/60'
                "
              >
                Resulting balance:
                {{ resultingBalance.toLocaleString("en-US") }} credits. Balance
                cannot go below zero.
              </p>
              <button
                type="submit"
                :disabled="!valid"
                class="min-h-11 rounded-xl bg-violet-600 px-5 text-sm font-semibold text-white disabled:opacity-40"
              >
                Review adjustment
              </button>
            </form>
            <section
              v-else-if="review"
              aria-labelledby="adjustment-review-title"
              class="space-y-4 rounded-xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-300/20 dark:bg-violet-300/10"
            >
              <h3 id="adjustment-review-title" class="font-semibold">
                Confirm credit adjustment
              </h3>
              <dl class="space-y-2 text-sm">
                <div class="flex justify-between gap-3">
                  <dt>Current balance</dt>
                  <dd class="font-semibold">
                    {{ review.input.expectedBalance.toLocaleString("en-US") }}
                  </dd>
                </div>
                <div class="flex justify-between gap-3">
                  <dt>Adjustment</dt>
                  <dd class="font-semibold">
                    {{ formatCreditChange(review.input.amount) }}
                  </dd>
                </div>
                <div class="flex justify-between gap-3">
                  <dt>Resulting balance</dt>
                  <dd class="font-semibold">
                    {{
                      (
                        review.input.expectedBalance + review.input.amount
                      ).toLocaleString("en-US")
                    }}
                  </dd>
                </div>
                <div>
                  <dt class="font-semibold">Reason</dt>
                  <dd class="mt-1 whitespace-pre-wrap break-words">
                    {{ review.input.reason }}
                  </dd>
                </div>
              </dl>
              <p class="text-xs text-slate-600 dark:text-white/60">
                Saving changes this account's balance immediately and records
                your admin account and reason.
              </p>
              <div class="flex flex-wrap gap-2">
                <button
                  type="button"
                  :disabled="saving"
                  class="min-h-11 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white disabled:opacity-50"
                  @click="confirmAdjustment"
                >
                  {{
                    saving
                      ? "Saving…"
                      : attempted
                        ? "Retry same adjustment"
                        : "Confirm and save"
                  }}
                </button>
                <button
                  v-if="!attempted"
                  type="button"
                  class="min-h-11 rounded-xl border border-violet-200 px-4 text-sm font-semibold dark:border-white/15"
                  @click="review = null"
                >
                  Cancel / edit
                </button>
              </div>
            </section>
          </div>
          <section
            aria-labelledby="daily-limit-title"
            class="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.04]"
          >
            <h2 id="daily-limit-title" class="text-lg font-semibold">
              Daily AI usage limit
            </h2>
            <p class="text-sm">
              <strong>{{ details.usage.used.toLocaleString("en-US") }}</strong>
              / {{ details.usage.limit.toLocaleString("en-US") }} credits used
              today ·
              {{ details.usage.remaining.toLocaleString("en-US") }} remaining
            </p>
            <p class="text-xs text-slate-500 dark:text-white/60">
              Resets daily at 00:00 UTC (07:00 Cambodia). Next reset:
              {{ new Date(details.usage.resetsAt).toLocaleString() }}. This
              allowance controls credits spent per day. Changing it does not add
              wallet credits or erase today's usage. Request-rate and provider
              budget safeguards still apply.
            </p>
            <form v-if="!usageReview" @submit.prevent="startUsageReview">
              <fieldset
                :disabled="locked"
                class="space-y-4 disabled:opacity-50"
              >
                <label
                  class="flex min-h-11 items-center gap-2 text-sm font-semibold"
                >
                  <input v-model="useDefaultLimit" type="checkbox" />
                  Use default ({{
                    details.usage.defaultLimit.toLocaleString("en-US")
                  }}
                  credits/day)
                </label>
                <label
                  v-if="!useDefaultLimit"
                  class="block text-sm font-semibold"
                >
                  Daily credits
                  <input
                    v-model="dailyLimit"
                    type="number"
                    inputmode="numeric"
                    min="0"
                    max="100000"
                    step="1"
                    required
                    class="mt-2 min-h-11 w-full rounded-xl border border-slate-200 bg-transparent px-3 dark:border-white/15"
                  />
                  <span
                    class="mt-1 block text-xs font-normal text-slate-500 dark:text-white/60"
                    >0 blocks new AI usage. Maximum: 100,000 credits/day.</span
                  >
                </label>
                <label class="block text-sm font-semibold">
                  Reason
                  <textarea
                    v-model="limitReason"
                    minlength="3"
                    maxlength="240"
                    rows="2"
                    required
                    placeholder="Why is this daily limit being changed?"
                    class="mt-2 w-full rounded-xl border border-slate-200 bg-transparent p-3 font-normal dark:border-white/15"
                  />
                </label>
                <button
                  type="submit"
                  :disabled="!validLimit || locked"
                  class="min-h-11 rounded-xl bg-violet-600 px-5 text-sm font-semibold text-white disabled:opacity-40"
                >
                  Review limit change
                </button>
              </fieldset>
            </form>
            <section
              v-else
              aria-label="Confirm daily usage limit"
              class="space-y-4 rounded-xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-300/20 dark:bg-violet-300/10"
            >
              <h3 class="font-semibold">Confirm daily usage limit</h3>
              <p class="text-sm">
                {{ details.user.name || details.user.id }}:
                {{ details.usage.limit.toLocaleString("en-US") }} →
                {{
                  (
                    usageReview.input.dailyCreditLimit ??
                    details.usage.defaultLimit
                  ).toLocaleString("en-US")
                }}
                credits/day{{
                  usageReview.input.dailyCreditLimit === null
                    ? " (use default)"
                    : ""
                }}.
              </p>
              <p
                v-if="
                  (usageReview.input.dailyCreditLimit ??
                    details.usage.defaultLimit) <= details.usage.used
                "
                class="text-sm text-amber-800 dark:text-amber-200"
              >
                Today's usage already meets or exceeds this limit. New requests
                will remain blocked today.
              </p>
              <p class="whitespace-pre-wrap break-words text-sm">
                {{ usageReview.input.reason }}
              </p>
              <p class="text-xs text-slate-600 dark:text-white/60">
                Saving applies immediately and records your admin account and
                reason.
              </p>
              <div class="flex flex-wrap gap-2">
                <button
                  type="button"
                  :disabled="saving"
                  class="min-h-11 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white disabled:opacity-50"
                  @click="confirmUsageLimit"
                >
                  {{
                    saving
                      ? "Saving…"
                      : attempted
                        ? "Retry same limit change"
                        : "Confirm and save"
                  }}
                </button>
                <button
                  v-if="!attempted"
                  type="button"
                  class="min-h-11 rounded-xl border border-violet-200 px-4 text-sm font-semibold dark:border-white/15"
                  @click="usageReview = null"
                >
                  Cancel / edit
                </button>
              </div>
            </section>
            <details v-if="details.usageLimitChanges.length" class="text-sm">
              <summary class="min-h-11 cursor-pointer py-3 font-semibold">
                Recent limit changes (latest 20)
              </summary>
              <ul class="space-y-3">
                <li
                  v-for="entry in details.usageLimitChanges"
                  :key="entry.id"
                  class="border-t border-slate-200 pt-3 dark:border-white/10"
                >
                  <p>
                    {{ entry.previousLimit ?? "Default" }} →
                    {{ entry.dailyCreditLimit ?? "Default" }} credits/day ·
                    {{ new Date(entry.createdAt).toLocaleString() }}
                  </p>
                  <p class="mt-1 whitespace-pre-wrap break-words">
                    {{ entry.reason }}
                  </p>
                  <p
                    class="mt-1 break-all text-xs text-slate-500 dark:text-white/60"
                  >
                    Admin: {{ entry.adminUserId }}
                  </p>
                </li>
              </ul>
            </details>
          </section>
          <h2 class="text-lg font-semibold">Recent credit activity</h2>
          <p class="text-xs text-slate-500 dark:text-white/50">
            Latest 50 transactions. Admin changes include the reason and
            responsible admin account.
          </p>
          <CreatorCreditActivity :transactions="details.transactions" />
        </template>
      </section>
    </div>
  </main>
</template>
