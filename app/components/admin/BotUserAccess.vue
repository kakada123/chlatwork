<script setup lang="ts">
import {
  reviewBotUser,
  type BotReview,
  type BotUserDetails,
  type BotStatus,
} from "~/services/bot-admin.service";
import { creatorCreditRequestError } from "~/lib/creator-credit-display";

const props = defineProps<{ details: BotUserDetails }>();
const emit = defineEmits<{ saved: [] }>();
const { user } = useAuth();
const state = reactive({
  status: "PENDING" as BotStatus,
  creator: true,
  chlatwork: true,
  grant: 0,
  reason: "",
});
const review = shallowRef<{
  body: BotReview;
  key: string;
  actorId: string;
} | null>(null);
const saving = ref(false);
const error = ref("");
watch(
  () => props.details,
  ({ profile }) => {
    Object.assign(state, {
      status: profile.status,
      creator: profile.creatorEnabled,
      chlatwork: profile.chlatworkEnabled,
      grant: 0,
      reason: "",
    });
    review.value = null;
    error.value = "";
  },
  { immediate: true },
);

function prepare() {
  error.value = "";
  if (state.reason.trim().length < 3) {
    error.value = "Enter a reason of at least 3 characters.";
    return;
  }
  review.value = {
    actorId: user.value?.id ?? "",
    key: crypto.randomUUID(),
    body: {
      status: state.status,
      creatorEnabled: state.creator,
      chlatworkEnabled: state.chlatwork,
      expectedVersion: props.details.profile.version,
      expectedBalance: props.details.profile.balance,
      startingCredits:
        props.details.profile.status === "PENDING" &&
        state.status === "APPROVED"
          ? Number(state.grant)
          : 0,
      reason: state.reason.trim(),
    },
  };
}

async function confirm() {
  const pending = review.value;
  if (
    !pending ||
    saving.value ||
    user.value?.role !== "ADMIN" ||
    user.value.id !== pending.actorId
  )
    return;
  saving.value = true;
  error.value = "";
  try {
    await reviewBotUser(
      props.details.profile.userId,
      pending.body,
      pending.key,
    );
    review.value = null;
    emit("saved");
  } catch (cause) {
    error.value = creatorCreditRequestError(
      cause,
      "Could not save. Refresh if the profile changed, then review again.",
    );
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <form class="space-y-5" @submit.prevent="prepare">
    <p class="text-sm text-slate-500">
      Approval is shared. Bot permissions are independent of website access.
    </p>
    <fieldset
      :disabled="saving || Boolean(review)"
      class="space-y-5 disabled:opacity-60"
    >
      <label class="block text-sm font-medium"
        >Approval status
        <select
          v-model="state.status"
          class="mt-2 w-full rounded-xl border border-slate-300 bg-transparent px-3 py-2 dark:border-white/15"
        >
          <option
            v-for="status in ['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED']"
            :key="status"
            :value="status"
          >
            {{ status }}
          </option>
        </select>
      </label>
      <div class="flex flex-wrap gap-5 text-sm">
        <label class="flex items-center gap-2"
          ><input v-model="state.creator" type="checkbox" /> Creator
          access</label
        >
        <label class="flex items-center gap-2"
          ><input v-model="state.chlatwork" type="checkbox" /> ChlatWork
          access</label
        >
      </div>
      <label
        v-if="
          details.profile.status === 'PENDING' && state.status === 'APPROVED'
        "
        class="block text-sm font-medium"
        >Optional starting credits
        <input
          v-model.number="state.grant"
          type="number"
          min="0"
          max="100000"
          step="1"
          required
          class="mt-2 w-full rounded-xl border border-slate-300 bg-transparent px-3 py-2 dark:border-white/15"
        />
        <span class="mt-1 block text-xs text-slate-500"
          >A starting grant replaces the automatic welcome grant. Current
          balance: {{ details.profile.balance }}.</span
        >
      </label>
      <label class="block text-sm font-medium"
        >Reason
        <textarea
          v-model="state.reason"
          required
          minlength="3"
          maxlength="240"
          rows="2"
          class="mt-2 w-full rounded-xl border border-slate-300 bg-transparent px-3 py-2 dark:border-white/15"
          placeholder="Why are you making this change?"
        />
      </label>
      <button
        type="submit"
        class="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white"
      >
        Review change
      </button>
    </fieldset>
    <div
      v-if="review"
      class="space-y-3 rounded-xl border border-violet-200 bg-violet-50 p-4 text-sm dark:border-violet-400/20 dark:bg-violet-400/10"
    >
      <p>
        Set status to <strong>{{ review.body.status }}</strong
        >. Creator: {{ review.body.creatorEnabled ? "allowed" : "disabled" }}.
        ChlatWork: {{ review.body.chlatworkEnabled ? "allowed" : "disabled" }}.
      </p>
      <p v-if="review.body.startingCredits">
        Grant {{ review.body.startingCredits }} credits:
        {{ review.body.expectedBalance }} →
        {{ review.body.expectedBalance + review.body.startingCredits }}.
      </p>
      <p>{{ review.body.reason }}</p>
      <div class="flex gap-3">
        <button
          type="button"
          :disabled="saving"
          class="rounded-lg bg-violet-600 px-3 py-2 font-semibold text-white disabled:opacity-50"
          @click="confirm"
        >
          {{ saving ? "Saving…" : "Confirm change" }}
        </button>
        <button
          type="button"
          :disabled="saving"
          class="px-3 py-2"
          @click="review = null"
        >
          Cancel
        </button>
      </div>
    </div>
    <p v-if="error" role="alert" class="text-sm text-red-600">{{ error }}</p>
  </form>
</template>
