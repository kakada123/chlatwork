<script setup lang="ts">
import { Gift, Heart } from "lucide-vue-next";
import MomentExperience from "~/components/moments/MomentExperience.vue";
import MomentLanguageToggle from "~/components/moments/MomentLanguageToggle.vue";
import type { PersonalInvitation } from "~/types/moment";

definePageMeta({ layout: false });

const route = useRoute();
const { locale, copy, isKhmer } = useMomentLanguage();
const publicCopy = computed(() => copy.value.publicPage);
const token = computed(() => String(route.params.token || ""));
const { data: invitation } = await useFetch<PersonalInvitation>(
  () => `/api/invitations/${token.value}`,
  { key: () => `personal-invitation-${token.value}` },
);

useSeoMeta({
  title: () => invitation.value?.status === "ready"
    ? `${invitation.value.invitationGuest.displayName} · ${invitation.value.title}`
    : publicCopy.value.metaWaiting,
  description: () => publicCopy.value.metaDescription,
  robots: "noindex, nofollow, noarchive",
});
</script>

<template>
  <div v-if="invitation?.status === 'ready'" class="personal-invitation-shell">
    <div class="language-toggle"><MomentLanguageToggle :dark="invitation.theme === 'ELEGANT'" /></div>
    <MomentExperience :moment="invitation" :invitation-guest="invitation.invitationGuest" :locale="locale" />
  </div>

  <main v-else class="invitation-state" :class="{ 'is-khmer': isKhmer }" :lang="isKhmer ? 'km' : 'en'">
    <div class="language-toggle"><MomentLanguageToggle /></div>
    <section class="state-card">
      <div class="gift"><Gift class="h-8 w-8" aria-hidden="true" /></div>
      <p v-if="invitation?.invitationGuest" class="guest-name">{{ invitation.invitationGuest.displayName }}</p>
      <h1>{{ invitation?.status === 'locked' ? publicCopy.waitingTitle : publicCopy.unavailableTitle }}</h1>
      <p>{{ invitation?.status === 'locked' ? publicCopy.waitingCopy : publicCopy.unavailableCopy }}</p>
      <span class="brand"><Heart class="h-4 w-4 fill-current" /> ChlatWork Moments</span>
    </section>
  </main>
</template>

<style scoped>
.personal-invitation-shell { position: relative; }
.language-toggle { position: absolute; right: 1rem; top: 1rem; z-index: 40; }
.invitation-state { display: grid; min-height: 100vh; place-items: center; background: radial-gradient(circle at 50% 0%, #ffe1e9, transparent 35rem), #fff8f8; padding: 1.25rem; color: #4c1427; }
.invitation-state.is-khmer { font-family: "Hanuman", ui-sans-serif, system-ui, sans-serif; }
.state-card { width: min(100%, 680px); border: 1px solid rgb(156 45 78 / .15); border-radius: 2rem; background: rgb(255 255 255 / .8); padding: clamp(2rem, 7vw, 4rem); text-align: center; box-shadow: 0 2rem 6rem rgb(92 20 47 / .14); }
.gift { display: grid; margin: 0 auto 1.5rem; height: 4rem; width: 4rem; place-items: center; border-radius: 1.25rem; background: #e84d76; color: white; }
.guest-name { color: #e84d76; font-size: clamp(1.3rem, 4vw, 2rem); font-weight: 700; }
h1 { margin-top: 1rem; font-size: clamp(2rem, 7vw, 4rem) !important; }
.state-card > p:not(.guest-name) { margin: 1rem auto 0; max-width: 34rem; color: #8b5265; line-height: 1.7; }
.brand { display: flex; margin-top: 2rem; align-items: center; justify-content: center; gap: .4rem; color: #8b5265; font-size: .75rem; }
</style>
