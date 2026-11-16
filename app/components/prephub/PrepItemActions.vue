<script setup lang="ts">
import { getDatePickerPosition } from "~/lib/date-picker-position";
import {
  MoreHorizontal,
  ArrowUp,
  ArrowDown,
  Pencil,
  Trash2,
} from "lucide-vue-next";
defineProps<{ title: string; busy?: boolean; first: boolean; last: boolean }>();
const emit = defineEmits<{ edit: []; up: []; down: []; remove: [] }>();
const { t } = useAppI18n();
const menu = ref<HTMLDetailsElement | null>(null),
  trigger = ref<HTMLElement | null>(null);
const panel = ref<HTMLElement | null>(null),
  panelStyle = ref<Record<string, string>>({});
function close(restore = true) {
  panel.value?.hidePopover?.();
  if (menu.value) menu.value.open = false;
  if (restore) trigger.value?.focus();
  cleanup();
}
function outside(event: PointerEvent) {
  if (event.target instanceof Node && !menu.value?.contains(event.target))
    close(false);
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
onBeforeUnmount(cleanup);
</script>
<template>
  <details
    ref="menu"
    class="relative shrink-0"
    @toggle="toggle"
    @keydown.esc.stop.prevent="close()"
  >
    <summary
      ref="trigger"
      class="prep-icon cursor-pointer list-none [&::-webkit-details-marker]:hidden"
      :aria-label="`${t('ui.more')}: ${title}`"
    >
      <MoreHorizontal class="size-4" aria-hidden="true" />
    </summary>
    <div
      ref="panel"
      popover="manual"
      :style="panelStyle"
      class="fixed inset-auto z-[10000] m-0 grid w-52 max-w-[calc(100vw-3rem)] overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg dark:border-white/15 dark:bg-neutral-950"
      @click="close()"
    >
      <button
        type="button"
        class="prep-menu-item"
        :disabled="busy"
        @click="emit('edit')"
      >
        <Pencil class="size-4" aria-hidden="true" />{{
          t("prephub.notebook.editDetails")
        }}</button
      ><button
        type="button"
        class="prep-menu-item"
        :disabled="busy || first"
        @click="emit('up')"
      >
        <ArrowUp class="size-4" aria-hidden="true" />{{
          t("prephub.moveUp")
        }}</button
      ><button
        type="button"
        class="prep-menu-item"
        :disabled="busy || last"
        @click="emit('down')"
      >
        <ArrowDown class="size-4" aria-hidden="true" />{{
          t("prephub.moveDown")
        }}</button
      ><button
        type="button"
        class="prep-menu-item text-red-600 dark:text-red-300"
        :disabled="busy"
        @click="emit('remove')"
      >
        <Trash2 class="size-4" aria-hidden="true" />{{ t("prephub.delete") }}
      </button>
    </div>
  </details>
</template>
