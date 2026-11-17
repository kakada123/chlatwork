<script setup lang="ts">
import {
  FileText,
  FileImage,
  Link2,
  Eye,
  Info,
  Check,
  Circle,
  MoreHorizontal,
  ArrowDown,
  ArrowUp,
  Pencil,
  Plus,
  Trash2,
  Download,
  ExternalLink,
} from "lucide-vue-next";
import {
  safeExternalUrl,
  type PrepItem,
  type PrepMutation,
  type PrepResource,
  type PrepSection,
} from "~/lib/prephub";
import PrepItemActions from "./PrepItemActions.vue";
import PrepDialog from "./PrepDialog.vue";
import PrepItemForm from "./PrepItemForm.vue";
import PrepFormattedText from "./PrepFormattedText.vue";
import PrepAttachmentPicker from "./PrepAttachmentPicker.vue";
import PrepAttachmentViewer from "./PrepAttachmentViewer.vue";
import PrepPdfPreview from "./PrepPdfPreview.vue";
import {
  canPreviewPrepResource,
  prepResourceUrl,
  uploadPrepFiles,
  validatePrepFiles,
} from "~/lib/prephub-attachments";
const props = defineProps<{
  section: PrepSection;
  subjectId: string;
  timeZone: string;
  busy: boolean;
  mutate: PrepMutation;
  confirm: (action: () => Promise<boolean>) => void;
  review?: boolean;
  notebook?: boolean;
  hideHeading?: boolean;
  anchor?: boolean;
  readOnly?: boolean;
  resourceBase?: string;
  viewerResources?: PrepResource[];
  error?: string;
}>();
const emit = defineEmits<{ move: [direction: number] }>();
const { t } = useAppI18n();
const base = computed(() => `/sections/${props.section.id}`);
const editor = ref<PrepItem | null>();
const rename = ref<{ title: string; path: string } | null>(null);
const uploadError = ref("");
const uploadFiles = ref<File[]>([]);
const uploading = ref(false);
const uploadProgress = ref({ current: 0, total: 0 });
const previewId = ref<string | null>(null);
const failedPreviews = ref<string[]>([]);
const attachments = computed(
  () => props.viewerResources ?? props.section.resources,
);
let uploadVersion = 0;
watch(
  () => props.subjectId,
  () => {
    uploadVersion++;
    uploading.value = false;
    uploadFiles.value = [];
    previewId.value = null;
    failedPreviews.value = [];
  },
);
onBeforeUnmount(() => {
  uploadVersion++;
});
const itemActions = ref<string | null>(null);
const root = ref<HTMLElement | null>(null);
const editingTitle = ref<string | null>(null),
  draftTitle = ref(""),
  titleInput = ref<HTMLInputElement | null>(null);
const simpleTasks = computed(() =>
  ["CHECKLIST", "DELIVERABLES"].includes(props.section.type),
);
const compactChecklist = computed(
  () => props.notebook && props.section.type === "CHECKLIST",
);
async function startTitleEdit(item: PrepItem) {
  if (props.busy || props.readOnly || props.review) return;
  editingTitle.value = item.id;
  draftTitle.value = item.title;
  await nextTick();
  titleInput.value?.focus();
  titleInput.value?.select();
}
async function endTitleEdit(id: string) {
  editingTitle.value = null;
  await nextTick();
  root.value
    ?.querySelector<HTMLButtonElement>(`[data-prep-task-title="${id}"]`)
    ?.focus();
}
async function saveInlineTitle(item: PrepItem) {
  if (props.busy || !draftTitle.value.trim()) return;
  if (
    await props.mutate(`${base.value}/items/${item.id}`, "PATCH", {
      title: draftTitle.value.trim(),
    })
  )
    await endTitleEdit(item.id);
}
function answered(item: PrepItem) {
  return props.section.type === "RESEARCH"
    ? item.status === "ANSWERED"
    : item.isCompleted;
}
async function toggleItem(item: PrepItem) {
  await props.mutate(
    `${base.value}/items/${item.id}`,
    "PATCH",
    props.section.type === "RESEARCH"
      ? { status: answered(item) ? "TO_RESEARCH" : "ANSWERED" }
      : { isCompleted: !item.isCompleted },
  );
}
const shownItems = computed(() =>
  props.review &&
  !props.readOnly &&
  ["CHECKLIST", "DELIVERABLES"].includes(props.section.type)
    ? props.section.items.filter((i) => !i.isCompleted)
    : props.section.items,
);
const trackable = computed(() =>
  ["CHECKLIST", "DELIVERABLES", "QUESTIONS"].includes(props.section.type),
);
const completed = computed(
  () => props.section.items.filter((i) => i.isCompleted).length,
);
function date(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    timeZone: props.timeZone,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
async function saveItem(body: Record<string, unknown>) {
  const ok = await props.mutate(
    `${base.value}/items${editor.value ? `/${editor.value.id}` : ""}`,
    editor.value ? "PATCH" : "POST",
    body,
  );
  if (ok) editor.value = undefined;
  return ok;
}
async function moveItem(id: string, direction: number) {
  const ids = props.section.items.map((i) => i.id);
  const index = ids.indexOf(id),
    target = index + direction;
  if (target < 0 || target >= ids.length) return;
  [ids[index], ids[target]] = [ids[target]!, ids[index]!];
  await props.mutate(`${base.value}/items/reorder`, "PUT", { ids });
}
async function upload() {
  if (props.busy || uploading.value || !uploadFiles.value.length) return;
  uploadError.value = "";
  const invalid = validatePrepFiles(
    uploadFiles.value,
    attachments.value.length,
  );
  if (invalid) {
    uploadError.value = t(
      invalid === "count" ? "prephub.attachments.tooMany" : "prephub.fileHint",
    );
    return;
  }
  const version = ++uploadVersion;
  const subjectId = props.subjectId;
  const current = () =>
    version === uploadVersion && props.subjectId === subjectId;
  uploading.value = true;
  const total = uploadFiles.value.length;
  let completed = 0;
  try {
    await uploadPrepFiles(
      uploadFiles.value,
      (body) => {
        uploadProgress.value = { current: completed + 1, total };
        return props.mutate(`${base.value}/resources`, "POST", body);
      },
      {
        current,
        uploaded(file) {
          completed++;
          uploadFiles.value = uploadFiles.value.filter(
            (pending) => pending !== file,
          );
        },
      },
    );
  } catch {
    if (current()) uploadError.value = t("prephub.saveError");
  } finally {
    if (current()) uploading.value = false;
  }
}
function resourceUrl(resource: PrepResource, preview = false) {
  return prepResourceUrl(
    props.subjectId,
    resource.id,
    props.resourceBase,
    preview,
  );
}
async function saveRename() {
  if (
    rename.value &&
    (await props.mutate(rename.value.path, "PATCH", {
      title: rename.value.title,
    }))
  )
    rename.value = null;
}
</script>
<template>
  <section
    ref="root"
    :id="anchor === false ? undefined : `section-${section.id}`"
    :class="notebook ? 'scroll-mt-36' : 'prep-panel scroll-mt-24'"
    :aria-label="section.title"
  >
    <header
      v-if="!hideHeading"
      class="flex flex-wrap items-center justify-between gap-2"
      :class="
        notebook
          ? 'mb-3'
          : 'border-b border-slate-100 pb-3 dark:border-white/10'
      "
    >
      <div class="min-w-0">
        <p v-if="!notebook" class="text-xs text-slate-500">
          {{ t(`prephub.${section.type}`)
          }}<span v-if="trackable">
            · {{ completed }}/{{ section.items.length }}</span
          >
        </p>
        <div class="flex min-w-0 items-center gap-2">
          <component
            v-if="
              notebook &&
              ['ATTACHMENTS', 'LINKS', 'NOTES'].includes(section.type)
            "
            :is="section.type === 'LINKS' ? Link2 : FileText"
            class="size-5 shrink-0 text-slate-500"
            aria-hidden="true"
          />
          <h3 class="break-words text-sm font-semibold sm:text-base">
            {{ section.title }}
          </h3>
          <span
            v-if="
              notebook &&
              ['ATTACHMENTS', 'LINKS', 'NOTES'].includes(section.type)
            "
            class="prep-count"
            >{{
              t(
                section.type === "ATTACHMENTS"
                  ? section.resources.length === 1
                    ? "prephub.visual.oneFile"
                    : "prephub.visual.files"
                  : section.type === "LINKS"
                    ? section.items.length === 1
                      ? "prephub.visual.oneLink"
                      : "prephub.visual.links"
                    : "prephub.visual.items",
                {
                  count:
                    section.type === "ATTACHMENTS"
                      ? section.resources.length
                      : section.items.length,
                },
              )
            }}</span
          >
        </div>
      </div>
      <div
        v-if="!review && !readOnly && !notebook"
        class="flex items-center"
        :class="{ 'pointer-events-none opacity-50': busy }"
      >
        <button
          class="prep-icon"
          type="button"
          :aria-label="t('prephub.moveUp')"
          :disabled="busy"
          @click="emit('move', -1)"
        >
          <ArrowUp class="size-4" aria-hidden="true" /></button
        ><button
          class="prep-icon"
          type="button"
          :aria-label="t('prephub.moveDown')"
          :disabled="busy"
          @click="emit('move', 1)"
        >
          <ArrowDown class="size-4" aria-hidden="true" />
        </button>
        <button
          class="prep-icon"
          type="button"
          :aria-label="t('prephub.rename')"
          :disabled="busy"
          @click="rename = { title: section.title, path: base }"
        >
          <Pencil class="size-4" aria-hidden="true" /></button
        ><button
          class="prep-icon"
          type="button"
          :aria-label="t('prephub.delete')"
          :disabled="busy"
          @click="confirm(() => mutate(base, 'DELETE'))"
        >
          <Trash2 class="size-4" aria-hidden="true" />
        </button>
      </div>
    </header>
    <ol
      :class="
        compactChecklist
          ? 'prep-checklist-items'
          : notebook && section.type === 'DELIVERABLES'
            ? 'prep-deliverable-grid'
            : notebook && ['LINKS', 'NOTES'].includes(section.type)
              ? 'space-y-2'
              : 'divide-y divide-slate-100 dark:divide-white/10'
      "
    >
      <li
        v-for="(item, index) in shownItems"
        :key="item.id"
        :class="
          compactChecklist
            ? 'prep-checklist-item'
            : notebook && section.type === 'DELIVERABLES'
              ? 'prep-deliverable-row'
              : notebook && ['LINKS', 'NOTES'].includes(section.type)
                ? 'prep-material-row'
                : 'py-3'
        "
      >
        <div class="flex items-start gap-2">
          <span
            v-if="notebook && ['LINKS', 'NOTES'].includes(section.type)"
            class="prep-file-icon"
            :class="{ 'prep-file-icon--link': section.type === 'LINKS' }"
            aria-hidden="true"
            ><Link2 v-if="section.type === 'LINKS'" class="size-5" /><FileText
              v-else
              class="size-5" /></span
          ><span
            v-if="notebook && section.type === 'DELIVERABLES'"
            class="prep-deliverable-number"
            >{{ index + 1 }}</span
          >
          <label
            v-if="
              (trackable || (notebook && section.type === 'RESEARCH')) &&
              !review &&
              !readOnly
            "
            class="grid size-11 shrink-0 cursor-pointer place-items-center"
            :class="{ relative: compactChecklist }"
          >
            <input
              type="checkbox"
              :class="compactChecklist ? 'prep-check-input' : 'size-5'"
              :checked="answered(item)"
              :disabled="busy"
              :aria-label="`${t(['QUESTIONS', 'RESEARCH'].includes(section.type) ? 'prephub.notebook.markAnswered' : 'prephub.complete')}: ${item.title}`"
              @change="toggleItem(item)" /><Check
              v-if="compactChecklist"
              class="prep-check-mark"
              :stroke-width="3"
              aria-hidden="true"
          /></label>
          <span
            v-if="
              (trackable || (notebook && section.type === 'RESEARCH')) &&
              readOnly
            "
            class="grid size-11 shrink-0 place-items-center"
            :class="answered(item) ? 'text-emerald-600' : 'text-slate-400'"
          >
            <span
              v-if="compactChecklist"
              class="prep-check-static"
              :class="{ 'prep-check-static--done': answered(item) }"
            >
              <Check
                v-if="answered(item)"
                class="size-3.5"
                :stroke-width="3"
                aria-hidden="true"
              /> </span
            ><component
              v-else
              :is="answered(item) ? Check : Circle"
              class="size-5"
              aria-hidden="true"
            /><span class="sr-only">{{
              t(
                answered(item)
                  ? "prephub.completedRequirements"
                  : "prephub.remaining",
              )
            }}</span>
          </span>
          <span
            v-if="section.type === 'AGENDA'"
            class="mt-1 text-sm text-slate-400"
            >{{ index + 1 }}.</span
          >
          <div class="min-w-0 flex-1">
            <form
              v-if="editingTitle === item.id"
              class="space-y-2"
              @submit.prevent="saveInlineTitle(item)"
              @keydown.esc.stop.prevent="endTitleEdit(item.id)"
            >
              <label class="sr-only" :for="`edit-${item.id}`">{{
                t("prephub.notebook.task")
              }}</label
              ><input
                :id="`edit-${item.id}`"
                :ref="(el) => (titleInput = el as HTMLInputElement | null)"
                v-model="draftTitle"
                class="prep-input"
                required
                maxlength="300"
                :disabled="busy"
              />
              <div class="flex flex-wrap gap-2">
                <button
                  class="prep-button"
                  :disabled="busy || !draftTitle.trim()"
                >
                  {{ t("prephub.save") }}</button
                ><button
                  type="button"
                  class="prep-button"
                  :disabled="busy"
                  @click="endTitleEdit(item.id)"
                >
                  {{ t("prephub.cancel") }}
                </button>
              </div>
            </form>
            <button
              v-else-if="notebook && simpleTasks && !readOnly && !review"
              type="button"
              class="min-h-11 w-full break-words text-left text-sm font-medium"
              :class="{
                'prep-checklist-title': compactChecklist,
                'line-through opacity-60':
                  item.isCompleted && !compactChecklist,
              }"
              :disabled="busy"
              :aria-label="`${t('prephub.edit')}: ${item.title}`"
              :data-prep-task-title="item.id"
              @click="startTitleEdit(item)"
            >
              {{ item.title }}
            </button>
            <h3
              v-else
              class="break-words text-sm font-medium"
              :class="{
                'prep-checklist-title': compactChecklist,
                'line-through opacity-60':
                  !compactChecklist &&
                  (notebook ? simpleTasks : trackable) &&
                  item.isCompleted,
              }"
            >
              {{ item.title }}
            </h3>
            <p
              v-if="notebook && simpleTasks && !item.isRequired"
              class="text-xs text-slate-400"
            >
              {{ t("prephub.notebook.optionalTask") }}
            </p>
            <p
              v-if="section.type === 'RESEARCH'"
              class="mt-1 text-xs font-medium text-sky-700 dark:text-sky-300"
            >
              {{
                notebook
                  ? t(
                      answered(item)
                        ? "prephub.ANSWERED"
                        : "prephub.notebook.unanswered",
                    )
                  : t(`prephub.${item.status}`)
              }}
            </p>
            <p
              v-if="item.dueAt"
              class="mt-1 text-xs"
              :class="
                !item.isCompleted && new Date(item.dueAt).getTime() < Date.now()
                  ? 'text-red-600 dark:text-red-300'
                  : 'text-slate-500'
              "
            >
              {{ date(item.dueAt)
              }}<span v-if="item.isRequired">
                · {{ t("prephub.required") }}</span
              >
            </p>
            <a
              v-if="safeExternalUrl(item.url)"
              :href="safeExternalUrl(item.url)"
              target="_blank"
              rel="noopener noreferrer"
              class="mt-2 inline-flex min-h-11 max-w-full items-center gap-2 break-all text-sm text-sky-700 underline dark:text-sky-300"
              ><ExternalLink class="size-4 shrink-0" aria-hidden="true" />{{
                notebook ? item.url : item.label || item.url
              }}</a
            >
            <span
              v-if="notebook && section.type === 'LINKS' && item.label"
              class="prep-link-label"
              >{{ item.label }}</span
            >
            <div
              v-if="item.content"
              :class="
                notebook && section.type === 'LINKS'
                  ? 'prep-link-note'
                  : 'mt-2 text-slate-600 dark:text-white/70'
              "
            >
              <Info
                v-if="notebook && section.type === 'LINKS'"
                class="mt-0.5 size-4 shrink-0 text-sky-600 dark:text-sky-300"
                aria-hidden="true"
              /><PrepFormattedText :text="item.content" class="min-w-0" />
            </div>
            <template v-if="section.type === 'RESEARCH'"
              ><div
                v-for="key in ['objective', 'findings', 'conclusion'] as const"
                v-show="item[key]"
                :key="key"
                class="mt-3"
              >
                <h4 class="text-xs font-semibold text-slate-500">
                  {{ t(`prephub.${key}`) }}
                </h4>
                <PrepFormattedText :text="item[key]" />
              </div>
              <div v-if="item.sources" class="mt-3">
                <h4 class="text-xs font-semibold text-slate-500">
                  {{ t("prephub.sources") }}
                </h4>
                <div
                  v-for="(source, n) in item.sources
                    .split('\n')
                    .filter(Boolean)"
                  :key="n"
                  class="break-words text-sm"
                >
                  <a
                    v-if="safeExternalUrl(source.trim())"
                    :href="safeExternalUrl(source.trim())"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="inline-flex min-h-11 items-center break-all text-sky-700 underline dark:text-sky-300"
                    >{{ source }}</a
                  ><span v-else>{{ source }}</span>
                </div>
              </div></template
            >
            <button
              v-if="
                notebook &&
                !readOnly &&
                !review &&
                ['QUESTIONS', 'RESEARCH'].includes(section.type)
              "
              type="button"
              class="min-h-11 text-left text-sm font-semibold text-sky-700 dark:text-sky-300"
              :disabled="busy"
              @click="editor = item"
            >
              {{
                t(
                  section.type === "RESEARCH"
                    ? "prephub.notebook.editFindings"
                    : item.content
                      ? "prephub.notebook.editAnswer"
                      : "prephub.notebook.addAnswer",
                )
              }}
            </button>
          </div>
          <PrepItemActions
            v-if="notebook && !readOnly && !review"
            :title="item.title"
            :busy="busy"
            :first="index === 0"
            :last="index === section.items.length - 1"
            @edit="editor = item"
            @up="moveItem(item.id, -1)"
            @down="moveItem(item.id, 1)"
            @remove="
              confirm(() => mutate(`${base}/items/${item.id}`, 'DELETE'))
            "
          />
        </div>
        <div
          v-if="!review && !readOnly && !notebook"
          class="mt-2 flex justify-end"
        >
          <div
            :id="`${section.id}-${item.id}-actions`"
            class="items-center"
            :class="itemActions === item.id ? 'flex' : 'hidden sm:flex'"
          >
            <button
              class="prep-icon"
              type="button"
              :disabled="busy || index === 0"
              :aria-label="t('prephub.moveUp')"
              @click="moveItem(item.id, -1)"
            >
              <ArrowUp class="size-4" aria-hidden="true" /></button
            ><button
              class="prep-icon"
              type="button"
              :disabled="busy || index === section.items.length - 1"
              :aria-label="t('prephub.moveDown')"
              @click="moveItem(item.id, 1)"
            >
              <ArrowDown class="size-4" aria-hidden="true" /></button
            ><button
              class="prep-icon"
              type="button"
              :disabled="busy"
              :aria-label="t('prephub.delete')"
              @click="
                confirm(() => mutate(`${base}/items/${item.id}`, 'DELETE'))
              "
            >
              <Trash2 class="size-4" aria-hidden="true" />
            </button>
          </div>
          <button
            type="button"
            class="prep-button"
            :disabled="busy"
            @click="editor = item"
          >
            {{ t("prephub.edit") }}
          </button>
          <button
            type="button"
            class="prep-icon sm:hidden"
            :aria-label="`${t('ui.more')}: ${item.title}`"
            :aria-controls="`${section.id}-${item.id}-actions`"
            :aria-expanded="itemActions === item.id"
            @click="itemActions = itemActions === item.id ? null : item.id"
          >
            <MoreHorizontal class="size-4" aria-hidden="true" />
          </button>
        </div>
      </li>
    </ol>
    <ul v-if="section.type === 'ATTACHMENTS'" class="prep-file-gallery">
      <li
        v-for="file in section.resources"
        :key="file.id"
        class="prep-file-card group"
      >
        <div class="prep-file-cover">
          <PrepPdfPreview
            v-if="file.mimeType === 'application/pdf'"
            thumbnail
            :url="resourceUrl(file, true)"
          />
          <img
            v-else-if="
              file.mimeType.startsWith('image/') &&
              canPreviewPrepResource(file) &&
              !failedPreviews.includes(file.id)
            "
            :src="resourceUrl(file, true)"
            alt=""
            loading="lazy"
            referrerpolicy="no-referrer"
            class="size-full object-contain motion-safe:transition-transform motion-safe:duration-200 motion-safe:group-hover:scale-[1.02]"
            @error="failedPreviews.push(file.id)"
          />
          <component
            v-else
            :is="file.mimeType.startsWith('image/') ? FileImage : FileText"
            class="size-12 text-slate-400"
            aria-hidden="true"
          />
          <span
            class="pointer-events-none absolute left-3 top-3 rounded-md border border-white/20 bg-white/90 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-600 shadow-sm dark:bg-neutral-950/85 dark:text-white/70"
            aria-hidden="true"
            >{{ file.extension }}</span
          >
          <button
            v-if="canPreviewPrepResource(file)"
            type="button"
            class="absolute inset-0 size-full focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-sky-500"
            :aria-label="`${t('prephub.preview')}: ${file.title}`"
            @click="previewId = file.id"
          >
            <span
              class="absolute bottom-3 right-3 grid size-9 place-items-center rounded-full bg-black/65 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
              aria-hidden="true"
              ><Eye class="size-4"
            /></span>
          </button>
        </div>
        <div class="min-w-0 space-y-2 p-3">
          <p
            class="line-clamp-2 min-h-10 break-words text-sm font-medium leading-5"
            :title="file.title"
          >
            {{ file.title }}
          </p>
          <div class="flex flex-wrap items-center gap-1">
            <span
              class="min-w-0 grow basis-28 text-xs tabular-nums text-slate-500"
              >{{ file.extension.toUpperCase() }} ·
              {{ (file.fileSize / 1024).toFixed(1) }} KiB</span
            >
            <div class="ml-auto flex items-center gap-1">
              <a
                class="prep-icon"
                :href="resourceUrl(file)"
                :aria-label="`${t('prephub.download')}: ${file.title}`"
                :title="t('prephub.download')"
                ><Download class="size-4" aria-hidden="true"
              /></a>
              <PrepItemActions
                v-if="!review && !readOnly"
                :title="file.title"
                :busy="busy"
                :reorderable="false"
                :edit-label="t('prephub.rename')"
                @edit="
                  rename = { title: file.title, path: `/resources/${file.id}` }
                "
                @remove="
                  confirm(() => mutate(`/resources/${file.id}`, 'DELETE'))
                "
              />
            </div>
          </div>
        </div>
      </li>
    </ul>
    <p
      v-if="!section.items.length && !section.resources.length"
      class="py-4 text-sm text-slate-500"
    >
      {{ t("prephub.emptySection") }}
    </p>
    <template v-if="!review && !readOnly && !notebook"
      ><form
        v-if="section.type === 'ATTACHMENTS'"
        class="mt-3 space-y-3"
        @submit.prevent="upload"
      >
        <PrepAttachmentPicker
          v-model="uploadFiles"
          :busy="busy || uploading"
          :existing-count="attachments.length"
        />
        <p
          v-if="uploading"
          role="status"
          class="text-sm tabular-nums text-slate-500"
        >
          {{ t("prephub.attachments.uploading", uploadProgress) }}
        </p>
        <p v-if="uploadError" role="alert" class="text-sm text-red-600">
          {{ uploadError }}
        </p>
        <button
          class="prep-primary"
          :disabled="busy || uploading || !uploadFiles.length"
        >
          {{
            t(uploading ? "prephub.saving" : "prephub.attachments.uploadFiles")
          }}
        </button>
      </form>
      <button
        v-else
        type="button"
        class="prep-button mt-3"
        :disabled="busy"
        @click="editor = null"
      >
        <Plus class="size-4" aria-hidden="true" />{{ t("prephub.addItem") }}
      </button></template
    >
    <PrepAttachmentViewer
      v-if="previewId"
      :key="subjectId"
      :initial-id="previewId"
      :resources="attachments"
      :subject-id="subjectId"
      :resource-base="resourceBase"
      @close="previewId = null"
    />
    <PrepDialog
      v-if="!readOnly"
      :error="error"
      :open="editor !== undefined"
      :title="t(editor ? 'prephub.edit' : 'prephub.addItem')"
      :busy="busy"
      @close="editor = undefined"
      ><PrepItemForm
        :type="section.type"
        :item="editor ?? undefined"
        :time-zone="timeZone"
        :busy="busy"
        :simple="notebook"
        :submit="saveItem"
        @cancel="editor = undefined"
    /></PrepDialog>
    <PrepDialog
      v-if="!readOnly"
      :error="error"
      :open="Boolean(rename)"
      :title="t('prephub.rename')"
      :busy="busy"
      @close="rename = null"
      ><form v-if="rename" class="space-y-4" @submit.prevent="saveRename">
        <label class="prep-label"
          >{{ t("prephub.title")
          }}<input
            v-model="rename.title"
            class="prep-input"
            required
            :maxlength="
              rename.path.startsWith('/resources') ? 200 : 160
            " /></label
        ><button class="prep-primary" :disabled="busy || !rename.title.trim()">
          {{ t("prephub.save") }}
        </button>
      </form></PrepDialog
    >
  </section>
</template>
