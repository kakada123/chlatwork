<script setup lang="ts">
import { useAppI18n } from "~/composables/useAppI18n";
import { computed, onBeforeUnmount, onMounted, ref, useId, watch } from "vue";
import {
  formatBirthdayAudioTime,
  getBirthdayAudioTrack,
  readBirthdayAudioClip,
  type BirthdayAudioClip,
} from "~/lib/birthday-audio";
import { useBirthdayAudioCatalog } from "~/composables/useBirthdayAudioCatalog";
import { createBirthdayAudioPlayer } from "~/lib/birthday-audio-player";

const props = withDefaults(defineProps<{
  modelValue?: BirthdayAudioClip | null;
  locale?: "en" | "km";
}>(), { modelValue: null, locale: "en" });
const { t } = useAppI18n(computed(() => props.locale === "km"));
const emit = defineEmits<{ "update:modelValue": [value: BirthdayAudioClip | null] }>();


const copy = computed(() => ({ title: t("products.moments.audio.title"), description: t("products.moments.audio.description"), search: t("products.moments.audio.search"), empty: t("products.moments.audio.empty"), preview: t("products.moments.audio.preview"), stop: t("products.moments.audio.stop"), choose: t("products.moments.audio.choose"), chosen: t("products.moments.audio.chosen"), start: t("products.moments.audio.start"), end: t("products.moments.audio.end"), length: t("products.moments.audio.length"), trim: t("products.moments.audio.trim"), previewClip: t("products.moments.audio.preview_clip"), apply: t("products.moments.audio.apply"), beforeApply: t("products.moments.audio.before_apply"), selected: t("products.moments.audio.selected"), none: t("products.moments.audio.none"), remove: t("products.moments.audio.remove"), loading: t("products.moments.audio.loading"), playing: t("products.moments.audio.playing"), error: t("products.moments.audio.error"), catalogError: t("products.moments.audio.catalog_error"), retry: t("products.moments.audio.retry") }));
const { tracks, loading: catalogLoading, error: catalogError, refresh: reloadCatalog } = useBirthdayAudioCatalog();
const inputId = useId();
const search = ref("");
const audio = ref<HTMLAudioElement | null>(null);
const candidateTrackId = ref<string>("");
const startMs = ref(0);
const endMs = ref(0);
const playbackState = ref<"loading" | "playing" | "paused" | "error">("paused");
const playbackKey = ref("");
const previewedClip = ref("");
let player: ReturnType<typeof createBirthdayAudioPlayer> | undefined;
let playbackRequest = 0;

const candidateTrack = computed(() => getBirthdayAudioTrack(candidateTrackId.value, tracks.value));
const candidateClip = computed(() => readBirthdayAudioClip({
  trackId: candidateTrackId.value, startMs: startMs.value, endMs: endMs.value,
}, tracks.value));
const clipKey = computed(() => `${candidateTrackId.value}:${startMs.value}:${endMs.value}`);
const canApply = computed(() => candidateClip.value !== null && previewedClip.value === clipKey.value);
const selectedClip = computed(() => readBirthdayAudioClip(props.modelValue, tracks.value));
const selectedTrack = computed(() => getBirthdayAudioTrack(selectedClip.value?.trackId, tracks.value));
const visibleTracks = computed(() => {
  const query = search.value.trim().toLocaleLowerCase();
  return tracks.value.filter((track) => track.title.toLocaleLowerCase().includes(query));
});
const isActive = (key: string) => playbackKey.value === key
  && (playbackState.value === "loading" || playbackState.value === "playing");
const isPlaying = () => playbackState.value === "playing";

function stopPlayback() {
  playbackRequest++;
  player?.pause();
  playbackState.value = "paused";
  playbackKey.value = "";
}

function chooseTrack(trackId: string) {
  const track = getBirthdayAudioTrack(trackId, tracks.value);
  if (!track) return;
  stopPlayback();
  candidateTrackId.value = track.id;
  startMs.value = 0;
  endMs.value = Math.min(track.durationMs, 30_000);
  previewedClip.value = "";
}

function changeBoundary(boundary: "start" | "end", event: Event) {
  const input = event.target as HTMLInputElement;
  const value = input.value;
  const milliseconds = Math.round(Number(value) * 1000);
  if (!candidateTrack.value) return;
  if (!value.trim() || !Number.isFinite(milliseconds)) {
    input.value = String((boundary === "start" ? startMs.value : endMs.value) / 1000);
    return;
  }
  stopPlayback();
  previewedClip.value = "";
  if (boundary === "start") startMs.value = Math.max(0, Math.min(milliseconds, endMs.value - 1000));
  else endMs.value = Math.min(candidateTrack.value.durationMs, Math.max(milliseconds, startMs.value + 1000));
  // Keep the visible field aligned even when clamping leaves the reactive value unchanged.
  input.value = String((boundary === "start" ? startMs.value : endMs.value) / 1000);
}

async function preview(trackId: string, clip?: BirthdayAudioClip) {
  const track = getBirthdayAudioTrack(trackId, tracks.value);
  if (!track || !player) return;
  const key = clip ? "clip" : `track:${trackId}`;
  if (isActive(key)) { stopPlayback(); return; }
  stopPlayback();
  const request = playbackRequest;
  const requestedClipKey = clipKey.value;
  playbackKey.value = key;
  playbackState.value = "loading";
  try {
    await player.play(track.src, clip ?? { startMs: 0, endMs: track.durationMs });
    // A completed stale play request must never approve a different trim or track.
    if (request === playbackRequest && clip && isPlaying()) {
      previewedClip.value = requestedClipKey;
    }
  } catch {
    if (request === playbackRequest) playbackState.value = "error";
  }
}

function applyClip() {
  if (!canApply.value || !candidateClip.value) return;
  stopPlayback();
  emit("update:modelValue", { ...candidateClip.value });
}

function removeClip() {
  stopPlayback();
  previewedClip.value = "";
  emit("update:modelValue", null);
}

watch([() => props.modelValue, tracks], ([value]) => {
  stopPlayback();
  previewedClip.value = "";
  const clip = readBirthdayAudioClip(value, tracks.value);
  if (clip) {
    candidateTrackId.value = clip.trackId;
    startMs.value = clip.startMs;
    endMs.value = clip.endMs;
  } else if (!getBirthdayAudioTrack(candidateTrackId.value, tracks.value) && tracks.value[0]) {
    chooseTrack(tracks.value[0].id);
  }
}, { immediate: true, deep: true });

onMounted(() => {
  if (audio.value) player = createBirthdayAudioPlayer(audio.value, {
    onState: (state) => { playbackState.value = state; },
  });
});
onBeforeUnmount(() => {
  stopPlayback();
  player?.destroy();
});
</script>

<template>
  <section class="birthday-audio-editor" :aria-labelledby="`${inputId}-title`">
    <div>
      <h3 :id="`${inputId}-title`">{{ copy.title }}</h3>
      <p class="audio-help">{{ copy.description }}</p>
    </div>
    <audio ref="audio" preload="none" aria-hidden="true" />
    <p v-if="catalogLoading" class="audio-status" role="status">{{ copy.loading }}</p>
    <div v-else-if="catalogError" class="audio-error" role="alert">{{ copy.catalogError }} <button type="button" @click="reloadCatalog()">{{ copy.retry }}</button></div>
    <label class="audio-search">
      <span>{{ copy.search }}</span>
      <input v-model="search" type="search" :placeholder="copy.search" />
    </label>
    <ul class="audio-tracks" :aria-label="copy.title">
      <li v-for="track in visibleTracks" :key="track.id" :class="{ 'is-chosen': candidateTrackId === track.id }">
        <div class="audio-track-title"><span>{{ track.title }}</span><small>{{ formatBirthdayAudioTime(track.durationMs) }}</small></div>
        <div class="audio-track-actions">
          <button type="button" :aria-label="`${isActive(`track:${track.id}`) ? copy.stop : copy.preview}: ${track.title}`" @click="preview(track.id)">
            {{ isActive(`track:${track.id}`) ? copy.stop : copy.preview }}
          </button>
          <button type="button" :aria-pressed="candidateTrackId === track.id" :aria-label="`${copy.choose}: ${track.title}`" @click="chooseTrack(track.id)">
            {{ candidateTrackId === track.id ? copy.chosen : copy.choose }}
          </button>
        </div>
      </li>
      <li v-if="!visibleTracks.length && !catalogLoading && !catalogError" role="status">{{ copy.empty }}</li>
    </ul>
    <div v-if="candidateTrack" class="audio-trim">
      <p class="audio-candidate">{{ candidateTrack.title }}</p>
      <div class="audio-boundaries">
        <div class="audio-boundary">
          <label :for="`${inputId}-start`">{{ copy.start }}</label>
          <input :id="`${inputId}-start`" type="number" min="0" :max="(endMs - 1000) / 1000" step="0.001" :value="startMs / 1000" @input="changeBoundary('start', $event)" />
          <input type="range" min="0" :max="(endMs - 1000) / 1000" step="0.001" :value="startMs / 1000" :aria-label="copy.start" @input="changeBoundary('start', $event)" />
        </div>
        <div class="audio-boundary">
          <label :for="`${inputId}-end`">{{ copy.end }}</label>
          <input :id="`${inputId}-end`" type="number" :min="(startMs + 1000) / 1000" :max="candidateTrack.durationMs / 1000" step="0.001" :value="endMs / 1000" @input="changeBoundary('end', $event)" />
          <input type="range" :min="(startMs + 1000) / 1000" :max="candidateTrack.durationMs / 1000" step="0.001" :value="endMs / 1000" :aria-label="copy.end" @input="changeBoundary('end', $event)" />
        </div>
      </div>
      <p class="audio-help">{{ copy.length }}: {{ formatBirthdayAudioTime(endMs - startMs) }} · {{ copy.trim }}</p>
      <div class="audio-apply-actions">
        <button type="button" :disabled="!candidateClip" @click="candidateClip && preview(candidateTrack.id, candidateClip)">{{ isActive('clip') ? copy.stop : copy.previewClip }}</button>
        <button type="button" class="audio-apply" :disabled="!canApply" @click="applyClip">{{ copy.apply }}</button>
      </div>
      <p v-if="!canApply" class="audio-help">{{ copy.beforeApply }}</p>
    </div>
    <p v-if="playbackState === 'loading' || playbackState === 'playing'" class="audio-status" role="status">{{ playbackState === 'loading' ? copy.loading : copy.playing }}</p>
    <p v-if="playbackState === 'error'" class="audio-error" role="alert">{{ copy.error }}</p>
    <div class="audio-selection" aria-live="polite">
      <template v-if="selectedClip && selectedTrack">
        <p><strong>{{ copy.selected }}</strong><br />{{ selectedTrack.title }} · {{ formatBirthdayAudioTime(selectedClip.startMs) }}–{{ formatBirthdayAudioTime(selectedClip.endMs) }}</p>
        <button type="button" @click="removeClip">{{ copy.remove }}</button>
      </template>
      <p v-else>{{ copy.none }}</p>
    </div>
  </section>
</template>

<style scoped>
.birthday-audio-editor { --audio-text: #172033; --audio-muted: #475569; --audio-border: #cbd5e1; --audio-surface: #f8fafc; --audio-field: #fff; --audio-hover: #f1f5f9; --audio-error: #be123c; display: grid; gap: 1rem; border: 1px solid var(--audio-border); border-radius: 1.2rem; padding: 1rem; background: var(--audio-surface); color: var(--audio-text); }
h3 { margin: 0 0 .3rem; font-size: 1rem; font-weight: 800; }
p { margin: 0; }
.audio-help, .audio-selection, .audio-status { font-size: .78rem; line-height: 1.6; color: var(--audio-muted); }
.audio-search, .audio-boundary { display: grid; gap: .45rem; font-size: .78rem; }
input[type="search"], input[type="number"] { width: 100%; min-height: 2.75rem; border: 1px solid #64748b; border-radius: .65rem; background: var(--audio-field); color: var(--audio-text); padding: .55rem .7rem; }
input[type="search"]::placeholder { color: var(--audio-muted); }
.audio-tracks { display: grid; gap: .5rem; margin: 0; padding: .15rem; list-style: none; }
.audio-tracks li { display: flex; align-items: center; justify-content: space-between; gap: .7rem; border: 1px solid var(--audio-border); border-radius: .75rem; padding: .6rem; }
.audio-tracks li.is-chosen { border-color: #fb7185; background: rgba(251,113,133,.08); }
.audio-track-title { display: grid; gap: .1rem; min-width: 0; font-size: .8rem; overflow-wrap: anywhere; }
.audio-track-title small { color: var(--audio-muted); }
.audio-track-actions, .audio-apply-actions { display: flex; flex-wrap: wrap; gap: .4rem; }
.audio-track-actions { flex-shrink: 0; }
button { min-height: 2.75rem; border: 1px solid #64748b; border-radius: .6rem; padding: .4rem .65rem; color: var(--audio-text); font-size: .76rem; font-weight: 700; }
button:hover:not(:disabled) { background: var(--audio-hover); }
button:disabled { opacity: .45; cursor: not-allowed; }
button:focus-visible, input:focus-visible { outline: 2px solid #fda4af; outline-offset: 3px; }
.audio-trim { display: grid; gap: .8rem; }
.audio-candidate { font-size: .85rem; font-weight: 700; }
.audio-boundaries { display: grid; grid-template-columns: minmax(0,1fr) minmax(0,1fr); gap: .9rem; }
input[type="range"] { width: 100%; min-height: 2rem; accent-color: #fb7185; }
.audio-apply, .audio-apply:hover:not(:disabled) { background: #be185d; border-color: #f472b6; color: #fff; }
.audio-error { color: var(--audio-error); font-size: .8rem; }
.audio-selection { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: .75rem; border-top: 1px solid var(--audio-border); padding-top: .8rem; }
:global(html.dark .birthday-audio-editor) { --audio-text: #f8fafc; --audio-muted: #cbd5e1; --audio-border: rgba(255,255,255,.16); --audio-surface: rgba(255,255,255,.035); --audio-field: #151b29; --audio-hover: rgba(255,255,255,.12); --audio-error: #fda4af; }
@media (max-width: 420px) { .audio-tracks li { align-items: stretch; flex-direction: column; } .audio-track-actions button { flex: 1; } }
</style>
