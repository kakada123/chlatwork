<script setup lang="ts">
import {
  ArrowRight,
  ClipboardList,
  FolderOpen,
  MessageCircle,
} from "lucide-vue-next";
import {
  notebookGroups,
  type PrepSection as Section,
  type PrepType,
  type PrepMutation,
  type PrepNotebookArea,
} from "~/lib/prephub";
import PrepSection from "./PrepSection.vue";
const props = defineProps<{
  sections: Section[];
  subjectId: string;
  timeZone: string;
  busy?: boolean;
  error?: string;
  mutate: PrepMutation;
  confirm: (action: () => Promise<boolean>) => void;
  createTask?: (title: string, sectionId?: string) => Promise<boolean>;
  readOnly?: boolean;
  review?: boolean;
  resourceBase?: string;
}>();
const emit = defineEmits<{ context: [type: PrepType, sectionId?: string] }>();
const { t } = useAppI18n();
const groups = computed(() => notebookGroups(props.sections));
const content = computed(() => ({
  checklist: groups.value.checklist.filter(hasContent),
  materials: groups.value.materials.filter(hasContent),
  questions: groups.value.questions.filter(hasContent),
}));
const taskTitle = ref(""),
  taskTarget = ref<string>(),
  taskInput = ref<HTMLInputElement | null>(null);
const areas = [
  { key: "checklist", type: "CHECKLIST", icon: ClipboardList },
  { key: "materials", type: "NOTES", icon: FolderOpen },
  { key: "questions", type: "QUESTIONS", icon: MessageCircle },
] as const;
function hasContent(section: Section) {
  return section.items.length > 0 || section.resources.length > 0;
}
function context(area: PrepNotebookArea) {
  const type =
    area === "checklist"
      ? "CHECKLIST"
      : area === "materials"
        ? "NOTES"
        : "QUESTIONS";
  emit("context", type);
}
async function focusTask(sectionId?: string) {
  taskTarget.value = groups.value.checklist.some((s) => s.id === sectionId)
    ? sectionId
    : undefined;
  await nextTick();
  taskInput.value?.focus();
  taskInput.value?.scrollIntoView({ block: "nearest" });
}
async function saveTask() {
  if (props.busy || !taskTitle.value.trim() || !props.createTask) return;
  if (await props.createTask(taskTitle.value.trim(), taskTarget.value)) {
    taskTitle.value = "";
    await nextTick();
    taskInput.value?.focus();
  }
}
defineExpose({ focusTask });
</script>
<template>
  <div class="space-y-4">
    <nav
      class="flex gap-2 overflow-x-auto pb-1"
      :aria-label="t('prephub.notebook.contents')"
    >
      <template v-for="area in areas" :key="area.key"
        ><a
          v-if="area.key !== 'questions' || content.questions.length"
          :href="`#prep-${area.key}`"
          class="prep-button shrink-0 bg-white dark:bg-neutral-950"
          @click="context(area.key)"
          ><component :is="area.icon" class="size-4" aria-hidden="true" />{{
            t(`prephub.notebook.${area.key}`)
          }}</a
        ></template
      >
    </nav>
    <template v-for="area in areas" :key="area.key">
      <section
        v-if="area.key !== 'questions' || content.questions.length"
        :id="`prep-${area.key}`"
        class="prep-panel scroll-mt-36"
        :aria-label="t(`prephub.notebook.${area.key}`)"
      >
        <h2 class="mb-3 flex items-center gap-2 font-semibold">
          <component
            :is="area.icon"
            class="size-4 text-slate-400"
            aria-hidden="true"
          />{{ t(`prephub.notebook.${area.key}`) }}
        </h2>
        <div class="space-y-4">
          <div
            v-for="section in content[area.key]"
            :key="section.id"
            @focusin="emit('context', section.type, section.id)"
            @pointerdown="emit('context', section.type, section.id)"
          >
            <PrepSection
              :section="section"
              :subject-id="subjectId"
              :time-zone="timeZone"
              :busy="Boolean(busy)"
              :error="error"
              :mutate="mutate"
              :confirm="confirm"
              :read-only="readOnly"
              :review="review"
              :resource-base="resourceBase"
              notebook
            />
          </div>
        </div>
        <p
          v-if="!content[area.key].length"
          class="text-sm leading-relaxed text-slate-500"
        >
          {{
            t(
              area.key === "checklist"
                ? review
                  ? "prephub.notebook.noUnfinishedTasks"
                  : "prephub.notebook.emptyChecklist"
                : "prephub.notebook.emptyMaterials",
            )
          }}
        </p>
        <form
          v-if="area.key === 'checklist' && !readOnly && !review && createTask"
          class="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3 dark:border-white/10"
          @submit.prevent="saveTask"
        >
          <label class="min-w-0 flex-1"
            ><span class="sr-only">{{ t("prephub.notebook.task") }}</span
            ><input
              :ref="(el) => (taskInput = el as HTMLInputElement | null)"
              v-model="taskTitle"
              class="prep-input !mt-0"
              maxlength="300"
              required
              :disabled="busy"
              :placeholder="t('prephub.notebook.taskPlaceholder')" /></label
          ><button
            type="submit"
            class="prep-icon text-sky-700 dark:text-sky-300"
            :disabled="busy || !taskTitle.trim()"
            :aria-label="t('prephub.notebook.saveTask')"
          >
            <ArrowRight class="size-5" aria-hidden="true" />
          </button>
        </form>
      </section>
    </template>
  </div>
</template>
