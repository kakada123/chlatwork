<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import { X, CheckCheck } from "lucide-vue-next";
import { toKhmerDigits } from "~/lib/khmer-calendar";
import type {
  MonthlyRosterSummary,
  RosterDay,
  RosterEntryStatus,
} from "~/types/roster";
const props = defineProps<{
  open: boolean;
  days: RosterDay[];
  year: number;
  month: number;
  monthTitle: string;
  summary: MonthlyRosterSummary;
  busy: boolean;
  khmer: boolean;
  statusFlowEnabled: boolean;
  error?: string | null;
  teleportTarget?: HTMLElement | null;
}>();
const emit = defineEmits<{
  close: [];
  apply: [payload: { dates: string[]; status: RosterEntryStatus }];
}>();
const dialog = ref<HTMLDialogElement | null>(null);
const scope = ref<"month" | "dates">("month");
const selected = ref<string[]>([]);
const status = ref<RosterEntryStatus>("CONFIRMED");
const d = (value: number) =>
  props.khmer ? toKhmerDigits(value) : String(value);
const editable = computed(() =>
  props.days.filter((day) => !day.isLocked && (day.shiftCode || day.leaveCode)),
);
const editableMap = computed(
  () => new Map(editable.value.map((day) => [day.entryDate, day])),
);
const dates = computed(() =>
  Array.from({ length: props.summary.totalDays }, (_, index) => ({
    day: index + 1,
    key: `${props.year}-${String(props.month).padStart(2, "0")}-${String(index + 1).padStart(2, "0")}`,
  })),
);
const picked = computed(() =>
  scope.value === "month"
    ? editable.value
        .filter((day) => day.status !== "CANCELLED")
        .map((day) => day.entryDate)
    : selected.value.filter((key) => editableMap.value.has(key)),
);
function toggle(key: string) {
  if (props.busy || !editableMap.value.has(key)) return;
  selected.value = selected.value.includes(key)
    ? selected.value.filter((item) => item !== key)
    : [...selected.value, key];
}
function close() {
  if (!props.busy) emit("close");
}
watch(
  () => props.open,
  async (open) => {
    if (!open) {
      dialog.value?.close();
      return;
    }
    scope.value = "month";
    selected.value = [];
    status.value = "CONFIRMED";
    await nextTick();
    if (dialog.value && !dialog.value.open) dialog.value.showModal();
  },
  { immediate: true },
);
function apply() {
  if (picked.value.length && !props.busy)
    emit("apply", {
      dates: picked.value,
      status: props.statusFlowEnabled ? status.value : "CONFIRMED",
    });
}
</script>
<template>
  <Teleport :to="teleportTarget || 'body'">
    <dialog
      v-if="open"
      ref="dialog"
      class="roster-status-dialog"
      aria-labelledby="roster-status-title"
      @cancel.prevent="close"
      @click.self="close"
      @close="emit('close')"
    >
      <header class="status-modal-header">
        <div>
          <h2 id="roster-status-title">
            {{ khmer ? "ពិនិត្យ និងបញ្ជាក់តារាង" : "Review & confirm roster" }}
          </h2>
          <p>
            {{ monthTitle }} · {{ khmer ? "បានកំណត់" : "Assigned" }}
            {{ d(summary.totalDays - summary.unassignedDays) }} /
            {{ d(summary.totalDays) }}
          </p>
        </div>
        <button
          type="button"
          class="status-close"
          :disabled="busy"
          :aria-label="khmer ? 'បិទ' : 'Close'"
          @click="close"
        >
          <X :size="18" aria-hidden="true" />
        </button>
      </header>
      <div class="status-modal-body">
        <fieldset class="status-scope">
          <legend class="sr-only">
            {{ khmer ? "ជ្រើសថ្ងៃ" : "Choose dates" }}
          </legend>
          <label
            ><input
              v-model="scope"
              type="radio"
              value="month"
              :disabled="busy"
            />{{ khmer ? "ទាំងខែ" : "Whole month" }}</label
          ><label
            ><input
              v-model="scope"
              type="radio"
              value="dates"
              :disabled="busy"
            />{{ khmer ? "ជ្រើសថ្ងៃ" : "Choose dates" }}</label
          >
        </fieldset>
        <div v-if="scope === 'dates'" class="status-date-grid">
          <label
            v-for="date in dates"
            :key="date.key"
            class="status-date"
            :class="{ 'is-disabled': !editableMap.has(date.key) }"
            ><input
              type="checkbox"
              :checked="selected.includes(date.key)"
              :disabled="busy || !editableMap.has(date.key)"
              @change="toggle(date.key)"
            /><strong>{{ d(date.day) }}</strong
            ><small>{{
              editableMap.get(date.key)?.leaveCode ||
              editableMap.get(date.key)?.shiftCode ||
              (khmer ? "មិនទាន់កំណត់" : "Unassigned")
            }}</small></label
          >
        </div>
        <p class="status-count" aria-live="polite">
          {{
            khmer
              ? `បានជ្រើស ${d(picked.length)} ថ្ងៃ`
              : `${picked.length} days selected`
          }}
        </p>
        <label v-if="statusFlowEnabled" class="status-field"
          >{{ khmer ? "ស្ថានភាពថ្មី" : "New status"
          }}<ModernSelect v-model="status" :disabled="busy"
            ><option value="DRAFT">{{ khmer ? "ព្រាង" : "Draft" }}</option>
            <option value="REQUESTED">
              {{ khmer ? "ស្នើសុំ" : "Requested" }}
            </option>
            <option value="CONFIRMED">
              {{ khmer ? "បានបញ្ជាក់" : "Confirmed" }}
            </option>
            <option value="CANCELLED">
              {{ khmer ? "បានបោះបង់" : "Cancelled" }}
            </option></ModernSelect
          ></label
        >
        <p v-else class="status-help">
          {{
            khmer
              ? "វេនដែលអ្នករក្សាទុក ត្រូវបានបញ្ជាក់ដោយស្វ័យប្រវត្តិ។"
              : "Saved assignments are confirmed automatically."
          }}
        </p>
        <p class="status-help">
          {{
            khmer
              ? "ថ្ងៃដែលចាក់សោ ឬមិនទាន់កំណត់ នឹងមិនត្រូវកែទេ។"
              : "Locked and unassigned dates are skipped."
          }}
        </p>
        <p v-if="error" role="alert" class="status-error">{{ error }}</p>
      </div>
      <footer class="status-modal-footer">
        <button type="button" :disabled="busy" @click="close">
          {{ khmer ? "បោះបង់" : "Cancel" }}</button
        ><button
          type="button"
          class="status-apply"
          :disabled="busy || !picked.length"
          @click="apply"
        >
          <CheckCheck :size="16" aria-hidden="true" />{{
            khmer
              ? `បញ្ជាក់ ${d(picked.length)} ថ្ងៃ`
              : `Confirm ${picked.length} days`
          }}
        </button>
      </footer>
    </dialog>
  </Teleport>
</template>
<style scoped>
.roster-status-dialog {
  width: min(620px, calc(100vw - 24px));
  max-height: calc(100dvh - 24px);
  margin: auto;
  padding: 0;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  background: #fff;
  color: #1e293b;
  font-family: var(--app-font);
}
.roster-status-dialog[open] {
  display: flex;
  flex-direction: column;
}
.roster-status-dialog::backdrop {
  background: #02061799;
}
.status-modal-header,
.status-modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 18px;
  flex: none;
}
.status-modal-header {
  border-bottom: 1px solid #e2e8f0;
}
h2 {
  font-size: 16px;
  line-height: 1.7;
}
.status-modal-header p,
.status-help {
  color: #64748b;
  font-size: 12px;
  line-height: 1.8;
}
.status-close,
.status-modal-footer button {
  min-height: 44px;
  padding: 8px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 9px;
}
.status-close {
  display: grid;
  place-items: center;
  min-width: 44px;
}
.status-modal-body {
  padding: 16px 18px;
  overflow-y: auto;
  min-height: 0;
}
.status-scope {
  display: flex;
  gap: 10px;
  border: 0;
  padding: 0;
}
.status-scope label {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  padding: 12px;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  cursor: pointer;
  font-size: 13px;
}
input {
  accent-color: #32776e;
}
.status-date-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 6px;
  margin-top: 14px;
}
.status-date {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 3px 6px;
  align-items: center;
  padding: 8px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  cursor: pointer;
  font-size: 12px;
}
.status-date small {
  grid-column: 1 / -1;
  font-size: 10px;
  overflow: hidden;
  text-overflow: ellipsis;
}
.is-disabled {
  opacity: 0.4;
  cursor: default;
}
.status-count {
  margin: 14px 0;
  font-size: 13px;
  font-weight: 600;
}
.status-field {
  display: grid;
  gap: 6px;
  font-size: 12px;
  margin-bottom: 12px;
}
.status-error {
  color: #b91c1c;
  font-size: 12px;
  margin-top: 10px;
}
.status-modal-footer {
  justify-content: flex-end;
  border-top: 1px solid #e2e8f0;
}
.status-modal-footer .status-apply {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: #32776e;
  border-color: #32776e;
  color: white;
}
button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.dark .roster-status-dialog {
  background: #202124;
  color: #eeeae3;
  border-color: #373638;
}
.dark .status-help,
.dark .status-modal-header p {
  color: #aaa9a6;
}
@media (max-width: 540px) {
  .status-date-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}
</style>
