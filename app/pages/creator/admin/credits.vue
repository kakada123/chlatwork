<script setup lang="ts">
import { useAppI18n } from "~/composables/useAppI18n";
import { useLanguage } from "~/composables/useLanguage";
import { useProductCopy } from "~/composables/useProductCopy";
const { isKhmer } = useLanguage();
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

const { t } = useAppI18n();

const { productText } = useProductCopy();

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
    successMessage.value = `${t("products.common.saved")} ${formatCreditChange(confirmation.input.amount)} ${t("products.creator.credits_balance_after_this_adjustment")} ${result.balance.toLocaleString(isKhmer.value ? "km-KH" : "en-US")}.`;
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
        {{ t("products.creator.manage_creator_credits_usage_limits") }}
      </h1>
      <p class="mt-2 text-sm text-slate-500 dark:text-white/60">
        {{ t("products.creator.find_an_account_review_its_balance_and_daily_usage_then_confirm_your_changes") }}
      </p>
      <NuxtLink
        to="/creator/credits"
        class="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-violet-700 dark:text-violet-300"
        >{{ t("products.creator.view_my_credits") }}</NuxtLink
      >
    </header>
    <p
      v-if="errorMessage"
      role="alert"
      class="rounded-xl bg-red-50 p-4 text-sm text-red-700 dark:bg-red-400/10 dark:text-red-200"
    >
      {{ productText(errorMessage) }}
    </p>
    <p
      v-if="successMessage"
      role="status"
      class="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-200"
    >
      {{ productText(successMessage) }}
    </p>

    <div
      class="grid items-start gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]"
    >
      <section class="min-w-0 space-y-4" :aria-label="t(&quot;products.common.find_an_account&quot;)">
        <form
          class="flex items-end gap-2"
          @submit.prevent="!locked && loadAccounts(1)"
        >
          <label class="min-w-0 flex-1 text-sm font-semibold"
            >{{ t("products.creator.name_or_email") }}
            <input
              v-model="search"
              type="search"
              maxlength="100"
              :disabled="locked"
              :placeholder="t(&quot;products.common.search_accounts&quot;)"
              class="mt-2 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 font-normal dark:border-white/15 dark:bg-white/[0.04]"
            />
          </label>
          <button
            type="submit"
            :disabled="locked || loading"
            class="min-h-11 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white disabled:opacity-50"
          >
            {{ t("products.moments.birthday_wish_generator.search") }}
          </button>
        </form>
        <p
          v-if="loading"
          role="status"
          class="text-sm text-slate-500 dark:text-white/50"
        >
          {{ t("products.creator.loading_accounts") }}
        </p>
        <template v-else-if="accounts">
          <p class="text-xs text-slate-500 dark:text-white/50">
            {{ accounts.total.toLocaleString("en-US") }} {{ t("products.creator.active_accounts") }}
          </p>
          <p
            v-if="!accounts.items.length"
            class="text-sm text-slate-500 dark:text-white/50"
          >
            {{ t("products.creator.no_matching_accounts") }}
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
                    account.name || t("products.creator.unnamed_account")
                  }}</strong
                  ><span class="shrink-0 text-sm font-semibold tabular-nums"
                    >{{ account.balance.toLocaleString("en-US") }} {{ t("products.creator.credits") }}</span
                  ></span
                >
                <span
                  class="mt-1 block break-all text-xs text-slate-500 dark:text-white/50"
                  >{{ account.email || account.id }}</span
                >
                <span
                  v-if="!account.hasWallet"
                  class="mt-2 block text-xs text-amber-700 dark:text-amber-300"
                  >{{ t("products.creator.creator_wallet_not_started") }}</span
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
              {{ t("products.common.previous") }}
            </button>
            <span
              >{{ t("products.creator.page") }} {{ accounts.page }} {{ t("products.creator.of") }}
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
              {{ t("products.creator.next") }}
            </button>
          </div>
        </template>
      </section>

      <section class="min-w-0 space-y-5" :aria-label="t(&quot;products.common.account_credits&quot;)">
        <p
          v-if="loadingDetails"
          role="status"
          class="rounded-2xl border border-slate-200 p-6 text-sm dark:border-white/10"
        >
          {{ t("products.creator.loading_credit_activity") }}
        </p>
        <p
          v-else-if="!details"
          class="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500 dark:border-white/15 dark:text-white/50"
        >
          {{ t("products.creator.select_an_account_to_manage_its_credits_and_daily_usage_limit") }}
        </p>
        <template v-else>
          <div
            class="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.04]"
          >
            <header>
              <h2 class="break-words text-lg font-semibold">
                {{ details.user.name || t("products.creator.unnamed_account") }}
              </h2>
              <p
                class="mt-1 break-all text-sm text-slate-500 dark:text-white/50"
              >
                {{ details.user.email || t("products.creator.no_email_address") }}
              </p>
              <p
                class="mt-1 break-all text-xs text-slate-500 dark:text-white/50"
              >
                {{ t("products.creator.account") }} {{ details.user.id }}
              </p>
              <p class="mt-4 text-sm">
                {{ t("products.creator.available_balance") }}
                <strong class="ml-2 text-2xl tabular-nums">{{
                  details.user.balance.toLocaleString("en-US")
                }}</strong>
              </p>
            </header>
            <p
              v-if="!details.user.hasWallet"
              class="rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-300/10 dark:text-amber-200"
            >
              {{ t("products.creator.the_first_confirmed_adjustment_sets_this_accounts_starting_credits_no_additional_welcome_grant_will_be_added_later") }}
            </p>
            <form
              v-if="!review && !usageReview"
              class="space-y-4"
              @submit.prevent="startReview"
            >
              <div class="grid grid-cols-2 gap-3">
                <label class="text-sm font-semibold"
                  >{{ t("products.creator.action") }}<ModernSelect
                    v-model="direction"
                    class="mt-2 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 dark:border-white/15 dark:bg-slate-900"
                  >
                    <option value="add">{{ t("products.creator.add_credits") }}</option>
                    <option value="remove">{{ t("products.creator.remove_credits") }}</option>
                  </ModernSelect></label
                >
                <label class="text-sm font-semibold"
                  >{{ t("products.creator.credits_alternative") }}<input
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
                >{{ t("products.creator.reason") }}<textarea
                  v-model="reason"
                  minlength="3"
                  maxlength="240"
                  required
                  rows="3"
                  :placeholder="t(&quot;products.common.why_are_these_credits_being_changed&quot;)"
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
                {{ t("products.creator.resulting_balance") }}
                {{ resultingBalance.toLocaleString("en-US") }} {{ t("products.creator.credits_balance_cannot_go_below_zero") }}
              </p>
              <button
                type="submit"
                :disabled="!valid"
                class="min-h-11 rounded-xl bg-violet-600 px-5 text-sm font-semibold text-white disabled:opacity-40"
              >
                {{ t("products.creator.review_adjustment") }}
              </button>
            </form>
            <section
              v-else-if="review"
              aria-labelledby="adjustment-review-title"
              class="space-y-4 rounded-xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-300/20 dark:bg-violet-300/10"
            >
              <h3 id="adjustment-review-title" class="font-semibold">
                {{ t("products.creator.confirm_credit_adjustment") }}
              </h3>
              <dl class="space-y-2 text-sm">
                <div class="flex justify-between gap-3">
                  <dt>{{ t("products.creator.current_balance") }}</dt>
                  <dd class="font-semibold">
                    {{ review.input.expectedBalance.toLocaleString("en-US") }}
                  </dd>
                </div>
                <div class="flex justify-between gap-3">
                  <dt>{{ t("products.creator.adjustment") }}</dt>
                  <dd class="font-semibold">
                    {{ productText(formatCreditChange(review.input.amount)) }}
                  </dd>
                </div>
                <div class="flex justify-between gap-3">
                  <dt>{{ t("products.creator.resulting_balance_alternative") }}</dt>
                  <dd class="font-semibold">
                    {{
                      (
                        review.input.expectedBalance + review.input.amount
                      ).toLocaleString("en-US")
                    }}
                  </dd>
                </div>
                <div>
                  <dt class="font-semibold">{{ t("products.creator.reason") }}</dt>
                  <dd class="mt-1 whitespace-pre-wrap break-words">
                    {{ review.input.reason }}
                  </dd>
                </div>
              </dl>
              <p class="text-xs text-slate-600 dark:text-white/60">
                {{ t("products.creator.saving_changes_this_accounts_balance_immediately_and_records_your_admin_account_and_reason") }}
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
                      ? t("products.common.saving")
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
                  {{ t("products.creator.cancel_edit") }}
                </button>
              </div>
            </section>
          </div>
          <section
            aria-labelledby="daily-limit-title"
            class="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.04]"
          >
            <h2 id="daily-limit-title" class="text-lg font-semibold">
              {{ t("products.creator.daily_ai_usage_limit") }}
            </h2>
            <p class="text-sm">
              <strong>{{ details.usage.used.toLocaleString("en-US") }}</strong>
              / {{ details.usage.limit.toLocaleString("en-US") }} {{ t("products.creator.credits_used_today") }}
              {{ details.usage.remaining.toLocaleString("en-US") }} {{ t("products.creator.remaining") }}
            </p>
            <p class="text-xs text-slate-500 dark:text-white/60">
              {{ t("products.creator.resets_daily_at_00_00_utc_07_00_cambodia_next_reset") }}
              {{ new Date(details.usage.resetsAt).toLocaleString() }}{{ t("products.creator.this_allowance_controls_credits_spent_per_day_changing_it_does_not_add_wallet_credits_or_erase_todays_usage_request_rate_and_provider_budget_safeguards_still_apply") }}
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
                  {{ t("products.creator.use_default") }}{{
                    details.usage.defaultLimit.toLocaleString("en-US")
                  }}
                  {{ t("products.creator.credits_day") }}
                </label>
                <label
                  v-if="!useDefaultLimit"
                  class="block text-sm font-semibold"
                >
                  {{ t("products.creator.daily_credits") }}
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
                    >{{ t("products.creator.0_blocks_new_ai_usage_maximum_100_000_credits_day") }}</span
                  >
                </label>
                <label class="block text-sm font-semibold">
                  {{ t("products.creator.reason") }}
                  <textarea
                    v-model="limitReason"
                    minlength="3"
                    maxlength="240"
                    rows="2"
                    required
                    :placeholder="t(&quot;products.common.why_is_this_daily_limit_being_changed&quot;)"
                    class="mt-2 w-full rounded-xl border border-slate-200 bg-transparent p-3 font-normal dark:border-white/15"
                  />
                </label>
                <button
                  type="submit"
                  :disabled="!validLimit || locked"
                  class="min-h-11 rounded-xl bg-violet-600 px-5 text-sm font-semibold text-white disabled:opacity-40"
                >
                  {{ t("products.creator.review_limit_change") }}
                </button>
              </fieldset>
            </form>
            <section
              v-else
              :aria-label="t(&quot;products.creator.confirm_daily_usage_limit&quot;)"
              class="space-y-4 rounded-xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-300/20 dark:bg-violet-300/10"
            >
              <h3 class="font-semibold">{{ t("products.creator.confirm_daily_usage_limit") }}</h3>
              <p class="text-sm">
                {{ details.user.name || details.user.id }}:
                {{ details.usage.limit.toLocaleString("en-US") }} →
                {{
                  (
                    usageReview.input.dailyCreditLimit ??
                    details.usage.defaultLimit
                  ).toLocaleString("en-US")
                }}
                {{ t("products.creator.credits_day_alternative") }}{{
                  usageReview.input.dailyCreditLimit === null
                    ? t("products.creator.use_default_alternative")
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
                {{ t("products.creator.todays_usage_already_meets_or_exceeds_this_limit_new_requests_will_remain_blocked_today") }}
              </p>
              <p class="whitespace-pre-wrap break-words text-sm">
                {{ usageReview.input.reason }}
              </p>
              <p class="text-xs text-slate-600 dark:text-white/60">
                {{ t("products.creator.saving_applies_immediately_and_records_your_admin_account_and_reason") }}
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
                      ? t("products.common.saving")
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
                  {{ t("products.creator.cancel_edit") }}
                </button>
              </div>
            </section>
            <details v-if="details.usageLimitChanges.length" class="text-sm">
              <summary class="min-h-11 cursor-pointer py-3 font-semibold">
                {{ t("products.creator.recent_limit_changes_latest_20") }}
              </summary>
              <ul class="space-y-3">
                <li
                  v-for="entry in details.usageLimitChanges"
                  :key="entry.id"
                  class="border-t border-slate-200 pt-3 dark:border-white/10"
                >
                  <p>
                    {{ entry.previousLimit ?? t("products.creator.default") }} →
                    {{ entry.dailyCreditLimit ?? t("products.creator.default") }} {{ t("products.creator.credits_day_alternative_2") }}
                    {{ new Date(entry.createdAt).toLocaleString() }}
                  </p>
                  <p class="mt-1 whitespace-pre-wrap break-words">
                    {{ entry.reason }}
                  </p>
                  <p
                    class="mt-1 break-all text-xs text-slate-500 dark:text-white/60"
                  >
                    {{ t("products.creator.admin") }} {{ entry.adminUserId }}
                  </p>
                </li>
              </ul>
            </details>
          </section>
          <h2 class="text-lg font-semibold">{{ t("products.creator.recent_credit_activity") }}</h2>
          <p class="text-xs text-slate-500 dark:text-white/50">
            {{ t("products.creator.latest_50_transactions_admin_changes_include_the_reason_and_responsible_admin_account") }}
          </p>
          <CreatorCreditActivity :transactions="details.transactions" />
        </template>
      </section>
    </div>
  </main>
</template>
