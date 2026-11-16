<script setup lang="ts">
import { Home, ListTodo, Plus, Trophy, MoreHorizontal } from "lucide-vue-next";
import { TASK_VIEWS, type TaskView } from "~/lib/work-tasks";
const props = defineProps<{
  view: TaskView;
  path: string;
  busy?: boolean;
  ready: boolean;
}>();
const emit = defineEmits<{ create: [] }>();
const { t } = useAppI18n();
const menu = ref<HTMLDetailsElement | null>(null),
  typing = ref(false),
  route = useRoute();
const primary = [
  { key: "overview", icon: Home },
  { key: "tasks", icon: ListTodo },
  { key: "achievements", icon: Trophy },
] as const;
const more = TASK_VIEWS.filter(
  (key) => !primary.some((item) => item.key === key),
);
function close() {
  if (menu.value) menu.value.open = false;
}
function syncFocus() {
  void nextTick(() => {
    const field = document.activeElement;
    typing.value =
      field instanceof HTMLTextAreaElement ||
      (field instanceof HTMLInputElement &&
        !field.readOnly &&
        ![
          "checkbox",
          "radio",
          "button",
          "submit",
          "file",
          "color",
          "range",
          "hidden",
        ].includes(field.type)) ||
      (field instanceof HTMLElement && field.isContentEditable);
  });
}
function outside(event: PointerEvent) {
  if (event.target instanceof Node && !menu.value?.contains(event.target))
    close();
}
watch(() => route.fullPath, close);
onMounted(() => {
  document.addEventListener("focusin", syncFocus);
  document.addEventListener("focusout", syncFocus);
  document.addEventListener("pointerdown", outside);
});
onBeforeUnmount(() => {
  document.removeEventListener("focusin", syncFocus);
  document.removeEventListener("focusout", syncFocus);
  document.removeEventListener("pointerdown", outside);
});
</script>
<template>
  <nav
    v-if="!typing"
    data-tasks-mobile-navigation
    class="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-2 pt-1 backdrop-blur dark:border-white/10 dark:bg-neutral-950/95 lg:hidden"
    style="padding-bottom: max(0.25rem, env(safe-area-inset-bottom))"
    :aria-label="t('tasks.name')"
  >
    <div class="mx-auto grid max-w-lg grid-cols-5 gap-1">
      <template v-for="(item, index) in primary" :key="item.key"
        ><button
          v-if="index === 2"
          type="button"
          class="flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-semibold text-sky-700 disabled:opacity-50 dark:text-sky-300"
          :disabled="busy || !ready"
          aria-haspopup="dialog"
          @click="emit('create')"
        >
          <span
            class="grid size-8 place-items-center rounded-xl bg-sky-700 text-white"
            ><Plus class="size-5" aria-hidden="true" /></span
          >{{ t("tasks.create") }}</button
        ><NuxtLink
          :to="{ path, query: { view: item.key } }"
          class="flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500"
          :class="
            view === item.key
              ? 'bg-sky-50 text-sky-800 dark:bg-sky-900/30 dark:text-sky-200'
              : 'text-slate-500 dark:text-white/60'
          "
          :aria-current="view === item.key ? 'page' : undefined"
          ><component :is="item.icon" class="size-5" aria-hidden="true" /><span
            class="max-w-full truncate"
            >{{ t(`tasks.${item.key}`) }}</span
          ></NuxtLink
        ></template
      >
      <details ref="menu" class="relative" @keydown.esc.stop.prevent="close">
        <summary
          class="flex min-h-14 cursor-pointer list-none flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-semibold text-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500 dark:text-white/60 [&::-webkit-details-marker]:hidden"
        >
          <MoreHorizontal class="size-5" aria-hidden="true" />{{ t("ui.more") }}
        </summary>
        <div
          class="absolute bottom-full right-0 mb-3 grid max-h-[60dvh] w-60 max-w-[calc(100vw-1.5rem)] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-white/15 dark:bg-neutral-950"
        >
          <NuxtLink
            v-for="key in more"
            :key="key"
            :to="{ path, query: { view: key } }"
            class="min-h-11 content-center rounded-xl px-3 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-white/10"
            :aria-current="view === key ? 'page' : undefined"
            @click="close"
            >{{ t(`tasks.${key}`) }}</NuxtLink
          >
        </div>
      </details>
    </div>
  </nav>
</template>
