<script setup lang="ts">
import { useAppI18n } from "~/composables/useAppI18n";
import { Gift, Heart } from "lucide-vue-next";
import MomentExperience from "~/components/moments/MomentExperience.vue";
import MomentLanguageToggle from "~/components/moments/MomentLanguageToggle.vue";
import BirthdayUnlockGate from "~/components/moments/BirthdayUnlockGate.vue";
import BirthdayMusicPlayer from "~/components/moments/BirthdayMusicPlayer.vue";
import { readBirthdayAudioClip } from "~/lib/birthday-audio";
import { birthdayStoryThemeStyle, readBirthdayStorySettings } from "~/lib/birthday-story";
import type { PublicMoment } from "~/types/moment";

definePageMeta({ layout: false });

const route = useRoute();
const { locale, copy, isKhmer, localizeMomentPath } = useMomentLanguage();

const { t } = useAppI18n(isKhmer);
const publicCopy = computed(() => copy.value.publicPage);
const slug = computed(() => String(route.params.slug || ""));
const {
  data: moment,
  error,
  refresh,
} = await useFetch<PublicMoment>(() => `/api/moments/${slug.value}`, {
  key: () => `moment-${slug.value}`,
});

const now = ref(Date.now());
const unlockingBirthday = ref(false);
const birthdayError = ref("");
const musicPlayer = ref<{ requestPlay: () => void } | null>(null);
const birthdayAudio = computed(() => {
  if (moment.value?.status === "birthday-locked") return readBirthdayAudioClip(moment.value.birthdayAudio);
  if (moment.value?.status !== "ready" || moment.value.occasion !== "BIRTHDAY") return null;
  return readBirthdayAudioClip(moment.value.blocks.find(block => block.type === "HERO")?.data.birthdayAudio);
});
const birthdayStyle = computed(() => {
  const hero = moment.value?.status === "ready" ? moment.value.blocks.find(block => block.type === "HERO") : undefined;
  const story = readBirthdayStorySettings(hero?.data.birthdayStory);
  return birthdayStoryThemeStyle(story?.theme ?? "ROMANTIC_PINK");
});
async function unlockBirthday(birthday: { day: number; month: number }) {
  if (unlockingBirthday.value) return;
  // Start the public library track inside this tap, before the request awaits the server.
  musicPlayer.value?.requestPlay();
  birthdayError.value = "";
  unlockingBirthday.value = true;
  try {
    await $fetch(`/api/moments/${encodeURIComponent(slug.value)}/unlock`, { method: "POST", body: birthday });
    await refresh();
    if (moment.value?.status !== "ready") throw new Error("Birthday remains locked");
  } catch (failure) {
    const status = (failure as { statusCode?: number; response?: { status?: number } })?.statusCode ?? (failure as { response?: { status?: number } })?.response?.status;
    birthdayError.value = status === 403
      ? (t("products.moments.that_birthday_doesnt_match_try_again"))
      : status === 429
        ? (t("products.moments.please_wait_a_moment_before_trying_again"))
        : (t("products.moments.we_couldnt_open_this_birthday_please_try_again"));
  } finally { unlockingBirthday.value = false; }
}
let timer: ReturnType<typeof setInterval> | null = null;
const remaining = computed(() => {
  if (moment.value?.status !== "locked") return 0;
  return Math.max(0, new Date(moment.value.unlockAt).getTime() - now.value);
});
const countdown = computed(() => {
  const seconds = Math.ceil(remaining.value / 1000);
  const values = [
    ["days", Math.floor(seconds / 86400)],
    ["hours", Math.floor((seconds % 86400) / 3600)],
    ["minutes", Math.floor((seconds % 3600) / 60)],
    ["seconds", seconds % 60],
  ] as const;
  return values.map(([key, value]) => ({
    key,
    value,
    label: publicCopy.value.countdownUnits[key],
  }));
});

useSeoMeta({
  title: () =>
    moment.value?.status === "ready"
      ? `${moment.value.title} | ChlatWork Moments`
      : publicCopy.value.metaWaiting,
  description: () => publicCopy.value.metaDescription,
  robots: "noindex, nofollow, noarchive",
  ogTitle: () =>
    moment.value?.status === "ready"
      ? moment.value.title
      : publicCopy.value.ogWaiting,
  ogDescription: () => publicCopy.value.ogDescription,
});

onMounted(() => {
  if (moment.value?.status !== "locked") return;
  timer = window.setInterval(async () => {
    now.value = Date.now();
    if (remaining.value <= 0) {
      if (timer) window.clearInterval(timer);
      timer = null;
      await refresh();
    }
  }, 1000);
});
onBeforeUnmount(() => {
  if (timer) window.clearInterval(timer);
});
</script>

<template>
  <div :style="birthdayStyle">
  <BirthdayMusicPlayer v-if="birthdayAudio" :key="slug" ref="musicPlayer" :clip="birthdayAudio" :locale="locale" :style="{ position: 'fixed', top: '1rem', left: '1rem', margin: '0', zIndex: 50 }" />
  <div v-if="moment?.status === 'birthday-locked'" class="public-language-toggle"><MomentLanguageToggle /></div>
  <BirthdayUnlockGate v-if="moment?.status === 'birthday-locked'" :recipient-name="moment.recipientName" :locale="locale" :submitting="unlockingBirthday" :error="birthdayError" @unlock="unlockBirthday" />
  <div v-else-if="moment?.status === 'ready'" class="public-moment-shell">
    <div class="public-language-toggle">
      <MomentLanguageToggle :dark="moment.theme === 'ELEGANT'" />
    </div>
    <MomentExperience :moment="moment" :locale="locale" external-music />
  </div>

  <main
    v-else-if="moment?.status === 'locked'"
    class="locked-page"
    :class="{ 'is-khmer': isKhmer }"
    :lang="isKhmer ? 'km' : 'en'"
  >
    <div class="public-language-toggle"><MomentLanguageToggle /></div>
    <div class="locked-card">
      <div class="gift-orbit">
        <Gift class="h-10 w-10" aria-hidden="true" />
      </div>
      <p class="locked-eyebrow">{{
        publicCopy.forRecipient(moment.recipientName)
      }}</p>
      <h1>{{ publicCopy.waitingTitle }}</h1>
      <p class="locked-copy">{{ publicCopy.waitingCopy }}</p>
      <div class="countdown" :aria-label="publicCopy.countdownLabel">
        <div v-for="item in countdown" :key="item.key">
          <strong>{{ String(item.value).padStart(2, "0") }}</strong>
          <span>{{ item.label }}</span>
        </div>
      </div>
      <p class="brand">
        <Heart class="h-4 w-4 fill-current" aria-hidden="true" /> ChlatWork
        Moments
      </p>
    </div>
  </main>

  <main
    v-else
    class="locked-page"
    :class="{ 'is-khmer': isKhmer }"
    :lang="isKhmer ? 'km' : 'en'"
  >
    <div class="public-language-toggle"><MomentLanguageToggle /></div>
    <div class="locked-card">
      <p class="locked-eyebrow">ChlatWork Moments</p>
      <h1>{{ publicCopy.unavailableTitle }}</h1>
      <p class="locked-copy">{{ publicCopy.unavailableCopy }}</p>
      <NuxtLink
        :to="localizeMomentPath('/moments/create')"
        class="create-link"
        >{{ publicCopy.createOwn }}</NuxtLink
      >
    </div>
  </main>
  </div>
</template>

<style scoped>
.public-moment-shell {
  position: relative;
}
.public-language-toggle {
  position: absolute;
  right: 1rem;
  top: 1rem;
  z-index: 40;
}
.locked-page {
  position: relative;
  display: grid;
  min-height: 100vh;
  place-items: center;
  overflow: hidden;
  background:
    radial-gradient(circle at 50% 0%, #ffe1e9 0, transparent 35rem), #fff8f8;
  padding: 1.25rem;
  color: #4c1427;
}
.locked-page.is-khmer {
  font-family: "Hanuman", ui-sans-serif, system-ui, sans-serif;
}
.locked-page.is-khmer h1,
.locked-page.is-khmer .locked-copy {
  font-family: "Hanuman", ui-sans-serif, system-ui, sans-serif;
  line-height: 1.65;
  letter-spacing: 0;
}
.locked-card {
  width: min(100%, 680px);
  border: 1px solid rgba(156, 45, 78, 0.15);
  border-radius: 2rem;
  background: rgba(255, 255, 255, 0.78);
  padding: clamp(2rem, 7vw, 4rem);
  text-align: center;
  box-shadow: 0 2rem 6rem rgba(92, 20, 47, 0.14);
  backdrop-filter: blur(18px);
}
.gift-orbit {
  display: flex;
  margin: 0 auto 2rem;
  height: 5rem;
  width: 5rem;
  align-items: center;
  justify-content: center;
  border-radius: 1.5rem;
  background: #e84d76;
  color: white;
  box-shadow: 0 1rem 2rem rgba(232, 77, 118, 0.24);
  transform: rotate(-5deg);
}
.locked-eyebrow {
  color: #e84d76;
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}
h1 {
  margin-top: 1rem;
  font-family: "Hanuman", Georgia, serif;
  font-size: clamp(2.3rem, 8vw, 4.5rem) !important;
  font-weight: 500 !important;
  line-height: 1;
}
.locked-copy {
  margin: 1.25rem auto 0;
  max-width: 34rem;
  color: #8b5265;
  line-height: 1.7;
}
.countdown {
  display: grid;
  margin-top: 2.25rem;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.5rem;
}
.countdown div {
  border-radius: 1rem;
  background: #fff1f4;
  padding: 1rem 0.25rem;
}
.countdown strong {
  display: block;
  font-family: "Hanuman", Georgia, serif;
  font-size: clamp(1.4rem, 5vw, 2.4rem);
}
.countdown span {
  display: block;
  margin-top: 0.25rem;
  color: #8b5265;
  font-size: 0.62rem;
  text-transform: uppercase;
}
.brand {
  display: flex;
  margin-top: 2rem;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  color: #8b5265;
  font-size: 0.75rem;
}
.create-link {
  display: inline-flex;
  margin-top: 2rem;
  border-radius: 999px;
  background: #e84d76;
  padding: 0.85rem 1.25rem;
  color: white;
  font-weight: 800;
}
</style>
