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
  error?: string;
}>();
const emit = defineEmits<{ move: [direction: number] }>();
const { t } = useAppI18n();
const base = computed(() => `/sections/${props.section.id}`);
const editor = ref<PrepItem | null>();
const rename = ref<{ title: string; path: string } | null>(null);
const uploadError = ref("");
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
async function upload(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  uploadError.value = "";
  if (!file) return;
  if (file.size > 5 * 1024 * 1024 || !file.size) {
    uploadError.value = t("prephub.fileHint");
    input.value = "";
    return;
  }
  const body = new FormData();
  body.append("file", file);
  await props.mutate(`${base.value}/resources`, "POST", body);
  input.value = "";
}
function resourceUrl(resource: PrepResource, preview = false) {
  return `${props.resourceBase ?? `/api/prephub/subjects/${props.subjectId}/resources`}/${resource.id}${preview ? "?preview=1" : ""}`;
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
    <ul v-if="section.type === 'ATTACHMENTS'" class="prep-file-list">
      <li
        v-for="file in section.resources"
        :key="file.id"
        class="prep-file-row"
      >
        <div class="flex min-w-0 items-center gap-3">
          <span
            class="prep-file-icon"
            :class="
              file.mimeType.startsWith('image/')
                ? 'prep-file-icon--image'
                : file.extension === 'pdf'
                  ? 'prep-file-icon--pdf'
                  : ''
            "
            aria-hidden="true"
            ><FileImage
              v-if="file.mimeType.startsWith('image/')"
              class="size-6" /><span
              v-else-if="file.extension === 'pdf'"
              class="text-[10px] font-bold"
              >PDF</span
            ><FileText v-else class="size-6"
          /></span>
          <div class="min-w-0">
            <p
              class="line-clamp-2 break-words text-sm font-semibold md:line-clamp-1"
              :title="file.title"
            >
              {{ file.title }}
            </p>
            <p class="mt-1 text-xs text-slate-500">
              {{ file.extension.toUpperCase() }} ·
              {{ (file.fileSize / 1024).toFixed(1) }} KiB
            </p>
          </div>
        </div>
        <div class="prep-file-actions">
          <a
            class="prep-button prep-file-action"
            :href="resourceUrl(file)"
            :aria-label="`${t('prephub.download')}: ${file.title}`"
            ><Download class="size-4 shrink-0" aria-hidden="true" /><span
              class="truncate"
              >{{ t("prephub.download") }}</span
            ></a
          >
          <a
            v-if="
              [
                'application/pdf',
                'image/png',
                'image/jpeg',
                'image/webp',
              ].includes(file.mimeType)
            "
            class="prep-button prep-file-action"
            :href="resourceUrl(file, true)"
            :aria-label="`${t('prephub.preview')}: ${file.title}`"
            target="_blank"
            rel="noopener noreferrer"
            ><Eye class="size-4 shrink-0" aria-hidden="true" /><span
              class="truncate"
              >{{ t("prephub.preview") }}</span
            ></a
          >
          <template v-if="!review && !readOnly"
            ><div class="hidden gap-1 md:flex">
              <button
                type="button"
                class="prep-icon border border-slate-200 dark:border-white/15"
                :disabled="busy"
                :aria-label="`${t('prephub.rename')}: ${file.title}`"
                @click="
                  rename = { title: file.title, path: `/resources/${file.id}` }
                "
              >
                <Pencil class="size-4" aria-hidden="true" /></button
              ><button
                type="button"
                class="prep-icon border border-slate-200 dark:border-white/15"
                :disabled="busy"
                :aria-label="`${t('prephub.delete')}: ${file.title}`"
                @click="
                  confirm(() => mutate(`/resources/${file.id}`, 'DELETE'))
                "
              >
                <Trash2 class="size-4" aria-hidden="true" />
              </button>
            </div>
            <PrepItemActions
              class="md:hidden"
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
          /></template>
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
      ><div v-if="section.type === 'ATTACHMENTS'" class="mt-3">
        <label class="prep-label"
          >{{ t("prephub.upload")
          }}<input
            type="file"
            class="prep-input"
            accept=".pdf,.png,.jpg,.jpeg,.webp,.docx,.pptx,.xlsx,.txt"
            :disabled="busy"
            @change="upload"
        /></label>
        <p class="mt-2 text-xs text-slate-500">{{ t("prephub.fileHint") }}</p>
        <p v-if="uploadError" role="alert" class="text-sm text-red-600">
          {{ uploadError }}
        </p>
      </div>
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
