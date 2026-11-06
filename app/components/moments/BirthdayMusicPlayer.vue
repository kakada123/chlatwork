<script setup lang="ts">
import { useAppI18n } from "~/composables/useAppI18n";
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { LoaderCircle, Volume2, VolumeX } from "lucide-vue-next";
import { readBirthdayAudioClip, type BirthdayAudioClip } from "~/lib/birthday-audio";
import { createBirthdayAudioPlayer, type BirthdayAudioState } from "~/lib/birthday-audio-player";

const props = withDefaults(defineProps<{ clip: BirthdayAudioClip; locale?: "en" | "km"; autoPlay?: boolean }>(), { locale: "en", autoPlay: true });
const { t } = useAppI18n(computed(() => props.locale === "km"));
const audio = ref<HTMLAudioElement | null>(null);
const state = ref<BirthdayAudioState>("paused");
const selection = computed(() => readBirthdayAudioClip(props.clip));
// The saved clip was validated by the API. Its allowlisted route needs no extra catalog request.
const source = computed(() => selection.value ? `/api/moments/birthday-audio/${selection.value.trackId}` : "");
const fragmentSource = computed(() => selection.value ? `${source.value}#t=${selection.value.startMs / 1000},${selection.value.endMs / 1000}` : "");
const busy = computed(() => state.value === "playing" || state.value === "loading");
const label = computed(() => t(busy.value ? "products.moments.music.turn_off" : "products.moments.music.turn_on"));
let player: ReturnType<typeof createBirthdayAudioPlayer> | undefined;
let manuallyPaused = false;
let mounted = false;
let hasPlayed = false;
let pendingPlay = props.autoPlay;
const gestureEvents = ["pointerup", "touchend", "keydown"] as const;

function removeGestureRetry() { gestureEvents.forEach(event => document.removeEventListener(event, retryFromGesture, true)); }
function requestPlay() {
  if (manuallyPaused || busy.value) return;
  if (!player || !selection.value || !source.value) { pendingPlay = true; return; }
  pendingPlay = false;
  void player.play(source.value, selection.value);
}
function retryFromGesture(event: Event) {
  if (!props.autoPlay || hasPlayed || manuallyPaused || document.hidden) return;
  if ((event.target as Element | null)?.closest?.("[data-music-switch]")) return;
  if (event.type === "keydown") {
    const key = event as KeyboardEvent;
    if (key.repeat || key.ctrlKey || key.metaKey || key.altKey) return;
  }
  requestPlay();
}
function toggle() {
  if (busy.value) {
    manuallyPaused = true; pendingPlay = false;
    removeGestureRetry();
    player?.pause();
  } else { manuallyPaused = false; requestPlay(); }
}
function pauseWhenHidden() { if (document.hidden) { pendingPlay = false; player?.pause(); } }
watch(() => `${props.clip.trackId}:${props.clip.startMs}:${props.clip.endMs}`, () => {
  player?.pause();
  manuallyPaused = false; hasPlayed = false; pendingPlay = props.autoPlay;
  if (mounted && pendingPlay && !document.hidden) requestPlay();
});
onMounted(() => {
  mounted = true;
  if (audio.value) {
    audio.value.volume = .4;
    player = createBirthdayAudioPlayer(audio.value, { loop: true, onState: value => {
      state.value = value;
      if (value === "playing") { hasPlayed = true; removeGestureRetry(); }
    } });
    if (props.autoPlay) gestureEvents.forEach(event => document.addEventListener(event, retryFromGesture, true));
    if (pendingPlay && !document.hidden) requestPlay();
  }
  document.addEventListener("visibilitychange", pauseWhenHidden);
});
defineExpose({ requestPlay });
onBeforeUnmount(() => {
  mounted = false;
  removeGestureRetry();
  document.removeEventListener("visibilitychange", pauseWhenHidden);
  player?.destroy();
});
</script>

<template>
  <div v-if="selection" class="birthday-music">
    <audio ref="audio" :src="fragmentSource" :autoplay="autoPlay" preload="metadata" playsinline aria-hidden="true" />
    <button type="button" class="music-switch" data-music-switch :class="{ 'is-on': busy }" :aria-label="label" :title="label" :aria-pressed="busy" @click="toggle">
      <LoaderCircle v-if="state === 'loading'" class="loading-icon" :size="19" aria-hidden="true" />
      <Volume2 v-else-if="state === 'playing'" :size="19" aria-hidden="true" />
      <VolumeX v-else :size="19" aria-hidden="true" />
      <span class="sr-only">{{ label }}</span>
    </button>
  </div>
</template>

<style scoped>
.birthday-music { position: relative; z-index: 5; display: flex; justify-content: center; margin: 1rem auto; }
.music-switch { display: inline-flex; align-items: center; justify-content: center; width: 2.9rem; height: 2.9rem; border: 1px solid var(--moment-border); border-radius: 50%; background: var(--moment-surface); color: var(--moment-muted); box-shadow: 0 .35rem 1rem var(--moment-shadow); cursor: pointer; }
.music-switch.is-on { background: var(--moment-accent-soft); color: var(--moment-ink); }
.music-switch:focus-visible { outline: 2px solid var(--moment-accent); outline-offset: 4px; }
.loading-icon { animation: music-spin 1s linear infinite; }
@keyframes music-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .loading-icon { animation: none; } }
</style>
