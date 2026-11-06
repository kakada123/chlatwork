<script setup lang="ts">
import { useAppI18n } from "~/composables/useAppI18n";
import { Bell, Brain, Check, ListTodo, Search, X } from "lucide-vue-next";
import { useLanguage } from "~/composables/useLanguage";

const { t } = useAppI18n();

const { isKhmer } = useLanguage();
definePageMeta({ middleware: "auth" });
useSeoMeta({
  title: () => t("shared.pages_personal.personal_assistant_chlat_work"),
  robots: "noindex, nofollow",
});

type TaskStatus = "OPEN" | "COMPLETED" | "CANCELLED";
type ReminderStatus =
  "PENDING" | "PROCESSING" | "SENT" | "CANCELLED" | "FAILED";
interface PersonalTask {
  id: string;
  title: string;
  subject?: string;
  status: TaskStatus;
  createdAt: string;
}
interface PersonalReminder {
  id: string;
  message: string;
  remindAt: string;
  status: ReminderStatus;
}
interface PersonalMemory {
  id: string;
  content: string;
  subject?: string;
  category?: string;
  createdAt: string;
}

const tab = ref<"tasks" | "reminders" | "memories">("tasks");
const memoryQuery = ref("");
const actionError = ref("");
const busyId = ref("");
const { data: tasks, refresh: refreshTasks } = await useFetch<PersonalTask[]>(
  "/api/personal/tasks",
  { default: () => [] },
);
const { data: reminders, refresh: refreshReminders } = await useFetch<
  PersonalReminder[]
>("/api/personal/reminders", { default: () => [] });
const { data: memories, refresh: refreshMemories } = await useFetch<
  PersonalMemory[]
>("/api/personal/memories", { default: () => [] });

const shownMemories = computed(() => {
  const query = memoryQuery.value.trim().toLocaleLowerCase();
  if (!query) return memories.value;
  return memories.value.filter((item) =>
    [item.content, item.subject, item.category].some((value) =>
      value?.toLocaleLowerCase().includes(query),
    ),
  );
});

function localDate(value: string) {
  return new Intl.DateTimeFormat(isKhmer.value ? "km-KH" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

async function completeTask(id: string) {
  busyId.value = id;
  actionError.value = "";
  try {
    await $fetch(`/api/personal/tasks/${encodeURIComponent(id)}/complete`, {
      method: "PATCH",
    });
    await Promise.all([refreshTasks(), refreshReminders()]);
  } catch {
    actionError.value = t("shared.pages_personal.could_not_complete_that_task_please_try_again");
  } finally {
    busyId.value = "";
  }
}

async function cancelReminder(id: string) {
  busyId.value = id;
  actionError.value = "";
  try {
    await $fetch(`/api/personal/reminders/${encodeURIComponent(id)}/cancel`, {
      method: "PATCH",
    });
    await refreshReminders();
  } catch {
    actionError.value = t("shared.pages_personal.could_not_cancel_that_reminder_please_try_again");
  } finally {
    busyId.value = "";
  }
}
</script>

<template>
  <main class="mx-auto min-h-screen max-w-4xl px-4 pb-24 pt-6 sm:px-6">
    <header class="mb-6">
      <p class="text-sm font-semibold text-violet-600 dark:text-violet-300">
        {{ t("shared.pages_personal.personal") }}
      </p>
      <h1 class="text-2xl font-bold text-slate-950 dark:text-white">
        {{ t("shared.pages_personal.memory_reminder_assistant") }}
      </h1>
      <p class="mt-2 text-sm text-slate-600 dark:text-slate-300">
        {{ t("shared.pages_personal.talk_naturally_to_the_chlat_work_telegram_bot_to") }}
      </p>
    </header>

    <nav
      class="mb-5 grid grid-cols-3 gap-2 rounded-2xl bg-slate-100 p-1 dark:bg-slate-900"
      :aria-label="t(&quot;shared.pages_personal.personal_assistant_sections&quot;)"
    >
      <button
        v-for="item in [
          { key: 'tasks', label: t(&quot;shared.pages_personal.tasks&quot;), icon: ListTodo },
          { key: 'reminders', label: t(&quot;shared.pages_personal.reminders&quot;), icon: Bell },
          { key: 'memories', label: t(&quot;shared.pages_personal.memories&quot;), icon: Brain },
        ]"
        :key="item.key"
        type="button"
        class="flex min-h-11 items-center justify-center gap-2 rounded-xl px-2 text-sm font-semibold transition"
        :class="
          tab === item.key
            ? 'bg-white text-violet-700 shadow-sm dark:bg-slate-800 dark:text-violet-200'
            : 'text-slate-500 dark:text-slate-400'
        "
        @click="tab = item.key as typeof tab"
      >
        <component :is="item.icon" class="size-4" aria-hidden="true" />{{
          item.label
        }}
      </button>
    </nav>

    <p
      v-if="actionError"
      class="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-200"
    >
      {{ actionError }}
    </p>

    <section v-if="tab === 'tasks'" class="space-y-3">
      <article
        v-for="task in tasks"
        :key="task.id"
        class="flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950"
      >
        <div>
          <p class="font-semibold text-slate-900 dark:text-white">
            {{ task.title }}
          </p>
          <p class="mt-1 text-xs text-slate-500">
            {{ task.subject || "Personal task" }} ·
            {{ localDate(task.createdAt) }} · {{ task.status.toLowerCase() }}
          </p>
        </div>
        <button
          v-if="task.status === 'OPEN'"
          type="button"
          class="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700 disabled:opacity-50 dark:bg-emerald-950/50 dark:text-emerald-300"
          :disabled="busyId === task.id"
          :aria-label="t(&quot;shared.pages_personal.mark_task_complete&quot;)"
          @click="completeTask(task.id)"
        >
          <Check class="size-5" />
        </button>
      </article>
      <p
        v-if="!tasks.length"
        class="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700"
      >
        {{ t("shared.pages_personal.no_tasks_yet") }}
      </p>
    </section>

    <section v-else-if="tab === 'reminders'" class="space-y-3">
      <article
        v-for="reminder in reminders"
        :key="reminder.id"
        class="flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950"
      >
        <div>
          <p class="font-semibold text-slate-900 dark:text-white">
            {{ reminder.message }}
          </p>
          <p class="mt-1 text-xs text-slate-500">
            {{ localDate(reminder.remindAt) }} ·
            {{ reminder.status.toLowerCase() }}
          </p>
        </div>
        <button
          v-if="reminder.status === 'PENDING'"
          type="button"
          class="grid size-10 shrink-0 place-items-center rounded-xl bg-red-50 text-red-700 disabled:opacity-50 dark:bg-red-950/50 dark:text-red-300"
          :disabled="busyId === reminder.id"
          :aria-label="t(&quot;shared.pages_personal.cancel_reminder&quot;)"
          @click="cancelReminder(reminder.id)"
        >
          <X class="size-5" />
        </button>
      </article>
      <p
        v-if="!reminders.length"
        class="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700"
      >
        {{ t("shared.pages_personal.no_reminders_yet") }}
      </p>
    </section>

    <section v-else class="space-y-3">
      <label class="relative block"
        ><Search
          class="absolute left-3 top-3 size-5 text-slate-400"
          aria-hidden="true" /><input
          v-model="memoryQuery"
          type="search"
          maxlength="300"
          :placeholder="t(&quot;shared.pages_personal.search_memories&quot;)"
          class="h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3 text-sm outline-none focus:border-violet-500 dark:border-slate-700 dark:bg-slate-950"
      /></label>
      <article
        v-for="memory in shownMemories"
        :key="memory.id"
        class="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950"
      >
        <p class="font-semibold text-slate-900 dark:text-white">
          {{ memory.content }}
        </p>
        <p class="mt-1 text-xs text-slate-500">
          {{
            [memory.subject, memory.category].filter(Boolean).join(" · ") ||
            localDate(memory.createdAt)
          }}
        </p>
      </article>
      <p
        v-if="!shownMemories.length"
        class="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700"
      >
        {{ t("shared.pages_personal.no_matching_memories") }}
      </p>
    </section>
  </main>
</template>
