<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { X, Sparkles, AlertTriangle, CheckCircle2, Calendar, ArrowRight } from "lucide-vue-next";
import { toKhmerDigits } from "~/lib/khmer-calendar";
import type {
  RosterGeneratePreview,
  RosterPreferences,
} from "~/types/roster";

const props = defineProps<{
  teleportTarget?: HTMLElement | null;
  open: boolean;
  year: number;
  month: number;
  preferences: RosterPreferences;
  preview: RosterGeneratePreview | null;
  khmer: boolean;
  busy: boolean;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "apply"): void;
}>();

function d(val: number | string) {
  return props.khmer ? toKhmerDigits(val) : String(val);
}
</script>

<template>
  <Teleport :to="teleportTarget || 'body'">
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0"
      leave-active-class="transition duration-100 ease-in"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open"
        class="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
        @click.self="emit('close')"
      >
        <div
          role="dialog"
          aria-modal="true"
          class="relative w-full max-w-2xl max-h-[calc(100dvh-1.5rem)] overflow-y-auto overscroll-contain rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900"
          :class="{ 'font-khmer': khmer }"
          @keydown.esc.prevent="emit('close')"
        >
          <!-- Header -->
          <div class="flex items-start justify-between border-b border-slate-100 pb-4 dark:border-zinc-800">
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300">
                <Sparkles :size="20" />
              </div>
              <div>
                <h2 class="text-lg font-bold text-slate-900 dark:text-zinc-100">
                  {{ khmer ? "បង្កើតតារាងវេនការងារស្វ័យប្រវត្តិ" : "Smart Roster Generator" }}
                </h2>
                <p class="text-xs text-slate-500 dark:text-zinc-400">
                  {{ khmer ? `ខែ ${d(month)} ឆ្នាំ ${d(year)} · បែងចែក PRD → PHL → AL ដោយស្វ័យប្រវត្តិ` : `Month ${month}/${year} · Auto-allocates PRD → PHL → AL` }}
                </p>
              </div>
            </div>
            <button
              type="button"
              class="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
              :aria-label="khmer ? 'បិទ' : 'Close'"
              @click="emit('close')"
            >
              <X :size="18" aria-hidden="true" />
            </button>
          </div>

          <!-- Body Content -->
          <div class="mt-4 max-h-[60vh] space-y-4 overflow-y-auto pr-1 text-xs">
            <!-- Rules summary -->
            <div class="rounded-xl border border-teal-100 bg-teal-50/60 p-3 dark:border-teal-900/40 dark:bg-teal-950/20">
              <h3 class="font-bold text-teal-900 dark:text-teal-300">
                {{ khmer ? "គោលការណ៍បែងចែក:" : "Allocation Logic:" }}
              </h3>
              <ul class="mt-1 list-inside list-disc space-y-0.5 text-teal-800 dark:text-teal-400">
                <li>{{ khmer ? "ធ្វើការមិនលើស ៦ ថ្ងៃក្នុងមួយសប្តាហ៍ (ចន្ទ–អាទិត្យ)" : "Maximum 6 workdays in each Monday-Sunday week, including weeks crossing months" }}</li>
                <li>{{ khmer ? "ពេលអស់ច្បាប់ ថ្ងៃសៅរ៍ និងថ្ងៃបុណ្យធ្វើការធម្មតា ដោយរក្សាថ្ងៃសម្រាកប្រចាំសប្តាហ៍" : "When leave runs out, Saturdays and public holidays use the normal shift while preserving weekly rest" }}</li>
                <li>{{ khmer ? `រក្សា PRD សម្រាប់ថ្ងៃអាទិត្យជាមុន (កូតា ${d(preferences.monthlyPrdAllowance)} ថ្ងៃ)` : `Reserves PRD for Sundays first (monthly allowance: ${preferences.monthlyPrdAllowance} days)` }}</li>
                <li v-if="!preferences.statusFlowEnabled">{{ khmer ? "ពេលអនុវត្ត វេនត្រូវបានបញ្ជាក់ភ្លាម ហើយសមតុល្យច្បាប់កែដោយស្វ័យប្រវត្តិ" : "Applying the roster confirms entries and updates leave balances immediately" }}</li>
                <li>{{ khmer ? "ប្រើ PHL ប្រសិនបើនៅសល់ថ្ងៃឈប់សម្រាកបុណ្យជាតិ" : "Suggests PHL next if PHL balance is available" }}</li>
                <li>{{ khmer ? "ប្រើ AL លុះត្រាតែអស់ PRD/PHL (ទាមទារការបញ្ជាក់ពីអ្នក)" : "Suggests AL only when necessary and available (requires confirmation)" }}</li>
                <li>{{ khmer ? "រក្សាថ្ងៃចាក់សោ ការឈប់សម្រាកដែលបានបញ្ជាក់ និងសំណើរង់ចាំ" : "Keeps locked dates, confirmed leave, and requested entries unchanged" }}</li>
                <li v-if="!preferences.statusFlowEnabled">{{ khmer ? "ពិនិត្យវេនធ្វើការដែលមិនចាក់សោ នៅថ្ងៃចង់ឈប់សម្រាកឡើងវិញ ដោយប្រើសមតុល្យច្បាប់ថ្មី" : "Rechecks unlocked work on preferred off-days using your latest leave balances" }}</li>
                <li v-else>{{ khmer ? "ពេលបើកលំហូរស្ថានភាព វេនដែលបានបញ្ជាក់មិនត្រូវបានកែទេ" : "With status flow on, confirmed work shifts are also preserved" }}</li>
              </ul>
            </div>

            <!-- Warnings -->
            <div
              v-if="preview?.warnings?.length"
              class="space-y-1.5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
            >
              <div class="flex items-center gap-1.5 font-bold">
                <AlertTriangle :size="15" class="text-amber-600 dark:text-amber-400" />
                {{ khmer ? "ការកត់សម្គាល់សំខាន់ៗ:" : "Notices & Warnings:" }}
              </div>
              <ul class="list-inside list-disc space-y-0.5 text-[11px]">
                <li v-for="(w, idx) in preview.warnings" :key="idx">{{ w }}</li>
              </ul>
            </div>

            <!-- Proposed Suggestions List -->
            <div>
              <h4 class="mb-2 font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                {{ khmer ? `សំណើរវេនការងារ (${preview?.suggestions?.length ?? 0} ថ្ងៃ)` : `Proposed Assignments (${preview?.suggestions?.length ?? 0} days)` }}
              </h4>
              <div class="max-h-60 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100 dark:border-zinc-800 dark:divide-zinc-800">
                <div
                  v-for="s in preview?.suggestions"
                  :key="s.entryDate"
                  class="flex flex-wrap gap-2 items-center justify-between px-3 py-2 transition-colors hover:bg-slate-50 dark:hover:bg-zinc-800/40"
                >
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="font-mono font-semibold text-slate-800 dark:text-zinc-200">
                      {{ s.entryDate }}
                    </span>
                    <span class="text-slate-400">·</span>
                    <span class="text-slate-500 dark:text-zinc-400">
                      {{ s.reason }}
                    </span>
                  </div>
                  <div>
                    <span
                      v-if="s.leaveCode === 'PRD'"
                      class="rounded bg-red-100 px-2 py-0.5 font-bold text-red-700 dark:bg-red-950 dark:text-red-300"
                    >
                      PRD
                    </span>
                    <span
                      v-else-if="s.leaveCode === 'PHL'"
                      class="rounded bg-amber-100 px-2 py-0.5 font-bold text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                    >
                      PHL
                    </span>
                    <span
                      v-else-if="s.leaveCode === 'AL'"
                      class="rounded bg-purple-100 px-2 py-0.5 font-bold text-purple-700 dark:bg-purple-950 dark:text-purple-300"
                    >
                      AL
                    </span>
                    <span
                      v-else-if="s.shiftCode"
                      class="rounded bg-slate-100 px-2 py-0.5 font-mono font-bold text-slate-700 dark:bg-zinc-800 dark:text-zinc-300"
                    >
                      {{ s.shiftCode }}
                    </span>
                    <span v-else class="text-slate-400">
                      {{ khmer ? "គ្មានវេន" : "Off" }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer Actions -->
          <div class="mt-5 flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-4 dark:border-zinc-800">
            <button
              type="button"
              class="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              @click="emit('close')"
            >
              {{ khmer ? "បដិសេធ" : "Cancel" }}
            </button>
            <button
              type="button"
              class="flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 text-xs font-bold text-white hover:bg-teal-700 disabled:opacity-50 dark:bg-teal-500 dark:hover:bg-teal-600"
              :disabled="busy || !preview?.suggestions?.length || preview?.blocked"
              @click="emit('apply')"
            >
              <CheckCircle2 :size="14" />
              {{ khmer ? "អនុវត្តតារាងវេននេះ" : "Apply Suggestions" }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
