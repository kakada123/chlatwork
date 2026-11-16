<script setup lang="ts">
import type { PrepInbox } from "~/lib/prephub";
const props = defineProps<{ timeZone: string }>();
const { request, owner, error, fail } = usePrepHub();
const { t } = useAppI18n();
const { linkTo } = useProductDomain();
function date(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    timeZone: props.timeZone,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
const reminders = ref<PrepInbox[]>([]);
const busy = ref("");
let timer: ReturnType<typeof setInterval> | undefined;
async function load() {
  try {
    reminders.value = await request<PrepInbox[]>("/inbox");
    error.value = "";
  } catch {
    /* Keep the last inbox and retry after reconnecting; the workspace reports primary API failures. */
  }
}
async function dismiss(reminder: PrepInbox) {
  busy.value = reminder.id;
  try {
    await request(`/subjects/${reminder.subjectId}/reminders/${reminder.id}`, {
      method: "PATCH",
    });
    reminders.value = reminders.value.filter((r) => r.id !== reminder.id);
  } catch (e) {
    fail(e);
  } finally {
    busy.value = "";
  }
}
onMounted(() => {
  void load();
  timer = setInterval(load, 30000);
});
watch(owner, () => {
  reminders.value = [];
  if (owner.value) void load();
});
onBeforeUnmount(() => clearInterval(timer));
</script>
<template>
  <aside v-if="reminders.length || error" aria-live="polite" class="space-y-2">
    <div
      v-for="r in reminders"
      :key="r.id"
      class="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-900 dark:bg-amber-950/30"
    >
      <NuxtLink
        :to="linkTo(`/prephub/${r.subjectId}/review`)"
        class="min-w-0 flex-1 break-words"
        ><strong>{{ t("prephub.reminderDue") }}: {{ r.subject.title }}</strong
        ><span class="mt-1 block text-xs">{{
          date(r.remindAt)
        }}</span></NuxtLink
      ><button
        type="button"
        class="prep-button"
        :disabled="busy === r.id"
        @click="dismiss(r)"
      >
        {{ t("prephub.dismiss") }}
      </button>
    </div>
    <p v-if="error" role="alert" class="text-sm text-red-600">{{ error }}</p>
  </aside>
</template>
