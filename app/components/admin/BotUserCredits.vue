<script setup lang="ts">
import { useAppI18n } from "~/composables/useAppI18n";
import { localizeBotCode } from "~/lib/bot-ui-copy";
const { isKhmer } = useLanguage();
import {
  adjustCreatorCredits,
  updateCreatorUsageLimit,
  type CreatorCreditAdjustment,
  type CreatorUsageLimitUpdate,
} from "~/services/creator-ai.service";
import type { BotUserDetails } from "~/services/bot-admin.service";
import {
  creatorCreditRequestError,
  formatCreditChange,
} from "~/lib/creator-credit-display";

const { t } = useAppI18n();

const props = defineProps<{ details: BotUserDetails }>();
const emit = defineEmits<{ saved: [] }>();
const { user } = useAuth();
const kind = ref<"balance" | "limit">("balance");
const direction = ref<1 | -1>(1);
const amount = ref<number | string>("");
const limit = ref<number | string>("");
const defaultLimit = ref(true);
const reason = ref("");
const saving = ref(false);
const error = ref("");
const pending = shallowRef<{
  key: string;
  actorId: string;
  summary: string;
  change:
    | { kind: "balance"; body: CreatorCreditAdjustment }
    | { kind: "limit"; body: CreatorUsageLimitUpdate };
} | null>(null);

watch(
  () => props.details,
  (value) => {
    defaultLimit.value = value.credits?.usage.override === null;
    limit.value = value.credits?.usage.override ?? "";
    pending.value = null;
    amount.value = "";
    reason.value = "";
    error.value = "";
  },
  { immediate: true },
);

function prepare() {
  const credits = props.details.credits;
  if (!credits) return;
  const common = {
    userId: props.details.profile.userId,
    reason: reason.value.trim(),
  };
  if (common.reason.length < 3) return;
  if (kind.value === "balance") {
    const change = Number(amount.value) * direction.value;
    if (
      !Number.isInteger(change) ||
      !change ||
      Math.abs(change) > 100000 ||
      credits.user.balance + change < 0
    )
      return;
    pending.value = {
      key: crypto.randomUUID(),
      actorId: user.value?.id ?? "",
      summary: `${t("shared.components_admin_bot_user_credits.credit_balance")}: ${credits.user.balance} → ${credits.user.balance + change}`,
      change: {
        kind: "balance",
        body: {
          ...common,
          amount: change,
          expectedBalance: credits.user.balance,
        },
      },
    };
  } else {
    const next = defaultLimit.value ? null : Number(limit.value);
    if (
      next !== null &&
      (!Number.isInteger(next) ||
        next < 0 ||
        next > 100000 ||
        limit.value === "")
    )
      return;
    pending.value = {
      key: crypto.randomUUID(),
      actorId: user.value?.id ?? "",
      summary: `${t("shared.components_admin_bot_user_credits.daily_limit")}: ${credits.usage.override ?? t("shared.components_admin_bot_user_credits.default")} → ${next ?? t("shared.components_admin_bot_user_credits.default")}`,
      change: {
        kind: "limit",
        body: {
          ...common,
          dailyCreditLimit: next,
          expectedLimit: credits.usage.override,
        },
      },
    };
  }
}

async function confirm() {
  const review = pending.value;
  if (
    !review ||
    saving.value ||
    user.value?.role !== "ADMIN" ||
    user.value.id !== review.actorId
  )
    return;
  saving.value = true;
  error.value = "";
  try {
    if (review.change.kind === "balance")
      await adjustCreatorCredits(review.change.body, review.key);
    else await updateCreatorUsageLimit(review.change.body, review.key);
    pending.value = null;
    emit("saved");
  } catch (cause) {
    error.value = creatorCreditRequestError(
      cause,
      t("shared.components_admin_bot_user_credits.could_not_save_refresh_and_review_the_current_balance"),
    );
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div v-if="details.credits" class="space-y-6">
    <div class="grid gap-3 sm:grid-cols-3">
      <div class="rounded-xl bg-violet-50 p-4 dark:bg-violet-400/10">
        <p class="text-xs text-slate-500">{{ t("shared.components_admin_bot_user_credits.shared_balance") }}</p>
        <p class="mt-1 text-2xl font-bold">
          {{ details.credits.user.balance }}
        </p>
      </div>
      <div class="rounded-xl bg-slate-50 p-4 dark:bg-white/5">
        <p class="text-xs text-slate-500">{{ t("shared.components_admin_bot_user_credits.used_today") }}</p>
        <p class="mt-1 text-2xl font-bold">
          {{ details.credits.usage.used }}
          <span class="text-sm font-normal text-slate-500"
            >/ {{ details.credits.usage.limit }}</span
          >
        </p>
      </div>
      <div class="rounded-xl bg-slate-50 p-4 dark:bg-white/5">
        <p class="text-xs text-slate-500">{{ t("shared.components_admin_bot_user_credits.remaining_today") }}</p>
        <p class="mt-1 text-2xl font-bold">
          {{ details.credits.usage.remaining }}
        </p>
      </div>
    </div>
    <p class="text-xs text-slate-500">
      {{ t("shared.components_admin_bot_user_credits.both_bots_use_this_wallet_and_daily_limit_chlat") }}
    </p>
    <form class="space-y-4" @submit.prevent="prepare">
      <fieldset
        :disabled="saving || Boolean(pending)"
        class="space-y-4 disabled:opacity-60"
      >
        <label class="block text-sm font-medium"
          >{{ t("shared.components_admin_bot_user_credits.action") }}
          <ModernSelect
            v-model="kind"
            class="mt-2 w-full rounded-xl border border-slate-300 bg-transparent px-3 py-2 dark:border-white/15"
          >
            <option value="balance">{{ t("shared.components_admin_bot_user_credits.adjust_credits_refund") }}</option>
            <option value="limit">{{ t("shared.components_admin_bot_user_credits.set_daily_limit") }}</option>
          </ModernSelect>
        </label>
        <div v-if="kind === 'balance'" class="flex gap-3">
          <ModernSelect
            v-model="direction"
            :aria-label="t(&quot;shared.components_admin_bot_user_credits.credit_direction&quot;)"
            class="rounded-xl border border-slate-300 bg-transparent px-3 py-2 dark:border-white/15"
          >
            <option :value="1">{{ t("shared.components_admin_bot_user_credits.add_refund") }}</option>
            <option :value="-1">{{ t("shared.components_admin_bot_user_credits.deduct") }}</option>
          </ModernSelect>
          <input
            v-model="amount"
            :aria-label="t(&quot;shared.components_layout_product_navigation.credits&quot;)"
            type="number"
            min="1"
            max="100000"
            step="1"
            required
            :placeholder="t(&quot;shared.components_layout_product_navigation.credits&quot;)"
            class="min-w-0 flex-1 rounded-xl border border-slate-300 bg-transparent px-3 py-2 dark:border-white/15"
          />
        </div>
        <div v-else class="space-y-3 text-sm">
          <label class="flex items-center gap-2"
            ><input v-model="defaultLimit" type="checkbox" /> {{ t("shared.components_admin_bot_user_credits.use_default") }}{{
              details.credits.usage.defaultLimit
            }}
            {{ t("shared.components_admin_bot_user_credits.credits_day") }}</label
          >
          <input
            v-if="!defaultLimit"
            v-model="limit"
            :aria-label="t(&quot;shared.components_admin_bot_user_credits.daily_credit_limit&quot;)"
            type="number"
            min="0"
            max="100000"
            step="1"
            required
            class="w-full rounded-xl border border-slate-300 bg-transparent px-3 py-2 dark:border-white/15"
          />
        </div>
        <label class="block text-sm font-medium"
          >{{ t("shared.common.reason") }}
          <textarea
            v-model="reason"
            rows="2"
            minlength="3"
            maxlength="240"
            required
            class="mt-2 w-full rounded-xl border border-slate-300 bg-transparent px-3 py-2 dark:border-white/15"
          />
        </label>
        <button
          type="submit"
          class="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white"
        >
          {{ t("shared.components_admin_bot_user_access.review_change") }}
        </button>
      </fieldset>
      <div
        v-if="pending"
        class="space-y-3 rounded-xl bg-violet-50 p-4 text-sm dark:bg-violet-400/10"
      >
        <p class="font-semibold">{{ pending.summary }}</p>
        <p>{{ pending.change.body.reason }}</p>
        <button
          type="button"
          :disabled="saving"
          class="rounded-lg bg-violet-600 px-3 py-2 text-white disabled:opacity-50"
          @click="confirm"
        >
          {{ saving ? t("shared.common.saving") : t("shared.components_admin_bot_user_credits.confirm_adjustment") }}
        </button>
        <button
          type="button"
          :disabled="saving"
          class="ml-3 px-3 py-2"
          @click="pending = null"
        >
          {{ t("shared.common.cancel") }}
        </button>
      </div>
      <p v-if="error" role="alert" class="text-sm text-red-600">{{ error }}</p>
    </form>
    <div class="overflow-x-auto">
      <table class="w-full text-left text-sm">
        <caption class="mb-3 text-left font-semibold">
          {{ t("shared.components_admin_bot_user_credits.recent_credit_history") }}
        </caption>
        <thead class="text-xs text-slate-500">
          <tr>
            <th class="py-2">{{ t("shared.components_admin_bot_user_credits.event") }}</th>
            <th class="py-2">{{ t("shared.components_admin_bot_user_credits.change") }}</th>
            <th class="py-2">{{ t("shared.components_admin_bot_user_credits.balance") }}</th>
            <th class="py-2">{{ t("shared.components_admin_bot_user_credits.reason_feature") }}</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 dark:divide-white/10">
          <tr v-for="entry in details.credits.transactions" :key="entry.id">
            <td class="py-3">
              <p>{{ localizeBotCode(entry.type, t("shared.components_admin_bot_group_workspaces.en")) }}</p>
              <time class="text-xs text-slate-500">{{
                new Date(entry.createdAt).toLocaleString()
              }}</time>
            </td>
            <td>{{ entry.amount === 0 ? t("shared.credits.no_balance_change") : formatCreditChange(entry.amount) }}</td>
            <td>{{ entry.balanceAfter }}</td>
            <td>{{ entry.reason || entry.feature || "—" }}</td>
          </tr>
        </tbody>
      </table>
      <p
        v-if="!details.credits.transactions.length"
        class="py-4 text-sm text-slate-500"
      >
        {{ t("shared.components_admin_bot_user_credits.no_credit_transactions_yet") }}
      </p>
    </div>
    <div
      v-if="details.credits.usageLimitChanges.length"
      class="space-y-2 text-sm"
    >
      <h3 class="font-semibold">{{ t("shared.components_admin_bot_user_credits.daily_limit_history") }}</h3>
      <p
        v-for="entry in details.credits.usageLimitChanges"
        :key="entry.id"
        class="rounded-lg bg-slate-50 p-3 dark:bg-white/5"
      >
        {{ entry.previousLimit ?? t("shared.common.default") }} →
        {{ entry.dailyCreditLimit ?? t("shared.common.default") }} · {{ entry.reason }}
        <time class="block text-xs text-slate-500">{{
          new Date(entry.createdAt).toLocaleString()
        }}</time>
      </p>
    </div>
  </div>
  <p v-else class="text-sm text-slate-500">
    {{ t("shared.components_admin_bot_user_credits.this_website_account_is_inactive_credit_edits_are_unavailable") }}
  </p>
</template>
