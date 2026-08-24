<script setup lang="ts">
import { BookOpen, TerminalSquare } from "lucide-vue-next";
import { DEVELOPER_COMMANDS, DEVELOPER_COMMAND_CATEGORIES } from "~/data/developer-commands";
import { DEVELOPER_GUIDES } from "~/data/developer-guides";
</script>

<template>
  <section class="py-12" aria-labelledby="developer-platform-title">
    <div class="flex items-center justify-between gap-3">
      <h2 id="developer-platform-title" class="text-xl font-semibold tracking-tight text-slate-950 dark:text-white">Helpful guides</h2>
    </div>
    <div class="mt-4 grid gap-3 sm:grid-cols-2">
      <NuxtLink
        to="/developer-commands"
        class="group flex min-h-24 items-center gap-4 rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50 to-white p-4 transition-colors hover:border-sky-400 hover:from-sky-100 hover:to-cyan-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 dark:border-cyan-300/20 dark:from-cyan-400/10 dark:to-white/[0.04] dark:hover:border-cyan-300/40 dark:hover:from-cyan-400/15 dark:hover:to-white/[0.07]"
      >
        <span class="grid size-10 shrink-0 place-items-center rounded-xl bg-sky-100 text-sky-700 transition-colors group-hover:bg-sky-200 dark:bg-cyan-300/15 dark:text-cyan-300 dark:group-hover:bg-cyan-300/20">
          <TerminalSquare class="h-5 w-5" aria-hidden="true" />
        </span>
        <span class="min-w-0">
          <span class="block font-semibold text-slate-950 dark:text-white">Command Hub</span>
          <span class="mt-1 block text-sm leading-5 text-slate-600 dark:text-white/60">
            {{ DEVELOPER_COMMANDS.length }} commands ·
            {{ DEVELOPER_COMMAND_CATEGORIES.length }} categories
          </span>
        </span>
      </NuxtLink>
      <NuxtLink
        to="/developer-guides"
        class="group flex min-h-24 items-center gap-4 rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-4 transition-colors hover:border-violet-400 hover:from-violet-100 hover:to-fuchsia-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 dark:border-violet-300/20 dark:from-violet-400/10 dark:to-white/[0.04] dark:hover:border-violet-300/40 dark:hover:from-violet-400/15 dark:hover:to-white/[0.07]"
      >
        <span class="grid size-10 shrink-0 place-items-center rounded-xl bg-violet-100 text-violet-700 transition-colors group-hover:bg-violet-200 dark:bg-violet-300/15 dark:text-violet-300 dark:group-hover:bg-violet-300/20">
          <BookOpen class="h-5 w-5" aria-hidden="true" />
        </span>
        <span class="min-w-0">
          <span class="block font-semibold text-slate-950 dark:text-white">Production Guides</span>
          <span class="mt-1 block text-sm leading-5 text-slate-600 dark:text-white/60">
            {{ DEVELOPER_GUIDES.length }} practical guides
          </span>
        </span>
      </NuxtLink>
    </div>
  </section>
</template>
