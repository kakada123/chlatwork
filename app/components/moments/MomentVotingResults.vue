<script setup lang="ts">
import {
  BarChart3,
  CalendarClock,
  ChevronDown,
  History,
  ImagePlus,
  LockKeyhole,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  Trophy,
  UserRoundCheck,
} from "lucide-vue-next";
import type { MomentPollResult, MomentSummary } from "~/types/moment";
import { prepareMomentImage } from "~/lib/moment-image";

const props = withDefaults(defineProps<{ moment: MomentSummary; resetting?: boolean }>(), { resetting: false });
const emit = defineEmits<{ reset: [moment: MomentSummary]; updated: [] }>();
const { copy, isKhmer } = useMomentLanguage();
const managerCopy = computed(() => copy.value.manager);
const summary = computed(() => props.moment.pollSummary);
const schedule = computed(() => props.moment.pollSchedule);
const insights = computed(() => props.moment.pollInsights);
const editingOptions = ref(false);
const savingOptions = ref(false);
const optionError = ref("");
const uploadingOption = ref("");
const optionDraft = ref<Array<{ key: string; id?: string; label: string; hasVotes: boolean }>>([]);
const originalOptionIds = ref<string[]>([]);
let nextDraftOptionKey = 0;
const validOptions = computed(() => {
  const labels = optionDraft.value.map((option) => option.label.trim().toLowerCase());
  return optionDraft.value.length >= 2 && optionDraft.value.length <= 15 &&
    labels.every(Boolean) && new Set(labels).size === labels.length;
});
const optionsChanged = computed(() => {
  const original = summary.value?.results ?? [];
  return original.length !== optionDraft.value.length || optionDraft.value.some((option, index) =>
    option.id !== original[index]?.optionId || option.label.trim() !== original[index]?.label,
  );
});

function startEditingOptions() {
  originalOptionIds.value = (summary.value?.results ?? []).map((result) => result.optionId);
  optionDraft.value = (summary.value?.results ?? []).map((result) => ({
    key: result.optionId,
    id: result.optionId,
    label: result.label,
    hasVotes: Boolean(result.hasVotes),
  }));
  optionError.value = "";
  editingOptions.value = true;
}

function cancelEditingOptions() {
  editingOptions.value = false;
  optionError.value = "";
  optionDraft.value = [];
  originalOptionIds.value = [];
}

async function addOption() {
  if (savingOptions.value || optionDraft.value.length >= 15) return;
  const key = `new-${++nextDraftOptionKey}`;
  optionDraft.value.push({ key, label: "", hasVotes: false });
  await nextTick();
  document.getElementById(`vote-option-${props.moment.id}-${key}`)?.focus();
}

function removeOption(key: string) {
  if (optionDraft.value.length <= 2) return;
  optionDraft.value = optionDraft.value.filter((option) => option.key !== key);
}

async function uploadOptionImage(event: Event, optionId: string) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = "";
  if (!file || uploadingOption.value) return;
  uploadingOption.value = optionId;
  optionError.value = "";
  try {
    const prepared = await prepareMomentImage(file);
    const body = new FormData();
    body.append("file", prepared);
    await $fetch(`/api/moments/${props.moment.id}/poll-options/${optionId}/image`, { method: "PUT", body });
    emit("updated");
  } catch {
    optionError.value = managerCopy.value.optionImageError;
  } finally {
    uploadingOption.value = "";
  }
}

async function saveOptions() {
  if (savingOptions.value || !optionsChanged.value) return;
  if (!validOptions.value) {
    optionError.value = managerCopy.value.pollOptionsInvalid;
    return;
  }
  savingOptions.value = true;
  optionError.value = "";
  try {
    await $fetch(`/api/moments/${props.moment.id}/poll-options`, {
      method: "PATCH",
      body: {
        expectedOptionIds: originalOptionIds.value,
        options: optionDraft.value.map((option) => ({ id: option.id, label: option.label.trim() })),
      },
    });
    cancelEditingOptions();
    emit("updated");
  } catch (error) {
    const fetchError = error as { statusCode?: number; status?: number };
    const status = fetchError.statusCode ?? fetchError.status;
    optionError.value = status === 409
      ? managerCopy.value.pollOptionsConflict
      : status === 400
        ? managerCopy.value.pollOptionsInvalid
        : managerCopy.value.pollOptionsError;
  } finally {
    savingOptions.value = false;
  }
}
const modeLabel = computed(() => {
  if (summary.value?.identityMode === "LOGIN_REQUIRED") return managerCopy.value.loginMode;
  if (summary.value?.identityMode === "NAME_REQUIRED") return managerCopy.value.namedMode;
  return managerCopy.value.anonymousMode;
});
const leaders = computed(() => {
  const results = summary.value?.results ?? [];
  const highest = Math.max(0, ...results.map((result) => result.votes));
  return highest ? results.filter((result) => result.votes === highest) : [];
});
const leaderIds = computed(() => new Set(leaders.value.map((result) => result.optionId)));
const percent = (votes: number, total = summary.value?.totalVotes ?? 0) =>
  total ? Math.round((votes / total) * 100) : 0;
const decisionCopy = computed(() => {
  if (!leaders.value.length) return managerCopy.value.noDecisionYet;
  if (leaders.value.length > 1)
    return managerCopy.value.currentTie(
      leaders.value.map((result) => result.label).join(", "),
      leaders.value[0]?.votes ?? 0,
    );
  const leader = leaders.value[0]!;
  return managerCopy.value.currentLeader(leader.label, leader.votes, percent(leader.votes));
});
const scheduleTime = computed(() =>
  schedule.value
    ? `${String(schedule.value.sendHour).padStart(2, "0")}:${String(schedule.value.sendMinute).padStart(2, "0")}`
    : "",
);
const formatDate = (date: string) =>
  new Intl.DateTimeFormat(isKhmer.value ? "km-KH" : "en-GB", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00.000Z`));
const votedResults = (results: MomentPollResult[]) => results.filter((result) => result.votes > 0);
</script>

<template>
  <section class="vote-results" :class="{ 'is-khmer': isKhmer }">
    <header>
      <div>
        <p class="kicker"><BarChart3 class="h-4 w-4" />{{ managerCopy.votingDetails }}</p>
        <h3>{{ managerCopy.totalParticipation(summary?.totalVotes ?? 0) }}</h3>
        <p v-if="summary?.voteDate" class="round-date">
          {{ managerCopy.todayRound(formatDate(summary.voteDate)) }}
        </p>
      </div>
      <div class="header-actions">
        <span class="mode"
          ><LockKeyhole v-if="summary?.identityMode === 'LOGIN_REQUIRED'" class="h-4 w-4" /><UserRoundCheck
            v-else
            class="h-4 w-4"
          />{{ modeLabel }}</span
        >
        <button
          v-if="!editingOptions"
          type="button"
          class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-white/15 dark:text-white dark:hover:bg-white/10"
          @click="startEditingOptions"
        >
          <Pencil class="h-4 w-4" aria-hidden="true" />
          {{ managerCopy.editPollOptions }}
        </button>
        <button
          type="button"
          class="reset-button"
          :disabled="resetting || (!summary?.totalVotes && !summary?.roundId)"
          @click="emit('reset', moment)"
        >
          <RotateCcw class="h-4 w-4" :class="{ 'animate-spin': resetting }" aria-hidden="true" />
          {{ resetting ? managerCopy.resettingVotes : managerCopy.resetVotes }}
        </button>
      </div>
    </header>

    <form v-if="editingOptions" class="mt-4 rounded-xl border border-slate-200 p-4 dark:border-white/10" @submit.prevent="saveOptions">
      <h4 class="text-sm font-bold">{{ managerCopy.editPollOptions }}</h4>
      <p class="mt-1 text-xs leading-5 text-slate-500 dark:text-white/55">{{ managerCopy.pollOptionsHelp }}</p>
      <div class="mt-3 space-y-2">
        <div v-for="(option, index) in optionDraft" :key="option.key" class="flex items-center gap-2">
          <img v-if="summary?.results.find((result) => result.optionId === option.id)?.imageId" :src="`/api/moments/${moment.slug}/media/${summary.results.find((result) => result.optionId === option.id)?.imageId}`" alt="" class="h-10 w-10 rounded-lg object-cover" />
          <label :for="`vote-option-${moment.id}-${option.key}`" class="sr-only">{{ managerCopy.pollOptionLabel(index + 1) }}</label>
          <input
            :id="`vote-option-${moment.id}-${option.key}`"
            v-model="option.label"
            maxlength="120"
            :disabled="option.hasVotes || savingOptions"
            class="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 disabled:opacity-60 dark:border-white/15 dark:bg-slate-900 dark:text-white"
          />
          <label v-if="option.id" class="cursor-pointer rounded-lg border border-slate-300 p-2 dark:border-white/15" :aria-label="managerCopy.optionImage"><ImagePlus class="h-4 w-4" aria-hidden="true" /><span class="sr-only">{{ managerCopy.optionImage }}</span><input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif" class="sr-only" :disabled="Boolean(uploadingOption)" @change="option.id && uploadOptionImage($event, option.id)" /></label>
          <button
            type="button"
            class="rounded-lg border border-red-200 p-2 text-red-600 disabled:opacity-40 dark:border-red-300/20 dark:text-red-300"
            :aria-label="managerCopy.removePollOption(option.label || managerCopy.pollOptionLabel(index + 1))"
            :disabled="option.hasVotes || optionDraft.length <= 2 || savingOptions"
            @click="removeOption(option.key)"
          >
            <Trash2 class="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
      <button v-if="optionDraft.length < 15" type="button" class="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-white/15 dark:text-white dark:hover:bg-white/10" :disabled="savingOptions" @click="addOption"><Plus class="h-4 w-4" aria-hidden="true" />{{ managerCopy.addPollOption }}</button>
      <p v-if="optionError" class="mt-3 text-xs font-semibold text-red-600 dark:text-red-300" role="alert">{{ optionError }}</p>
      <div class="mt-4 flex flex-wrap gap-2">
        <button type="submit" class="rounded-lg bg-rose-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50" :disabled="savingOptions || !optionsChanged">
          {{ savingOptions ? managerCopy.savingPollOptions : managerCopy.savePollOptions }}
        </button>
        <button type="button" class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold dark:border-white/15" :disabled="savingOptions" @click="cancelEditingOptions">
          {{ managerCopy.cancelPollOptions }}
        </button>
      </div>
    </form>

    <div class="daily-card" :class="{ active: schedule?.enabled }">
      <CalendarClock class="h-5 w-5" aria-hidden="true" />
      <div>
        <strong>{{ managerCopy.dailyVoting }}</strong>
        <p v-if="schedule?.enabled">
          {{
            managerCopy.dailyScheduleActive(
              schedule.telegramChatTitle || managerCopy.telegramGroup,
              scheduleTime,
              schedule.timeZone,
            )
          }}
        </p>
        <p v-else>{{ managerCopy.dailyScheduleHelp }}</p>
        <code v-if="!schedule?.enabled">/dailyvote</code>
      </div>
    </div>

    <div v-if="summary?.totalVotes" class="decision-card">
      <Trophy class="h-5 w-5" aria-hidden="true" />
      <div>
        <span>{{ managerCopy.currentDecision }}</span
        ><strong>{{ decisionCopy }}</strong>
      </div>
    </div>
    <p v-else class="empty">{{ managerCopy.noVotes }}</p>

    <div v-if="summary?.totalVotes" class="results-grid">
      <article
        v-for="result in summary.results"
        :key="result.optionId"
        :class="{ leader: leaderIds.has(result.optionId) }"
      >
        <div class="result-heading">
          <img v-if="result.imageId" :src="`/api/moments/${moment.slug}/media/${result.imageId}`" alt="" class="mr-2 h-9 w-9 rounded-lg object-cover" />
          <strong
            >{{ result.label }}
            <small v-if="leaderIds.has(result.optionId)">{{
              leaders.length > 1 ? managerCopy.tied : managerCopy.leading
            }}</small></strong
          >
          <span>{{ result.votes }} · {{ percent(result.votes) }}%</span>
        </div>
        <div class="bar">
          <i :style="{ width: `${percent(result.votes)}%` }" />
        </div>
        <p v-if="result.voters?.length">
          <b>{{ managerCopy.votersForOption }}:</b>
          {{ result.voters.join(", ") }}
        </p>
      </article>
    </div>

    <section v-if="insights?.daysTracked" class="history-section">
      <div class="history-heading">
        <div>
          <p class="kicker"><History class="h-4 w-4" />{{ managerCopy.voteHistory }}</p>
          <h4>
            {{ managerCopy.historySummary(insights.daysTracked, insights.totalVotes) }}
          </h4>
        </div>
        <div v-if="insights.topChoice" class="top-choice">
          <Trophy class="h-4 w-4" />
          <span>{{ managerCopy.mostSelected }}</span>
          <strong>{{ insights.topChoice.label }}</strong>
          <small>{{ managerCopy.daysLed(insights.topChoice.daysLed) }}</small>
        </div>
      </div>
      <div class="day-list">
        <details v-for="day in insights.recentDays" :key="day.date">
          <summary>
            <span>{{ formatDate(day.date) }}</span
            ><span>{{ managerCopy.totalParticipation(day.totalVotes) }} <ChevronDown class="h-4 w-4" /></span>
          </summary>
          <div class="day-results">
            <div v-for="result in votedResults(day.results)" :key="result.optionId">
              <p>
                <strong>{{ result.label }}</strong
                ><span>{{ result.votes }} · {{ percent(result.votes, day.totalVotes) }}%</span>
              </p>
              <small v-if="result.voters?.length"
                >{{ managerCopy.votersForOption }}: {{ result.voters.join(", ") }}</small
              >
            </div>
          </div>
        </details>
      </div>
    </section>
  </section>
</template>

<style scoped>
.vote-results {
  margin-top: 0.75rem;
  border: 1px solid rgb(226 232 240);
  border-radius: 1rem;
  background: white;
  padding: 1.25rem;
}
.vote-results header,
.history-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}
.header-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.5rem;
}
.kicker,
.mode {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  color: #be315a;
  font-size: 0.75rem;
  font-weight: 800;
}
.reset-button {
  display: inline-flex;
  min-height: 2.75rem;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  border: 1px solid rgb(254 202 202);
  border-radius: 0.75rem;
  padding: 0.55rem 0.75rem;
  color: #dc2626;
  font-size: 0.75rem;
  font-weight: 800;
  transition:
    background-color 0.15s ease,
    opacity 0.15s ease;
}
.reset-button:hover:not(:disabled) {
  background: #fef2f2;
}
.reset-button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}
.vote-results h3 {
  margin-top: 0.35rem;
  font-size: 1.15rem;
  font-weight: 800;
}
.round-date {
  margin-top: 0.2rem;
  color: #64748b;
  font-size: 0.75rem;
}
.mode {
  border-radius: 999px;
  background: rgb(255 241 242);
  padding: 0.45rem 0.7rem;
}
.daily-card,
.decision-card {
  display: flex;
  margin-top: 1rem;
  gap: 0.75rem;
  border-radius: 0.9rem;
  padding: 0.9rem;
}
.daily-card {
  border: 1px dashed #cbd5e1;
  color: #475569;
}
.daily-card.active {
  border-style: solid;
  border-color: #a7f3d0;
  background: #ecfdf5;
  color: #065f46;
}
.daily-card strong,
.decision-card strong {
  display: block;
  font-size: 0.85rem;
}
.daily-card p {
  margin-top: 0.15rem;
  font-size: 0.75rem;
  line-height: 1.55;
}
.daily-card code {
  display: inline-block;
  margin-top: 0.4rem;
  border-radius: 0.4rem;
  background: #0f172a;
  padding: 0.2rem 0.45rem;
  color: white;
  font-size: 0.75rem;
}
.decision-card {
  align-items: center;
  background: #fff1f2;
  color: #9f1239;
}
.decision-card span {
  display: block;
  font-size: 0.7rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.empty {
  margin-top: 1rem;
  color: #64748b;
  font-size: 0.85rem;
}
.results-grid {
  display: grid;
  margin-top: 1rem;
  gap: 0.75rem;
}
.results-grid article {
  border: 1px solid transparent;
  border-radius: 0.85rem;
  background: #f8fafc;
  padding: 0.9rem;
}
.results-grid article.leader {
  border-color: #fda4af;
  background: #fff1f2;
}
.result-heading {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  font-size: 0.85rem;
}
.result-heading strong small {
  margin-left: 0.3rem;
  border-radius: 999px;
  background: #be315a;
  padding: 0.15rem 0.4rem;
  color: white;
  font-size: 0.6rem;
}
.result-heading span,
.results-grid p {
  color: #64748b;
}
.bar {
  margin-top: 0.55rem;
  height: 0.45rem;
  overflow: hidden;
  border-radius: 999px;
  background: #e2e8f0;
}
.bar i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: #dc4f76;
}
.results-grid p {
  margin-top: 0.55rem;
  font-size: 0.75rem;
  line-height: 1.6;
}
.history-section {
  margin-top: 1.25rem;
  border-top: 1px solid #e2e8f0;
  padding-top: 1.25rem;
}
.history-section h4 {
  margin-top: 0.35rem;
  font-size: 0.9rem;
  font-weight: 800;
}
.top-choice {
  display: grid;
  grid-template-columns: auto auto;
  align-items: center;
  gap: 0.1rem 0.35rem;
  border-radius: 0.8rem;
  background: #fffbeb;
  padding: 0.65rem 0.8rem;
  color: #92400e;
  font-size: 0.7rem;
}
.top-choice strong,
.top-choice small {
  grid-column: 2;
}
.top-choice strong {
  font-size: 0.85rem;
}
.day-list {
  display: grid;
  margin-top: 0.75rem;
  gap: 0.5rem;
}
.day-list details {
  border-radius: 0.75rem;
  background: #f8fafc;
}
.day-list summary {
  display: flex;
  cursor: pointer;
  list-style: none;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.75rem;
  font-size: 0.78rem;
  font-weight: 700;
}
.day-list summary::-webkit-details-marker {
  display: none;
}
.day-list summary span:last-child {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  color: #64748b;
}
.day-list details[open] summary svg {
  transform: rotate(180deg);
}
.day-results {
  display: grid;
  gap: 0.5rem;
  border-top: 1px solid #e2e8f0;
  padding: 0.75rem;
}
.day-results p {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  font-size: 0.75rem;
}
.day-results small {
  display: block;
  margin-top: 0.15rem;
  color: #64748b;
  font-size: 0.7rem;
}
.is-khmer {
  font-family: "Hanuman", ui-sans-serif, system-ui, sans-serif;
}
:global(html.dark .vote-results) {
  border-color: rgb(255 255 255 / 0.1);
  background: rgb(255 255 255 / 0.05);
}
:global(html.dark .mode),
:global(html.dark .decision-card) {
  background: rgb(244 63 94 / 0.12);
  color: #fda4af;
}
:global(html.dark .daily-card) {
  border-color: rgb(255 255 255 / 0.18);
  color: rgb(255 255 255 / 0.65);
}
:global(html.dark .daily-card.active) {
  border-color: rgb(52 211 153 / 0.25);
  background: rgb(16 185 129 / 0.1);
  color: #6ee7b7;
}
:global(html.dark .reset-button) {
  border-color: rgb(248 113 113 / 0.3);
  color: #fca5a5;
}
:global(html.dark .reset-button:hover:not(:disabled)) {
  background: rgb(248 113 113 / 0.1);
}
:global(html.dark .results-grid article),
:global(html.dark .day-list details) {
  background: rgb(255 255 255 / 0.05);
}
:global(html.dark .results-grid article.leader) {
  border-color: rgb(251 113 133 / 0.35);
  background: rgb(244 63 94 / 0.1);
}
:global(html.dark .bar) {
  background: rgb(255 255 255 / 0.12);
}
:global(html.dark .history-section),
:global(html.dark .day-results) {
  border-color: rgb(255 255 255 / 0.1);
}
:global(html.dark .top-choice) {
  background: rgb(245 158 11 / 0.1);
  color: #fcd34d;
}
:global(html.dark .empty),
:global(html.dark .round-date),
:global(html.dark .result-heading span),
:global(html.dark .results-grid p),
:global(html.dark .day-list summary span:last-child),
:global(html.dark .day-results small) {
  color: rgb(255 255 255 / 0.6);
}
@media (min-width: 640px) {
  .results-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 639px) {
  .vote-results header,
  .history-heading {
    flex-direction: column;
  }
  .header-actions {
    justify-content: flex-start;
  }
  .top-choice {
    width: 100%;
  }
}
</style>
