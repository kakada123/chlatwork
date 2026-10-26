import { computed, onMounted, ref, watch } from "vue";
import {
  calculateJekLuy,
  createJekLuyDraft,
  getJekLuyCompleted,
  JEKLUY_MAX_PARTICIPANTS,
  JEKLUY_STORAGE_KEY,
  JekLuyInputError,
  jekluySummary,
  parseJekLuyDraft,
  serializeJekLuyDraft,
  type JekLuyCurrency,
} from "../lib/jekluy.ts";

type PendingAction = { kind: "reset" } | { kind: "currency"; currency: JekLuyCurrency };

export function useJekLuy() {
  const draft = ref(createJekLuyDraft());
  const ready = ref(false);
  const pending = ref<PendingAction | null>(null);
  const storageMessage = ref("");
  const shareMessage = ref("");
  const manualCopy = ref("");
  const sharing = ref(false);
  const validation = computed(() => {
    try {
      return { result: calculateJekLuy(draft.value.participants, draft.value.currency), error: null };
    } catch (error) {
      return { result: null, error: error instanceof JekLuyInputError ? error : new JekLuyInputError("សូមពិនិត្យទិន្នន័យម្តងទៀត។") };
    }
  });
  const result = computed(() => validation.value.result);
  const error = computed(() => validation.value.error);
  const completedIds = computed(() => result.value ? getJekLuyCompleted(result.value, draft.value.completed) : []);

  watch(() => result.value?.basis, (basis) => {
    // Invalidate permanently: reverting a later edit must not resurrect an earlier paid mark.
    if (draft.value.completed.basis !== basis)
      draft.value.completed = { basis: basis || "", ids: [] };
  }, { flush: "sync" });

  onMounted(() => {
    try {
      const saved = window.localStorage.getItem(JEKLUY_STORAGE_KEY);
      if (saved) draft.value = parseJekLuyDraft(saved);
    } catch {
      storageMessage.value = "មិនអាចអានទិន្នន័យចាស់បានទេ។ អ្នកនៅតែអាចគណនាថ្មីបាន។";
    }
    ready.value = true;
  });

  watch(draft, () => {
    shareMessage.value = "";
    manualCopy.value = "";
    // SSR and the initial empty form must never overwrite a locally saved calculation.
    if (!ready.value) return;
    try {
      window.localStorage.setItem(JEKLUY_STORAGE_KEY, serializeJekLuyDraft(draft.value));
      storageMessage.value = "";
    } catch {
      storageMessage.value = "មិនអាចរក្សាទុកលើឧបករណ៍នេះបានទេ។ សូមចម្លងលទ្ធផលទុក។";
    }
  }, { deep: true });

  function addParticipant() {
    if (!ready.value || draft.value.participants.length >= JEKLUY_MAX_PARTICIPANTS) return;
    const ids = new Set(draft.value.participants.map((person) => person.id));
    let index = 1;
    while (ids.has(`person-${index}`)) index++;
    draft.value.participants.push({ id: `person-${index}`, name: "", amount: "" });
    return `person-${index}`;
  }

  function removeParticipant(id: string) {
    if (!ready.value || draft.value.participants.length <= 2) return;
    draft.value.participants = draft.value.participants.filter((person) => person.id !== id);
  }

  function requestCurrency(currency: JekLuyCurrency) {
    if (!ready.value || currency === draft.value.currency) return;
    if (draft.value.participants.some((person) => person.amount.trim())) pending.value = { kind: "currency", currency };
    else {
      draft.value.currency = currency;
      draft.value.completed = { basis: "", ids: [] };
    }
  }

  function requestReset() {
    if (ready.value) pending.value = { kind: "reset" };
  }

  function cancelPending() { pending.value = null; }

  function confirmPending() {
    const action = pending.value;
    if (!action) return;
    draft.value = action.kind === "reset" ? createJekLuyDraft() : {
      ...draft.value,
      currency: action.currency,
      participants: draft.value.participants.map((person) => ({ ...person, amount: "" })),
      completed: { basis: "", ids: [] },
    };
    pending.value = null;
  }

  function toggleCompleted(id: string) {
    const current = result.value;
    if (!ready.value || !current?.transfers.some((transfer) => transfer.id === id)) return;
    const ids = new Set(completedIds.value);
    if (ids.has(id)) ids.delete(id);
    else ids.add(id);
    draft.value.completed = { basis: current.basis, ids: [...ids] };
  }

  async function copyResult() {
    if (!result.value) return;
    const text = jekluySummary(result.value, completedIds.value);
    manualCopy.value = "";
    shareMessage.value = "";
    try {
      await navigator.clipboard.writeText(text);
      shareMessage.value = "បានចម្លងហើយ! អ្នកអាចផ្ញើទៅមិត្តភក្តិបាន។";
    } catch {
      manualCopy.value = text;
      shareMessage.value = "សូមជ្រើសរើសអត្ថបទខាងក្រោម ហើយចម្លងផ្ញើទៅមិត្តភក្តិ។";
    }
  }

  async function shareResult() {
    if (!result.value || sharing.value) return;
    if (typeof navigator === "undefined" || !navigator.share) return copyResult();
    sharing.value = true;
    shareMessage.value = "";
    manualCopy.value = "";
    try {
      await navigator.share({ title: "ចែកលុយ 💸", text: jekluySummary(result.value, completedIds.value) });
      shareMessage.value = "បានចែករំលែកហើយ។";
    } catch (error) {
      if ((error as { name?: string })?.name !== "AbortError") await copyResult();
    } finally {
      sharing.value = false;
    }
  }

  return { draft, ready, pending, result, error, completedIds, storageMessage, shareMessage, manualCopy, sharing,
    addParticipant, removeParticipant, requestCurrency, requestReset, cancelPending, confirmPending,
    toggleCompleted, copyResult, shareResult };
}
