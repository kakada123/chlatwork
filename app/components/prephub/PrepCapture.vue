<script setup lang="ts">
import {
  notebookCaptureLabel,
  type PrepList,
  type PrepSubject,
  type PrepSubjectSummary,
  type PrepType,
} from "~/lib/prephub";
import PrepDialog from "./PrepDialog.vue";
import PrepItemForm from "./PrepItemForm.vue";
import PrepAttachmentPicker from "./PrepAttachmentPicker.vue";
import { uploadPrepFiles, validatePrepFiles } from "~/lib/prephub-attachments";
const props = defineProps<{
  open: boolean;
  initialType?: PrepType;
  targetSectionId?: string;
  simple?: boolean;
  subject?: Pick<PrepSubject, "id">;
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
const subjects = ref<PrepSubjectSummary[]>([]);
const files = ref<File[]>([]);
const uploadProgress = ref({ current: 0, total: 0 });
let captureVersion = 0;
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
    captureVersion++;
    if (!open) busy.value = false;
    if (!open) return;
    error.value = "";
    selected.value = props.subject?.id ?? "";
    files.value = [];
    uploadProgress.value = { current: 0, total: 0 };
    type.value = props.initialType ?? "NOTES";
    if (!props.subject) void search();
  },
);
watch(owner, () => {
  captureVersion++;
  busy.value = false;
  files.value = [];
  subjects.value = [];
  selected.value = "";
  emit("close");
});
watch(
  () => props.subject?.id,
  (id) => {
    captureVersion++;
    busy.value = false;
    files.value = [];
    selected.value = id ?? "";
  },
);
onBeforeUnmount(() => {
  captureVersion++;
  clearTimeout(timer);
  searchVersion++;
});
async function capture(body: Record<string, unknown> = {}) {
  if (busy.value || !selected.value) return false;
  const version = captureVersion;
  const startedOwner = owner.value;
  const subjectId = selected.value;
  const captureType = type.value;
  const current = () =>
    version === captureVersion &&
    owner.value === startedOwner &&
    selected.value === subjectId &&
    type.value === captureType;
  let uploaded = 0;
  let savedSectionId: string | undefined;
  busy.value = true;
  error.value = "";
  try {
    const subject = await request<PrepSubject>(`/subjects/${subjectId}`);
    if (!current()) return false;
    if (captureType === "ATTACHMENTS") {
      const invalid = validatePrepFiles(
        files.value,
        subject.sections.reduce(
          (count, section) => count + section.resources.length,
          0,
        ),
      );
      if (!files.value.length || invalid)
        throw new Error(
          t(
            invalid === "count"
              ? "prephub.attachments.tooMany"
              : "prephub.fileHint",
          ),
        );
    }
    // An explicit section context wins; changing capture type falls back to a matching section.
    let section =
      subject.sections.find(
        (s) => s.id === props.targetSectionId && s.type === captureType,
      ) ?? subject.sections.find((s) => s.type === captureType);
    if (!section)
      section = await request(`/subjects/${subjectId}/sections`, {
        method: "POST",
        body: { type: captureType, title: t(`prephub.${captureType}`) },
      });
    if (!current()) return false;
    savedSectionId = section!.id;
    const base = `/subjects/${subjectId}/sections/${section!.id}`;
    if (captureType === "ATTACHMENTS") {
      const total = files.value.length;
      const complete = await uploadPrepFiles(
        files.value,
        (form) => {
          uploadProgress.value = { current: uploaded + 1, total };
          return request(`${base}/resources`, { method: "POST", body: form });
        },
        {
          current,
          uploaded(file) {
            uploaded++;
            files.value = files.value.filter((pending) => pending !== file);
          },
        },
      );
      if (!complete) return false;
    } else await request(`${base}/items`, { method: "POST", body });
    if (!current()) return false;
    emit("saved", section!.id);
    emit("close");
    return true;
  } catch (e) {
    if (current()) {
      if (uploaded) emit("saved", savedSectionId);
      fail(e);
    }
    return false;
  } finally {
    if (current()) busy.value = false;
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
          <PrepAttachmentPicker v-model="files" :busy="busy" />
          <p
            v-if="busy && uploadProgress.total"
            role="status"
            class="text-sm tabular-nums text-slate-500"
          >
            {{ t("prephub.attachments.uploading", uploadProgress) }}
          </p>
          <button class="prep-primary" :disabled="busy || !files.length">
            {{ t(busy ? "prephub.saving" : "prephub.attachments.uploadFiles") }}
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
