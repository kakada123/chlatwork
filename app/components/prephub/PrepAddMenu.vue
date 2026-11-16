<script setup lang="ts">
import { getDatePickerPosition } from "~/lib/date-picker-position";
import {
  Plus,
  ListTodo,
  FileText,
  Paperclip,
  Link2,
  MessageCircle,
  Bell,
} from "lucide-vue-next";
import type { PrepType } from "~/lib/prephub";
const props = defineProps<{ busy?: boolean; defaultType?: PrepType }>();
const emit = defineEmits<{
  select: [type: PrepType | "REMINDER"];
  opening: [];
}>();
const { t } = useAppI18n();
const menu = ref<HTMLDetailsElement | null>(null),
  trigger = ref<HTMLElement | null>(null);
const panel = ref<HTMLElement | null>(null),
  panelStyle = ref<Record<string, string>>({});
const choices = [
  { type: "CHECKLIST", key: "task", icon: ListTodo },
  { type: "NOTES", key: "note", icon: FileText },
  { type: "ATTACHMENTS", key: "file", icon: Paperclip },
  { type: "LINKS", key: "link", icon: Link2 },
  { type: "QUESTIONS", key: "question", icon: MessageCircle },
  { type: "REMINDER", key: "reminder", icon: Bell },
] as const;
const ordered = computed(() => {
  const type =
    props.defaultType === "DELIVERABLES"
      ? "CHECKLIST"
      : props.defaultType === "RESEARCH"
        ? "QUESTIONS"
        : props.defaultType === "AGENDA"
          ? "NOTES"
          : props.defaultType;
  return [
    ...choices.filter((c) => c.type === type),
    ...choices.filter((c) => c.type !== type),
  ];
});
function close(restore = false) {
  panel.value?.hidePopover?.();
  if (menu.value) menu.value.open = false;
  if (restore) trigger.value?.focus();
  cleanup();
}
function outside(event: PointerEvent) {
  if (event.target instanceof Node && !menu.value?.contains(event.target))
    close();
}
function cleanup() {
  document.removeEventListener("pointerdown", outside);
  window.removeEventListener("resize", position);
  window.removeEventListener("scroll", position, true);
}
function position() {
  if (!menu.value?.open || !trigger.value || !panel.value) return;
  // Reuse the picker placement rules to flip/clamp menus in short viewports and dialogs.
  const next = getDatePickerPosition(
    trigger.value.getBoundingClientRect(),
    { width: panel.value.offsetWidth, height: panel.value.scrollHeight },
    { width: document.documentElement.clientWidth, height: window.innerHeight },
    "bottom",
    window.innerWidth < 640,
  );
  panelStyle.value = {
    top: `${next.top}px`,
    left: `${next.left}px`,
    maxHeight: `${next.maxHeight}px`,
  };
}
async function toggle() {
  cleanup();
  if (!menu.value?.open) {
    panel.value?.hidePopover?.();
    return;
  }
  emit("opening");
  await nextTick();
  if (!menu.value?.open) return;
  panel.value?.showPopover?.();
  position();
  panel.value
    ?.querySelector<HTMLButtonElement>("button:not(:disabled)")
    ?.focus();
  document.addEventListener("pointerdown", outside);
  window.addEventListener("resize", position);
  window.addEventListener("scroll", position, true);
}
function choose(type: PrepType | "REMINDER") {
  if (props.busy) return;
  close();
  emit(
    "select",
    type === "CHECKLIST" && props.defaultType === "DELIVERABLES"
      ? "DELIVERABLES"
      : type === "QUESTIONS" && props.defaultType === "RESEARCH"
        ? "RESEARCH"
        : type === "NOTES" && props.defaultType === "AGENDA"
          ? "AGENDA"
          : type,
  );
}
onBeforeUnmount(cleanup);
</script>
<template>
  <details
    ref="menu"
    class="relative"
    @toggle="toggle"
    @keydown.esc.stop.prevent="close(true)"
  >
    <summary
      ref="trigger"
      class="prep-primary cursor-pointer list-none [&::-webkit-details-marker]:hidden"
      :aria-disabled="busy || undefined"
    >
      <Plus class="size-4" aria-hidden="true" />{{ t("prephub.notebook.add") }}
    </summary>
    <div
      ref="panel"
      popover="manual"
      :style="panelStyle"
      class="fixed inset-auto z-[10000] m-0 grid w-72 max-w-[calc(100vw-3rem)] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-white/15 dark:bg-neutral-950"
    >
      <button
        v-for="choice in ordered"
        :key="choice.type"
        type="button"
        class="prep-menu-item"
        :disabled="busy"
        @click="choose(choice.type)"
      >
        <component
          :is="choice.icon"
          class="size-4 shrink-0 text-slate-400"
          aria-hidden="true"
        /><span
          ><span class="block font-semibold">{{
            t(`prephub.notebook.${choice.key}`)
          }}</span
          ><span class="mt-0.5 block text-xs text-slate-500">{{
            t(`prephub.notebook.${choice.key}Hint`)
          }}</span></span
        >
      </button>
    </div>
  </details>
</template>
