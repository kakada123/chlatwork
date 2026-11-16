<script setup lang="ts">
import {
  notebookCaptureLabel,
  type PrepList,
  type PrepSubject,
  type PrepType,
} from "~/lib/prephub";
import PrepDialog from "./PrepDialog.vue";
import PrepItemForm from "./PrepItemForm.vue";
const props = defineProps<{
  open: boolean;
  initialType?: PrepType;
  targetSectionId?: string;
  simple?: boolean;
  subject?: PrepSubject;
  timeZone: string;
}>();
const emit = defineEmits<{ close: []; saved: [sectionId?: string] }>();
const { t } = useAppI18n();
const { request, busy, error, fail, owner } = usePrepHub();
const type = ref<PrepType>(props.initialType ?? "NOTES");
const typeOptions = computed(() => [
  ...new Set<PrepType>([
    "CHECKLIST",
    "NOTES",
    "ATTACHMENTS",
    "LINKS",
    "QUESTIONS",
    ...(props.initialType ? [props.initialType] : ["RESEARCH" as const]),
  ]),
]);
const selected = ref("");
const query = ref("");
const subjects = ref<PrepSubject[]>([]);
const file = ref<File>();
let timer: ReturnType<typeof setTimeout> | undefined;
let searchVersion = 0;
async function search() {
  const version = ++searchVersion;
  try {
    const result = await request<PrepList>("/subjects", {
      query: { q: query.value, limit: 50, status: "ACTIVE" },
    });
    if (version === searchVersion) subjects.value = result.subjects;
  } catch (e) {
    if (version === searchVersion) fail(e);
  }
}
watch(query, () => {
  clearTimeout(timer);
  timer = setTimeout(search, 250);
});
watch(
  () => props.open,
  (open) => {
    if (!open) return;
    error.value = "";
    selected.value = props.subject?.id ?? "";
    file.value = undefined;
    type.value = props.initialType ?? "NOTES";
    if (!props.subject) void search();
  },
);
watch(owner, () => {
  subjects.value = [];
  selected.value = "";
  emit("close");
});
onBeforeUnmount(() => {
  clearTimeout(timer);
  searchVersion++;
});
async function capture(body: Record<string, unknown> = {}) {
  if (busy.value || !selected.value) return false;
  busy.value = true;
  error.value = "";
  try {
    const subject = await request<PrepSubject>(`/subjects/${selected.value}`);
    if (
      type.value === "ATTACHMENTS" &&
      (!file.value || !file.value.size || file.value.size > 5 * 1024 * 1024)
    )
      throw new Error(t("prephub.fileHint"));
    // An explicit section context wins; changing capture type falls back to a matching section.
    let section =
      subject.sections.find(
        (s) => s.id === props.targetSectionId && s.type === type.value,
      ) ?? subject.sections.find((s) => s.type === type.value);
    if (!section)
      section = await request(`/subjects/${selected.value}/sections`, {
        method: "POST",
        body: { type: type.value, title: t(`prephub.${type.value}`) },
      });
    const base = `/subjects/${selected.value}/sections/${section!.id}`;
    if (type.value === "ATTACHMENTS") {
      const form = new FormData();
      form.append("file", file.value);
      await request(`${base}/resources`, { method: "POST", body: form });
    } else await request(`${base}/items`, { method: "POST", body });
    emit("saved", section!.id);
    emit("close");
    return true;
  } catch (e) {
    fail(e);
    return false;
  } finally {
    busy.value = false;
  }
}
</script>
<template>
  <PrepDialog
    :open="open"
    :title="simple ? t(notebookCaptureLabel(type)) : t('prephub.quickCapture')"
    :busy="busy"
    @close="emit('close')"
  >
    <div class="space-y-4">
      <template v-if="!subject"
        ><label class="prep-label"
          >{{ t("prephub.searchCapture")
          }}<input
            v-model="query"
            type="search"
            class="prep-input"
            maxlength="200" /></label
        ><label class="prep-label"
          >{{ t("prephub.captureSubject")
          }}<ModernSelect
            v-model="selected"
            class="mt-1 w-full"
            :disabled="busy"
          >
            <option value="" disabled>{{ t("prephub.captureSubject") }}</option>
            <option v-for="s in subjects" :key="s.id" :value="s.id">
              {{ s.title }}
            </option>
          </ModernSelect></label
        ></template
      >
      <label class="prep-label"
        >{{ t("prephub.captureType")
        }}<ModernSelect v-model="type" class="mt-1 w-full" :disabled="busy">
          <option v-for="v in typeOptions" :key="v" :value="v">
            {{ t(notebookCaptureLabel(v)) }}
          </option>
        </ModernSelect></label
      >
      <p v-if="error" role="alert" class="text-sm text-red-600">{{ error }}</p>
      <template v-if="selected"
        ><form
          v-if="type === 'ATTACHMENTS'"
          class="space-y-4"
          @submit.prevent="capture()"
        >
          <label class="prep-label"
            >{{ t("prephub.selectedFile")
            }}<input
              type="file"
              class="prep-input"
              accept=".pdf,.png,.jpg,.jpeg,.webp,.docx,.pptx,.xlsx,.txt"
              required
              :disabled="busy"
              @change="file = ($event.target as HTMLInputElement).files?.[0]"
          /></label>
          <p class="text-xs text-slate-500">{{ t("prephub.fileHint") }}</p>
          <button class="prep-primary" :disabled="busy || !file">
            {{ t(busy ? "prephub.saving" : "prephub.save") }}
          </button>
        </form>
        <PrepItemForm
          v-else
          :key="`${selected}-${type}`"
          :type="type"
          :time-zone="timeZone"
          :busy="busy"
          :simple="simple"
          :submit="capture"
          @cancel="emit('close')"
      /></template>
    </div>
  </PrepDialog>
</template>
