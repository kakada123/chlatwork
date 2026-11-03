<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { LoaderCircle, Music2, Pause, Play, Volume2 } from "lucide-vue-next";
import {
  formatBirthdayAudioTime,
  getBirthdayAudioTrack,
  readBirthdayAudioClip,
  type BirthdayAudioClip,
} from "~~/api/src/moments/birthday-audio";
import { createBirthdayAudioPlayer, type BirthdayAudioState } from "~/lib/birthday-audio-player";

const props = withDefaults(defineProps<{ clip: BirthdayAudioClip; locale?: "en" | "km" }>(), { locale: "en" });
const audio = ref<HTMLAudioElement | null>(null);
const state = ref<BirthdayAudioState>("paused");
const volume = ref(40);
const selection = computed(() => readBirthdayAudioClip(props.clip));
const track = computed(() => getBirthdayAudioTrack(selection.value?.trackId));
const busy = computed(() => state.value === "playing" || state.value === "loading");
const labels = computed(() => props.locale === "km" ? {
  music: "តន្ត្រីថ្ងៃកំណើត", play: "ចាក់តន្ត្រី", pause: "ផ្អាកតន្ត្រី", loading: "កំពុងផ្ទុកតន្ត្រី…",
  volume: "កម្រិតសំឡេង", error: "មិនអាចចាក់តន្ត្រីបានទេ។ សូមចុចចាក់ម្តងទៀត។", loop: "ចាក់ផ្នែកដែលបានជ្រើសរើសម្តងហើយម្តងទៀត",
} : {
  music: "Birthday music", play: "Play music", pause: "Pause music", loading: "Loading music…",
  volume: "Volume", error: "Music could not play. Tap play to try again.", loop: "Your selected clip, on repeat",
});
let player: ReturnType<typeof createBirthdayAudioPlayer> | undefined;

function toggle() {
  if (busy.value) { player?.pause(); return; }
  if (selection.value && track.value) void player?.play(track.value.src, selection.value);
}
function applyVolume() { if (audio.value) audio.value.volume = volume.value / 100; }
function pauseWhenHidden() { if (document.hidden) player?.pause(); }
watch(() => [props.clip.trackId, props.clip.startMs, props.clip.endMs], () => player?.pause());
onMounted(() => {
  if (audio.value) {
    player = createBirthdayAudioPlayer(audio.value, { loop: true, onState: (value) => { state.value = value; } });
    applyVolume();
  }
  document.addEventListener("visibilitychange", pauseWhenHidden);
});
onBeforeUnmount(() => {
  player?.destroy();
  document.removeEventListener("visibilitychange", pauseWhenHidden);
});
</script>

<template>
  <div v-if="selection && track" class="birthday-music">
    <audio ref="audio" preload="none" aria-hidden="true" />
    <div class="music-heading"><Music2 :size="17" aria-hidden="true" /><span>{{ labels.music }}</span></div>
    <div class="music-controls">
      <button type="button" class="music-toggle" :aria-label="busy ? labels.pause : labels.play" :aria-pressed="busy" @click="toggle">
        <LoaderCircle v-if="state === 'loading'" class="loading-icon" :size="18" aria-hidden="true" />
        <Pause v-else-if="state === 'playing'" :size="18" aria-hidden="true" />
        <Play v-else :size="18" aria-hidden="true" />
        {{ state === 'loading' ? labels.loading : state === 'playing' ? labels.pause : labels.play }}
      </button>
      <div class="music-track"><strong>{{ track.title }}</strong><small>{{ formatBirthdayAudioTime(selection.startMs) }} – {{ formatBirthdayAudioTime(selection.endMs) }} · {{ labels.loop }}</small></div>
      <label class="music-volume"><Volume2 :size="16" aria-hidden="true" /><span class="sr-only">{{ labels.volume }}</span><input v-model.number="volume" type="range" min="0" max="100" @input="applyVolume" /></label>
    </div>
    <p v-if="state === 'error'" class="music-error" role="status">{{ labels.error }}</p>
  </div>
</template>

<style scoped>
.birthday-music { position: relative; z-index: 1; width: min(100%, 38rem); margin: 1.5rem auto 0; padding: 1rem; border: 1px solid var(--moment-border); border-radius: 1.25rem; background: var(--moment-surface); color: var(--moment-ink); text-align: left; }
.music-heading { display: flex; align-items: center; gap: .5rem; margin-bottom: .75rem; color: var(--moment-muted); font-size: .8rem; font-weight: 700; }
.music-controls { display: flex; align-items: center; flex-wrap: wrap; gap: .75rem; }
.music-toggle { display: inline-flex; align-items: center; justify-content: center; gap: .5rem; min-height: 2.75rem; padding: .6rem .9rem; border: 1px solid var(--moment-border); border-radius: .85rem; background: var(--moment-accent-soft); color: var(--moment-ink); font: inherit; font-size: .85rem; font-weight: 700; }
.music-toggle:focus-visible, input:focus-visible { outline: 2px solid var(--moment-accent); outline-offset: 3px; }
.music-track { flex: 1 1 10rem; min-width: 0; }
.music-track strong, .music-track small { display: block; overflow-wrap: anywhere; }
.music-track strong { font-size: .85rem; }
.music-track small { margin-top: .2rem; color: var(--moment-muted); font-size: .7rem; }
.music-volume { display: flex; align-items: center; gap: .35rem; }
.music-volume input { width: 4.5rem; min-height: 1.5rem; accent-color: var(--moment-accent); }
.music-error { margin-top: .75rem; font-size: .8rem; color: var(--moment-ink); }
.loading-icon { animation: music-spin 1s linear infinite; }
@keyframes music-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .loading-icon { animation: none; } }
</style>
