<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { X, Clock, Calendar, AlertCircle, Lock, Trash2, Check } from "lucide-vue-next";
import type { CalendarDate, CalendarDay } from "~/lib/khmer-calendar";
import { toKhmerDigits } from "~/lib/khmer-calendar";
import type {
  LeaveCode,
  RosterDay,
  RosterEntryStatus,
  RosterPreferences,
  RosterShift,
} from "~/types/roster";
import { calculateDayWorkingHours, calculateShiftHours } from "~/lib/roster";

const props = defineProps<{
  teleportTarget?: HTMLElement | null;
  open: boolean;
  dateKey: string;
  day: CalendarDay | null;
  entry: RosterDay | null;
  shifts: RosterShift[];
  preferences: RosterPreferences;
  prdRemaining: number;
  alRemaining: number;
  phlRemaining: number;
  leaveRestrictions?: Partial<Record<LeaveCode, string | null>>;
  busy?: boolean;
  error?: string | null;
  khmer: boolean;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (
    e: "save",
    payload: {
      shiftCode: string | null;
      leaveCode: LeaveCode | null;
      status: RosterEntryStatus;
      note: string | null;
      isLocked: boolean;
    },
  ): void;
  (e: "delete", date: string): void;
}>();

const selectedShiftCode = ref<string | null>(null);
const selectedLeaveCode = ref<LeaveCode | null>(null);
const selectedStatus = ref<RosterEntryStatus>("DRAFT");
const note = ref<string>("");
const isLocked = ref<boolean>(false);

watch(
  () => [props.open, props.entry],
  () => {
    if (!props.open) return;
    if (props.entry) {
      selectedShiftCode.value = props.entry.shiftCode;
      selectedLeaveCode.value = props.entry.leaveCode;
      selectedStatus.value = props.preferences.statusFlowEnabled ? props.entry.status : "CONFIRMED";
      note.value = props.entry.note || "";
      isLocked.value = props.entry.isLocked;
    } else {
      selectedShiftCode.value = props.preferences.defaultShiftCode || (props.shifts[0]?.code ?? "K123");
      selectedLeaveCode.value = null;
      selectedStatus.value = props.preferences.statusFlowEnabled ? "DRAFT" : "CONFIRMED";
      note.value = "";
      isLocked.value = false;
    }
  },
  { immediate: true },
);

const currentShift = computed(() =>
  props.shifts.find((s) => s.code === selectedShiftCode.value),
);

const computedHours = computed(() => {
  return calculateDayWorkingHours(currentShift.value, selectedLeaveCode.value);
});

const isFullDayLeave = computed(() => {
  return (
    selectedLeaveCode.value === "PRD" ||
    selectedLeaveCode.value === "PHL" ||
    selectedLeaveCode.value === "AL"
  );
});

function handleLeaveChange(code: LeaveCode | null) {
  if (code && props.leaveRestrictions?.[code]) return;
  selectedLeaveCode.value = code;
  if (code === "PRD" || code === "PHL" || code === "AL") {
    selectedShiftCode.value = null;
  } else if ((code === "H1" || code === "H2") && !selectedShiftCode.value) {
    selectedShiftCode.value = props.preferences.defaultShiftCode || (props.shifts[0]?.code ?? "K123");
  }
}

function handleSave() {
  if (props.busy) return;
  emit("save", {
    shiftCode: isFullDayLeave.value ? null : selectedShiftCode.value,
    leaveCode: selectedLeaveCode.value,
    status: props.preferences.statusFlowEnabled ? selectedStatus.value : "CONFIRMED",
    note: note.value.trim() || null,
    isLocked: isLocked.value,
  });
}

function handleDelete() {
  emit("delete", props.dateKey);
  emit("close");
}

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
          class="relative w-full max-w-lg max-h-[calc(100dvh-1.5rem)] overflow-y-auto overscroll-contain rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900"
          :class="{ 'font-khmer': khmer }"
          @keydown.esc.prevent="emit('close')"
        >
          <!-- Header -->
          <div class="flex items-start justify-between border-b border-slate-100 pb-4 dark:border-zinc-800">
            <div>
              <div class="flex items-center gap-2">
                <span class="rounded bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                  {{ dateKey }}
                </span>
                <span v-if="day?.lunar" class="text-xs text-slate-500 dark:text-zinc-400" lang="km">
                  {{ toKhmerDigits(day.lunar.day) }}{{ day.lunar.moonPhaseName }} {{ day.lunar.monthName }}
                </span>
              </div>
              <h2 class="mt-1 text-lg font-bold text-slate-900 dark:text-zinc-100">
                {{ khmer ? "កែសម្រួលវេន និងការឈប់សម្រាក" : "Edit Shift & Leave Entry" }}
              </h2>
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

          <!-- Body -->
          <div class="mt-4 max-h-[70vh] space-y-4 overflow-y-auto pr-1">
            <!-- Leave Code Selection -->
            <div>
              <label class="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                {{ khmer ? "ប្រភេទការឈប់សម្រាក (Leave Code)" : "Leave Type" }}
              </label>
              <div class="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">
                <button
                  type="button"
                  class="rounded-lg border px-2 py-2 text-center text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  :class="
                    selectedLeaveCode === null
                      ? 'border-slate-800 bg-slate-900 text-white dark:border-zinc-200 dark:bg-zinc-100 dark:text-zinc-900'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                  "
                  @click="handleLeaveChange(null)"
                >
                  {{ khmer ? "ធម្មតា" : "None" }}
                </button>
                <button
                  type="button"
                  class="rounded-lg border px-2 py-2 text-center text-xs font-bold transition-all"
                  :class="
                    selectedLeaveCode === 'PRD'
                      ? 'border-red-600 bg-red-600 text-white'
                      : 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300'
                  "
                  :disabled="Boolean(leaveRestrictions?.PRD)"
                  :title="leaveRestrictions?.PRD || undefined"
                  @click="handleLeaveChange('PRD')"
                >
                  PRD
                </button>
                <button
                  type="button"
                  class="rounded-lg border px-2 py-2 text-center text-xs font-bold transition-all"
                  :class="
                    selectedLeaveCode === 'PHL'
                      ? 'border-amber-500 bg-amber-500 text-white'
                      : 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300'
                  "
                  :disabled="Boolean(leaveRestrictions?.PHL)"
                  :title="leaveRestrictions?.PHL || undefined"
                  @click="handleLeaveChange('PHL')"
                >
                  PHL
                </button>
                <button
                  type="button"
                  class="rounded-lg border px-2 py-2 text-center text-xs font-bold transition-all"
                  :class="
                    selectedLeaveCode === 'AL'
                      ? 'border-purple-600 bg-purple-600 text-white'
                      : 'border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 dark:border-purple-900 dark:bg-purple-950/40 dark:text-purple-300'
                  "
                  :disabled="Boolean(leaveRestrictions?.AL)"
                  :title="leaveRestrictions?.AL || undefined"
                  @click="handleLeaveChange('AL')"
                >
                  AL
                </button>
                <button
                  type="button"
                  class="rounded-lg border px-2 py-2 text-center text-xs font-bold transition-all"
                  :class="
                    selectedLeaveCode === 'H1'
                      ? 'border-violet-500 bg-violet-500 text-white'
                      : 'border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-300'
                  "
                  :disabled="Boolean(leaveRestrictions?.H1)"
                  :title="leaveRestrictions?.H1 || undefined"
                  @click="handleLeaveChange('H1')"
                >
                  H1 (ព្រឹក)
                </button>
                <button
                  type="button"
                  class="rounded-lg border px-2 py-2 text-center text-xs font-bold transition-all"
                  :class="
                    selectedLeaveCode === 'H2'
                      ? 'border-violet-500 bg-violet-500 text-white'
                      : 'border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-300'
                  "
                  :disabled="Boolean(leaveRestrictions?.H2)"
                  :title="leaveRestrictions?.H2 || undefined"
                  @click="handleLeaveChange('H2')"
                >
                  H2 (រសៀល)
                </button>
              </div>

              <!-- Leave Info / Warnings -->
              <div v-if="selectedLeaveCode" class="mt-2 rounded-lg bg-slate-50 p-2.5 text-xs dark:bg-zinc-800/60">
                <p v-if="selectedLeaveCode === 'PRD'" class="text-red-700 dark:text-red-300">
                  <strong>PRD (Regular Day Off):</strong>
                  {{ khmer ? `កូតាប្រចាំខែនៅសល់ ${d(prdRemaining)} ថ្ងៃ` : `${prdRemaining} days remaining in monthly quota` }}
                </p>
                <p v-else-if="selectedLeaveCode === 'PHL'" class="text-amber-700 dark:text-amber-300">
                  <strong>PHL (Public Holiday Leave):</strong>
                  {{ khmer ? `សមតុល្យនៅសល់ ${d(phlRemaining)} ថ្ងៃ · កាត់ ១ ថ្ងៃនៅពេលបញ្ជាក់` : `${phlRemaining} days available · Deducts 1 day when confirmed` }}
                </p>
                <p v-else-if="selectedLeaveCode === 'AL'" class="text-purple-700 dark:text-purple-300">
                  <strong>AL (Annual Leave):</strong>
                  {{ khmer ? `សមតុល្យនៅសល់ ${d(alRemaining)} ថ្ងៃ · កាត់ ១ ថ្ងៃនៅពេលបញ្ជាក់` : `${alRemaining} days available · Deducts 1 day when confirmed` }}
                </p>
                <p v-else-if="selectedLeaveCode === 'H1' || selectedLeaveCode === 'H2'" class="text-violet-700 dark:text-violet-300">
                  <strong>{{ selectedLeaveCode === 'H1' ? 'H1 (Morning Leave)' : 'H2 (Afternoon Leave)' }}:</strong>
                  {{ khmer ? `កាត់ ០.៥ ថ្ងៃពី AL នៅពេលបញ្ជាក់ · ត្រូវបំពេញវេនការងារពាក់កណ្តាលថ្ងៃដែលនៅសល់` : `Deducts 0.5 day from AL when confirmed · Associated working shift remains active for half day` }}
                </p>
              </div>
            </div>

            <!-- Working Shift Selection (disabled if full-day leave) -->
            <div v-if="!isFullDayLeave">
              <label class="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                {{ khmer ? "វេនការងារ (Working Shift)" : "Working Shift" }}
              </label>
              <div class="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <button
                  v-for="s in shifts.filter((x) => x.isActive)"
                  :key="s.id"
                  type="button"
                  class="rounded-lg border p-2 text-left transition-all"
                  :class="
                    selectedShiftCode === s.code
                      ? 'border-teal-600 bg-teal-50 ring-1 ring-teal-600 dark:border-teal-400 dark:bg-teal-950/40'
                      : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700/60'
                  "
                  @click="selectedShiftCode = s.code"
                >
                  <div class="flex items-center justify-between">
                    <span class="font-mono text-xs font-bold text-slate-900 dark:text-zinc-100">{{ s.code }}</span>
                    <span v-if="s.isOvernight" class="text-[10px] text-amber-600 dark:text-amber-400">🌙</span>
                  </div>
                  <div class="mt-1 text-[11px] text-slate-500 dark:text-zinc-400">
                    {{ s.startTime }} - {{ s.endTime }}
                  </div>
                  <div class="text-[10px] text-slate-400 dark:text-zinc-500">
                    {{ calculateShiftHours(s.startTime, s.endTime, s.isOvernight) }}h
                  </div>
                </button>
              </div>
            </div>

            <!-- Working Hours display -->
            <div class="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs dark:bg-zinc-800">
              <span class="flex items-center gap-1.5 text-slate-600 dark:text-zinc-300">
                <Clock :size="14" class="text-teal-600 dark:text-teal-400" />
                {{ khmer ? "ម៉ោងការងារសរុប:" : "Working Hours:" }}
              </span>
              <strong class="font-mono text-sm text-slate-900 dark:text-zinc-100">
                {{ computedHours }} {{ khmer ? "ម៉ោង" : "hrs" }}
              </strong>
            </div>

            <!-- Status Selection -->
            <div v-if="preferences.statusFlowEnabled">
              <label class="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                {{ khmer ? "ស្ថានភាព (Status)" : "Entry Status" }}
              </label>
              <div class="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <button
                  type="button"
                  class="rounded-lg border py-1.5 text-center text-xs font-semibold transition-all"
                  :class="
                    selectedStatus === 'DRAFT'
                      ? 'border-slate-700 bg-slate-100 font-bold text-slate-900 dark:border-zinc-400 dark:bg-zinc-800 dark:text-white'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-zinc-700 dark:text-zinc-400'
                  "
                  @click="selectedStatus = 'DRAFT'"
                >
                  {{ khmer ? "ព្រាង" : "Draft" }}
                </button>
                <button
                  type="button"
                  class="rounded-lg border py-1.5 text-center text-xs font-semibold transition-all"
                  :class="
                    selectedStatus === 'REQUESTED'
                      ? 'border-amber-600 bg-amber-50 font-bold text-amber-700 dark:border-amber-400 dark:bg-amber-950/40 dark:text-amber-300'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-zinc-700 dark:text-zinc-400'
                  "
                  @click="selectedStatus = 'REQUESTED'"
                >
                  {{ khmer ? "ស្នើសុំ" : "Requested" }}
                </button>
                <button
                  type="button"
                  class="rounded-lg border py-1.5 text-center text-xs font-semibold transition-all"
                  :class="
                    selectedStatus === 'CONFIRMED'
                      ? 'border-emerald-600 bg-emerald-50 font-bold text-emerald-700 dark:border-emerald-400 dark:bg-emerald-950/40 dark:text-emerald-300'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-zinc-700 dark:text-zinc-400'
                  "
                  @click="selectedStatus = 'CONFIRMED'"
                >
                  {{ khmer ? "បានបញ្ជាក់" : "Confirmed" }}
                </button>
                <button
                  type="button"
                  class="rounded-lg border py-1.5 text-center text-xs font-semibold transition-all"
                  :class="
                    selectedStatus === 'CANCELLED'
                      ? 'border-rose-600 bg-rose-50 font-bold text-rose-700 dark:border-rose-400 dark:bg-rose-950/40 dark:text-rose-300'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-zinc-700 dark:text-zinc-400'
                  "
                  @click="selectedStatus = 'CANCELLED'"
                >
                  {{ khmer ? "បោះបង់" : "Cancelled" }}
                </button>
              </div>
              <p class="mt-1 text-[11px] text-slate-500 dark:text-zinc-400">
                {{ khmer ? "* មានតែស្ថានភាព 'បានបញ្ជាក់' ប៉ុណ្ណោះដែលកាត់សមតុល្យច្បាប់ជាផ្លូវការ" : "* Only Confirmed entries deduct from official leave balance." }}
              </p>
            </div>

            <!-- Notes -->
            <div>
              <label class="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                {{ khmer ? "កំណត់ចំណាំ (Note)" : "Note" }}
              </label>
              <input
                v-model="note"
                type="text"
                maxlength="200"
                class="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-teal-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                :placeholder="khmer ? 'ឧទាហរណ៍៖ ឈប់សម្រាកការងារផ្ទាល់ខ្លួន' : 'e.g. Family event or shift swap'"
              />
            </div>

            <!-- Lock Toggle -->
            <label class="flex items-center gap-2 cursor-pointer text-xs text-slate-700 dark:text-zinc-300">
              <input v-model="isLocked" type="checkbox" class="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500" />
              <span class="flex items-center gap-1">
                <Lock :size="13" class="text-slate-400" />
                {{ khmer ? "ចាក់សោ (ការពារពីការកែដោយស្វ័យប្រវត្តិ)" : "Lock entry (protect from auto-generation)" }}
              </span>
            </label>
          </div>

          <!-- Footer Actions -->
          <p v-if="error" role="alert" class="mt-3 text-xs text-rose-700 dark:text-rose-300">{{ error }}</p>
          <div class="mt-5 flex flex-wrap gap-2 items-center justify-between border-t border-slate-100 pt-4 dark:border-zinc-800">
            <button
              v-if="entry"
              type="button"
              class="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
              @click="handleDelete"
            >
              <Trash2 :size="14" />
              {{ khmer ? "លុបចោល" : "Delete" }}
            </button>
            <div v-else />

            <div class="flex items-center gap-2">
              <button
                type="button"
                class="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                @click="emit('close')"
              >
                {{ khmer ? "បិទ" : "Cancel" }}
              </button>
              <button
                type="button"
                class="flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 text-xs font-bold text-white hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600"
                @click="handleSave"
                :disabled="busy"
              >
                <Check :size="14" />
                {{ khmer ? "រក្សាទុក" : "Save Entry" }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
