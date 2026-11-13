<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import { X, Download, Copy, FileText, Check, Loader2 } from "lucide-vue-next";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";
import { toKhmerDigits } from "~/lib/khmer-calendar";
import { getRosterDayColors } from "~/lib/roster";
import RosterEntryBadge from "~/components/roster/RosterEntryBadge.vue";
import type {
  MonthlyRosterSummary,
  RosterDay,
  RosterPreferences,
  RosterShift,
} from "~/types/roster";

const props = defineProps<{
  teleportTarget?: HTMLElement | null;
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
const previewRef = ref<HTMLElement | null>(null);
const previewScale = ref(1);
const previewHeight = ref<number>();
const exporting = ref(false);
const copySuccess = ref(false);
const exportError = ref("");
const canCopyImage = ref(false);
let previewObserver: ResizeObserver | undefined;
let copyTimer: ReturnType<typeof setTimeout> | undefined;

function resizePreview() {
  if (!previewRef.value || !printCardRef.value) return;
  previewScale.value = Math.min(
    1,
    previewRef.value.clientWidth / printCardRef.value.offsetWidth,
  );
  previewHeight.value = Math.ceil(
    printCardRef.value.offsetHeight * previewScale.value,
  );
}

watch(
  () => props.open,
  async (open) => {
    previewObserver?.disconnect();
    exportError.value = "";
    copySuccess.value = false;
    if (!open) return;
    canCopyImage.value =
      typeof ClipboardItem !== "undefined" &&
      Boolean(navigator.clipboard?.write);
    await nextTick();
    if (!props.open || !previewRef.value || !printCardRef.value) return;
    // Scale only the preview; exports retain the same readable width on every device.
    resizePreview();
    previewObserver = new ResizeObserver(resizePreview);
    previewObserver.observe(previewRef.value);
    previewObserver.observe(printCardRef.value);
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  previewObserver?.disconnect();
  if (copyTimer) clearTimeout(copyTimer);
});

function d(val: number | string) {
  return props.khmer ? toKhmerDigits(val) : String(val);
}

// Generate calendar cells array for the 7 columns (Monday to Sunday)
const monthCells = computed(() => {
  const lastDay = new Date(Date.UTC(props.year, props.month, 0)).getUTCDate();
  const rawDow = new Date(Date.UTC(props.year, props.month - 1, 1)).getUTCDay();
  const firstDow = (rawDow - 1 + 7) % 7; // Monday-first

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
    cells.push({ dayNumber: null, dateKey: `blank-${i}`, entry: null, weekday: (i + 1) % 7 });
  }

  // Days of month
  for (let day = 1; day <= lastDay; day++) {
    const key = `${props.year}-${String(props.month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const weekday = (rawDow + day - 1) % 7;
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
      weekday: (cells.length + 1) % 7,
    });
  }

  return cells;
});

const weekdays = computed(() => {
  return props.khmer
    ? ["ចន្ទ", "អង្គារ", "ពុធ", "ព្រហស្បតិ៍", "សុក្រ", "សៅរ៍", "អាទិត្យ"]
    : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
});

async function captureRoster() {
  await nextTick();
  // Measuring before Hanuman loads can cut off Khmer glyphs and the final calendar row.
  await document.fonts.ready;
  const card = printCardRef.value;
  if (!card) throw new Error("Roster preview unavailable");
  const width = Math.max(card.scrollWidth, card.offsetWidth || 0);
  const height = Math.max(card.scrollHeight, card.offsetHeight || 0);
  return toPng(card, {
    pixelRatio: 2,
    backgroundColor: "#ffffff",
    width,
    height,
    style: {
      width: `${width}px`,
      height: `${height}px`,
      maxWidth: "none",
      transform: "none",
      margin: "0",
    },
  });
}

function reportExportError() {
  exportError.value = props.khmer
    ? "មិនអាចនាំចេញរូបភាពបានទេ។ សូមព្យាយាមម្តងទៀត ឬទាញយក PNG។"
    : "Could not export the roster. Please try again or download PNG instead.";
}

async function exportPNG() {
  if (!printCardRef.value || exporting.value) return;
  exporting.value = true;
  exportError.value = "";
  try {
    const dataUrl = await captureRoster();
    const link = document.createElement("a");
    link.download = `ChlatWork-Roster-${props.year}-${String(props.month).padStart(2, "0")}.png`;
    link.href = dataUrl;
    link.click();
  } catch {
    reportExportError();
  } finally {
    exporting.value = false;
  }
}

async function exportPDF() {
  if (!printCardRef.value || exporting.value) return;
  exporting.value = true;
  exportError.value = "";
  try {
    const dataUrl = await captureRoster();
    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });
    const imgProps = pdf.getImageProperties(dataUrl);
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    // Six-week months and wrapped notes must fit within both A4 dimensions.
    const scale = Math.min(
      (pageWidth - 20) / imgProps.width,
      (pageHeight - 20) / imgProps.height,
    );
    const width = imgProps.width * scale;
    const height = imgProps.height * scale;
    pdf.addImage(
      dataUrl,
      "PNG",
      (pageWidth - width) / 2,
      (pageHeight - height) / 2,
      width,
      height,
    );
    pdf.save(`ChlatWork-Roster-${props.year}-${String(props.month).padStart(2, "0")}.pdf`);
  } catch {
    reportExportError();
  } finally {
    exporting.value = false;
  }
}

async function copyImageToClipboard() {
  if (!printCardRef.value || exporting.value) return;
  exporting.value = true;
  exportError.value = "";
  copySuccess.value = false;
  try {
    if (typeof ClipboardItem === "undefined" || !navigator.clipboard?.write) {
      throw new Error("Image clipboard unavailable");
    }
    // Start clipboard.write during the tap so Safari retains user activation while rendering.
    const image = captureRoster().then(async (url) =>
      (await fetch(url)).blob(),
    );
    await navigator.clipboard.write([
      new ClipboardItem({ "image/png": image }),
    ]);
    copySuccess.value = true;
    if (copyTimer) clearTimeout(copyTimer);
    copyTimer = setTimeout(() => {
      copySuccess.value = false;
    }, 2500);
  } catch {
    reportExportError();
  } finally {
    exporting.value = false;
  }
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
        class="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-3 sm:p-4 backdrop-blur-sm"
        @click.self="emit('close')"
      >
        <div
          role="dialog"
          aria-modal="true"
          class="roster-export-dialog relative flex w-full max-w-5xl flex-col max-h-[calc(100dvh-1.5rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900"
          :class="{ 'font-khmer': khmer }"
          @keydown.esc.prevent="emit('close')"
        >
          <!-- Modal Top Bar -->
          <div class="export-toolbar relative flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4 pr-14 dark:border-zinc-800">
            <div>
              <h2 class="text-base font-bold text-slate-900 dark:text-zinc-100">
                {{ khmer ? "នាំចេញតារាងវេនការងារ" : "Export Monthly Roster" }}
              </h2>
              <p class="text-xs text-slate-500 dark:text-zinc-400">
                {{ khmer ? "រូបភាព និង PDF សម្រាប់ផ្ញើតាម Telegram ឬ Messenger" : "Ready to share via Telegram, Messenger, or email" }}
              </p>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <button
                v-if="canCopyImage"
                type="button"
                class="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                :disabled="exporting"
                @click="copyImageToClipboard"
              >
                <component :is="copySuccess ? Check : Copy" :size="14" :class="copySuccess ? 'text-emerald-600' : ''" />
                {{ copySuccess ? khmer ? "បានចម្លង!" : "Copied!"
                    : khmer ? "ចម្លងរូបភាព" : "Copy Image"
                }}
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
                class="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
                :aria-label="khmer ? 'បិទ' : 'Close'"
                @click="emit('close')"
              >
                <X :size="18" />
              </button>
            </div>
          </div>

          <p
            v-if="exportError"
            role="alert"
            class="shrink-0 bg-rose-50 px-4 py-2 text-sm text-rose-800 dark:bg-rose-950 dark:text-rose-200"
          >
            {{ exportError }}
          </p>

          <!-- Printable Preview Area -->
          <div class="min-h-0 flex-1 overflow-auto bg-slate-100 p-3 sm:p-6 dark:bg-zinc-950">
            <div
              ref="previewRef"
              class="relative mx-auto w-full max-w-[1000px] overflow-hidden"
              :style="{
                height: previewHeight ? `${previewHeight}px` : undefined,
              }"
            >
              <div
                ref="printCardRef"
                class="roster-print-card rounded-2xl bg-white p-6 shadow-md text-slate-900 border border-slate-200"
                :style="{ transform: `scale(${previewScale})` }"
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
                  <span class="block text-[11px] text-amber-600">PHL · {{ d(year) }} ({{ khmer ? "បានប្រើ" : "Used"
                      }})</span>
                  <strong class="font-mono text-base font-bold text-amber-700">{{ d(summary.phlUsed) }}</strong>
                </div>
                <div>
                  <span class="block text-[11px] text-purple-600">AL · {{ d(year) }} ({{ khmer ? "បានប្រើ" : "Used"
                      }})</span>
                  <strong class="font-mono text-base font-bold text-purple-700">{{ d(summary.alUsed) }}</strong>
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
                      :class="idx === 6 ? 'text-red-600' : ''"
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
                      :style="{ backgroundColor: getRosterDayColors(monthCells[(rowIdx - 1) * 7 + (colIdx - 1)].entry)?.light, '--roster-code-ink': getRosterDayColors(monthCells[(rowIdx - 1) * 7 + (colIdx - 1)].entry)?.text }"
                      class="border border-slate-200 p-2 align-top h-20"
                      :class="{
                        'bg-slate-50/50': !monthCells[(rowIdx - 1) * 7 + (colIdx - 1)]?.dayNumber,
                        'bg-red-50/20': colIdx === 7,
                      }"
                    >
                      <template v-if="monthCells[(rowIdx - 1) * 7 + (colIdx - 1)]?.dayNumber">
                        <div class="flex items-center justify-between">
                          <span class="font-bold text-slate-900" :class="colIdx === 7 ? 'text-red-600' : ''">
                            {{ d(monthCells[(rowIdx - 1) * 7 + (colIdx - 1)].dayNumber!) }}
                          </span>
                        </div>

                        <!-- Roster Entry Badge -->
                        <div v-if="monthCells[(rowIdx - 1) * 7 + (colIdx - 1)].entry" class="mt-1 flex flex-col items-start gap-1">
                          <!-- Leave -->
                          <RosterEntryBadge
                            v-if="monthCells[(rowIdx - 1) * 7 + (colIdx - 1)].entry?.leaveCode"
                            :code="monthCells[(rowIdx - 1) * 7 + (colIdx - 1)].entry!.leaveCode!"
                            :leave-code="monthCells[(rowIdx - 1) * 7 + (colIdx - 1)].entry!.leaveCode"
                            :show-description="false"
                          />

                          <!-- Shift -->
                          <RosterEntryBadge
                            v-if="monthCells[(rowIdx - 1) * 7 + (colIdx - 1)].entry?.shiftCode"
                            :code="monthCells[(rowIdx - 1) * 7 + (colIdx - 1)].entry!.shiftCode!"
                            :shift="shiftsByCode.get(monthCells[(rowIdx - 1) * 7 + (colIdx - 1)].entry!.shiftCode!)"
                          />

                          <!-- Note snippet -->
                          <div
                            v-if="monthCells[(rowIdx - 1) * 7 + (colIdx - 1)].entry?.note"
                            class="mt-0.5 break-words text-[9px] text-slate-500"
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
    </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.roster-print-card {
  width: 1000px;
  max-width: none;
  box-sizing: border-box;
  transform-origin: top left;
  font-family: var(--app-font);
  color: #1e293b;
  background: #fff;
  overflow-wrap: anywhere;
}
.roster-print-card h1 {
  line-height: 1.7;
}
.export-toolbar button {
  min-height: 44px;
}
</style>
