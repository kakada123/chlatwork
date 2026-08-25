<script setup lang="ts">
import {
  CalendarClock,
  ExternalLink,
  Images,
  Plus,
  Trash2,
} from "lucide-vue-next";
import MomentLanguageToggle from "~/components/moments/MomentLanguageToggle.vue";
import { getMomentOccasion } from "~/data/moments";
import type { MomentOccasion, MomentTheme } from "~/types/moment";

definePageMeta({ middleware: "auth" });

type MomentSummary = {
  id: string;
  slug: string;
  recipientName: string;
  occasion: MomentOccasion;
  title: string;
  theme: MomentTheme;
  status: "DRAFT" | "PUBLISHED";
  publishAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  _count: { media: number };
};

const { locale, copy, isKhmer, localizeMomentPath } = useMomentLanguage();
const managerCopy = computed(() => copy.value.manager);

useSeoMeta({
  title: () => `${managerCopy.value.title} | ChlatWork`,
  description: () => managerCopy.value.description,
  robots: "noindex, nofollow",
});
const { data, status, error } =
  await useFetch<MomentSummary[]>("/api/moments/mine");
const moments = computed(() => data.value ?? []);
const deletingId = ref("");
const deleteError = ref("");

function formatDate(value: string) {
  return new Intl.DateTimeFormat(locale.value === "km" ? "km-KH" : undefined, {
    dateStyle: "medium",
  }).format(new Date(value));
}

function statusKind(moment: MomentSummary) {
  if (moment.status === "DRAFT") return "draft";
  if (moment.publishAt && new Date(moment.publishAt) > new Date())
    return "scheduled";
  return "published";
}

function statusLabel(moment: MomentSummary) {
  return managerCopy.value[statusKind(moment)];
}

async function removeMoment(moment: MomentSummary) {
  if (!window.confirm(managerCopy.value.deleteConfirm(moment.title)))
    return;
  deletingId.value = moment.id;
  deleteError.value = "";
  try {
    await $fetch(`/api/moments/${moment.id}`, { method: "DELETE" });
    data.value = moments.value.filter((item) => item.id !== moment.id);
  } catch {
    deleteError.value = managerCopy.value.deleteError;
  } finally {
    deletingId.value = "";
  }
}
</script>

<template>
  <div
    class="moments-manager mx-auto max-w-5xl"
    :class="{ 'is-khmer': isKhmer }"
    :lang="isKhmer ? 'km' : 'en'"
  >
    <header
      class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
    >
      <div>
        <p
          class="text-xs font-bold uppercase tracking-[.16em] text-rose-600 dark:text-rose-300"
        >
          ChlatWork Moments
        </p>
        <h1 class="mt-2">{{ managerCopy.title }}</h1>
        <p class="mt-2 text-sm text-slate-600 dark:text-white/60">
          {{ managerCopy.description }}
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <MomentLanguageToggle />
        <NuxtLink
          :to="localizeMomentPath('/moments/create')"
          class="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-3 text-sm font-bold text-white hover:bg-rose-700"
          ><Plus class="h-4 w-4" />{{ managerCopy.create }}</NuxtLink
        >
      </div>
    </header>

    <p
      v-if="deleteError"
      class="mt-5 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700 dark:bg-red-400/10 dark:text-red-300"
      role="alert"
    >
      {{ deleteError }}
    </p>

    <div v-if="status === 'pending'" class="mt-8 grid gap-4 sm:grid-cols-2">
      <div
        v-for="item in 2"
        :key="item"
        class="h-52 animate-pulse rounded-2xl bg-slate-200/70 dark:bg-white/10"
      />
    </div>

    <section
      v-else-if="error"
      class="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800 dark:border-red-300/20 dark:bg-red-400/10 dark:text-red-200"
    >
      <h2 class="text-lg font-semibold">{{ managerCopy.loadErrorTitle }}</h2>
      <p class="mt-2 text-sm">{{ managerCopy.loadErrorCopy }}</p>
    </section>

    <section
      v-else-if="moments.length === 0"
      class="mt-8 rounded-3xl border border-dashed border-rose-200 bg-rose-50/60 p-10 text-center dark:border-rose-300/20 dark:bg-rose-300/5"
    >
      <p class="text-4xl" aria-hidden="true">💝</p>
      <h2 class="mt-4 text-2xl font-semibold">
        {{ managerCopy.emptyTitle }}
      </h2>
      <p
        class="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600 dark:text-white/60"
      >
        {{ managerCopy.emptyCopy }}
      </p>
      <NuxtLink
        :to="localizeMomentPath('/moments/create')"
        class="mt-5 inline-flex rounded-xl bg-rose-600 px-4 py-3 text-sm font-bold text-white"
        >{{ managerCopy.create }}</NuxtLink
      >
    </section>

    <ul v-else class="mt-8 grid gap-4 sm:grid-cols-2">
      <li
        v-for="moment in moments"
        :key="moment.id"
        class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[.05]"
      >
        <div class="flex items-start justify-between gap-3">
          <span class="text-3xl" aria-hidden="true">{{
            getMomentOccasion(moment.occasion).emoji
          }}</span>
          <span
            class="rounded-full px-2.5 py-1 text-xs font-bold"
            :class="
              statusKind(moment) === 'published'
                ? 'bg-green-50 text-green-700 dark:bg-green-300/10 dark:text-green-300'
                : 'bg-amber-50 text-amber-700 dark:bg-amber-300/10 dark:text-amber-200'
            "
            >{{ statusLabel(moment) }}</span
          >
        </div>
        <h2 class="mt-4 text-xl font-semibold">{{ moment.title }}</h2>
        <p class="mt-1 text-sm text-slate-500 dark:text-white/50">
          {{ managerCopy.forRecipient(moment.recipientName) }}
        </p>
        <div
          class="mt-4 flex flex-wrap gap-3 text-xs text-slate-500 dark:text-white/45"
        >
          <span class="inline-flex items-center gap-1"
            ><Images class="h-3.5 w-3.5" />{{
              managerCopy.photos(moment._count.media)
            }}</span
          >
          <span class="inline-flex items-center gap-1"
            ><CalendarClock class="h-3.5 w-3.5" />{{
              formatDate(moment.createdAt)
            }}</span
          >
        </div>
        <div
          class="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-white/10"
        >
          <NuxtLink
            v-if="moment.status === 'PUBLISHED'"
            :to="localizeMomentPath(`/m/${moment.slug}`)"
            target="_blank"
            class="inline-flex items-center gap-1.5 text-sm font-bold text-rose-600 hover:text-rose-800 dark:text-rose-300"
            ><ExternalLink class="h-4 w-4" />{{ managerCopy.open }}</NuxtLink
          >
          <span v-else class="text-xs text-slate-400">{{
            managerCopy.notShared
          }}</span>
          <button
            type="button"
            class="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-50 dark:text-red-300 dark:hover:bg-red-400/10"
            :disabled="deletingId === moment.id"
            @click="removeMoment(moment)"
          >
            <Trash2 class="h-4 w-4" />{{
              deletingId === moment.id
                ? managerCopy.deleting
                : managerCopy.delete
            }}
          </button>
        </div>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.moments-manager.is-khmer {
  font-family: "Hanuman", ui-sans-serif, system-ui, sans-serif;
  line-height: 1.75;
}
</style>
