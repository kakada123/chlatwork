<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-xl font-bold">Text to Voice</h1>
      <p class="mt-1 max-w-2xl text-sm text-gray-500">
        Listen to Khmer or English text with online audio or your browser voice engine.
      </p>
    </div>

    <section class="rounded-xl border bg-white p-4 shadow-sm">
      <audio
        ref="audioPlayer"
        class="hidden"
        preload="none"
        @ended="playNextOnlineChunk"
        @error="handleOnlineError"
      />

      <div class="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div class="space-y-2">
          <div class="flex h-10 items-center justify-between gap-3">
            <label for="text-to-voice-input" class="block text-sm font-semibold text-gray-900">
              Text
            </label>
            <span class="shrink-0 text-xs text-gray-400">
              {{ characterCount }} characters
              <span v-if="usesNarakeetVoice">
                · ~{{ estimatedSpeechSeconds }}s / 10s
              </span>
            </span>
          </div>

          <textarea
            id="text-to-voice-input"
            v-model="text"
            class="h-80 w-full resize-y rounded-lg border px-3 py-2 text-base leading-8 outline-none focus:ring-2 focus:ring-gray-900/20"
            :style="{ fontFamily: textFontFamily }"
            :lang="detectedLanguageTag"
            :placeholder="textPlaceholder"
          />

          <div class="flex flex-wrap items-center gap-2 text-xs text-gray-500">
            <span class="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1">
              Detected: {{ detectedLanguageLabel }}
            </span>
            <span>
              Khmer and English are detected automatically before playback.
            </span>
          </div>

          <div class="flex flex-wrap gap-2">
            <button
              type="button"
              class="h-10 rounded-lg bg-gray-900 px-4 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300"
              :disabled="!canSpeak"
              @click="speak"
            >
              {{ isSpeaking ? "Restart" : "Speak" }}
            </button>
            <button
              type="button"
              class="h-10 rounded-lg border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-300"
              :disabled="!isSpeaking"
              @click="togglePause"
            >
              {{ isPaused ? "Resume" : "Pause" }}
            </button>
            <button
              type="button"
              class="h-10 rounded-lg border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-300"
              :disabled="!isSpeaking && !isPaused"
              @click="stop"
            >
              Stop
            </button>
            <button
              type="button"
              class="h-10 rounded-lg border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              @click="clearText"
            >
              Clear
            </button>
            <button
              v-if="engine === 'online'"
              type="button"
              class="h-10 rounded-lg border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-300"
              :disabled="!canDownload"
              @click="downloadSpeech"
            >
              {{ isDownloading ? "Downloading..." : "Download MP3" }}
            </button>
            <span
              v-else
              class="flex h-10 items-center rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 text-xs font-semibold text-gray-500"
              title="Browser voices only expose local playback, not downloadable audio data."
            >
              Local playback only
            </span>
          </div>

          <p v-if="message" class="text-sm" :class="messageClass">
            {{ message }}
          </p>
        </div>

        <div class="space-y-4 rounded-lg border bg-gray-50 p-4">
          <div class="space-y-2">
            <label for="engine-select" class="block text-sm font-semibold text-gray-900">
              Engine
            </label>
            <select
              id="engine-select"
              v-model="engine"
              class="h-11 w-full rounded-lg border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-gray-900/20"
            >
              <option value="online">Online audio</option>
              <option value="browser">Browser voice</option>
            </select>
            <p class="text-xs text-gray-500">
              Online mode sends text to the ChlatWork API and can export MP3. Browser voice stays local.
            </p>
          </div>

          <div v-if="engine === 'online'" class="space-y-2">
            <label for="online-voice-select" class="block text-sm font-semibold text-gray-900">
              Voice
            </label>
            <select
              id="online-voice-select"
              v-model="onlineVoice"
              class="h-11 w-full rounded-lg border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-gray-900/20"
            >
              <option
                v-for="voice in onlineVoiceOptions"
                :key="voice.key"
                :value="voice.key"
                :disabled="
                  voice.provider === 'narakeet' && detectedTextLanguage === 'en'
                "
              >
                {{ voice.label }}
              </option>
            </select>
            <p class="text-xs text-gray-500">
              Auto voice supports Khmer and English. Narakeet voices are Khmer-only.
            </p>
          </div>

          <div v-if="engine === 'browser'" class="space-y-2">
            <label for="voice-select" class="block text-sm font-semibold text-gray-900">
              Voice
            </label>
            <select
              id="voice-select"
              v-model="selectedVoiceURI"
              class="h-11 w-full rounded-lg border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-gray-900/20"
            >
              <option value="">Browser default detected voice</option>
              <option
                v-for="voice in voiceOptions"
                :key="voice.voiceURI"
                :value="voice.voiceURI"
              >
                {{ voice.name }} ({{ voice.lang }})
              </option>
            </select>
            <p class="text-xs text-gray-500">
              Voices matching the detected language appear first when your browser provides them.
            </p>
          </div>

          <div class="space-y-2">
            <div class="flex items-center justify-between gap-3">
              <label for="rate-control" class="text-sm font-semibold text-gray-900">
                Speed
              </label>
              <span class="text-xs text-gray-500">{{ rate.toFixed(1) }}x</span>
            </div>
            <input
              id="rate-control"
              v-model.number="rate"
              type="range"
              min="0.5"
              max="1.5"
              step="0.1"
              class="w-full"
            />
          </div>

          <div v-if="engine === 'browser'" class="space-y-2">
            <div class="flex items-center justify-between gap-3">
              <label for="pitch-control" class="text-sm font-semibold text-gray-900">
                Pitch
              </label>
              <span class="text-xs text-gray-500">{{ pitch.toFixed(1) }}</span>
            </div>
            <input
              id="pitch-control"
              v-model.number="pitch"
              type="range"
              min="0.5"
              max="1.5"
              step="0.1"
              class="w-full"
            />
          </div>

          <div class="space-y-2">
            <div class="flex items-center justify-between gap-3">
              <label for="volume-control" class="text-sm font-semibold text-gray-900">
                Volume
              </label>
              <span class="text-xs text-gray-500">{{ Math.round(volume * 100) }}%</span>
            </div>
            <input
              id="volume-control"
              v-model.number="volume"
              type="range"
              min="0"
              max="1"
              step="0.05"
              class="w-full"
            />
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
useSeoMeta({
  title: "Text to Voice Khmer and English - ChlatWork",
  description:
    "Read Khmer or English text aloud with automatic language detection, online audio, and browser text-to-speech controls.",
  ogTitle: "Text to Voice Khmer and English - ChlatWork",
  ogDescription:
    "Khmer and English text-to-voice with automatic language detection and online audio support.",
});

type SpeechEngine = "online" | "browser";
type TextLanguage = "km" | "en";

const DEFAULT_TEXT =
  "សួស្តី! សូមសាកល្បងបញ្ចូលអត្ថបទភាសាខ្មែរ ហើយចុច Speak ដើម្បីស្តាប់សំឡេង។";
const ENGLISH_FONT_STACK =
  '"-apple-system-body", "ui-sans-serif", "-apple-system", "system-ui", "Segoe UI", "Helvetica", "Apple Color Emoji", "Arial", "sans-serif", "Segoe UI Emoji", "Segoe UI Symbol"';
const KHMER_FONT_STACK = `"Hanuman", ${ENGLISH_FONT_STACK}`;
const MAX_AUDIO_SECONDS = 10;
const GOOGLE_TTS_CHUNK_LIMIT = 180;
const KHMER_GRAPHEMES_PER_SECOND = 12;
const NARAKEET_TTS_CHUNK_LIMIT = MAX_AUDIO_SECONDS * KHMER_GRAPHEMES_PER_SECOND;
const onlineVoiceOptions = [
  {
    key: "auto",
    label: "Auto (Khmer / English)",
    provider: "google",
    language: "auto",
  },
  {
    key: "khmer-default",
    label: "Khmer default",
    provider: "google",
    language: "km",
  },
  {
    key: "english-default",
    label: "English default",
    provider: "google",
    language: "en",
  },
  {
    key: "khmer-male-graham",
    label: "Graham - Male Warm Smooth",
    provider: "narakeet",
    language: "km",
  },
  {
    key: "khmer-male-sovath",
    label: "Sovath - Male",
    provider: "narakeet",
    language: "km",
  },
  {
    key: "khmer-female-nisa",
    label: "Nisa - Female",
    provider: "narakeet",
    language: "km",
  },
] as const;

const text = ref(DEFAULT_TEXT);
const engine = ref<SpeechEngine>("online");
const audioPlayer = ref<HTMLAudioElement | null>(null);
const onlineVoice = ref<(typeof onlineVoiceOptions)[number]["key"]>("auto");
const voices = ref<SpeechSynthesisVoice[]>([]);
const selectedVoiceURI = ref("");
const rate = ref(1);
const pitch = ref(1);
const volume = ref(1);
const isSpeaking = ref(false);
const isPaused = ref(false);
const isDownloading = ref(false);
const error = ref("");
const onlineChunks = ref<string[]>([]);
const onlineChunkIndex = ref(0);
const downloadProgress = ref({ current: 0, total: 0 });
const currentAudioUrl = ref("");

const characterCount = computed(() => text.value.length);
const detectedTextLanguage = computed<TextLanguage>(() => detectTextLanguage(text.value));
const detectedLanguageTag = computed(() =>
  detectedTextLanguage.value === "km" ? "km-KH" : "en-US",
);
const detectedLanguageLabel = computed(() =>
  detectedTextLanguage.value === "km" ? "Khmer" : "English",
);
const textPlaceholder = computed(() =>
  detectedTextLanguage.value === "km"
    ? "សូមបញ្ចូលអត្ថបទភាសាខ្មែរ..."
    : "Type English text here...",
);
const textFontFamily = computed(() =>
  detectedTextLanguage.value === "km" ? KHMER_FONT_STACK : ENGLISH_FONT_STACK,
);
const estimatedSpeechSeconds = computed(() => estimateSpeechSeconds(text.value));
const activeOnlineVoiceKey = computed(() =>
  resolveOnlineVoiceKey(onlineVoice.value, detectedTextLanguage.value),
);
const selectedOnlineVoiceOption = computed(
  () =>
    onlineVoiceOptions.find((voice) => voice.key === activeOnlineVoiceKey.value) ??
    null,
);
const usesNarakeetVoice = computed(
  () => engine.value === "online" && selectedOnlineVoiceOption.value?.provider === "narakeet",
);
const onlineTtsChunkLimit = computed(() =>
  selectedOnlineVoiceOption.value?.provider === "narakeet"
    ? NARAKEET_TTS_CHUNK_LIMIT
    : GOOGLE_TTS_CHUNK_LIMIT,
);
const isOverDurationLimit = computed(
  () => usesNarakeetVoice.value && estimatedSpeechSeconds.value > MAX_AUDIO_SECONDS,
);
const narakeetDurationLimitMessage = computed(
  () =>
    `Text is estimated at ${estimatedSpeechSeconds.value}s. Limit is ${MAX_AUDIO_SECONDS}s for Narakeet voices.`,
);
const hasOnlineAudioSupport = computed(() => process.client);
const hasSpeechSupport = computed(
  () => process.client && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window,
);
const canSpeak = computed(() => {
  const hasText = text.value.trim().length > 0;
  const hasEngine =
    engine.value === "online" ? hasOnlineAudioSupport.value : hasSpeechSupport.value;

  return hasText && hasEngine && !isOverDurationLimit.value;
});
const canDownload = computed(
  () => engine.value === "online" && canSpeak.value && !isDownloading.value,
);
const matchingBrowserVoices = computed(() =>
  voices.value.filter((voice) =>
    isVoiceForLanguage(voice, detectedTextLanguage.value),
  ),
);
const voiceOptions = computed(() => {
  const matchingVoiceURIs = new Set(
    matchingBrowserVoices.value.map((voice) => voice.voiceURI),
  );
  const otherVoices = voices.value.filter(
    (voice) => !matchingVoiceURIs.has(voice.voiceURI),
  );

  return [...matchingBrowserVoices.value, ...otherVoices];
});
const selectedVoice = computed(
  () => voices.value.find((voice) => voice.voiceURI === selectedVoiceURI.value) ?? null,
);
const message = computed(() => {
  if (!process.client) {
    return "";
  }

  if (error.value) {
    return error.value;
  }

  if (engine.value === "online" && !hasOnlineAudioSupport.value) {
    return "Online audio is not available in this browser.";
  }

  if (engine.value === "browser" && !hasSpeechSupport.value) {
    return "Your browser does not support text-to-speech.";
  }

  if (
    engine.value === "browser" &&
    voices.value.length > 0 &&
    matchingBrowserVoices.value.length === 0
  ) {
    return `No ${detectedLanguageLabel.value} voice was found. The browser may still read with its default voice.`;
  }

  if (isOverDurationLimit.value) {
    return narakeetDurationLimitMessage.value;
  }

  if (isPaused.value) {
    return "Speech is paused.";
  }

  if (isSpeaking.value) {
    return engine.value === "online"
      ? `Playing ${detectedLanguageLabel.value} audio ${onlineChunkIndex.value + 1} of ${onlineChunks.value.length}.`
      : `Speaking ${detectedLanguageLabel.value} text...`;
  }

  if (isDownloading.value) {
    return `Preparing MP3 ${downloadProgress.value.current} of ${downloadProgress.value.total}.`;
  }

  return "";
});
const messageClass = computed(() =>
  error.value ||
  isOverDurationLimit.value ||
  (engine.value === "online" && !hasOnlineAudioSupport.value) ||
  (engine.value === "browser" && !hasSpeechSupport.value)
    ? "text-red-600"
    : "text-gray-500",
);

onMounted(() => {
  if (!hasSpeechSupport.value) {
    return;
  }

  loadVoices();
  window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
});

onBeforeUnmount(() => {
  stop();

  if (hasSpeechSupport.value) {
    window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
  }
});

watch(matchingBrowserVoices, (nextVoices) => {
  if (
    (!selectedVoice.value ||
      !isVoiceForLanguage(selectedVoice.value, detectedTextLanguage.value)) &&
    nextVoices.length > 0
  ) {
    selectedVoiceURI.value = nextVoices[0].voiceURI;
  }
});

watch(detectedTextLanguage, (language) => {
  const selectedOnlineVoice = onlineVoiceOptions.find(
    (voice) => voice.key === onlineVoice.value,
  );

  if (
    selectedOnlineVoice &&
    selectedOnlineVoice.language !== "auto" &&
    selectedOnlineVoice.language !== language
  ) {
    onlineVoice.value = "auto";
  }

  if (
    selectedVoice.value &&
    !isVoiceForLanguage(selectedVoice.value, language)
  ) {
    selectedVoiceURI.value = matchingBrowserVoices.value[0]?.voiceURI ?? "";
  }
});

watch(engine, () => {
  stop();
  error.value = "";
});

watch([text, onlineVoice], () => {
  if (!isOverDurationLimit.value && error.value.includes("for Narakeet voices")) {
    error.value = "";
  }
});

watch(onlineVoice, (voiceKey) => {
  const selectedOnlineVoice = onlineVoiceOptions.find(
    (voice) => voice.key === voiceKey,
  );

  if (
    selectedOnlineVoice &&
    selectedOnlineVoice.language !== "auto" &&
    selectedOnlineVoice.language !== detectedTextLanguage.value
  ) {
    onlineVoice.value = "auto";
  }
});

watch([rate, volume], ([nextRate, nextVolume]) => {
  if (!audioPlayer.value) {
    return;
  }

  audioPlayer.value.playbackRate = nextRate;
  audioPlayer.value.volume = nextVolume;
});

function containsKhmerContent(value: string) {
  return /[\u1780-\u17FF\u19E0-\u19FF]/u.test(value);
}

function detectTextLanguage(value: string): TextLanguage {
  return containsKhmerContent(value) ? "km" : "en";
}

function resolveOnlineVoiceKey(
  voiceKey: (typeof onlineVoiceOptions)[number]["key"],
  language: TextLanguage,
) {
  const selectedVoice = onlineVoiceOptions.find((voice) => voice.key === voiceKey);

  if (!selectedVoice || selectedVoice.language === "auto") {
    return language === "km" ? "khmer-default" : "english-default";
  }

  if (selectedVoice.language !== language) {
    return language === "km" ? "khmer-default" : "english-default";
  }

  return voiceKey;
}

function isVoiceForLanguage(
  voice: SpeechSynthesisVoice,
  language: TextLanguage,
) {
  const voiceLanguage = voice.lang.toLowerCase();

  if (language === "km") {
    return voiceLanguage.startsWith("km");
  }

  return voiceLanguage.startsWith("en");
}

function loadVoices() {
  voices.value = window.speechSynthesis.getVoices();
}

function speak() {
  const trimmedText = text.value.trim();
  if (!trimmedText) {
    error.value = "Enter text before speaking.";
    return;
  }

  if (isOverDurationLimit.value) {
    error.value = narakeetDurationLimitMessage.value;
    return;
  }

  error.value = "";
  stop();

  if (engine.value === "online") {
    void playOnlineSpeech(trimmedText);
    return;
  }

  speakWithBrowser(trimmedText);
}

async function playOnlineSpeech(value: string) {
  const chunks = splitTextForOnlineTts(value);
  if (chunks.length === 0) {
    error.value = "Enter text before speaking.";
    return;
  }

  onlineChunks.value = chunks;
  onlineChunkIndex.value = 0;
  await playCurrentOnlineChunk();
}

async function playCurrentOnlineChunk() {
  const audio = audioPlayer.value;
  const chunk = onlineChunks.value[onlineChunkIndex.value];

  if (!audio || !chunk) {
    error.value = `Unable to prepare ${detectedLanguageLabel.value} audio.`;
    resetSpeechState();
    return;
  }

  audio.pause();
  revokeCurrentAudioUrl();

  try {
    const audioBlob = await fetchAudioBlob(chunk);
    currentAudioUrl.value = URL.createObjectURL(audioBlob);
    audio.src = currentAudioUrl.value;
  } catch (caught: any) {
    error.value =
      caught?.message || `Unable to load ${detectedLanguageLabel.value} audio.`;
    resetSpeechState();
    return;
  }

  audio.playbackRate = rate.value;
  audio.volume = volume.value;

  try {
    isSpeaking.value = true;
    isPaused.value = false;
    await audio.play();
  } catch {
    error.value = `Unable to play ${detectedLanguageLabel.value} audio. Check the internet connection and try again.`;
    resetSpeechState();
  }
}

function playNextOnlineChunk() {
  if (engine.value !== "online" || !isSpeaking.value) {
    return;
  }

  if (onlineChunkIndex.value < onlineChunks.value.length - 1) {
    onlineChunkIndex.value += 1;
    void playCurrentOnlineChunk();
    return;
  }

  resetSpeechState();
}

function handleOnlineError() {
  if (engine.value !== "online" || !isSpeaking.value) {
    return;
  }

  error.value = `Unable to load ${detectedLanguageLabel.value} audio. Check the internet connection and try again.`;
  resetSpeechState();
}

function speakWithBrowser(value: string) {
  if (!hasSpeechSupport.value) {
    error.value = "Your browser does not support text-to-speech.";
    return;
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(value);
  utterance.lang = selectedVoice.value?.lang || detectedLanguageTag.value;
  utterance.voice = selectedVoice.value;
  utterance.rate = rate.value;
  utterance.pitch = pitch.value;
  utterance.volume = volume.value;

  utterance.onstart = () => {
    isSpeaking.value = true;
    isPaused.value = false;
  };
  utterance.onpause = () => {
    isPaused.value = true;
  };
  utterance.onresume = () => {
    isPaused.value = false;
  };
  utterance.onend = resetSpeechState;
  utterance.onerror = () => {
    error.value = "Unable to play speech with the selected voice.";
    resetSpeechState();
  };

  window.speechSynthesis.speak(utterance);
}

function togglePause() {
  if (isPaused.value) {
    resumeSpeech();
    return;
  }

  pauseSpeech();
}

function stop() {
  resetSpeechState();

  if (hasSpeechSupport.value) {
    window.speechSynthesis.cancel();
  }

  if (audioPlayer.value) {
    audioPlayer.value.pause();
    audioPlayer.value.removeAttribute("src");
    audioPlayer.value.load();
  }

  revokeCurrentAudioUrl();
}

function clearText() {
  stop();
  text.value = "";
  error.value = "";
}

async function downloadSpeech() {
  const trimmedText = text.value.trim();
  if (!trimmedText) {
    error.value = "Enter text before downloading.";
    return;
  }

  if (engine.value !== "online") {
    error.value = "Only ChlatWork API audio can be downloaded.";
    return;
  }

  if (isOverDurationLimit.value) {
    error.value = narakeetDurationLimitMessage.value;
    return;
  }

  const chunks = splitTextForOnlineTts(trimmedText);
  if (chunks.length === 0) {
    error.value = "Enter text before downloading.";
    return;
  }

  error.value = "";
  isDownloading.value = true;
  downloadProgress.value = { current: 0, total: chunks.length };

  try {
    const audioParts: BlobPart[] = [];

    for (const chunk of chunks) {
      downloadProgress.value.current += 1;
      audioParts.push(await fetchAudioBlob(chunk, true));
    }

    const audioBlob = new Blob(audioParts, { type: "audio/mpeg" });
    const downloadUrl = URL.createObjectURL(audioBlob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = `${detectedTextLanguage.value}-text-to-voice-${formatDownloadDate(new Date())}.mp3`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(downloadUrl);
  } catch (caught: any) {
    error.value =
      caught?.message ||
      `Unable to download ${detectedLanguageLabel.value} audio.`;
  } finally {
    isDownloading.value = false;
    downloadProgress.value = { current: 0, total: 0 };
  }
}

function resetSpeechState() {
  isSpeaking.value = false;
  isPaused.value = false;
  onlineChunks.value = [];
  onlineChunkIndex.value = 0;
}

function pauseSpeech() {
  if (engine.value === "online") {
    audioPlayer.value?.pause();
    isPaused.value = true;
    return;
  }

  if (hasSpeechSupport.value) {
    window.speechSynthesis.pause();
    isPaused.value = true;
  }
}

function resumeSpeech() {
  if (engine.value === "online") {
    void audioPlayer.value
      ?.play()
      .then(() => {
        isPaused.value = false;
      })
      .catch(() => {
        error.value = `Unable to resume ${detectedLanguageLabel.value} audio.`;
        resetSpeechState();
      });
    return;
  }

  if (hasSpeechSupport.value) {
    window.speechSynthesis.resume();
    isPaused.value = false;
  }
}

function buildOnlineTtsUrl(value: string, download = false) {
  const params = new URLSearchParams({
    lang: detectedTextLanguage.value,
    text: value,
    voice: activeOnlineVoiceKey.value,
  });

  if (download) {
    params.set("download", "1");
  }

  return `/api/text-to-voice?${params.toString()}`;
}

async function fetchAudioBlob(value: string, download = false) {
  const response = await fetch(buildOnlineTtsUrl(value, download));
  const contentType = response.headers.get("content-type") || "";

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  if (!contentType.includes("audio")) {
    throw new Error(await readApiError(response));
  }

  return response.blob();
}

function splitTextForOnlineTts(value: string) {
  const normalizedText = value.replace(/\s+/g, " ").trim();
  const sentenceChunks = normalizedText.match(/[^។៕.!?]+[។៕.!?]?/gu) ?? [
    normalizedText,
  ];

  return sentenceChunks.flatMap((chunk) => splitLongChunk(chunk.trim())).filter(Boolean);
}

function splitLongChunk(value: string) {
  const words = value.split(/\s+/).filter(Boolean);

  if (words.length > 1) {
    return splitByWords(words);
  }

  return splitByGraphemes(value);
}

function splitByWords(words: string[]) {
  const chunks: string[] = [];
  let currentChunk = "";

  for (const word of words) {
    const nextChunk = currentChunk ? `${currentChunk} ${word}` : word;

    if (countGraphemes(nextChunk) <= onlineTtsChunkLimit.value) {
      currentChunk = nextChunk;
      continue;
    }

    if (currentChunk) {
      chunks.push(currentChunk);
    }

    if (countGraphemes(word) > onlineTtsChunkLimit.value) {
      chunks.push(...splitByGraphemes(word));
      currentChunk = "";
      continue;
    }

    currentChunk = word;
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
}

function splitByGraphemes(value: string) {
  const graphemes = getGraphemes(value);
  const chunks: string[] = [];

  for (let index = 0; index < graphemes.length; index += onlineTtsChunkLimit.value) {
    chunks.push(graphemes.slice(index, index + onlineTtsChunkLimit.value).join(""));
  }

  return chunks;
}

function countGraphemes(value: string) {
  return getGraphemes(value).length;
}

function estimateSpeechSeconds(value: string) {
  const graphemeCount = countGraphemes(value.replace(/\s+/g, " ").trim());

  if (graphemeCount === 0) {
    return 0;
  }

  return Math.ceil(graphemeCount / KHMER_GRAPHEMES_PER_SECOND);
}

function getGraphemes(value: string) {
  const Segmenter = (Intl as any).Segmenter;

  if (Segmenter) {
    const segmenter = new Segmenter(detectedTextLanguage.value, {
      granularity: "grapheme",
    });
    return Array.from(segmenter.segment(value), (item: any) => item.segment as string);
  }

  return Array.from(value);
}

async function readApiError(response: Response) {
  try {
    const data = await response.json();
    return data?.statusMessage || data?.message || "Unable to generate audio.";
  } catch {
    return "Unable to generate audio.";
  }
}

function formatDownloadDate(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  const hours = String(value.getHours()).padStart(2, "0");
  const minutes = String(value.getMinutes()).padStart(2, "0");
  const seconds = String(value.getSeconds()).padStart(2, "0");

  return `${year}${month}${day}-${hours}${minutes}${seconds}`;
}

function revokeCurrentAudioUrl() {
  if (!currentAudioUrl.value) {
    return;
  }

  URL.revokeObjectURL(currentAudioUrl.value);
  currentAudioUrl.value = "";
}
</script>
