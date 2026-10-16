<script setup lang="ts">
import {
  groupApi,
  type GroupDetails,
  type GroupFeatures,
} from "~/services/group-workspaces.service";
const props = defineProps<{ group: GroupDetails }>();
let active = true;
onBeforeUnmount(() => {
  active = false;
});
const emit = defineEmits<{ changed: []; denied: [] }>();
const form = reactive<GroupFeatures>({
  enabled: props.group.enabled,
  voting: props.group.voting,
  split: props.group.split,
  khqr: props.group.khqr,
  creator: props.group.creator,
});
const busy = ref(false);
const error = ref("");
const stale = ref(false);
const { epoch, state } = useBotSession();
async function save() {
  if (busy.value || stale.value || state.value !== "ready") return;
  if (
    !form.enabled &&
    !window.confirm(
      `Pause ${props.group.title}? Members will lose this bot’s group features.`,
    )
  )
    return;
  const session = epoch.value;
  const group = structuredClone(toRaw(props.group));
  busy.value = true;
  error.value = "";
  try {
    await groupApi.features(group, { ...form }, crypto.randomUUID());
    if (
      active &&
      session === epoch.value &&
      props.group.workspaceId === group.workspaceId
    )
      emit("changed");
  } catch (cause: any) {
    if (active && session === epoch.value) {
      error.value =
        cause?.status === 409 || cause?.statusCode === 409
          ? "Another manager changed this group. Refresh before saving again."
          : "Could not save group settings.";
      stale.value = true;
      if ([401, 403].includes(cause?.statusCode ?? cause?.status))
        emit("denied");
    }
  } finally {
    busy.value = false;
  }
}
</script>
<template>
  <form
    class="space-y-4 rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-900"
    @submit.prevent="save"
  >
    <h2 class="font-semibold">Features in {{ group.title }}</h2>
    <label class="flex items-center gap-3"
      ><input
        v-model="form.enabled"
        type="checkbox"
        :disabled="busy"
        class="size-4 accent-violet-600"
      />Enable this bot in this group</label
    ><template v-if="group.bot === 'CHLATWORK'"
      ><label
        v-for="feature in ['voting', 'split', 'khqr'] as const"
        :key="feature"
        class="flex items-center justify-between gap-3 border-t border-slate-100 py-3 text-sm dark:border-slate-800"
        ><span>{{
          { voting: "Voting", split: "Bill split", khqr: "KHQR directory" }[
            feature
          ]
        }}</span
        ><input
          v-model="form[feature]"
          type="checkbox"
          :disabled="busy"
          class="size-4 accent-violet-600" /></label></template
    ><label v-else class="flex items-center gap-3"
      ><input
        v-model="form.creator"
        type="checkbox"
        :disabled="busy"
        class="size-4 accent-violet-600"
      />Creator AI</label
    >
    <p v-if="error" role="alert" class="text-sm text-rose-600">{{ error }}</p>
    <button
      :disabled="busy || stale"
      class="rounded-xl bg-violet-600 px-4 py-2 text-white disabled:opacity-50"
    >
      {{ busy ? "Saving…" : "Save features" }}
    </button>
  </form>
</template>
