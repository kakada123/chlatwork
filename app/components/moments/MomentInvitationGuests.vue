<script setup lang="ts">
import { Check, Copy, LoaderCircle, Send, Share2, Users } from "lucide-vue-next";
import type { InvitationGuest, InvitationRecipientType, MomentSummary } from "~/types/moment";

const props = defineProps<{ moment: MomentSummary }>();
const { copy, isKhmer, localizeMomentPath } = useMomentLanguage();
const managerCopy = computed(() => copy.value.manager);
const guests = ref<InvitationGuest[]>([]);
const names = ref("");
const recipientType = ref<InvitationRecipientType>("INDIVIDUAL");
const maxGuests = ref(1);
const loading = ref(true);
const saving = ref(false);
const message = ref("");
const error = ref("");
const copiedAction = ref("");
let copiedTimer: ReturnType<typeof setTimeout> | null = null;

const recipientTypes = computed(() => [
  { value: "INDIVIDUAL" as const, label: managerCopy.value.individual, max: 1 },
  { value: "COUPLE" as const, label: managerCopy.value.couple, max: 2 },
  { value: "FAMILY" as const, label: managerCopy.value.family, max: 5 },
  { value: "GROUP" as const, label: managerCopy.value.group, max: 10 },
]);

watch(recipientType, (type) => {
  maxGuests.value = recipientTypes.value.find((item) => item.value === type)?.max ?? 1;
});

async function loadGuests() {
  loading.value = true;
  try {
    guests.value = await $fetch<InvitationGuest[]>(`/api/moments/${props.moment.id}/guests`);
  } finally {
    loading.value = false;
  }
}

async function addGuests() {
  const parsedNames = names.value.split(/\r?\n/).map((name) => name.trim()).filter(Boolean);
  if (!parsedNames.length || saving.value) return;
  saving.value = true;
  error.value = "";
  message.value = "";
  try {
    const created = await $fetch<InvitationGuest[]>(`/api/moments/${props.moment.id}/guests`, {
      method: "POST",
      body: { names: parsedNames, recipientType: recipientType.value, maxGuests: maxGuests.value },
    });
    guests.value.push(...created.map((guest) => ({ ...guest, rsvp: null })));
    names.value = "";
    message.value = managerCopy.value.guestsAdded(created.length);
  } catch {
    error.value = managerCopy.value.guestAddError;
  } finally {
    saving.value = false;
  }
}

function guestUrl(guest: InvitationGuest) {
  return `${window.location.origin}${localizeMomentPath(`/i/${guest.token}`)}`;
}

function guestMessage(guest: InvitationGuest) {
  return managerCopy.value.invitationShareText(guest.displayName, props.moment.title, guestUrl(guest));
}

async function copyText(value: string) {
  await navigator.clipboard.writeText(value);
}

async function copyGuestValue(
  guest: InvitationGuest,
  kind: "message" | "link",
) {
  await copyText(kind === "message" ? guestMessage(guest) : guestUrl(guest));
  copiedAction.value = `${guest.id}:${kind}`;
  if (copiedTimer) clearTimeout(copiedTimer);
  copiedTimer = setTimeout(() => {
    copiedAction.value = "";
    copiedTimer = null;
  }, 1800);
}

async function markSent(guest: InvitationGuest) {
  await $fetch(`/api/moments/${props.moment.id}/guests/${guest.id}/sent`, { method: "POST" });
  guest.sentAt = new Date().toISOString();
}

async function shareGuest(guest: InvitationGuest) {
  if (navigator.share) {
    await navigator.share({ title: props.moment.title, text: guestMessage(guest), url: guestUrl(guest) });
    await markSent(guest);
    return;
  }
  await copyText(guestMessage(guest));
}

onMounted(loadGuests);
onBeforeUnmount(() => {
  if (copiedTimer) clearTimeout(copiedTimer);
});
</script>

<template>
  <section class="guest-manager" :class="{ 'is-khmer': isKhmer }">
    <div class="flex items-start gap-3">
      <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-700 dark:bg-rose-300/10 dark:text-rose-300"><Users class="h-5 w-5" /></span>
      <div><h3 class="font-semibold">{{ managerCopy.guestList }}</h3><p class="mt-1 text-xs leading-5 text-slate-500 dark:text-white/50">{{ managerCopy.guestListHelp }}</p></div>
    </div>

    <form class="mt-4 space-y-3" @submit.prevent="addGuests">
      <textarea v-model="names" rows="4" maxlength="12100" class="guest-input resize-y" :placeholder="managerCopy.pasteGuests" />
      <div class="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <label><span>{{ managerCopy.recipientType }}</span><select v-model="recipientType" class="guest-input mt-1"><option v-for="type in recipientTypes" :key="type.value" :value="type.value">{{ type.label }}</option></select></label>
        <label><span>{{ managerCopy.partyLimit }}</span><input v-model.number="maxGuests" type="number" min="1" max="20" class="guest-input mt-1" /></label>
        <button type="submit" class="add-button" :disabled="saving || !names.trim()"><LoaderCircle v-if="saving" class="h-4 w-4 animate-spin" />{{ saving ? managerCopy.addingGuests : managerCopy.addGuests }}</button>
      </div>
    </form>
    <p v-if="message" class="mt-3 text-xs font-semibold text-emerald-700 dark:text-emerald-300" role="status">{{ message }}</p>
    <p v-if="error" class="mt-3 text-xs font-semibold text-red-700 dark:text-red-300" role="alert">{{ error }}</p>

    <div v-if="loading" class="mt-4 flex justify-center p-4"><LoaderCircle class="h-5 w-5 animate-spin" /></div>
    <p v-else-if="!guests.length" class="mt-4 rounded-xl border border-dashed border-slate-300 p-4 text-center text-xs text-slate-500 dark:border-white/15 dark:text-white/45">{{ managerCopy.noGuests }}</p>
    <ul v-else class="mt-4 divide-y divide-slate-200 dark:divide-white/10">
      <li v-for="guest in guests" :key="guest.id" class="py-3 first:pt-0 last:pb-0">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div><strong class="text-sm">{{ guest.displayName }}</strong><p class="mt-1 text-xs text-slate-500 dark:text-white/45">{{ guest.rsvp ? `${guest.rsvp.choice} · ${guest.rsvp.guestCount}` : managerCopy.waitingResponse }} · {{ guest.sentAt ? managerCopy.sent : managerCopy.markSent }}</p></div>
          <div class="flex flex-wrap gap-1.5">
            <button type="button" class="guest-action" :class="{ copied: copiedAction === `${guest.id}:message` }" @click="copyGuestValue(guest, 'message')">
              <Check v-if="copiedAction === `${guest.id}:message`" class="copy-success-icon h-3.5 w-3.5" />
              <Copy v-else class="h-3.5 w-3.5" />
              {{ copiedAction === `${guest.id}:message` ? managerCopy.guestCopied : managerCopy.copyMessage }}
            </button>
            <button type="button" class="guest-action" :class="{ copied: copiedAction === `${guest.id}:link` }" @click="copyGuestValue(guest, 'link')">
              <Check v-if="copiedAction === `${guest.id}:link`" class="copy-success-icon h-3.5 w-3.5" />
              <Copy v-else class="h-3.5 w-3.5" />
              {{ copiedAction === `${guest.id}:link` ? managerCopy.guestCopied : managerCopy.copyGuestLink }}
            </button>
            <button type="button" class="guest-action primary" @click="shareGuest(guest)"><Share2 class="h-3.5 w-3.5" />{{ managerCopy.shareGuest }}</button>
            <button v-if="!guest.sentAt" type="button" class="guest-action" @click="markSent(guest)"><Send class="h-3.5 w-3.5" />{{ managerCopy.markSent }}</button>
            <span v-else class="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300"><Check class="h-3.5 w-3.5" />{{ managerCopy.sent }}</span>
          </div>
        </div>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.guest-manager { margin-top: .75rem; border: 1px solid rgb(226 232 240); border-radius: 1rem; background: rgb(255 255 255); padding: 1rem; }
:global(html.dark .guest-manager) { border-color: rgb(255 255 255 / .1); background: rgb(255 255 255 / .035); color: white; }
.guest-manager.is-khmer { font-family: "Hanuman", ui-sans-serif, system-ui, sans-serif; line-height: 1.7; }
.guest-manager label > span { display: block; font-size: .7rem; font-weight: 700; color: rgb(100 116 139); }
:global(html.dark .guest-manager label > span) { color: rgb(255 255 255 / .55); }
.guest-input { width: 100%; border: 1px solid rgb(203 213 225); border-radius: .75rem; background: white; padding: .7rem .8rem; color: rgb(15 23 42); font-size: .8rem; outline: none; }
.guest-input:focus { border-color: rgb(244 63 94); box-shadow: 0 0 0 3px rgb(244 63 94 / .1); }
:global(html.dark .guest-input) { border-color: rgb(255 255 255 / .15); background: rgb(0 0 0 / .25); color: white; }
.add-button { display: inline-flex; min-height: 2.7rem; align-self: end; align-items: center; justify-content: center; gap: .4rem; border-radius: .75rem; background: rgb(225 29 72); padding: .7rem 1rem; color: white; font-size: .75rem; font-weight: 800; }
.add-button:disabled { opacity: .5; }
.guest-action { display: inline-flex; align-items: center; gap: .3rem; border-radius: .55rem; padding: .45rem .55rem; color: rgb(71 85 105); font-size: .68rem; font-weight: 700; }
.guest-action:hover { background: rgb(241 245 249); }
.guest-action.copied { background: rgb(236 253 245); color: rgb(4 120 87); }
.copy-success-icon { animation: copy-pop .28s ease-out; }
.guest-action.primary { background: rgb(255 241 242); color: rgb(190 18 60); }
:global(html.dark .guest-action) { color: rgb(255 255 255 / .65); }
:global(html.dark .guest-action:hover) { background: rgb(255 255 255 / .08); }
:global(html.dark .guest-action.primary) { background: rgb(244 63 94 / .12); color: rgb(253 164 175); }
:global(html.dark .guest-action.copied) { background: rgb(52 211 153 / .12); color: rgb(110 231 183); }
@keyframes copy-pop {
  0% { transform: scale(.55); opacity: 0; }
  70% { transform: scale(1.2); }
  100% { transform: scale(1); opacity: 1; }
}
@media (prefers-reduced-motion: reduce) {
  .copy-success-icon { animation: none; }
}
</style>
