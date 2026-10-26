<script setup lang="ts">
import { ArrowDown, ArrowRight, Check, Copy, Plus, RotateCcw, Share2, Trash2, Users } from "lucide-vue-next";
import ConfirmDialog from "~/components/ui/ConfirmDialog.vue";
import { formatJekLuyMoney, JEKLUY_MAX_PARTICIPANTS } from "~/lib/jekluy";

definePageMeta({ layout: "jekluy", localOnly: true, blankCanvas: true });
useSeoMeta({
  title: "ចែកលុយ — គណនាលុយដែលត្រូវសងគ្នា ងាយៗ",
  description: "បញ្ចូលឈ្មោះ និងលុយដែលម្នាក់ៗបានចេញ ដើម្បីដឹងថាអ្នកណាត្រូវសងអ្នកណា។ គណនាជារៀល ឬដុល្លារ ដោយមិនបាច់ចូលគណនី។",
  ogTitle: "ចែកលុយ 💸 — ងាយស្រួលចែកចំណាយជាមួយមិត្តភក្តិ",
  ogDescription: "ម្នាក់ៗចេញលុយមិនស្មើគ្នាមែនទេ? មើលចំណែក និងលុយដែលត្រូវសងគ្នាភ្លាមៗ។",
  ogLocale: "km_KH",
  twitterTitle: "ចែកលុយ — គណនាលុយដែលត្រូវសងគ្នា",
  twitterDescription: "បញ្ចូលឈ្មោះ និងលុយដែលបានចេញ រួចចែករំលែកលទ្ធផលទៅមិត្តភក្តិ។",
});
useHead({ htmlAttrs: { lang: "km", "data-locale": "km" } });

const {
  draft, ready, pending, result, error, completedIds, storageMessage, shareMessage, manualCopy, sharing,
  addParticipant, removeParticipant, requestCurrency, requestReset, cancelPending, confirmPending,
  toggleCompleted, copyResult, shareResult,
} = useJekLuy();
const attempted = ref(false);
const resultPanel = ref<HTMLElement | null>(null);
const manualCopyInput = ref<HTMLTextAreaElement | null>(null);
const money = (amount: bigint) => formatJekLuyMoney(amount, draft.value.currency);
const visibleError = computed(() => error.value && (attempted.value || error.value.field === "amount") ? error.value : null);
const shareRange = computed(() => {
  if (!result.value) return "";
  const shares = result.value.people.map((person) => person.shareCents);
  const lowest = shares.reduce((a, b) => a < b ? a : b);
  const highest = shares.reduce((a, b) => a > b ? a : b);
  return lowest === highest ? money(lowest) : `${money(lowest)} – ${money(highest)}`;
});
const remainderName = computed(() => result.value?.people.find((person) => person.id === result.value?.remainderPersonId)?.name);
const pendingTitle = computed(() => pending.value?.kind === "reset" ? "ជម្រះទិន្នន័យទាំងអស់?" : "ប្ដូររូបិយប័ណ្ណ?");
const pendingDescription = computed(() => pending.value?.kind === "reset"
  ? "ឈ្មោះ ចំនួនលុយ និងសញ្ញាសងរួចនឹងត្រូវលុបចេញពីការគណនានេះ។"
  : "ចំនួនលុយ និងសញ្ញាសងរួចនឹងត្រូវជម្រះ។ ឈ្មោះនៅដដែល ហើយមិនមានការប្ដូរអត្រាលុយទេ។");

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
          <Users class="size-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />អ្នកចូលរួម
          <span class="grid min-w-7 place-items-center rounded-full bg-blue-50 px-2 text-xs tabular-nums text-blue-700 dark:bg-blue-400/10 dark:text-blue-300">{{ draft.participants.length }}</span>
        </h2>
        <button type="button" class="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl px-2 text-xs text-slate-500 hover:text-red-600 disabled:opacity-40 dark:text-slate-400" :disabled="!ready" @click="requestReset">
          <RotateCcw class="size-3.5" aria-hidden="true" />ជម្រះ
        </button>
      </div>

      <fieldset class="mb-6">
        <legend class="mb-2 text-xs font-semibold text-slate-500 dark:text-slate-400">ជ្រើសរើសរូបិយប័ណ្ណ</legend>
        <div class="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-950/50">
          <button v-for="currency in (['KHR', 'USD'] as const)" :key="currency" type="button" class="min-h-11 rounded-lg px-3 text-sm font-bold transition disabled:opacity-50" :class="draft.currency === currency ? 'bg-white text-blue-700 shadow-sm dark:bg-slate-700 dark:text-blue-200' : 'text-slate-500 dark:text-slate-400'" :aria-pressed="draft.currency === currency" :disabled="!ready" @click="requestCurrency(currency)">
            {{ currency === 'KHR' ? 'រៀល (៛)' : 'ដុល្លារ ($)' }}
          </button>
        </div>
      </fieldset>

      <form novalidate @submit.prevent="showResult">
        <div class="participant-grid mb-2 text-xs font-semibold text-slate-500 dark:text-slate-400" aria-hidden="true">
          <span>ឈ្មោះ</span><span>លុយដែលបានចេញ</span><span />
        </div>
        <fieldset :disabled="!ready" class="space-y-3">
          <legend class="sr-only">ឈ្មោះ និងលុយរបស់អ្នកចូលរួម</legend>
          <div v-for="(person, index) in draft.participants" :key="person.id">
            <div class="participant-grid items-center">
              <label :for="`name-${person.id}`" class="sr-only">ឈ្មោះអ្នកទី {{ index + 1 }}</label>
              <input :id="`name-${person.id}`" v-model="person.name" type="text" :placeholder="`អ្នកទី ${index + 1}`" maxlength="80" autocomplete="off" enterkeyhint="next" class="jekluy-input min-w-0" :aria-invalid="visibleError?.participantId === person.id && visibleError?.field === 'name' || undefined" :aria-describedby="visibleError?.participantId === person.id ? 'jekluy-error' : undefined" />
              <label :for="`amount-${person.id}`" class="sr-only">លុយដែលអ្នកទី {{ index + 1 }} បានចេញជា{{ draft.currency === 'KHR' ? 'រៀល' : 'ដុល្លារ' }}</label>
              <div class="relative min-w-0">
                <input :id="`amount-${person.id}`" v-model="person.amount" type="text" :inputmode="draft.currency === 'KHR' ? 'numeric' : 'decimal'" :placeholder="draft.currency === 'KHR' ? '0' : '0.00'" maxlength="24" autocomplete="off" enterkeyhint="done" class="jekluy-input w-full min-w-0 pr-7 tabular-nums" :aria-invalid="visibleError?.participantId === person.id && visibleError?.field === 'amount' || undefined" :aria-describedby="visibleError?.participantId === person.id ? 'jekluy-error' : undefined" />
                <span class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-slate-400" aria-hidden="true">{{ draft.currency === 'KHR' ? '៛' : '$' }}</span>
              </div>
              <button type="button" class="grid size-11 place-items-center rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-25 dark:hover:bg-red-400/10" :disabled="draft.participants.length <= 2" :aria-label="`ដកអ្នកទី ${index + 1} ចេញ`" @click="removeParticipant(person.id)">
                <Trash2 class="size-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </fieldset>
        <button type="button" class="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-blue-200 text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-40 dark:border-blue-400/30 dark:text-blue-300 dark:hover:bg-blue-400/5" :disabled="!ready || draft.participants.length >= JEKLUY_MAX_PARTICIPANTS" @click="addPerson">
          <Plus class="size-4" aria-hidden="true" />បន្ថែមអ្នកចូលរួម
        </button>
        <p v-if="visibleError" id="jekluy-error" role="alert" class="mt-3 text-sm leading-7 text-red-600 dark:text-red-300">{{ visibleError.message }}</p>
        <button type="submit" class="mt-5 inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-xl bg-[#12355b] px-4 py-3.5 text-sm font-bold text-white hover:bg-[#1b4b7d] disabled:opacity-40 dark:bg-blue-500 dark:hover:bg-blue-400" :disabled="!ready">
          មើលអ្នកត្រូវសង<ArrowDown class="size-4 md:rotate-[-90deg]" aria-hidden="true" />
        </button>
      </form>
      <p v-if="storageMessage" role="status" class="mt-4 text-xs leading-6 text-amber-700 dark:text-amber-300">{{ storageMessage }}</p>
    </section>

    <section id="results" ref="resultPanel" tabindex="-1" class="min-w-0 scroll-mt-5 outline-none md:sticky md:top-6" aria-labelledby="jekluy-results-title">
      <h2 id="jekluy-results-title" class="sr-only">លទ្ធផលគណនា</h2>
      <template v-if="result">
        <div class="rounded-2xl bg-[#12355b] p-5 text-white sm:p-6">
          <div class="flex items-center justify-between gap-3 text-sm text-blue-100">
            <span>លុយសរុប</span><span>{{ result.people.length }} នាក់</span>
          </div>
          <p class="jekluy-money mt-2 text-3xl font-bold leading-relaxed tabular-nums sm:text-4xl">{{ money(result.totalCents) }}</p>
          <div class="mt-4 border-t border-white/15 pt-4">
            <p class="text-xs text-blue-100">ចំណែកម្នាក់ៗ</p>
            <p class="jekluy-money mt-1 text-lg font-semibold tabular-nums">{{ shareRange }}</p>
          </div>
          <p v-if="result.remainderCents > 0n" class="mt-3 text-xs leading-6 text-blue-100">បង្គត់ចំណែកត្រឹម ១០០៛។ សំណល់ {{ money(result.remainderCents) }} គិតលើ {{ remainderName }}។</p>
        </div>

        <div class="mt-5 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700/70 dark:bg-[#101e30] sm:p-5">
          <div class="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h3 class="text-base font-bold">អ្នកណាត្រូវសងអ្នកណា</h3>
            <span v-if="result.transfers.length" class="text-xs text-slate-500 dark:text-slate-400">សងរួច {{ completedIds.length }}/{{ result.transfers.length }}</span>
          </div>
          <ul v-if="result.transfers.length" class="divide-y divide-slate-100 dark:divide-slate-700/70">
            <li v-for="transfer in result.transfers" :key="transfer.id" class="py-4" :class="{ 'opacity-60': completedIds.includes(transfer.id) }">
              <div class="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                <p class="min-w-0 flex-1 break-words text-sm leading-8"><strong>{{ transfer.fromName }}</strong><span class="mx-1 text-slate-500 dark:text-slate-400">ត្រូវសង</span><strong>{{ transfer.toName }}</strong></p>
                <p class="jekluy-money max-w-full text-xl font-bold leading-8 tabular-nums text-blue-700 dark:text-blue-300">{{ money(transfer.amountCents) }}</p>
              </div>
              <label class="mt-1 inline-flex min-h-11 cursor-pointer items-center gap-2 text-xs font-semibold" :class="completedIds.includes(transfer.id) ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-500 dark:text-slate-400'">
                <input type="checkbox" class="size-5 cursor-pointer accent-blue-600" :checked="completedIds.includes(transfer.id)" :aria-label="`${transfer.fromName} សង ${transfer.toName} ${money(transfer.amountCents)} រួចហើយ`" @change="toggleCompleted(transfer.id)" />សងរួច
              </label>
            </li>
          </ul>
          <div v-else class="flex items-start gap-3 py-5 text-sm leading-7 text-slate-500 dark:text-slate-400">
            <Check class="mt-1 size-5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            <p>{{ result.totalCents === 0n ? 'មិនទាន់មានអ្នកចេញលុយទេ។ អ្នកដែលមិនបានចេញលុយ អាចទុកជា ០ បាន។' : 'គ្រប់គ្នាចេញលុយស្មើគ្នាហើយ មិនបាច់សងគ្នាទេ។' }}</p>
          </div>
          <div class="mt-2 grid grid-cols-2 gap-2 border-t border-slate-100 pt-4 dark:border-slate-700/70">
            <button type="button" class="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 px-2 text-sm font-semibold dark:border-slate-700" @click="copyResult"><Copy class="size-4" aria-hidden="true" />ចម្លង</button>
            <button type="button" class="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 dark:bg-blue-500" :disabled="sharing" @click="shareResult"><Share2 class="size-4" aria-hidden="true" />{{ sharing ? 'កំពុងផ្ញើ…' : 'ចែករំលែក' }}</button>
          </div>
          <p v-if="shareMessage" role="status" class="mt-3 text-xs leading-6 text-blue-700 dark:text-blue-300">{{ shareMessage }}</p>
          <div v-if="manualCopy" class="mt-3 grid gap-2 text-xs">
            <label for="jekluy-copy-summary">អត្ថបទសម្រាប់ចម្លង</label>
            <textarea id="jekluy-copy-summary" ref="manualCopyInput" :value="manualCopy" readonly rows="7" class="jekluy-input w-full min-w-0 text-sm" @focus="($event.target as HTMLTextAreaElement).select()" />
            <button type="button" class="min-h-11 rounded-xl border border-slate-200 px-3 font-semibold dark:border-slate-700" @click="selectSummary">ជ្រើសរើសអត្ថបទទាំងអស់</button>
          </div>
        </div>

        <details class="mt-3 rounded-xl px-1">
          <summary class="flex min-h-12 cursor-pointer list-none items-center justify-between gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300 [&::-webkit-details-marker]:hidden">មើលចំណែករបស់ម្នាក់ៗ<ArrowRight class="size-4" aria-hidden="true" /></summary>
          <ul class="divide-y divide-slate-200 dark:divide-slate-700">
            <li v-for="person in result.people" :key="person.id" class="py-3 text-xs leading-7">
              <div class="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <strong class="min-w-0 break-words text-sm">{{ person.name }}</strong>
                <span class="jekluy-money font-semibold" :class="person.balanceCents > 0n ? 'text-emerald-700 dark:text-emerald-300' : person.balanceCents < 0n ? 'text-blue-700 dark:text-blue-300' : 'text-slate-500 dark:text-slate-400'">{{ person.balanceCents > 0n ? 'ត្រូវទទួល' : person.balanceCents < 0n ? 'ត្រូវសង' : 'ស្មើហើយ' }} {{ person.balanceCents === 0n ? '' : money(person.balanceCents < 0n ? -person.balanceCents : person.balanceCents) }}</span>
              </div>
              <p class="break-words text-slate-500 dark:text-slate-400">បានចេញ {{ money(person.paidCents) }} · ចំណែក {{ money(person.shareCents) }}</p>
            </li>
          </ul>
        </details>
      </template>
      <div v-else class="flex min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 px-6 py-8 text-center dark:border-slate-700">
        <span class="mb-3 grid size-12 place-items-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-400/10 dark:text-blue-300"><Users class="size-6" aria-hidden="true" /></span>
        <h3 class="font-bold">ម្នាក់ៗបានចេញប៉ុន្មាន?</h3>
        <p class="mt-2 max-w-xs text-sm leading-7 text-slate-500 dark:text-slate-400">បញ្ចូលឈ្មោះ និងលុយដែលបានចេញ។ លទ្ធផលនឹងបង្ហាញភ្លាមៗ។</p>
      </div>
    </section>

    <ConfirmDialog :open="Boolean(pending)" :title="pendingTitle" :description="pendingDescription" :confirm-label="pending?.kind === 'reset' ? 'ជម្រះទាំងអស់' : 'ប្ដូរ និងជម្រះលុយ'" cancel-label="ទុកដដែល" busy-label="សូមរង់ចាំ…" locale="km" @close="cancelPending" @confirm="confirmAction" />
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
