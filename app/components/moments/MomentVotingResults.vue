<script setup lang="ts">
import { BarChart3, LockKeyhole, UserRoundCheck } from "lucide-vue-next";
import type { MomentSummary } from "~/types/moment";

const props = defineProps<{ moment: MomentSummary }>();
const { copy, isKhmer } = useMomentLanguage();
const managerCopy = computed(() => copy.value.manager);
const summary = computed(() => props.moment.pollSummary);
const modeLabel = computed(() => {
  if (summary.value?.identityMode === "LOGIN_REQUIRED") return managerCopy.value.loginMode;
  if (summary.value?.identityMode === "NAME_REQUIRED") return managerCopy.value.namedMode;
  return managerCopy.value.anonymousMode;
});
const percent = (votes: number) => summary.value?.totalVotes
  ? Math.round((votes / summary.value.totalVotes) * 100)
  : 0;
</script>

<template>
  <section class="vote-results" :class="{ 'is-khmer': isKhmer }">
    <header>
      <div>
        <p class="kicker"><BarChart3 class="h-4 w-4" />{{ managerCopy.votingDetails }}</p>
        <h3>{{ managerCopy.totalParticipation(summary?.totalVotes ?? 0) }}</h3>
      </div>
      <span class="mode"><LockKeyhole v-if="summary?.identityMode === 'LOGIN_REQUIRED'" class="h-4 w-4" /><UserRoundCheck v-else class="h-4 w-4" />{{ modeLabel }}</span>
    </header>
    <p v-if="!summary?.totalVotes" class="empty">{{ managerCopy.noVotes }}</p>
    <div v-else class="results-grid">
      <article v-for="result in summary.results" :key="result.optionId">
        <div class="result-heading"><strong>{{ result.label }}</strong><span>{{ result.votes }} · {{ percent(result.votes) }}%</span></div>
        <div class="bar"><i :style="{ width: `${percent(result.votes)}%` }" /></div>
        <p v-if="result.voters?.length"><b>{{ managerCopy.votersForOption }}:</b> {{ result.voters.join(', ') }}</p>
      </article>
    </div>
  </section>
</template>

<style scoped>
.vote-results { margin-top: .75rem; border: 1px solid rgb(226 232 240); border-radius: 1rem; background: white; padding: 1.25rem; }
.vote-results header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
.kicker, .mode { display: inline-flex; align-items: center; gap: .4rem; color: #be315a; font-size: .75rem; font-weight: 800; }
.vote-results h3 { margin-top: .35rem; font-size: 1.15rem; font-weight: 800; }
.mode { border-radius: 999px; background: rgb(255 241 242); padding: .45rem .7rem; }
.empty { margin-top: 1rem; color: #64748b; font-size: .85rem; }
.results-grid { display: grid; margin-top: 1rem; gap: .75rem; }
.results-grid article { border-radius: .85rem; background: #f8fafc; padding: .9rem; }
.result-heading { display: flex; justify-content: space-between; gap: 1rem; font-size: .85rem; }
.result-heading span, .results-grid p { color: #64748b; }
.bar { margin-top: .55rem; height: .45rem; overflow: hidden; border-radius: 999px; background: #e2e8f0; }
.bar i { display: block; height: 100%; border-radius: inherit; background: #dc4f76; }
.results-grid p { margin-top: .55rem; font-size: .75rem; line-height: 1.6; }
.is-khmer { font-family: "Hanuman", ui-sans-serif, system-ui, sans-serif; }
:global(html.dark .vote-results) { border-color: rgb(255 255 255 / .1); background: rgb(255 255 255 / .05); }
:global(html.dark .mode) { background: rgb(244 63 94 / .12); color: #fda4af; }
:global(html.dark .results-grid article) { background: rgb(255 255 255 / .05); }
:global(html.dark .bar) { background: rgb(255 255 255 / .12); }
:global(html.dark .empty), :global(html.dark .result-heading span), :global(html.dark .results-grid p) { color: rgb(255 255 255 / .6); }
@media (min-width: 640px) { .results-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
</style>
