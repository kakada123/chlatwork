<script setup lang="ts">
import { Check, RotateCcw, Share2 } from "lucide-vue-next";
import { useLanguage } from "~/composables/useLanguage";

const { isKhmer } = useLanguage();

type PaybackShareState = "idle" | "busy" | "copied" | "shared" | "ready" | "failed";
const props = defineProps<{ shareState: PaybackShareState }>();
const emit = defineEmits<{ reset: []; share: [] }>();

const shareLabel = computed(() => {
  if (props.shareState === "busy") return isKhmer.value ? "កំពុងរៀបចំ…" : "Preparing…";
  if (props.shareState === "copied") return isKhmer.value ? "បានចម្លង Link" : "Link copied";
  if (props.shareState === "shared") return isKhmer.value ? "បានចែករំលែក" : "Shared";
  if (props.shareState === "ready") return isKhmer.value ? "Link រួចរាល់" : "Link ready";
  if (props.shareState === "failed") return isKhmer.value ? "ព្យាយាមម្តងទៀត" : "Try again";
  return isKhmer.value ? "ចែករំលែក" : "Share";
});
const isShareConfirmed = computed(() => ["copied", "shared", "ready"].includes(props.shareState));
</script>

<template>
  <header class="mb-6 border-b border-slate-200 pb-6 dark:border-white/10">
    <NuxtLink to="/tools" class="hidden text-sm font-semibold text-sky-700 hover:text-sky-900 dark:text-cyan-300 dark:hover:text-cyan-200 sm:inline-flex">
      {{ isKhmer ? "← ឧបករណ៍ទាំងអស់" : "← All tools" }}
    </NuxtLink>
    <div class="flex flex-col gap-4 sm:mt-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 class="text-3xl font-black tracking-tight text-slate-950 dark:text-white">
          {{ isKhmer ? "គណនាចែកលុយ PayBack" : "PayBack Calculator" }}
        </h1>
        <p class="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-white/60">
          {{ isKhmer ? "បញ្ចូលចំនួនទឹកប្រាក់ដែលម្នាក់ៗបានចេញ។ យើងនឹងគណនាវិធីទូទាត់សងគ្នាដែលងាយស្រួលបំផុត។" : "Add what each person paid. We’ll calculate the simplest way to settle up." }}
        </p>
      </div>
      <div class="flex gap-2">
        <button class="payback-secondary inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:text-white/75" type="button" @click="emit('reset')">
          <RotateCcw class="h-4 w-4" aria-hidden="true" /> {{ isKhmer ? "កំណត់ឡើងវិញ" : "Reset" }}
        </button>
        <button class="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-sky-700 px-4 text-sm font-semibold text-white transition hover:bg-sky-800 disabled:cursor-wait disabled:opacity-70 dark:bg-cyan-200 dark:text-slate-950 dark:hover:bg-cyan-100" type="button" :aria-busy="shareState === 'busy'" :disabled="shareState === 'busy'" @click="emit('share')">
          <Check v-if="isShareConfirmed" class="h-4 w-4" aria-hidden="true" />
          <Share2 v-else class="h-4 w-4" aria-hidden="true" />
          {{ shareLabel }}
        </button>
      </div>
    </div>
  </header>
</template>
