<script setup lang="ts">
import { ref } from "vue";
import { X, Download, Copy, FileText, Check, Loader2 } from "lucide-vue-next";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";
import { toKhmerDigits } from "~/lib/khmer-calendar";
import type {
  MonthlyRosterSummary,
  RosterDay,
  RosterPreferences,
  RosterShift,
} from "~/types/roster";

const props = defineProps<{
  open: boolean;
  year: number;
  month: number;
  monthTitle: string;
  days: RosterDay[];
  shiftsByCode: Map<string, RosterShift>;
  preferences: RosterPreferences;
  summary: MonthlyRosterSummary;
  khmer: boolean;
}>();

const emit = defineEmits<{
  (e: "close"): void;
}>();

const printCardRef = ref<HTMLElement | null>(null);
const exporting = ref(false);
const copySuccess = ref(false);

function d(val: number | string) {
  return props.khmer ? toKhmerDigits(val) : String(val);
}

// Generate calendar cells array for the 7 columns (Sun to Sat)
const monthCells = computed(() => {
  const lastDay = new Date(Date.UTC(props.year, props.month, 0)).getUTCDate();
  const firstDow = new Date(Date.UTC(props.year, props.month - 1, 1)).getUTCDay();

  const daysMap = new Map<string, RosterDay>();
  for (const day of props.days) {
    daysMap.set(day.entryDate, day);
  }

  const cells: Array<{
    dayNumber: number | null;
    dateKey: string;
    entry: RosterDay | null;
    weekday: number;
  }> = [];

  // Blank padding
  for (let i = 0; i < firstDow; i++) {
    cells.push({ dayNumber: null, dateKey: `blank-${i}`, entry: null, weekday: i });
  }

  // Days of month
  for (let day = 1; day <= lastDay; day++) {
    const key = `${props.year}-${String(props.month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const weekday = (firstDow + day - 1) % 7;
    cells.push({
      dayNumber: day,
      dateKey: key,
      entry: daysMap.get(key) || null,
      weekday,
    });
  }

  // Pad to multiple of 7
  while (cells.length % 7 !== 0) {
    cells.push({
      dayNumber: null,
      dateKey: `blank-end-${cells.length}`,
      entry: null,
      weekday: cells.length % 7,
    });
  }

  return cells;
});

const weekdays = computed(() => {
  return props.khmer
    ? ["អាទិត្យ", "ចន្ទ", "អង្គារ", "ពុធ", "ព្រហស្បតិ៍", "សុក្រ", "សៅរ៍"]
    : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
});

async function exportPNG() {
  if (!printCardRef.value || exporting.value) return;
  exporting.value = true;
  try {
    const dataUrl = await toPng(printCardRef.value, {
      pixelRatio: 2,
      backgroundColor: "#ffffff",
    });
    const link = document.createElement("a");
    link.download = `ChlatWork-Roster-${props.year}-${String(props.month).padStart(2, "0")}.png`;
    link.href = dataUrl;
    link.click();
  } catch (err) {
    console.error("Export PNG failed:", err);
  } finally {
    exporting.value = false;
  }
}

async function exportPDF() {
  if (!printCardRef.value || exporting.value) return;
  exporting.value = true;
  try {
    const dataUrl = await toPng(printCardRef.value, {
      pixelRatio: 2,
      backgroundColor: "#ffffff",
    });
    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });
    const imgProps = pdf.getImageProperties(dataUrl);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    pdf.addImage(dataUrl, "PNG", 0, 10, pdfWidth, pdfHeight);
    pdf.save(`ChlatWork-Roster-${props.year}-${String(props.month).padStart(2, "0")}.pdf`);
  } catch (err) {
    console.error("Export PDF failed:", err);
  } finally {
    exporting.value = false;
  }
}

async function copyImageToClipboard() {
  if (!printCardRef.value || exporting.value) return;
  exporting.value = true;
  try {
    const dataUrl = await toPng(printCardRef.value, {
      pixelRatio: 2,
      backgroundColor: "#ffffff",
    });
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    if (navigator.clipboard && (window as any).ClipboardItem) {
      await navigator.clipboard.write([
        new (window as any).ClipboardItem({ "image/png": blob }),
      ]);
      copySuccess.value = true;
      setTimeout(() => {
        copySuccess.value = false;
      }, 2500);
    }
  } catch (err) {
    console.error("Copy image failed:", err);
  } finally {
    exporting.value = false;
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0"
      leave-active-class="transition duration-100 ease-in"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open"
        class="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-3 sm:p-4 backdrop-blur-sm"
        @click.self="emit('close')"
      >
        <div
          role="dialog"
          aria-modal="true"
          class="relative flex w-full max-w-5xl flex-col max-h-[95vh] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900"
          :class="{ 'font-khmer': khmer }"
          @keydown.esc.prevent="emit('close')"
        >
          <!-- Modal Top Bar -->
          <div class="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-zinc-800">
            <div>
              <h2 class="text-base font-bold text-slate-900 dark:text-zinc-100">
                {{ khmer ? "នាំចេញតារាងវេនការងារ" : "Export Monthly Roster" }}
              </h2>
              <p class="text-xs text-slate-500 dark:text-zinc-400">
                {{ khmer ? "រូបភាព និង PDF សម្រាប់ផ្ញើតាម Telegram ឬ Messenger" : "Ready to share via Telegram, Messenger, or email" }}
              </p>
            </div>
            <div class="flex items-center gap-2">
              <button
                type="button"
                class="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                :disabled="exporting"
                @click="copyImageToClipboard"
              >
                <component :is="copySuccess ? Check : Copy" :size="14" :class="copySuccess ? 'text-emerald-600' : ''" />
                {{ copySuccess ? (khmer ? "បានចម្លង!" : "Copied!") : (khmer ? "ចម្លងរូបភាព" : "Copy Image") }}
              </button>
              <button
                type="button"
                class="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                :disabled="exporting"
                @click="exportPDF"
              >
                <FileText :size="14" />
                PDF
              </button>
              <button
                type="button"
                class="flex items-center gap-1.5 rounded-lg bg-teal-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-teal-700 disabled:opacity-50"
                :disabled="exporting"
                @click="exportPNG"
              >
                <Loader2 v-if="exporting" :size="14" class="animate-spin" />
                <Download v-else :size="14" />
                {{ khmer ? "ទាញយក PNG" : "Download PNG" }}
              </button>
              <button
                type="button"
                class="ml-2 flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
                @click="emit('close')"
              >
                <X :size="18" />
              </button>
            </div>
          </div>

          <!-- Printable Preview Area -->
          <div class="flex-1 overflow-auto bg-slate-100 p-4 sm:p-6 dark:bg-zinc-950">
            <div
              ref="printCardRef"
              class="mx-auto max-w-4xl rounded-2xl bg-white p-6 shadow-md text-slate-900 border border-slate-200"
              style="font-family: inherit; color: #1e293b; background: #ffffff;"
            >
              <!-- Card Header -->
              <div class="flex items-start justify-between border-b-2 border-slate-800 pb-4">
                <div>
                  <div class="flex items-center gap-2">
                    <span class="rounded bg-teal-600 px-2 py-0.5 text-xs font-extrabold text-white tracking-wider">
                      CHLATWORK
                    </span>
                    <span class="text-xs font-semibold text-slate-500">CALENDAR</span>
                  </div>
                  <h1 class="mt-2 text-2xl font-black text-slate-900">
                    {{ monthTitle }}
                  </h1>
                  <p class="text-xs text-slate-500">
                    {{ khmer ? "តារាងកាលវិភាគវេនការងារ និងការឈប់សម្រាក" : "Monthly Work Roster & Leave Schedule" }}
                  </p>
                </div>
                <div class="text-right">
                  <div v-if="preferences.displayName" class="text-sm font-bold text-slate-900">
                    {{ preferences.displayName }}
                  </div>
                  <div class="text-xs text-slate-500">
                    Asia/Phnom_Penh · UTC+7
                  </div>
                </div>
              </div>

              <!-- Summary Metrics in Export -->
              <div class="my-4 grid grid-cols-4 gap-2 rounded-xl bg-slate-50 p-3 text-center text-xs">
                <div>
                  <span class="block text-[11px] text-slate-500">{{ khmer ? "ថ្ងៃធ្វើការ" : "Working Days" }}</span>
                  <strong class="font-mono text-base font-bold text-slate-900">{{ d(summary.workingDays) }}</strong>
                </div>
                <div>
                  <span class="block text-[11px] text-red-600">PRD ({{ khmer ? "បានប្រើ/កូតា" : "Used/Quota" }})</span>
                  <strong class="font-mono text-base font-bold text-red-700">{{ d(summary.prdUsed) }} / {{ d(summary.prdAllowance) }}</strong>
                </div>
                <div>
                  <span class="block text-[11px] text-amber-600">PHL ({{ khmer ? "នៅសល់" : "Available" }})</span>
                  <strong class="font-mono text-base font-bold text-amber-700">{{ d(summary.phlRemaining) }}</strong>
                </div>
                <div>
                  <span class="block text-[11px] text-purple-600">AL ({{ khmer ? "នៅសល់" : "Available" }})</span>
                  <strong class="font-mono text-base font-bold text-purple-700">{{ d(summary.alRemaining) }}</strong>
                </div>
              </div>

              <!-- Calendar Grid Table -->
              <table class="w-full table-fixed border-collapse border border-slate-200 text-xs">
                <thead>
                  <tr class="bg-slate-100 text-center font-bold text-slate-700">
                    <th
                      v-for="(w, idx) in weekdays"
                      :key="idx"
                      class="border border-slate-200 py-2 text-xs"
                      :class="idx === 0 ? 'text-red-600' : ''"
                    >
                      {{ w }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="rowIdx in Math.ceil(monthCells.length / 7)" :key="rowIdx">
                    <td
                      v-for="colIdx in 7"
                      :key="colIdx"
                      class="border border-slate-200 p-2 align-top h-20"
                      :class="{
                        'bg-slate-50/50': !monthCells[(rowIdx - 1) * 7 + (colIdx - 1)]?.dayNumber,
                        'bg-red-50/20': colIdx === 1,
                      }"
                    >
                      <template v-if="monthCells[(rowIdx - 1) * 7 + (colIdx - 1)]?.dayNumber">
                        <div class="flex items-center justify-between">
                          <span class="font-bold text-slate-900" :class="colIdx === 1 ? 'text-red-600' : ''">
                            {{ d(monthCells[(rowIdx - 1) * 7 + (colIdx - 1)].dayNumber!) }}
                          </span>
                        </div>

                        <!-- Roster Entry Badge -->
                        <div v-if="monthCells[(rowIdx - 1) * 7 + (colIdx - 1)].entry" class="mt-1">
                          <!-- Leave -->
                          <div
                            v-if="monthCells[(rowIdx - 1) * 7 + (colIdx - 1)].entry?.leaveCode"
                            class="inline-block rounded px-1.5 py-0.5 text-[10px] font-extrabold"
                            :class="{
                              'bg-red-100 text-red-800': monthCells[(rowIdx - 1) * 7 + (colIdx - 1)].entry?.leaveCode === 'PRD',
                              'bg-amber-100 text-amber-800': monthCells[(rowIdx - 1) * 7 + (colIdx - 1)].entry?.leaveCode === 'PHL',
                              'bg-purple-100 text-purple-800': monthCells[(rowIdx - 1) * 7 + (colIdx - 1)].entry?.leaveCode === 'AL',
                              'bg-violet-100 text-violet-800': monthCells[(rowIdx - 1) * 7 + (colIdx - 1)].entry?.leaveCode === 'H1' || monthCells[(rowIdx - 1) * 7 + (colIdx - 1)].entry?.leaveCode === 'H2',
                            }"
                          >
                            {{ monthCells[(rowIdx - 1) * 7 + (colIdx - 1)].entry?.leaveCode }}
                          </div>

                          <!-- Shift -->
                          <div
                            v-if="monthCells[(rowIdx - 1) * 7 + (colIdx - 1)].entry?.shiftCode"
                            class="mt-0.5 text-[10px] font-mono font-bold text-slate-700"
                          >
                            {{ monthCells[(rowIdx - 1) * 7 + (colIdx - 1)].entry?.shiftCode }}
                            <span class="block font-sans text-[9px] font-normal text-slate-500">
                              {{ shiftsByCode.get(monthCells[(rowIdx - 1) * 7 + (colIdx - 1)].entry?.shiftCode!)?.startTime }} -
                              {{ shiftsByCode.get(monthCells[(rowIdx - 1) * 7 + (colIdx - 1)].entry?.shiftCode!)?.endTime }}
                            </span>
                          </div>

                          <!-- Note snippet -->
                          <div
                            v-if="monthCells[(rowIdx - 1) * 7 + (colIdx - 1)].entry?.note"
                            class="mt-0.5 truncate text-[9px] text-slate-400"
                          >
                            {{ monthCells[(rowIdx - 1) * 7 + (colIdx - 1)].entry?.note }}
                          </div>
                        </div>
                      </template>
                    </td>
                  </tr>
                </tbody>
              </table>

              <!-- Footer with branding -->
              <div class="mt-4 flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-100 pt-3">
                <span>ChlatWork · https://calendar.chlatwork.com</span>
                <span>{{ khmer ? "បង្កើតដោយ ChlatWork Calendar" : "Generated with ChlatWork Calendar" }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
