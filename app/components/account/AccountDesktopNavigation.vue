<script setup lang="ts">
import { BarChart3, BookOpen, Heart, History, ReceiptText, Settings2, Sparkles, Terminal, UserRound } from "lucide-vue-next";
import { DESKTOP_ACCOUNT_SECTIONS, type DesktopAccountSection } from "~/lib/account-navigation";

defineProps<{
  activeSection: DesktopAccountSection;
  commandsEnabled: boolean;
}>();
defineEmits<{ select: [section: DesktopAccountSection] }>();

const isKhmer = typeof useLanguage === "function" ? useLanguage().isKhmer : ref(false);

const icons = {
  overview: UserRound,
  expenses: ReceiptText,
  moments: Sparkles,
  payback: History,
  activity: BarChart3,
  "favorite-tools": Heart,
  "favorite-commands": Terminal,
  settings: Settings2,
  information: BookOpen,
};
</script>

<template>
  <nav aria-label="Account sections" class="hidden min-h-0 space-y-1 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-[#101214] lg:block">
    <template v-for="section in DESKTOP_ACCOUNT_SECTIONS" :key="section.key">
      <button
        v-if="!section.feature || commandsEnabled"
        type="button"
        :aria-current="activeSection === section.key ? 'page' : undefined"
        aria-controls="account-desktop-content"
        class="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
        :class="activeSection === section.key
          ? 'bg-sky-50 text-sky-800 dark:bg-cyan-300/10 dark:text-cyan-200'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-white/60 dark:hover:bg-white/[0.06] dark:hover:text-white'"
        @click="$emit('select', section.key)"
      >
        <component :is="icons[section.key]" class="size-4 shrink-0" aria-hidden="true" />
        <span v-if="!isKhmer">{{ section.title }}</span>
        <span v-else>{{ isKhmer && section.titleKm ? section.titleKm : section.title }}</span>
      </button>
    </template>
  </nav>
</template>
