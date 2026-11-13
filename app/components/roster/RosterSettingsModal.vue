<script setup lang="ts">
import { ref, watch } from "vue";
import {
  X,
  Sliders,
  Calendar,
  Clock,
  History,
  Plus,
  Check,
  CheckCircle2,
  Settings,
  Shield,
  User,
} from "lucide-vue-next";
import { toKhmerDigits } from "~/lib/khmer-calendar";
import type {
  LeaveBalance,
  LeaveCode,
  LeaveTransaction,
  RosterPreferences,
  RosterShift,
} from "~/types/roster";

const props = defineProps<{
  teleportTarget?: HTMLElement | null;
  open: boolean;
  preferences: RosterPreferences;
  shifts: RosterShift[];
  balances: LeaveBalance[];
  transactions: LeaveTransaction[];
  khmer: boolean;
  year: number;
  busy: boolean;
  saved?: boolean;
  error?: string;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "savePreferences", prefs: Partial<RosterPreferences>): void;
  (
    e: "createShift",
    shift: {
      code: string;
      startTime: string;
      endTime: string;
      isOvernight?: boolean;
      isDefault?: boolean;
    },
  ): void;
  (e: "updateShift", id: string, shift: Partial<RosterShift>): void;
  (
    e: "recordLeaveAdjustment",
    adj: {
      leaveCode: LeaveCode;
      year: number;
      kind: "OPENING_BALANCE" | "EARNED" | "ADJUSTMENT";
      halfDays: number;
      note?: string;
    },
  ): void;
}>();

const activeTab = ref<"balances" | "shifts" | "preferences" | "general">(
  "balances",
);

// Form states for Leave Adjustment
const showAdjustmentForm = ref(false);
const adjLeaveCode = ref<LeaveCode>("AL");
const adjKind = ref<"OPENING_BALANCE" | "EARNED" | "ADJUSTMENT">("OPENING_BALANCE");
const adjDays = ref<number>(1);
const adjNote = ref<string>("");

// Form states for Shift Creation
const showNewShiftForm = ref(false);
const newShiftCode = ref("");
const newShiftStart = ref("09:00");
const newShiftEnd = ref("18:30");
const newShiftOvernight = ref(false);
const newShiftDefault = ref(false);

// Local editable preferences
const localSaturdayOff = ref(props.preferences.saturdayOff);
const localSundayOff = ref(props.preferences.sundayOff);
const localHolidaysOff = ref(props.preferences.publicHolidaysOff);
const localDefaultShift = ref(props.preferences.defaultShiftCode || "K123");
const localPrdAllowance = ref(props.preferences.monthlyPrdAllowance || 7);
const localDisplayName = ref(props.preferences.displayName || "");
const localStatusFlowEnabled = ref(props.preferences.statusFlowEnabled ?? false);

watch(() => [props.open, props.preferences], () => {
  if (!props.open) return;
  localSaturdayOff.value = props.preferences.saturdayOff;
  localSundayOff.value = props.preferences.sundayOff;
  localHolidaysOff.value = props.preferences.publicHolidaysOff;
  localDefaultShift.value = props.preferences.defaultShiftCode || "K123";
  localPrdAllowance.value = Math.max(0, Math.min(7, props.preferences.monthlyPrdAllowance ?? 7));
  localDisplayName.value = props.preferences.displayName || "";
  localStatusFlowEnabled.value = props.preferences.statusFlowEnabled ?? false;
}, { immediate: true });

function d(val: number | string) {
  return props.khmer ? toKhmerDigits(val) : String(val);
}

function handleSavePreferences() {
  if (props.busy) return;
  emit("savePreferences", {
    statusFlowEnabled: localStatusFlowEnabled.value,
    saturdayOff: localSaturdayOff.value,
    sundayOff: localSundayOff.value,
    publicHolidaysOff: localHolidaysOff.value,
    defaultShiftCode: localDefaultShift.value,
    monthlyPrdAllowance: Number(localPrdAllowance.value),
    displayName: localDisplayName.value.trim() || null,
  });
}

function submitAdjustment() {
  if (props.busy) return;
  emit("recordLeaveAdjustment", {
    leaveCode: adjLeaveCode.value,
    year: props.year,
    kind: adjKind.value,
    halfDays: Math.round(Number(adjDays.value) * 2),
    note: adjNote.value.trim() || undefined,
  });
  showAdjustmentForm.value = false;
  adjNote.value = "";
}

function submitNewShift() {
  if (props.busy || !newShiftCode.value.trim()) return;
  emit("createShift", {
    code: newShiftCode.value.trim().toUpperCase(),
    startTime: newShiftStart.value,
    endTime: newShiftEnd.value,
    isOvernight: newShiftOvernight.value,
    isDefault: newShiftDefault.value,
  });
  showNewShiftForm.value = false;
  newShiftCode.value = "";
}

function toggleShiftDefault(shift: RosterShift) {
  if (props.busy) return;
  emit("updateShift", shift.id, { isDefault: true });
}

function toggleShiftActive(shift: RosterShift) {
  if (props.busy) return;
  emit("updateShift", shift.id, { isActive: !shift.isActive });
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
          class="relative w-full max-w-3xl max-h-[calc(100dvh-1.5rem)] overflow-y-auto overscroll-contain rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900"
          :class="{ 'font-khmer': khmer }"
          @keydown.esc.prevent="emit('close')"
        >
          <!-- Header -->
          <div class="flex items-start justify-between border-b border-slate-100 pb-4 dark:border-zinc-800">
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300">
                <Settings :size="20" />
              </div>
              <div>
                <h2 class="text-lg font-bold text-slate-900 dark:text-zinc-100">
                  {{ khmer ? "ការកំណត់តារាងវេនការងារ" : "My Roster Settings" }}
                  · {{ d(year) }}
                </h2>
                <p class="text-xs text-slate-500 dark:text-zinc-400">
                  {{ khmer ? "គ្រប់គ្រងសមតុល្យច្បាប់ វេនការងារ និងចំណង់ចំណូលចិត្ត" : "Manage leave balances, work shifts, and planning preferences" }}
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

          <!-- Tabs Navigation -->
          <div class="mt-4 flex overflow-x-auto border-b border-slate-200 text-xs font-semibold dark:border-zinc-800">
            <button
              type="button"
              class="shrink-0 whitespace-nowrap border-b-2 px-3 py-2.5 transition-all"
              :class="
                activeTab === 'balances'
                  ? 'border-teal-600 text-teal-600 dark:border-teal-400 dark:text-teal-400'
                  : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200'
              "
              @click="activeTab = 'balances'"
            >
              {{ khmer ? "សមតុល្យការឈប់សម្រាក" : "Leave Balances" }}
            </button>
            <button
              type="button"
              class="shrink-0 whitespace-nowrap border-b-2 px-3 py-2.5 transition-all"
              :class="
                activeTab === 'shifts'
                  ? 'border-teal-600 text-teal-600 dark:border-teal-400 dark:text-teal-400'
                  : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200'
              "
              @click="activeTab = 'shifts'"
            >
              {{ khmer ? "ការគ្រប់គ្រងវេន" : "Shift Management" }}
            </button>
            <button
              type="button"
              class="shrink-0 whitespace-nowrap border-b-2 px-3 py-2.5 transition-all"
              :class="
                activeTab === 'preferences'
                  ? 'border-teal-600 text-teal-600 dark:border-teal-400 dark:text-teal-400'
                  : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200'
              "
              @click="activeTab = 'preferences'"
            >
              {{ khmer ? "ចំណង់ចំណូលចិត្ត" : "Roster Preferences" }}
            </button>
            <button
              type="button"
              class="shrink-0 whitespace-nowrap border-b-2 px-3 py-2.5 transition-all"
              :class="
                activeTab === 'general'
                  ? 'border-teal-600 text-teal-600 dark:border-teal-400 dark:text-teal-400'
                  : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200'
              "
              @click="activeTab = 'general'"
            >
              {{ khmer ? "ទូទៅ" : "General" }}
            </button>
          </div>

          <!-- Tab Content Panels -->
          <div class="mt-4 max-h-[60vh] overflow-y-auto pr-1 text-xs">
            <!-- TAB A: LEAVE BALANCES -->
            <div v-if="activeTab === 'balances'" class="space-y-4">
              <div class="flex items-center justify-between">
                <div>
                  <h3 class="font-bold text-slate-900 dark:text-zinc-100">
                    {{ khmer ? "តារាងសមតុល្យច្បាប់សម្រាកប្រចាំឆ្នាំ" : "Annual Leave Balances" }}
                  </h3>
                  <p class="text-[11px] text-slate-500 dark:text-zinc-400">
                    {{ khmer ? "តាមដានសមតុល្យ AL និង PHL ដោយឡែកពីគ្នា" : "Track AL and PHL balances independently" }}
                  </p>
                </div>
                <button
                  type="button"
                  class="flex items-center gap-1 rounded-lg bg-teal-50 px-3 py-1.5 font-bold text-teal-700 hover:bg-teal-100 dark:bg-teal-950/40 dark:text-teal-300"
                  @click="showAdjustmentForm = !showAdjustmentForm"
                >
                  <Plus :size="14" />
                  {{ khmer ? "កត់ត្រាសមតុល្យ/ការកែតម្រូវ" : "Add Adjustment" }}
                </button>
              </div>

              <!-- Adjustment form modal/expandable -->
              <div
                v-if="showAdjustmentForm"
                class="rounded-xl border border-teal-200 bg-teal-50/50 p-4 dark:border-teal-900/60 dark:bg-teal-950/20"
              >
                <h4 class="font-bold text-teal-900 dark:text-teal-200">
                  {{ khmer ? "កត់ត្រាការកែតម្រូវសមតុល្យច្បាប់:" : "Record Balance Adjustment:" }}
                </h4>
                <div class="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-4">
                  <div>
                    <label class="block text-[11px] font-semibold text-slate-600 dark:text-zinc-300">
                      {{ khmer ? "ប្រភេទច្បាប់" : "Leave Code" }}
                    </label>
                    <select
                      v-model="adjLeaveCode"
                      class="mt-1 w-full rounded border border-slate-300 bg-white p-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-800"
                    >
                      <option value="AL">AL (Annual Leave)</option>
                      <option value="PHL">PHL (Public Holiday Leave)</option>
                    </select>
                  </div>
                  <div>
                    <label class="block text-[11px] font-semibold text-slate-600 dark:text-zinc-300">
                      {{ khmer ? "ប្រភេទប្រតិបត្តិការ" : "Transaction Kind" }}
                    </label>
                    <select
                      v-model="adjKind"
                      class="mt-1 w-full rounded border border-slate-300 bg-white p-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-800"
                    >
                      <option value="OPENING_BALANCE">Opening Balance (សមតុល្យដើមគ្រា)</option>
                      <option value="EARNED">Earned (ទទួលបន្ថែម)</option>
                      <option value="ADJUSTMENT">Manual Adjustment (កែតម្រូវដោយដៃ)</option>
                    </select>
                  </div>
                  <div>
                    <label class="block text-[11px] font-semibold text-slate-600 dark:text-zinc-300">
                      {{ khmer ? "ចំនួន (ថ្ងៃ)" : "Amount (Days)" }}
                    </label>
                    <input
                      v-model.number="adjDays"
                      type="number"
                      step="0.5"
                      min="-50"
                      max="100"
                      class="mt-1 w-full rounded border border-slate-300 bg-white p-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-800"
                    />
                  </div>
                  <div>
                    <label class="block text-[11px] font-semibold text-slate-600 dark:text-zinc-300">
                      {{ khmer ? "កំណត់ចំណាំ" : "Note" }}
                    </label>
                    <input
                      v-model="adjNote"
                      type="text"
                      placeholder="e.g. Carry-forward from 2025"
                      class="mt-1 w-full rounded border border-slate-300 bg-white p-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-800"
                    />
                  </div>
                </div>
                <div class="mt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    class="rounded border border-slate-300 px-3 py-1 text-xs text-slate-600 hover:bg-white dark:border-zinc-700 dark:text-zinc-300"
                    @click="showAdjustmentForm = false"
                  >
                    {{ khmer ? "បោះបង់" : "Cancel" }}
                  </button>
                  <button
                    type="button"
                    class="rounded bg-teal-600 px-3 py-1 text-xs font-bold text-white hover:bg-teal-700"
                    @click="submitAdjustment"
                    :disabled="busy"
                  >
                    {{ busy ? (khmer ? "កំពុងរក្សាទុក…" : "Saving…") : (khmer ? "រក្សាទុក" : "Save Adjustment") }}
                  </button>
                </div>
              </div>

              <!-- Balances summary table -->
              <div class="overflow-x-auto rounded-xl border border-slate-200 dark:border-zinc-800">
                <table class="w-full text-left">
                  <thead class="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-300">
                    <tr>
                      <th class="p-3">{{ khmer ? "កូដ" : "Code" }}</th>
                      <th class="p-3">{{ khmer ? "ដើមគ្រា" : "Opening" }}</th>
                      <th class="p-3">{{ khmer ? "បានទទួល" : "Earned" }}</th>
                      <th class="p-3">{{ khmer ? "កែតម្រូវ" : "Adjustments" }}</th>
                      <th class="p-3">{{ khmer ? "បានប្រើ (បញ្ជាក់)" : "Confirmed Used" }}</th>
                      <th class="p-3">{{ khmer ? "រង់ចាំ (Pending)" : "Pending" }}</th>
                      <th class="p-3 font-extrabold text-teal-700 dark:text-teal-400">{{ khmer ? "សមតុល្យនៅសល់" : "Available" }}</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100 font-mono text-xs dark:divide-zinc-800">
                    <tr v-for="b in balances" :key="b.leaveCode">
                      <td class="p-3 font-sans font-bold">
                        <span
                          class="rounded px-2 py-0.5"
                          :class="
                            b.leaveCode === 'AL'
                              ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                          "
                        >
                          {{ b.leaveCode }}
                        </span>
                      </td>
                      <td class="p-3">{{ d(b.openingBalanceHalfDays / 2) }}</td>
                      <td class="p-3">{{ d(b.earnedHalfDays / 2) }}</td>
                      <td class="p-3">{{ d(b.adjustmentHalfDays / 2) }}</td>
                      <td class="p-3 text-red-600 dark:text-red-400">{{ d(b.confirmedUsedHalfDays / 2) }}</td>
                      <td class="p-3 text-amber-600 dark:text-amber-400">{{ d(b.pendingHalfDays / 2) }}</td>
                      <td class="p-3 font-bold text-teal-700 dark:text-teal-400">{{ d(b.availableHalfDays / 2) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- Transactions History -->
              <div v-if="transactions.length" class="mt-4">
                <h4 class="mb-2 font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                  {{ khmer ? "ប្រវត្តិប្រតិបត្តិការសមតុល្យ (Audit Log)" : "Transaction History" }}
                </h4>
                <div class="max-h-40 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100 text-[11px] dark:border-zinc-800 dark:divide-zinc-800">
                  <div v-for="tx in transactions" :key="tx.id" class="flex items-center justify-between p-2">
                    <div>
                      <span class="font-bold">{{ tx.leaveCode }}</span> ·
                      <span class="text-slate-500">{{ tx.kind }}</span>
                      <p v-if="tx.note" class="text-slate-400">{{ tx.note }}</p>
                    </div>
                    <div class="font-mono font-bold" :class="tx.halfDays > 0 ? 'text-emerald-600' : 'text-red-600'">
                      {{ tx.halfDays > 0 ? `+${tx.halfDays / 2}` : `${tx.halfDays / 2}` }} {{ khmer ? "ថ្ងៃ" : "days" }}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- TAB B: SHIFTS MANAGEMENT -->
            <div v-else-if="activeTab === 'shifts'" class="space-y-4">
              <div class="flex items-center justify-between">
                <div>
                  <h3 class="font-bold text-slate-900 dark:text-zinc-100">
                    {{ khmer ? "បញ្ជីវេនការងារ" : "Working Shifts" }}
                  </h3>
                  <p class="text-[11px] text-slate-500 dark:text-zinc-400">
                    {{ khmer ? "បង្កើតកូដវេនផ្ទាល់ខ្លួន ឬកែសម្រួលម៉ោងវេនដែលមានស្រាប់" : "Configure standard and custom shifts (including overnight shifts)" }}
                  </p>
                </div>
                <button
                  type="button"
                  class="flex items-center gap-1 rounded-lg bg-teal-50 px-3 py-1.5 font-bold text-teal-700 hover:bg-teal-100 dark:bg-teal-950/40 dark:text-teal-300"
                  @click="showNewShiftForm = !showNewShiftForm"
                >
                  <Plus :size="14" />
                  {{ khmer ? "បន្ថែមវេនថ្មី" : "Add Shift" }}
                </button>
              </div>

              <!-- New Shift Form -->
              <div
                v-if="showNewShiftForm"
                class="rounded-xl border border-teal-200 bg-teal-50/50 p-4 dark:border-teal-900/60 dark:bg-teal-950/20"
              >
                <h4 class="font-bold text-teal-900 dark:text-teal-200">
                  {{ khmer ? "បន្ថែមវេនការងារថ្មី (e.g. STKL):" : "Add New Shift Code:" }}
                </h4>
                <div class="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div>
                    <label class="block text-[11px] font-semibold text-slate-600 dark:text-zinc-300">
                      {{ khmer ? "កូដវេន" : "Shift Code" }}
                    </label>
                    <input
                      v-model="newShiftCode"
                      type="text"
                      maxlength="16"
                      placeholder="e.g. STKL"
                      class="mt-1 w-full rounded border border-slate-300 bg-white p-1.5 font-mono text-xs uppercase dark:border-zinc-700 dark:bg-zinc-800"
                    />
                  </div>
                  <div>
                    <label class="block text-[11px] font-semibold text-slate-600 dark:text-zinc-300">
                      {{ khmer ? "ម៉ោងចូល" : "Start Time" }}
                    </label>
                    <input
                      v-model="newShiftStart"
                      type="time"
                      class="mt-1 w-full rounded border border-slate-300 bg-white p-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-800"
                    />
                  </div>
                  <div>
                    <label class="block text-[11px] font-semibold text-slate-600 dark:text-zinc-300">
                      {{ khmer ? "ម៉ោងចេញ" : "End Time" }}
                    </label>
                    <input
                      v-model="newShiftEnd"
                      type="time"
                      class="mt-1 w-full rounded border border-slate-300 bg-white p-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-800"
                    />
                  </div>
                  <div class="flex flex-col justify-center space-y-1">
                    <label class="flex items-center gap-1.5 text-[11px] text-slate-700 dark:text-zinc-300">
                      <input v-model="newShiftOvernight" type="checkbox" class="rounded" />
                      {{ khmer ? "ឆ្លងអធ្រាត្រ (Overnight)" : "Overnight" }}
                    </label>
                    <label class="flex items-center gap-1.5 text-[11px] text-slate-700 dark:text-zinc-300">
                      <input v-model="newShiftDefault" type="checkbox" class="rounded" />
                      {{ khmer ? "វេនលំនាំដើម" : "Default" }}
                    </label>
                  </div>
                </div>
                <div class="mt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    class="rounded border border-slate-300 px-3 py-1 text-xs text-slate-600 hover:bg-white dark:border-zinc-700 dark:text-zinc-300"
                    @click="showNewShiftForm = false"
                  >
                    {{ khmer ? "បោះបង់" : "Cancel" }}
                  </button>
                  <button
                    type="button"
                    class="rounded bg-teal-600 px-3 py-1 text-xs font-bold text-white hover:bg-teal-700"
                    @click="submitNewShift"
                    :disabled="busy"
                  >
                    {{ khmer ? "បង្កើតវេន" : "Create Shift" }}
                  </button>
                </div>
              </div>

              <!-- Shifts list table -->
              <div class="overflow-x-auto rounded-xl border border-slate-200 dark:border-zinc-800">
                <table class="w-full text-left">
                  <thead class="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-300">
                    <tr>
                      <th class="p-3">{{ khmer ? "កូដវេន" : "Shift Code" }}</th>
                      <th class="p-3">{{ khmer ? "ម៉ោងការងារ" : "Hours" }}</th>
                      <th class="p-3">{{ khmer ? "ឆ្លងអធ្រាត្រ" : "Overnight" }}</th>
                      <th class="p-3">{{ khmer ? "លំនាំដើម" : "Default" }}</th>
                      <th class="p-3">{{ khmer ? "ស្ថានភាព" : "Status" }}</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100 font-mono text-xs dark:divide-zinc-800">
                    <tr v-for="s in shifts" :key="s.id">
                      <td class="p-3 font-bold text-slate-900 dark:text-zinc-100">{{ s.code }}</td>
                      <td class="p-3 font-sans">{{ s.startTime }} - {{ s.endTime }}</td>
                      <td class="p-3 font-sans">
                        <span v-if="s.isOvernight" class="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                          {{ khmer ? "បាទ/ចាស" : "Yes" }}
                        </span>
                        <span v-else class="text-slate-400">-</span>
                      </td>
                      <td class="p-3">
                        <span
                          v-if="s.isDefault"
                          class="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                        >
                          {{ khmer ? "លំនាំដើម" : "Default" }}
                        </span>
                        <button
                          v-else
                          type="button"
                          class="text-[11px] text-slate-500 hover:text-teal-600 underline font-sans"
                          @click="toggleShiftDefault(s)"
                          :disabled="busy"
                        >
                          {{ khmer ? "កំណត់ជាលំនាំដើម" : "Set default" }}
                        </button>
                      </td>
                      <td class="p-3 font-sans">
                        <button
                          type="button"
                          class="rounded px-2 py-0.5 text-[10px] font-bold transition-colors"
                          :class="s.isActive ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-slate-100 text-slate-500 dark:bg-zinc-800'"
                          @click="toggleShiftActive(s)"
                          :disabled="busy"
                        >
                          {{ s.isActive ? (khmer ? "សកម្ម" : "Active") : (khmer ? "អសកម្ម" : "Inactive") }}
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- TAB C: ROSTER PREFERENCES -->
            <div v-else-if="activeTab === 'preferences'" class="space-y-4">
              <div>
                <h3 class="font-bold text-slate-900 dark:text-zinc-100">
                  {{ khmer ? "ចំណង់ចំណូលចិត្តនៃការបង្កើតតារាងវេន" : "Auto-Roster Preferences" }}
                </h3>
                <p class="text-[11px] text-slate-500 dark:text-zinc-400">
                  {{ khmer ? "កំណត់ថ្ងៃឈប់សម្រាកដែលអ្នកពេញចិត្ត និងលំដាប់អាទិភាពកាត់ច្បាប់" : "Configure preferred off days and leave consumption order" }}
                </p>
              </div>

              <div class="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-zinc-800">
                <label class="flex items-center justify-between gap-4 cursor-pointer">
                  <span class="text-xs text-slate-800 dark:text-zinc-200">
                    <strong class="block">{{ khmer ? "ប្រើលំហូរស្ថានភាព" : "Status flow" }}</strong>
                    <span class="block mt-1 text-slate-500 dark:text-zinc-400">{{ khmer ? "បិទ៖ បញ្ជាក់ភ្លាម និងកែសមតុល្យច្បាប់។ បើក៖ ប្រើ ព្រាង → ស្នើសុំ → បញ្ជាក់។" : "Off: confirm saved entries and update leave balances immediately. On: use Draft → Requested → Confirmed." }}</span>
                  </span>
                  <input v-model="localStatusFlowEnabled" type="checkbox" role="switch" :aria-checked="localStatusFlowEnabled" class="h-5 w-5 shrink-0 rounded text-teal-600 focus:ring-teal-500" />
                </label>
                <label class="flex items-center justify-between cursor-pointer">
                  <span class="text-xs text-slate-800 dark:text-zinc-200">
                    {{ khmer ? "ថ្ងៃសៅរ៍ ជាថ្ងៃពេញចិត្តឈប់សម្រាក" : "Saturday as preferred day off" }}
                  </span>
                  <input v-model="localSaturdayOff" type="checkbox" class="h-4 w-4 rounded text-teal-600 focus:ring-teal-500" />
                </label>

                <label class="flex items-center justify-between cursor-pointer">
                  <span class="text-xs text-slate-800 dark:text-zinc-200">
                    {{ khmer ? "ថ្ងៃអាទិត្យ ជាថ្ងៃពេញចិត្តឈប់សម្រាក" : "Sunday as preferred day off" }}
                  </span>
                  <input v-model="localSundayOff" type="checkbox" class="h-4 w-4 rounded text-teal-600 focus:ring-teal-500" />
                </label>

                <label class="flex items-center justify-between cursor-pointer">
                  <span class="text-xs text-slate-800 dark:text-zinc-200">
                    {{ khmer ? "ថ្ងៃបុណ្យជាតិកម្ពុជា ជាថ្ងៃពេញចិត្តឈប់សម្រាក" : "Cambodian public holidays as preferred days off" }}
                  </span>
                  <input v-model="localHolidaysOff" type="checkbox" class="h-4 w-4 rounded text-teal-600 focus:ring-teal-500" />
                </label>

                <div class="pt-2 border-t border-slate-100 dark:border-zinc-800">
                  <label class="block text-xs font-semibold text-slate-700 dark:text-zinc-300">
                    {{ khmer ? "កូតា PRD ប្រចាំខែ (ថ្ងៃ)" : "Monthly PRD Allowance (Days)" }}
                  </label>
                  <input
                    v-model.number="localPrdAllowance"
                    type="number"
                    min="0"
                    max="7"
                    class="mt-1 w-32 rounded border border-slate-300 bg-white p-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-800"
                  />
                </div>

                <div>
                  <label class="block text-xs font-semibold text-slate-700 dark:text-zinc-300">
                    {{ khmer ? "វេនការងារលំនាំដើម (Default Working Shift)" : "Default Working Shift" }}
                  </label>
                  <select
                    v-model="localDefaultShift"
                    class="mt-1 w-48 rounded border border-slate-300 bg-white p-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-800"
                  >
                    <option v-for="s in shifts" :key="s.id" :value="s.code">
                      {{ s.code }} ({{ s.startTime }} - {{ s.endTime }})
                    </option>
                  </select>
                </div>

                <div class="rounded-lg bg-slate-50 p-3 text-[11px] text-slate-600 dark:bg-zinc-800/60 dark:text-zinc-300">
                  <span class="font-bold">{{ khmer ? "លំដាប់អាទិភាពនៃការបែងចែក:" : "Allocation Priority Order:" }}</span>
                  PRD → PHL → AL
                </div>
              </div>

              <div class="flex justify-end">
                <button
                  type="button"
                  class="rounded-lg bg-teal-600 px-4 py-2 text-xs font-bold text-white hover:bg-teal-700"
                  @click="handleSavePreferences"
                  :disabled="busy"
                >
                  {{ busy ? (khmer ? "កំពុងរក្សាទុក…" : "Saving…") : (khmer ? "រក្សាទុកចំណង់ចំណូលចិត្ត" : "Save Preferences") }}
                </button>
              </div>
            </div>

            <!-- TAB D: GENERAL -->
            <div v-else-if="activeTab === 'general'" class="space-y-4">
              <div>
                <h3 class="font-bold text-slate-900 dark:text-zinc-100">
                  {{ khmer ? "ព័ត៌មានទូទៅ" : "General Information" }}
                </h3>
                <p class="text-[11px] text-slate-500 dark:text-zinc-400">
                  {{ khmer ? "ឈ្មោះបង្ហាញ និងតំបន់ពេលវេលា" : "Display options and metadata" }}
                </p>
              </div>

              <div class="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-zinc-800">
                <div>
                  <label class="block text-xs font-semibold text-slate-700 dark:text-zinc-300">
                    {{ khmer ? "ឈ្មោះបុគ្គលិក (បង្ហាញលើតារាងនាំចេញ)" : "Employee Display Name (shown on exports)" }}
                  </label>
                  <input
                    v-model="localDisplayName"
                    type="text"
                    maxlength="64"
                    placeholder="e.g. Sok Piseth"
                    class="mt-1 w-full max-w-sm rounded border border-slate-300 bg-white p-2 text-xs dark:border-zinc-700 dark:bg-zinc-800"
                  />
                </div>

                <div class="pt-2 text-xs text-slate-500 dark:text-zinc-400">
                  <span class="font-semibold text-slate-700 dark:text-zinc-300">{{ khmer ? "តំបន់ពេលវេលា:" : "Timezone:" }}</span>
                  Asia/Phnom_Penh (UTC+7)
                </div>
              </div>

              <div class="flex justify-end">
                <button
                  type="button"
                  class="rounded-lg bg-teal-600 px-4 py-2 text-xs font-bold text-white hover:bg-teal-700"
                  @click="handleSavePreferences"
                  :disabled="busy"
                >
                  {{ busy ? (khmer ? "កំពុងរក្សាទុក…" : "Saving…") : (khmer ? "រក្សាទុក" : "Save") }}
                </button>
              </div>
            </div>
          </div>
          <p v-if="busy" role="status" class="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:bg-zinc-800 dark:text-zinc-300">{{ khmer ? "កំពុងរក្សាទុក…" : "Saving…" }}</p>
          <p v-else-if="error" role="alert" class="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{{ error }}</p>
          <p v-else-if="saved" role="status" class="mt-4 flex items-center gap-2 rounded-lg bg-teal-50 px-3 py-2 text-sm font-semibold text-teal-700 dark:bg-teal-950/40 dark:text-teal-300"><CheckCircle2 :size="16" aria-hidden="true" />{{ khmer ? "បានរក្សាទុកដោយជោគជ័យ។" : "Saved successfully." }}</p>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
