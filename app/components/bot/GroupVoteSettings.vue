<script setup lang="ts">
import { useAppI18n } from "~/composables/useAppI18n";
import {
  groupApi,
  type GroupDetails,
  type VoteInput,
} from "~/services/group-workspaces.service";

const { t } = useAppI18n();

const { isKhmer } = useLanguage();
const props = defineProps<{ group: GroupDetails }>();
let active = true;
onBeforeUnmount(() => {
  active = false;
});
const emit = defineEmits<{ changed: [notice?: string]; denied: [] }>();
const { epoch, state } = useBotSession();
const form = reactive<VoteInput>({
  expectedVersion: props.group.workspaceVersion,
  question: props.group.poll?.question ?? t("shared.components_bot_group_vote_settings.what_s_for_lunch"),
  options: props.group.poll?.options.map((option) => ({ ...option })) ?? [
    { label: t("shared.components_bot_group_vote_settings.option_1") },
    { label: t("shared.components_bot_group_vote_settings.option_2") },
  ],
  timeZone: props.group.poll?.schedule?.timeZone ?? "Asia/Phnom_Penh",
  sendHour: props.group.poll?.schedule?.sendHour ?? 10,
  sendMinute: props.group.poll?.schedule?.sendMinute ?? 0,
  durationMinutes: props.group.poll?.schedule?.durationMinutes ?? 30,
  enabled: props.group.poll?.schedule?.enabled ?? false,
});
const search = ref("");
const busy = ref(false);
const error = ref("");
const stale = ref(false);
const visible = computed(() =>
  form.options
    .map((option, index) => ({ option, index }))
    .filter(({ option }) =>
      option.label.toLowerCase().includes(search.value.toLowerCase()),
    ),
);
function remove(index: number) {
  if (
    form.options.length > 2 &&
    window.confirm(t("shared.components_bot_group_vote_settings.delete_and_its_votes", { indexLabel: form.options[index]?.label }))
  )
    form.options.splice(index, 1);
}
function failed(cause: any) {
  error.value =
    (cause?.statusCode ?? cause?.status) === 409
      ? t("shared.components_bot_group_vote_settings.this_group_changed_refresh_and_review_the_latest_choices")
      : t("shared.components_bot_group_vote_settings.could_not_save_refresh_before_trying_again");
  stale.value = true;
  if ([401, 403].includes(cause?.statusCode ?? cause?.status)) emit("denied");
}
async function save() {
  if (busy.value || stale.value || state.value !== "ready") return;
  if (
    props.group.poll?.schedule?.enabled &&
    !form.enabled &&
    !window.confirm(t("shared.components_bot_group_vote_settings.stop_daily_voting_in", { groupTitle: props.group.title }))
  )
    return;
  const session = epoch.value;
  const id = props.group.workspaceId;
  const group = { ...props.group };
  busy.value = true;
  error.value = "";
  try {
    await groupApi.vote(
      group,
      {
        ...structuredClone(toRaw(form)),
        options: form.options.map(({ id, label }) => ({
          ...(id ? { id } : {}),
          label,
        })),
      },
      crypto.randomUUID(),
    );
    if (active && session === epoch.value && props.group.workspaceId === id)
      emit("changed");
  } catch (cause) {
    if (active && session === epoch.value && props.group.workspaceId === id)
      failed(cause);
  } finally {
    busy.value = false;
  }
}
async function upload(event: Event, optionId?: string) {
  const element = event.target as HTMLInputElement;
  const image = element.files?.[0];
  element.value = "";
  if (
    !image ||
    !optionId ||
    busy.value ||
    stale.value ||
    state.value !== "ready"
  )
    return;
  if (image.size > 10 * 1024 * 1024) {
    error.value = t("shared.components_bot_group_vote_settings.choose_an_image_up_to_10_mb");
    return;
  }
  if (
    !window.confirm(
      t("shared.components_bot_group_vote_settings.upload_this_image_save_any_choice_edits_first_the"),
    )
  )
    return;
  const session = epoch.value;
  const group = { ...props.group };
  busy.value = true;
  error.value = "";
  try {
    await groupApi.upload(group, optionId, image, crypto.randomUUID());
    if (
      active &&
      session === epoch.value &&
      props.group.workspaceId === group.workspaceId
    )
      emit("changed");
  } catch (cause) {
    if (active && session === epoch.value) failed(cause);
  } finally {
    busy.value = false;
  }
}
function resetUnavailableReason() {
  const round = props.group.poll?.currentRound;
  if (!round)
    return t("shared.components_bot_group_vote_settings.no_voting_round_is_open_start_one_with_startvote");
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: props.group.poll?.schedule?.timeZone ?? "Asia/Phnom_Penh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  if (round.voteDate?.slice(0, 10) !== today)
    return t("shared.components_bot_group_vote_settings.this_is_an_earlier_day_s_vote_start_today");
  return "";
}
async function reset() {
  if (state.value !== "ready") return;
  const reason = resetUnavailableReason();
  if (reason) {
    error.value = reason;
    return;
  }
  const round = props.group.poll?.currentRound;
  if (
    !round ||
    busy.value ||
    stale.value ||
    !window.confirm(
      t("shared.components_bot_group_vote_settings.clear_today_s_votes_and_reopen_voting_in_with", { groupTitle: props.group.title }),
    )
  )
    return;
  const session = epoch.value;
  const group = { ...props.group };
  busy.value = true;
  error.value = "";
  try {
    const result = await groupApi.reset(group, round.id, crypto.randomUUID());
    if (
      active &&
      session === epoch.value &&
      props.group.workspaceId === group.workspaceId
    )
      emit(
        "changed",
        result.deliveryPending
          ? t("shared.components_bot_group_vote_settings.votes_reset_and_voting_reopened_telegram_delivery_is_pending")
          : t("shared.components_bot_group_vote_settings.votes_reset_and_voting_reopened_with_a_fresh_timer"),
      );
  } catch (cause) {
    if (active && session === epoch.value) failed(cause);
  } finally {
    busy.value = false;
  }
}
</script>
<template>
  <form
    class="space-y-5 rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-900"
    @submit.prevent="save"
  >
    <h2 class="font-semibold">{{ t("shared.components_bot_group_vote_settings.voting_in") }} {{ group.title }}</h2>
    <fieldset :disabled="busy || stale" class="space-y-4 disabled:opacity-60">
      <label class="block text-sm"
        >{{ t("shared.components_bot_group_vote_settings.question") }}<input
          v-model="form.question"
          required
          maxlength="240"
          class="mt-2 w-full rounded-xl border border-slate-200 bg-transparent px-3 py-2 dark:border-slate-700" /></label
      ><input
        v-model="search"
        type="search"
        :placeholder="t(&quot;shared.components_bot_group_vote_settings.search_choices&quot;)"
        :aria-label="t(&quot;shared.components_bot_group_vote_settings.search_choices&quot;)"
        class="w-full rounded-xl border border-slate-200 bg-transparent px-3 py-2 dark:border-slate-700"
      />
      <div
        v-for="{ option, index } in visible"
        :key="option.id ?? index"
        class="space-y-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-800"
      >
        <div class="flex gap-2">
          <input
            v-model="option.label"
            required
            maxlength="120"
            :aria-label="t(&quot;shared.components_bot_group_vote_settings.choice&quot;, { index: index + 1 })"
            class="min-w-0 flex-1 rounded-lg border border-slate-200 bg-transparent px-3 py-2 dark:border-slate-600"
          /><button
            type="button"
            :disabled="form.options.length <= 2"
            class="text-sm text-rose-600 disabled:opacity-40"
            @click="remove(index)"
          >
            {{ t("shared.common.delete") }}
          </button>
        </div>
        <img
          v-if="option.imageUrl"
          :src="option.imageUrl"
          :alt="t(&quot;shared.components_bot_group_vote_settings.image&quot;, { optionLabel: option.label })"
          class="h-24 w-24 rounded-lg object-cover"
        />
        <label v-if="option.id" class="block text-xs text-violet-600"
          >{{ option.imageId ? t("shared.components_bot_group_vote_settings.replace_choice_image") : t("shared.components_bot_group_vote_settings.add_choice_image")
          }}<input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            class="mt-1 block w-full text-xs"
            @change="upload($event, option.id)"
        /></label>
        <p v-else class="text-xs text-slate-500">
          {{ t("shared.components_bot_group_vote_settings.save_this_choice_before_adding_an_image") }}
        </p>
      </div>
      <button
        type="button"
        :disabled="form.options.length >= 15"
        class="text-sm font-medium text-violet-600 disabled:opacity-40"
        @click="form.options.push({ label: '' })"
      >
        {{ t("shared.components_bot_group_vote_settings.add_choice") }}
      </button>
      <div class="grid grid-cols-2 gap-3">
        <label class="text-sm"
          >{{ t("shared.components_bot_group_vote_settings.hour") }}<input
            v-model.number="form.sendHour"
            type="number"
            min="0"
            max="23"
            required
            class="mt-1 w-full rounded-xl border bg-transparent p-2 dark:border-slate-700" /></label
        ><label class="text-sm"
          >{{ t("shared.components_bot_group_vote_settings.minute") }}<input
            v-model.number="form.sendMinute"
            type="number"
            min="0"
            max="59"
            required
            class="mt-1 w-full rounded-xl border bg-transparent p-2 dark:border-slate-700" /></label
        ><label class="col-span-2 text-sm"
          >{{ t("shared.components_bot_group_vote_settings.timezone") }}<input
            v-model="form.timeZone"
            required
            maxlength="64"
            class="mt-1 w-full rounded-xl border bg-transparent p-2 dark:border-slate-700" /></label
        ><label class="col-span-2 text-sm"
          >{{ t("shared.components_bot_group_vote_settings.round_duration_minutes") }}<input
            v-model.number="form.durationMinutes"
            type="number"
            min="1"
            max="1440"
            required
            class="mt-1 w-full rounded-xl border bg-transparent p-2 dark:border-slate-700"
        /></label>
      </div>
      <label class="flex gap-3 text-sm"
        ><input
          v-model="form.enabled"
          type="checkbox"
          class="size-4 accent-violet-600"
        />{{ t("shared.components_bot_group_vote_settings.send_this_poll_daily") }}</label
      >
    </fieldset>
    <p v-if="error" role="alert" class="text-sm text-rose-600">{{ error }}</p>
    <div class="flex flex-wrap items-center gap-4">
      <button
        :disabled="busy || stale"
        class="rounded-xl bg-violet-600 px-4 py-2 text-white disabled:opacity-50"
      >
        {{ busy ? t("shared.common.saving") : t("shared.components_bot_group_vote_settings.save_voting") }}</button
      ><button
        type="button"
        :disabled="busy || stale || Boolean(resetUnavailableReason())"
        :aria-describedby="
          resetUnavailableReason() ? 'vote-reset-unavailable' : undefined
        "
        class="text-sm text-rose-600 disabled:opacity-50"
        @click="reset"
      >
        {{ t("shared.components_bot_group_vote_settings.reset_reopen_voting") }}
      </button>
    </div>
    <p
      v-if="!resetUnavailableReason()"
      class="text-sm text-slate-500 dark:text-slate-400"
    >
      {{ t("shared.components_bot_group_vote_settings.clears_today_s_votes_and_starts_a_fresh_timer") }}
    </p>
    <!-- Only today's round can be reset; earlier days remain in history. -->
    <p
      v-if="resetUnavailableReason()"
      id="vote-reset-unavailable"
      class="text-sm text-slate-500 dark:text-slate-400"
    >
      {{ resetUnavailableReason() }}
    </p>
  </form>
</template>
