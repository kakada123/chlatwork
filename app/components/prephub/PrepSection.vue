<script setup lang="ts">
import {
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
  error?: string;
}>();
const emit = defineEmits<{ move: [direction: number] }>();
const { t } = useAppI18n();
const base = computed(() => `/sections/${props.section.id}`);
const editor = ref<PrepItem | null>();
const rename = ref<{ title: string; path: string } | null>(null);
const uploadError = ref("");
const itemActions = ref<string | null>(null);
const shownItems = computed(() =>
  props.review && ["CHECKLIST", "DELIVERABLES"].includes(props.section.type)
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
  return `/api/prephub/subjects/${props.subjectId}/resources/${resource.id}${preview ? "?preview=1" : ""}`;
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
    :id="`section-${section.id}`"
    class="prep-panel scroll-mt-24"
    :aria-label="section.title"
  >
    <header
      class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-white/10"
    >
      <div class="min-w-0">
        <p class="text-xs text-slate-500">
          {{ t(`prephub.${section.type}`)
          }}<span v-if="trackable">
            · {{ completed }}/{{ section.items.length }}</span
          >
        </p>
        <h2 class="break-words text-base font-semibold">{{ section.title }}</h2>
      </div>
      <div
        v-if="!review"
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
    <ol class="divide-y divide-slate-100 dark:divide-white/10">
      <li v-for="(item, index) in shownItems" :key="item.id" class="py-3">
        <div class="flex items-start gap-2">
          <label
            v-if="trackable && !review"
            class="grid size-11 shrink-0 cursor-pointer place-items-center"
          >
            <input
              type="checkbox"
              class="size-5"
              :checked="item.isCompleted"
              :disabled="busy"
              :aria-label="`${t('prephub.complete')}: ${item.title}`"
              @change="
                mutate(`${base}/items/${item.id}`, 'PATCH', {
                  isCompleted: !item.isCompleted,
                })
              "
          /></label>
          <span
            v-if="section.type === 'AGENDA'"
            class="mt-1 text-sm text-slate-400"
            >{{ index + 1 }}.</span
          >
          <div class="min-w-0 flex-1">
            <h3
              class="break-words font-medium"
              :class="{
                'line-through opacity-60': trackable && item.isCompleted,
              }"
            >
              {{ item.title }}
            </h3>
            <p
              v-if="section.type === 'RESEARCH'"
              class="mt-1 text-xs font-medium text-sky-700 dark:text-sky-300"
            >
              {{ t(`prephub.${item.status}`) }}
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
                item.label || item.url
              }}</a
            >
            <PrepFormattedText
              v-if="item.content"
              class="mt-2 text-slate-600 dark:text-white/70"
              :text="item.content"
            />
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
          </div>
        </div>
        <div v-if="!review" class="mt-2 flex justify-end">
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
    <ul
      v-if="section.type === 'ATTACHMENTS'"
      class="divide-y divide-slate-100 dark:divide-white/10"
    >
      <li
        v-for="file in section.resources"
        :key="file.id"
        class="flex flex-wrap items-center justify-between gap-2 py-3"
      >
        <div class="min-w-0">
          <p class="break-words text-sm font-medium">{{ file.title }}</p>
          <p class="text-xs text-slate-500">
            {{ file.extension.toUpperCase() }} ·
            {{ (file.fileSize / 1024).toFixed(1) }} KiB
          </p>
        </div>
        <div class="flex flex-wrap gap-1">
          <a class="prep-button" :href="resourceUrl(file)"
            ><Download class="size-4" aria-hidden="true" />{{
              t("prephub.download")
            }}</a
          ><a
            v-if="
              [
                'application/pdf',
                'image/png',
                'image/jpeg',
                'image/webp',
              ].includes(file.mimeType)
            "
            class="prep-button"
            :href="resourceUrl(file, true)"
            target="_blank"
            rel="noopener noreferrer"
            >{{ t("prephub.preview") }}</a
          ><template v-if="!review"
            ><button
              type="button"
              class="prep-icon"
              :disabled="busy"
              :aria-label="t('prephub.rename')"
              @click="
                rename = { title: file.title, path: `/resources/${file.id}` }
              "
            >
              <Pencil class="size-4" aria-hidden="true" /></button
            ><button
              type="button"
              class="prep-icon"
              :disabled="busy"
              :aria-label="t('prephub.delete')"
              @click="confirm(() => mutate(`/resources/${file.id}`, 'DELETE'))"
            >
              <Trash2 class="size-4" aria-hidden="true" /></button
          ></template>
        </div>
      </li>
    </ul>
    <p
      v-if="!section.items.length && !section.resources.length"
      class="py-4 text-sm text-slate-500"
    >
      {{ t("prephub.emptySection") }}
    </p>
    <template v-if="!review"
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
        :submit="saveItem"
        @cancel="editor = undefined"
    /></PrepDialog>
    <PrepDialog
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
