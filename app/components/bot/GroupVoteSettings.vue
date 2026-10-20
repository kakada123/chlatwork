<script setup lang="ts">
import {
  groupApi,
  type GroupDetails,
  type VoteInput,
} from "~/services/group-workspaces.service";
const props = defineProps<{ group: GroupDetails }>();
let active = true;
onBeforeUnmount(() => {
  active = false;
});
const emit = defineEmits<{ changed: [notice?: string]; denied: [] }>();
const { epoch, state } = useBotSession();
const form = reactive<VoteInput>({
  expectedVersion: props.group.workspaceVersion,
  question: props.group.poll?.question ?? "What’s for lunch?",
  options: props.group.poll?.options.map((option) => ({ ...option })) ?? [
    { label: "Option 1" },
    { label: "Option 2" },
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
    window.confirm(`Delete “${form.options[index]?.label}” and its votes?`)
  )
    form.options.splice(index, 1);
}
function failed(cause: any) {
  error.value =
    (cause?.statusCode ?? cause?.status) === 409
      ? "This group changed. Refresh and review the latest choices before saving."
      : "Could not save. Refresh before trying again.";
  stale.value = true;
  if ([401, 403].includes(cause?.statusCode ?? cause?.status)) emit("denied");
}
async function save() {
  if (busy.value || stale.value || state.value !== "ready") return;
  if (
    props.group.poll?.schedule?.enabled &&
    !form.enabled &&
    !window.confirm(`Stop daily voting in ${props.group.title}?`)
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
    error.value = "Choose an image up to 10 MB.";
    return;
  }
  if (
    !window.confirm(
      "Upload this image? Save any choice edits first; the form will refresh after uploading.",
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
    return "No voting round is open. Start one with /startvote in the bot’s private chat.";
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: props.group.poll?.schedule?.timeZone ?? "Asia/Phnom_Penh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  if (round.voteDate?.slice(0, 10) !== today)
    return "This is an earlier day’s vote. Start today’s vote with /startvote in the bot’s private chat.";
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
      `Clear today’s votes and reopen voting in ${props.group.title} with a fresh timer? This cannot be undone.`,
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
          ? "Votes reset and voting reopened. Telegram delivery is pending; the bot will retry automatically."
          : "Votes reset and voting reopened with a fresh timer.",
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
    <h2 class="font-semibold">Voting in {{ group.title }}</h2>
    <fieldset :disabled="busy || stale" class="space-y-4 disabled:opacity-60">
      <label class="block text-sm"
        >Question<input
          v-model="form.question"
          required
          maxlength="240"
          class="mt-2 w-full rounded-xl border border-slate-200 bg-transparent px-3 py-2 dark:border-slate-700" /></label
      ><input
        v-model="search"
        type="search"
        placeholder="Search choices"
        aria-label="Search choices"
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
            :aria-label="`Choice ${index + 1}`"
            class="min-w-0 flex-1 rounded-lg border border-slate-200 bg-transparent px-3 py-2 dark:border-slate-600"
          /><button
            type="button"
            :disabled="form.options.length <= 2"
            class="text-sm text-rose-600 disabled:opacity-40"
            @click="remove(index)"
          >
            Delete
          </button>
        </div>
        <p v-if="/canteen/i.test(option.label)" class="text-xs text-slate-500">
          Canteen shows its image and joke; it never counts as a vote.
        </p>
        <img
          v-if="option.imageUrl"
          :src="option.imageUrl"
          :alt="`${option.label} image`"
          class="h-24 w-24 rounded-lg object-cover"
        />
        <label v-if="option.id" class="block text-xs text-violet-600"
          >{{ option.imageId ? "Replace choice image" : "Add choice image"
          }}<input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            class="mt-1 block w-full text-xs"
            @change="upload($event, option.id)"
        /></label>
        <p v-else class="text-xs text-slate-500">
          Save this choice before adding an image.
        </p>
      </div>
      <button
        type="button"
        :disabled="form.options.length >= 15"
        class="text-sm font-medium text-violet-600 disabled:opacity-40"
        @click="form.options.push({ label: '' })"
      >
        + Add choice
      </button>
      <div class="grid grid-cols-2 gap-3">
        <label class="text-sm"
          >Hour<input
            v-model.number="form.sendHour"
            type="number"
            min="0"
            max="23"
            required
            class="mt-1 w-full rounded-xl border bg-transparent p-2 dark:border-slate-700" /></label
        ><label class="text-sm"
          >Minute<input
            v-model.number="form.sendMinute"
            type="number"
            min="0"
            max="59"
            required
            class="mt-1 w-full rounded-xl border bg-transparent p-2 dark:border-slate-700" /></label
        ><label class="col-span-2 text-sm"
          >Timezone<input
            v-model="form.timeZone"
            required
            maxlength="64"
            class="mt-1 w-full rounded-xl border bg-transparent p-2 dark:border-slate-700" /></label
        ><label class="col-span-2 text-sm"
          >Round duration (minutes)<input
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
        />Send this poll daily</label
      >
    </fieldset>
    <p v-if="error" role="alert" class="text-sm text-rose-600">{{ error }}</p>
    <div class="flex flex-wrap items-center gap-4">
      <button
        :disabled="busy || stale"
        class="rounded-xl bg-violet-600 px-4 py-2 text-white disabled:opacity-50"
      >
        {{ busy ? "Saving…" : "Save voting" }}</button
      ><button
        type="button"
        :disabled="busy || stale || Boolean(resetUnavailableReason())"
        :aria-describedby="
          resetUnavailableReason() ? 'vote-reset-unavailable' : undefined
        "
        class="text-sm text-rose-600 disabled:opacity-50"
        @click="reset"
      >
        Reset &amp; reopen voting
      </button>
    </div>
    <p
      v-if="!resetUnavailableReason()"
      class="text-sm text-slate-500 dark:text-slate-400"
    >
      Clears today’s votes and starts a fresh timer. You can reset and reopen
      multiple times a day.
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
