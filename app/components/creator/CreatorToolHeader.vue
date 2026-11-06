<script setup lang="ts">
import { useAppI18n } from "~/composables/useAppI18n";
import { useProductCopy } from "~/composables/useProductCopy";
import { ArrowLeft, Coins } from "lucide-vue-next";
import type { CreatorToolDefinition } from "~/data/creator-tools";
import { useLanguage } from "~/composables/useLanguage";

const { t } = useAppI18n();

const { productText } = useProductCopy();

const { isKhmer } = useLanguage();
defineProps<{ tool: CreatorToolDefinition }>();
</script>

<template>
  <header class="border-b border-slate-200 pb-5 dark:border-white/10 sm:pb-6">
    <NuxtLink
      to="/creator"
      class="mb-4 hidden min-h-10 items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-sky-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 sm:inline-flex dark:text-white/50 dark:hover:text-cyan-300"
    >
      <ArrowLeft class="size-4" aria-hidden="true" /> {{ t("products.creator.creator") }}
    </NuxtLink>
    <div class="flex items-start gap-3 sm:gap-4">
      <span
        class="tool-icon-tone tool-icon-tone-cyan grid size-12 shrink-0 place-items-center rounded-2xl sm:size-14"
        aria-hidden="true"
      >
        <CreatorIcon :name="tool.icon" class="size-6 sm:size-7" />
      </span>
      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-center gap-2">
          <h1 class="text-[#082552] dark:text-white">{{ productText(tool.title) }}</h1>
          <span
            v-if="tool.featured"
            class="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-800 dark:bg-amber-300/15 dark:text-amber-200"
            >{{ t("products.creator.featured") }}</span
          >
          <span
            v-if="tool.fast"
            class="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-300/15 dark:text-emerald-200"
            >{{ t("products.creator.quick_tool") }}</span
          >
        </div>
        <p
          class="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-white/60"
        >
          {{ productText(tool.description) }}
        </p>
        <p
          class="mt-2 inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-white/45"
        >
          <Coins class="size-3.5" aria-hidden="true" /> {{ t("products.creator.credits_are_confirmed_by_the_server_before_processing") }}
        </p>
      </div>
    </div>
  </header>
</template>
