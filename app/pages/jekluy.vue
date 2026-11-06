<script setup lang="ts">
import { useLanguage } from "~/composables/useLanguage";
import { useAppI18n } from "~/composables/useAppI18n";
import { ArrowDown, ArrowRight, Check, Copy, Plus, RotateCcw, Share2, Trash2, Users } from "lucide-vue-next";
import ConfirmDialog from "~/components/ui/ConfirmDialog.vue";
import { formatJekLuyMoney, jekluyEmptySettlementMessage, JEKLUY_MAX_PARTICIPANTS } from "~/lib/jekluy";

const { t } = useAppI18n();
const { isKhmer } = useLanguage();

definePageMeta({ layout: "jekluy", localOnly: true, blankCanvas: true });
useSeoMeta({
  title: () => t("native.jekluy.jekluyEasilyCalculateWhoOwesWhom"),
  description: () => t("native.jekluy.enterEachPersonSNameAndContributionToFindOut"),
  ogTitle: () => t("native.jekluy.jekluyEasilySplitExpensesWithFriends"),
  ogDescription: () => t("native.jekluy.paidDifferentAmountsSeeEachPersonSShareAndRepayments"),
  ogLocale: () => isKhmer.value ? "km_KH" : "en_US",
  twitterTitle: () => t("native.jekluy.jekluyCalculateWhoOwesWhom"),
  twitterDescription: () => t("native.jekluy.enterNamesAndContributionsThenShareTheResultWithFriends"),
});
useHead(() => ({ htmlAttrs: { lang: isKhmer.value ? "km" : "en", "data-locale": isKhmer.value ? "km" : "en" } }));

const {
  draft, ready, pending, result, error, completedIds, storageMessage, shareMessage, manualCopy, sharing,
  addParticipant, removeParticipant, requestCurrency, requestReset, cancelPending, confirmPending,
  toggleCompleted, copyResult, shareResult,
} = useJekLuy(isKhmer);
const attempted = ref(false);
const resultPanel = ref<HTMLElement | null>(null);
const manualCopyInput = ref<HTMLTextAreaElement | null>(null);
const money = (amount: bigint) => formatJekLuyMoney(amount, draft.value.currency);
const visibleError = computed(() => error.value && (attempted.value || error.value.field === "amount") ? error.value : null);
const shareRange = computed(() => {
  if (!result.value) return "";
  if (draft.value.currency === "KHR") return money(result.value.baseShareCents);
  const shares = result.value.people.map((person) => person.shareCents);
  const lowest = shares.reduce((a, b) => a < b ? a : b);
  const highest = shares.reduce((a, b) => a > b ? a : b);
  return lowest === highest ? money(lowest) : `${money(lowest)} – ${money(highest)}`;
});
const remainderName = computed(() => result.value?.people.find((person) => person.id === result.value?.remainderPersonId)?.name);
const pendingTitle = computed(() => pending.value?.kind === "reset" ? t("native.jekluy.clearAllData") : t("native.jekluy.changeCurrency"));
const pendingDescription = computed(() => pending.value?.kind === "reset"
  ? t("native.jekluy.namesAmountsAndPaidMarkersWillBeRemovedFromThis")
  : t("native.jekluy.amountsAndPaidMarkersWillBeClearedNamesStayThe"));

async function addPerson() {
  const id = addParticipant();
  await nextTick();
  if (id) document.getElementById(`name-${id}`)?.focus();
}
async function showResult() {
  attempted.value = true;
  await nextTick();
  if (error.value?.participantId) {
    document.getElementById(`${error.value.field}-${error.value.participantId}`)?.focus();
    return;
  }
  resultPanel.value?.focus({ preventScroll: true });
  resultPanel.value?.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
}
function confirmAction() {
  confirmPending();
  attempted.value = false;
}
async function selectSummary() {
  await nextTick();
  manualCopyInput.value?.focus();
  manualCopyInput.value?.select();
}
</script>

<template>
  <div class="grid items-start gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-7">
    <section class="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700/70 dark:bg-[#101e30] sm:p-6" aria-labelledby="jekluy-participants-title">
      <div class="mb-5 flex items-center justify-between gap-2">
        <h2 id="jekluy-participants-title" class="flex items-center gap-2 text-base font-bold">
          <Users class="size-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />{{ t("native.jekluy.participants") }}
          <span class="grid min-w-7 place-items-center rounded-full bg-blue-50 px-2 text-xs tabular-nums text-blue-700 dark:bg-blue-400/10 dark:text-blue-300">{{ draft.participants.length }}</span>
        </h2>
        <button type="button" class="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl px-2 text-xs text-slate-500 hover:text-red-600 disabled:opacity-40 dark:text-slate-400" :disabled="!ready" @click="requestReset">
          <RotateCcw class="size-3.5" aria-hidden="true" />{{ t("native.jekluy.clear") }}
        </button>
      </div>

      <fieldset class="mb-6">
        <legend class="mb-2 text-xs font-semibold text-slate-500 dark:text-slate-400">{{ t("native.jekluy.chooseCurrency") }}</legend>
        <div class="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-950/50">
          <button v-for="currency in (['KHR', 'USD'] as const)" :key="currency" type="button" class="min-h-11 rounded-lg px-3 text-sm font-bold transition disabled:opacity-50" :class="draft.currency === currency ? 'bg-white text-blue-700 shadow-sm dark:bg-slate-700 dark:text-blue-200' : 'text-slate-500 dark:text-slate-400'" :aria-pressed="draft.currency === currency" :disabled="!ready" @click="requestCurrency(currency)">
            {{ currency === 'KHR' ? t("native.jekluy.riel") : t("native.jekluy.dollars") }}
          </button>
        </div>
      </fieldset>

      <form novalidate @submit.prevent="showResult">
        <div class="participant-grid mb-2 text-xs font-semibold text-slate-500 dark:text-slate-400" aria-hidden="true">
          <span>{{ t("native.jekluy.name") }}</span><span>{{ t("native.jekluy.amountPaid") }}</span><span />
        </div>
        <fieldset :disabled="!ready" class="space-y-3">
          <legend class="sr-only">{{ t("native.jekluy.participantNamesAndContributions") }}</legend>
          <div v-for="(person, index) in draft.participants" :key="person.id">
            <div class="participant-grid items-center">
              <label :for="`name-${person.id}`" class="sr-only">{{ t("native.jekluy.nameOfPerson") }} {{ index + 1 }}</label>
              <input :id="`name-${person.id}`" v-model="person.name" type="text" :placeholder="t(&quot;native.jekluy.person&quot;, { index: index + 1 })" maxlength="80" autocomplete="off" enterkeyhint="next" class="jekluy-input min-w-0" :aria-invalid="visibleError?.participantId === person.id && visibleError?.field === 'name' || undefined" :aria-describedby="visibleError?.participantId === person.id ? 'jekluy-error' : undefined" />
              <label :for="`amount-${person.id}`" class="sr-only">{{ t("native.jekluy.amountPaidByPerson") }} {{ index + 1 }} {{ t("native.jekluy.in") }}{{ draft.currency === 'KHR' ? t("native.jekluy.riel_2") : t("native.jekluy.dollars_2") }}</label>
              <div class="relative min-w-0">
                <input :id="`amount-${person.id}`" v-model="person.amount" type="text" :inputmode="draft.currency === 'KHR' ? 'numeric' : 'decimal'" :placeholder="draft.currency === 'KHR' ? '0' : '0.00'" maxlength="24" autocomplete="off" enterkeyhint="done" class="jekluy-input w-full min-w-0 pr-7 tabular-nums" :aria-invalid="visibleError?.participantId === person.id && visibleError?.field === 'amount' || undefined" :aria-describedby="visibleError?.participantId === person.id ? 'jekluy-error' : undefined" />
                <span class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-slate-400" aria-hidden="true">{{ draft.currency === 'KHR' ? t("native.jekluy.rielSymbol") : '$' }}</span>
              </div>
              <button type="button" class="grid size-11 place-items-center rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-25 dark:hover:bg-red-400/10" :disabled="draft.participants.length <= 2" :aria-label="t(&quot;native.jekluy.removePerson&quot;, { index: index + 1 })" @click="removeParticipant(person.id)">
                <Trash2 class="size-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </fieldset>
        <button type="button" class="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-blue-200 text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-40 dark:border-blue-400/30 dark:text-blue-300 dark:hover:bg-blue-400/5" :disabled="!ready || draft.participants.length >= JEKLUY_MAX_PARTICIPANTS" @click="addPerson">
          <Plus class="size-4" aria-hidden="true" />{{ t("native.jekluy.addParticipant") }}
        </button>
        <p v-if="visibleError" id="jekluy-error" role="alert" class="mt-3 text-sm leading-7 text-red-600 dark:text-red-300">{{ visibleError.message }}</p>
        <button type="submit" class="mt-5 inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-xl bg-[#12355b] px-4 py-3.5 text-sm font-bold text-white hover:bg-[#1b4b7d] disabled:opacity-40 dark:bg-blue-500 dark:hover:bg-blue-400" :disabled="!ready">
          {{ t("native.jekluy.seeWhoOwesWhom") }}<ArrowDown class="size-4 md:rotate-[-90deg]" aria-hidden="true" />
        </button>
      </form>
      <p v-if="storageMessage" role="status" class="mt-4 text-xs leading-6 text-amber-700 dark:text-amber-300">{{ storageMessage }}</p>
    </section>

    <section id="results" ref="resultPanel" tabindex="-1" class="min-w-0 scroll-mt-5 outline-none md:sticky md:top-6" aria-labelledby="jekluy-results-title">
      <h2 id="jekluy-results-title" class="sr-only">{{ t("native.jekluy.calculationResults") }}</h2>
      <template v-if="result">
        <div class="rounded-2xl bg-[#12355b] p-5 text-white sm:p-6">
          <div class="flex items-center justify-between gap-3 text-sm text-blue-100">
            <span>{{ t("native.jekluy.totalAmount") }}</span><span>{{ result.people.length }} {{ t("native.jekluy.people") }}</span>
          </div>
          <p class="jekluy-money mt-2 text-3xl font-bold leading-relaxed tabular-nums sm:text-4xl">{{ money(result.totalCents) }}</p>
          <div class="mt-4 border-t border-white/15 pt-4">
            <p class="text-xs text-blue-100">{{ t("native.jekluy.eachPersonSShare") }}</p>
            <p class="jekluy-money mt-1 text-lg font-semibold tabular-nums">{{ shareRange }}</p>
          </div>
          <p v-if="result.remainderCents > 0n" class="mt-3 text-xs leading-6 text-blue-100">{{ t("native.jekluy.sharesAreRoundedTo100Remainder") }} {{ money(result.remainderCents) }} {{ remainderName ? t("native.jekluy.chargedTo", { remainderName: remainderName }) : t("native.jekluy.keptSeparate") }}{{ t("native.jekluy.period") }}</p>
        </div>

        <fieldset v-if="result.remainderCents > 0n" class="mt-4 space-y-2">
          <legend class="mb-2 text-xs font-semibold text-slate-500 dark:text-slate-400">{{ t("native.jekluy.handleTheRemainder") }}</legend>
          <label for="jekluy-remainder-mode" class="sr-only">{{ t("native.jekluy.remainderHandlingMethod") }}</label>
          <ModernSelect id="jekluy-remainder-mode" v-model="draft.remainderMode" class="jekluy-input w-full text-sm">
            <option value="LEFTOVER_ONLY">{{ t("native.jekluy.keepTheRemainderSeparate") }}</option>
            <option value="ASSIGN_TO_PERSON">{{ t("native.jekluy.assignTheRemainderToOnePerson") }}</option>
          </ModernSelect>
          <template v-if="draft.remainderMode === 'ASSIGN_TO_PERSON'">
            <label for="jekluy-remainder-payer" class="block text-xs text-slate-500 dark:text-slate-400">{{ t("native.jekluy.personCoveringTheRemainder") }}</label>
            <ModernSelect id="jekluy-remainder-payer" :value="result.remainderPersonId" class="jekluy-input w-full text-sm" @change="draft.remainderPayer = ($event.target as HTMLSelectElement).value">
              <option v-for="person in draft.participants" :key="person.id" :value="person.id">{{ person.name }}</option>
            </ModernSelect>
          </template>
        </fieldset>

        <div class="mt-5 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700/70 dark:bg-[#101e30] sm:p-5">
          <div class="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h3 class="text-base font-bold">{{ t("native.jekluy.whoPaysWhom") }}</h3>
            <span v-if="result.transfers.length" class="text-xs text-slate-500 dark:text-slate-400">{{ t("native.jekluy.paid") }} {{ completedIds.length }}/{{ result.transfers.length }}</span>
          </div>
          <p v-if="result.roundingAdjustments.length" class="mb-2 text-xs leading-6 text-slate-500 dark:text-slate-400">{{ t("native.jekluy.repaymentsAreRoundedToUnitsOf100") }}</p>
          <ul v-if="result.transfers.length" class="divide-y divide-slate-100 dark:divide-slate-700/70">
            <li v-for="transfer in result.transfers" :key="transfer.id" class="py-4" :class="{ 'opacity-60': completedIds.includes(transfer.id) }">
              <div class="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                <p class="min-w-0 flex-1 break-words text-sm leading-8"><strong>{{ transfer.fromName }}</strong><span class="mx-1 text-slate-500 dark:text-slate-400">{{ t("native.jekluy.owes") }}</span><strong>{{ transfer.toName }}</strong></p>
                <p class="jekluy-money max-w-full text-xl font-bold leading-8 tabular-nums text-blue-700 dark:text-blue-300">{{ money(transfer.amountCents) }}</p>
              </div>
              <label class="mt-1 inline-flex min-h-11 cursor-pointer items-center gap-2 text-xs font-semibold" :class="completedIds.includes(transfer.id) ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-500 dark:text-slate-400'">
                <input type="checkbox" class="size-5 cursor-pointer accent-blue-600" :checked="completedIds.includes(transfer.id)" :aria-label="t(&quot;native.jekluy.hasRepaid&quot;, { transferFromName: transfer.fromName, transferToName: transfer.toName, moneyTransferAmountCents: money(transfer.amountCents) })" @change="toggleCompleted(transfer.id)" />{{ t("native.jekluy.paid") }}
              </label>
            </li>
          </ul>
          <div v-else class="flex items-start gap-3 py-5 text-sm leading-7 text-slate-500 dark:text-slate-400">
            <Check class="mt-1 size-5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            <p>{{ jekluyEmptySettlementMessage(result, isKhmer ? 'km' : 'en') }}</p>
          </div>
          <div class="mt-2 grid grid-cols-2 gap-2 border-t border-slate-100 pt-4 dark:border-slate-700/70">
            <button type="button" class="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 px-2 text-sm font-semibold dark:border-slate-700" @click="copyResult"><Copy class="size-4" aria-hidden="true" />{{ t("native.jekluy.copy") }}</button>
            <button type="button" class="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 dark:bg-blue-500" :disabled="sharing" @click="shareResult"><Share2 class="size-4" aria-hidden="true" />{{ sharing ? t("native.jekluy.sending") : t("native.jekluy.share") }}</button>
          </div>
          <p v-if="shareMessage" role="status" class="mt-3 text-xs leading-6 text-blue-700 dark:text-blue-300">{{ shareMessage }}</p>
          <div v-if="manualCopy" class="mt-3 grid gap-2 text-xs">
            <label for="jekluy-copy-summary">{{ t("native.jekluy.textToCopy") }}</label>
            <textarea id="jekluy-copy-summary" ref="manualCopyInput" :value="manualCopy" readonly rows="7" class="jekluy-input w-full min-w-0 text-sm" @focus="($event.target as HTMLTextAreaElement).select()" />
            <button type="button" class="min-h-11 rounded-xl border border-slate-200 px-3 font-semibold dark:border-slate-700" @click="selectSummary">{{ t("native.jekluy.selectAllText") }}</button>
          </div>
        </div>

        <details class="mt-3 rounded-xl px-1">
          <summary class="flex min-h-12 cursor-pointer list-none items-center justify-between gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300 [&::-webkit-details-marker]:hidden">{{ t("native.jekluy.viewEachPersonSShare") }}<ArrowRight class="size-4" aria-hidden="true" /></summary>
          <ul class="divide-y divide-slate-200 dark:divide-slate-700">
            <li v-for="person in result.people" :key="person.id" class="py-3 text-xs leading-7">
              <div class="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <strong class="min-w-0 break-words text-sm">{{ person.name }}</strong>
                <span class="jekluy-money font-semibold" :class="person.settlementBalanceCents > 0n ? 'text-emerald-700 dark:text-emerald-300' : person.settlementBalanceCents < 0n ? 'text-blue-700 dark:text-blue-300' : 'text-slate-500 dark:text-slate-400'">{{ person.settlementBalanceCents > 0n ? t("native.jekluy.receives") : person.settlementBalanceCents < 0n ? t("native.jekluy.owes") : t("native.jekluy.nothingOwed") }} {{ person.settlementBalanceCents === 0n ? '' : money(person.settlementBalanceCents < 0n ? -person.settlementBalanceCents : person.settlementBalanceCents) }}</span>
              </div>
              <p class="break-words text-slate-500 dark:text-slate-400">{{ t("native.jekluy.paid_2") }} {{ money(person.paidCents) }} {{ t("native.jekluy.share_2") }} {{ money(person.shareCents) }}</p>
              <p v-if="result.roundingAdjustments.length" class="break-words text-slate-500 dark:text-slate-400">{{ t("native.jekluy.actualCostAfterRepayments") }} {{ money(person.actualShareCents) }}</p>
            </li>
          </ul>
        </details>
        <details v-if="result.roundingAdjustments.length" class="mt-1 rounded-xl px-1">
          <summary class="flex min-h-12 cursor-pointer items-center text-xs font-semibold text-slate-500 dark:text-slate-400">{{ t("native.jekluy.viewRepaymentRounding") }}</summary>
          <ul class="space-y-2 pb-3 text-xs leading-7 text-slate-500 dark:text-slate-400">
            <li v-for="change in result.roundingAdjustments" :key="`${change.fromId}-${change.toId}`" class="break-words">{{ change.fromName }} → {{ change.toName }}{{ t("native.jekluy.colon") }} {{ money(change.exactAmountCents) }} → {{ money(change.amountCents) }}</li>
          </ul>
        </details>
      </template>
      <div v-else class="flex min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 px-6 py-8 text-center dark:border-slate-700">
        <span class="mb-3 grid size-12 place-items-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-400/10 dark:text-blue-300"><Users class="size-6" aria-hidden="true" /></span>
        <h3 class="font-bold">{{ t("native.jekluy.howMuchDidEachPersonPay") }}</h3>
        <p class="mt-2 max-w-xs text-sm leading-7 text-slate-500 dark:text-slate-400">{{ t("native.jekluy.enterNamesAndContributionsResultsAppearInstantly") }}</p>
      </div>
    </section>

    <ConfirmDialog :open="Boolean(pending)" :title="pendingTitle" :description="pendingDescription" :confirm-label="pending?.kind === 'reset' ? t(&quot;native.jekluy.clearEverything&quot;) : t(&quot;native.jekluy.changeAndClearAmounts&quot;)" :cancel-label="t(&quot;native.jekluy.keepAsIs&quot;)" :busy-label="t(&quot;native.jekluy.pleaseWait&quot;)" :locale="isKhmer ? 'km' : 'en'" @close="cancelPending" @confirm="confirmAction" />
  </div>
</template>

<style scoped>
.participant-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, .9fr) 2.75rem; column-gap: .5rem; }
.participant-grid > label.sr-only { position: absolute; }
.jekluy-input { min-height: 3.125rem; border: 1px solid #cbd5e1; border-radius: .75rem; background: transparent; padding: .625rem .75rem; font: inherit; font-size: 1rem; line-height: 1.75; color: inherit; }
.jekluy-input:focus { outline: 2px solid #2563eb; outline-offset: 1px; border-color: transparent; }
.jekluy-input[aria-invalid="true"] { border-color: #dc2626; }
.jekluy-input.pr-7 { padding-right: 1.75rem; }
.jekluy-money { overflow-wrap: anywhere; }
:global(.dark) .jekluy-input { border-color: #475569; }
:global(.dark) .jekluy-input[aria-invalid="true"] { border-color: #f87171; }
details[open] > summary svg { transform: rotate(90deg); }
@media (max-width: 359px) { .participant-grid { grid-template-columns: minmax(0, 1fr) minmax(0, .85fr) 2.5rem; column-gap: .25rem; } }
</style>
