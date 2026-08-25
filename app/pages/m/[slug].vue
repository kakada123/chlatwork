<script setup lang="ts">
import { Gift, Heart } from "lucide-vue-next";
import MomentExperience from "~/components/moments/MomentExperience.vue";
import type { PublicMoment } from "~/types/moment";

definePageMeta({ layout: false });

const route = useRoute();
const slug = computed(() => String(route.params.slug || ""));
const {
  data: moment,
  error,
  refresh,
} = await useFetch<PublicMoment>(() => `/api/moments/${slug.value}`, {
  key: () => `moment-${slug.value}`,
});

const now = ref(Date.now());
let timer: ReturnType<typeof setInterval> | null = null;
const remaining = computed(() => {
  if (moment.value?.status !== "locked") return 0;
  return Math.max(0, new Date(moment.value.unlockAt).getTime() - now.value);
});
const countdown = computed(() => {
  const seconds = Math.ceil(remaining.value / 1000);
  return {
    days: Math.floor(seconds / 86400),
    hours: Math.floor((seconds % 86400) / 3600),
    minutes: Math.floor((seconds % 3600) / 60),
    seconds: seconds % 60,
  };
});

useSeoMeta({
  title: () =>
    moment.value?.status === "ready"
      ? `${moment.value.title} | ChlatWork Moments`
      : "A Moment is waiting for you | ChlatWork",
  description: "A private celebration made with ChlatWork Moments.",
  robots: "noindex, nofollow, noarchive",
  ogTitle: () =>
    moment.value?.status === "ready"
      ? moment.value.title
      : "A Moment is waiting for you 🎁",
  ogDescription: "Someone made a little place on the internet just for you.",
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
  <MomentExperience v-if="moment?.status === 'ready'" :moment="moment" />

  <main v-else-if="moment?.status === 'locked'" class="locked-page">
    <div class="locked-card">
      <div class="gift-orbit">
        <Gift class="h-10 w-10" aria-hidden="true" />
      </div>
      <p class="locked-eyebrow">For {{ moment.recipientName }}</p>
      <h1>Something special is waiting for you…</h1>
      <p class="locked-copy">
        This Moment is still wrapped. Come back when the countdown reaches zero.
      </p>
      <div class="countdown" aria-label="Time until this Moment unlocks">
        <div v-for="(value, label) in countdown" :key="label">
          <strong>{{ String(value).padStart(2, "0") }}</strong>
          <span>{{ label }}</span>
        </div>
      </div>
      <p class="brand">
        <Heart class="h-4 w-4 fill-current" aria-hidden="true" /> ChlatWork
        Moments
      </p>
    </div>
  </main>

  <main v-else class="locked-page">
    <div class="locked-card">
      <p class="locked-eyebrow">ChlatWork Moments</p>
      <h1>This Moment is unavailable.</h1>
      <p class="locked-copy">
        The link may be incorrect, unpublished, or expired.
      </p>
      <NuxtLink to="/moments/create" class="create-link"
        >Create your own Moment</NuxtLink
      >
    </div>
  </main>
</template>

<style scoped>
.locked-page {
  display: grid;
  min-height: 100vh;
  place-items: center;
  overflow: hidden;
  background:
    radial-gradient(circle at 50% 0%, #ffe1e9 0, transparent 35rem), #fff8f8;
  padding: 1.25rem;
  color: #4c1427;
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
  font-family: Georgia, serif;
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
  font-family: Georgia, serif;
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
