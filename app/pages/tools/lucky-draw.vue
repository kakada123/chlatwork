<template>
  <div class="mx-auto max-w-5xl">
    <div
      class="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between"
    >
      <div>
        <h1 class="text-xl font-bold leading-tight">Lucky Draw Wheel</h1>
        <p class="mt-2 max-w-xl text-gray-600">
          Add names, spin the wheel, and let the top pointer choose the winner.
        </p>
      </div>

      <div class="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <button
          class="w-full rounded-lg border bg-white px-4 py-2 hover:bg-gray-100 sm:w-auto"
          @click="reset"
        >
          Reset
        </button>

        <button
          class="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-black px-4 py-2 text-white hover:opacity-90 sm:w-auto"
          @click="shareLink"
          :aria-label="shareCopied ? 'Link copied' : 'Share link'"
        >
          <svg
            v-if="!shareCopied"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            class="h-4 w-4"
          >
            <path
              fill="currentColor"
              d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7a2.5 2.5 0 0 0 0-1.39l7-4.11A2.99 2.99 0 1 0 14 5a2.9 2.9 0 0 0 .05.52l-7 4.11a3 3 0 1 0 0 4.74l7.05 4.11c-.03.17-.05.34-.05.52a3 3 0 1 0 3-2.92Z"
            />
          </svg>

          <svg
            v-else
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            class="h-4 w-4"
          >
            <path
              fill="currentColor"
              d="M9.55 18.2 4.8 13.45l1.4-1.4 3.35 3.35 8.25-8.25 1.4 1.4-9.65 9.65Z"
            />
          </svg>

          <span class="text-sm font-medium">
            {{ shareCopied ? "Link copied" : "Share link" }}
          </span>
        </button>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-4 md:grid-cols-[1fr_430px]">
      <div class="rounded-xl border bg-white p-4">
        <div class="mb-2 flex items-center justify-between gap-3">
          <h2 class="font-semibold">Participants</h2>

          <div class="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700">
            {{ participants.length }} people
          </div>
        </div>

        <div class="overflow-auto rounded-xl border">
          <table class="w-full text-sm">
            <thead class="bg-gray-50">
              <tr>
                <th class="w-[85%] p-2 text-left">Full name</th>
                <th class="w-[15%] p-2"></th>
              </tr>
            </thead>

            <tbody>
              <tr
                v-for="(row, index) in rows"
                :key="index"
                class="align-top border-t"
              >
                <td class="p-2">
                  <input
                    :ref="(element) => setNameInputRef(element, index)"
                    v-model.trim="row.name"
                    class="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-black/10"
                    placeholder="e.g. Kakada Ngen"
                  />
                </td>

                <td class="p-2 text-right">
                  <button
                    class="rounded-lg border px-2 py-2 hover:bg-gray-100"
                    @click="removeRow(index)"
                    :aria-label="`Remove row ${index + 1}`"
                  >
                    ✕
                  </button>
                </td>
              </tr>

              <tr v-if="rows.length === 0">
                <td colspan="2" class="p-3 text-gray-500">
                  No participants yet. Click “Add row”.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <button
            class="inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10 active:scale-[0.99]"
            @click="addRow"
          >
            <span class="text-base leading-none">＋</span>
            <span class="truncate">Add row</span>
          </button>

          <button
            class="inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-black px-3 text-sm font-medium text-white hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10 active:scale-[0.99]"
            @click="loadExample"
          >
            <span class="truncate">Load example</span>
          </button>

          <button
            class="inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10 active:scale-[0.99]"
            @click="applyRawToRows"
          >
            <span class="truncate">Apply paste</span>
          </button>
        </div>

        <details class="mt-4">
          <summary
            class="cursor-pointer text-sm text-gray-600 hover:text-gray-900"
          >
            Paste mode (optional)
          </summary>

          <textarea
            v-model="raw"
            class="mt-2 h-40 w-full rounded-xl border p-3 font-mono text-sm outline-none focus:ring-2 focus:ring-black/10"
            placeholder="Example:
Kakada Ngen
Mina Sok
Sreynea Chhun
John Smith"
          />
        </details>

        <p v-if="error" class="mt-3 text-sm text-red-600">{{ error }}</p>
      </div>

      <div ref="wheelStageRef" :class="wheelCardClass">
        <canvas
          ref="confettiCanvasRef"
          class="pointer-events-none absolute inset-0 z-40 h-full w-full"
        />

        <div class="relative z-10 flex h-full min-h-0 flex-col">
          <div class="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 class="font-semibold">Wheel Spinner</h2>

              <div class="text-sm text-gray-500">
                {{ canSpin ? "Ready to spin" : "Need at least 2 people" }}
              </div>
            </div>

            <button
              v-if="isFullscreenSupported"
              class="inline-flex h-10 w-10 items-center justify-center rounded-lg border bg-white hover:bg-gray-100"
              @click="toggleWheelFullscreen"
              :aria-label="
                isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'
              "
              :title="isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'"
            >
              <svg
                v-if="!isFullscreen"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                class="h-5 w-5"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M8 3H5a2 2 0 0 0-2 2v3" />
                <path d="M16 3h3a2 2 0 0 1 2 2v3" />
                <path d="M8 21H5a2 2 0 0 1-2-2v-3" />
                <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
              </svg>

              <svg
                v-else
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                class="h-5 w-5"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M9 3H5v4" />
                <path d="M15 3h4v4" />
                <path d="M9 21H5v-4" />
                <path d="M15 21h4v-4" />
              </svg>
            </button>
          </div>

          <div class="flex flex-1 min-h-0 flex-col">
            <div class="flex flex-1 items-center justify-center min-h-0">
              <div
                class="relative mx-auto aspect-square w-full"
                :style="wheelBoxStyle"
              >
                <div class="absolute left-1/2 top-0 z-30 -translate-x-1/2">
                  <div
                    class="h-0 w-0 border-l-[14px] border-r-[14px] border-b-[24px] border-l-transparent border-r-transparent border-b-black drop-shadow-sm"
                  />
                </div>

                <div
                  class="relative h-full w-full overflow-hidden rounded-full border-[10px] border-white bg-gray-50 shadow-xl"
                >
                  <svg
                    viewBox="0 0 100 100"
                    class="h-full w-full"
                    aria-label="Lucky draw wheel"
                  >
                    <g :transform="`rotate(${wheelRotation} 50 50)`">
                      <template v-if="wheelSegments.length > 0">
                        <path
                          v-for="segment in wheelSegments"
                          :key="segment.index"
                          :d="segment.path"
                          :fill="segment.color"
                          stroke="#ffffff"
                          stroke-width="0.8"
                        />

                        <g
                          v-for="segment in wheelSegments"
                          :key="`label-${segment.index}`"
                          :transform="`translate(${segment.labelX} ${segment.labelY}) rotate(${segment.textRotation})`"
                        >
                          <text
                            text-anchor="middle"
                            fill="#ffffff"
                            stroke="rgba(0,0,0,0.18)"
                            stroke-width="0.4"
                            paint-order="stroke"
                            font-weight="700"
                            :font-size="wheelLabelFontSize"
                            style="letter-spacing: 0.15px"
                          >
                            <tspan
                              v-for="(line, lineIndex) in segment.labelLines"
                              :key="`${segment.index}-${lineIndex}`"
                              x="0"
                              :dy="
                                getLabelLineDy(
                                  lineIndex,
                                  segment.labelLines.length,
                                )
                              "
                            >
                              {{ line }}
                            </tspan>
                          </text>
                        </g>
                      </template>

                      <circle
                        cx="50"
                        cy="50"
                        r="15"
                        fill="rgba(255,255,255,0.96)"
                        stroke="#e5e7eb"
                        stroke-width="1"
                      />
                    </g>
                  </svg>

                  <div
                    class="absolute inset-0 flex items-center justify-center"
                  >
                    <button
                      class="inline-flex h-20 w-20 items-center justify-center rounded-full bg-black text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                      :disabled="!canSpin"
                      @click="runLuckyDraw"
                    >
                      {{ isSpinning ? "..." : "SPIN" }}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <p class="mt-4 text-center text-sm text-gray-500">
              The top pointer lands exactly in the middle of the winning color.
            </p>

            <div
              v-if="lastWinner"
              class="mt-3 rounded-xl border bg-gray-50 p-3 text-center text-sm"
            >
              <span class="text-gray-500">Winner:</span>
              <span class="ml-2 font-semibold text-gray-900">{{
                lastWinner
              }}</span>
            </div>

            <div
              :class="
                isFullscreen
                  ? 'mt-4 min-h-0 max-h-[28vh] overflow-auto'
                  : 'mt-4'
              "
            >
              <h3 class="mb-2 font-semibold">Participants</h3>

              <div
                v-if="participants.length === 0"
                class="text-sm text-gray-500"
              >
                No participants yet.
              </div>

              <div v-else class="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div
                  v-for="segment in wheelSegments"
                  :key="`${segment.index}-${segment.name}`"
                  class="flex items-center gap-2 rounded-lg border bg-gray-50 px-3 py-2 text-sm"
                >
                  <span
                    class="h-3 w-3 shrink-0 rounded-full"
                    :style="{ backgroundColor: segment.color }"
                  />
                  <span class="truncate">{{ segment.name }}</span>
                </div>
              </div>
            </div>

            <p class="sr-only" aria-live="polite">
              {{ lastWinner ? `Winner is ${lastWinner}` : "No winner yet" }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ComponentPublicInstance } from "vue";

type InputRow = {
  name: string;
};

type SharePayload = {
  t?: string;
};

type WheelSegment = {
  index: number;
  name: string;
  color: string;
  startAngle: number;
  endAngle: number;
  midAngle: number;
  path: string;
  labelX: number;
  labelY: number;
  textRotation: number;
  labelLines: string[];
};

type ConfettiLauncher = ((options?: Record<string, unknown>) => unknown) | null;

const route = useRoute();
const router = useRouter();

useSeoMeta({
  title: "Lucky Draw Wheel | ChlatWork",
  description:
    "Add participants and spin a colorful lucky draw wheel instantly.",
  ogTitle: "Lucky Draw Wheel | ChlatWork",
  ogDescription:
    "Add participants and spin a colorful lucky draw wheel instantly.",
  ogType: "website",
  twitterCard: "summary_large_image",
  twitterTitle: "Lucky Draw Wheel | ChlatWork",
  twitterDescription:
    "Add participants and spin a colorful lucky draw wheel instantly.",
});

useHead({
  link: [
    {
      rel: "canonical",
      href: "https://chlatwork.com/tools/lucky-draw",
    },
  ],
});

const INITIAL_ROWS = (): InputRow[] => [
  { name: "" },
  { name: "" },
  { name: "" },
];

const SEGMENT_COLORS = [
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#84cc16",
  "#10b981",
  "#14b8a6",
  "#06b6d4",
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#d946ef",
  "#ec4899",
];

const SPIN_DURATION_MS = 8200;
const FULL_TURNS = 12;
const WHEEL_CENTER = 50;
const WHEEL_RADIUS = 49;

const rows = ref<InputRow[]>(INITIAL_ROWS());
const raw = ref("");
const error = ref("");
const shareCopied = ref(false);
const isSpinning = ref(false);
const wheelRotation = ref(0);
const lastWinner = ref("");
const isFullscreen = ref(false);

const nameInputRefs = ref<(HTMLInputElement | null)[]>([]);
const wheelStageRef = ref<HTMLElement | null>(null);
const confettiCanvasRef = ref<HTMLCanvasElement | null>(null);
const audioContext = ref<AudioContext | null>(null);

let shareTimer: ReturnType<typeof setTimeout> | null = null;
let spinAnimationFrameId: number | null = null;
let confettiLauncher: ConfettiLauncher = null;

function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function parseRows(inputRows: InputRow[]) {
  return inputRows.map((row) => normalizeName(row.name ?? "")).filter(Boolean);
}

function parseLines(input: string) {
  return input
    .split(/\n|,/)
    .map((line) => normalizeName(line))
    .filter(Boolean);
}

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(1, maxLength - 1)).trim()}…`;
}

function splitNameForWheelLabel(
  value: string,
  maxCharsPerLine: number,
  maxLines = 3,
) {
  const words = normalizeName(value).split(" ").filter(Boolean);
  if (words.length === 0) return [""];

  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    if (word.length > maxCharsPerLine && !currentLine) {
      lines.push(truncateText(word, maxCharsPerLine));
      continue;
    }

    const nextLine = currentLine ? `${currentLine} ${word}` : word;

    if (nextLine.length <= maxCharsPerLine) {
      currentLine = nextLine;
      continue;
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    currentLine =
      word.length > maxCharsPerLine
        ? truncateText(word, maxCharsPerLine)
        : word;
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  if (lines.length <= maxLines) {
    return lines;
  }

  const visibleLines = lines.slice(0, maxLines - 1);
  const remaining = lines.slice(maxLines - 1).join(" ");
  visibleLines.push(truncateText(remaining, maxCharsPerLine));

  return visibleLines;
}

const participants = computed(() => parseRows(rows.value));

const canSpin = computed(
  () => participants.value.length >= 2 && !isSpinning.value,
);

const segmentAngle = computed(() => {
  if (participants.value.length === 0) return 360;
  return 360 / participants.value.length;
});

const wheelLabelFontSize = computed(() => {
  const count = participants.value.length;

  if (count <= 4) return 4;
  if (count <= 6) return 3.5;
  if (count <= 10) return 2.8;
  if (count <= 14) return 2.3;
  return 1.9;
});

const labelRadius = computed(() => {
  const count = participants.value.length;

  if (count <= 4) return 28;
  if (count <= 8) return 31;
  if (count <= 12) return 34;
  if (count <= 18) return 36;
  return 38;
});

const labelMaxCharsPerLine = computed(() => {
  const count = participants.value.length;

  if (count <= 4) return 14;
  if (count <= 8) return 12;
  if (count <= 12) return 10;
  return 8;
});

const isFullscreenSupported = computed(() => {
  return import.meta.client && typeof document !== "undefined"
    ? document.fullscreenEnabled
    : false;
});

const wheelCardClass = computed(() => {
  return [
    "relative flex min-h-0 flex-col bg-white",
    isFullscreen.value
      ? "fixed inset-0 z-[120] overflow-hidden rounded-none border-0 p-4 sm:p-5 md:p-6"
      : "rounded-xl border p-4",
  ].join(" ");
});

const wheelBoxStyle = computed(() => {
  return {
    maxWidth: isFullscreen.value ? "min(78vw, 68vh)" : "380px",
  };
});

function angleToPoint(angle: number, radius: number) {
  const radians = ((angle - 90) * Math.PI) / 180;

  return {
    x: WHEEL_CENTER + radius * Math.cos(radians),
    y: WHEEL_CENTER + radius * Math.sin(radians),
  };
}

function createSlicePath(startAngle: number, endAngle: number) {
  const start = angleToPoint(startAngle, WHEEL_RADIUS);
  const end = angleToPoint(endAngle, WHEEL_RADIUS);
  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

  return [
    `M ${WHEEL_CENTER} ${WHEEL_CENTER}`,
    `L ${start.x} ${start.y}`,
    `A ${WHEEL_RADIUS} ${WHEEL_RADIUS} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`,
    "Z",
  ].join(" ");
}

function getTextRotation(midAngle: number) {
  let rotation = midAngle;

  if (midAngle > 90 && midAngle < 270) {
    rotation += 180;
  }

  return rotation;
}

function getLabelLineDy(lineIndex: number, totalLines: number) {
  if (lineIndex === 0) {
    return `${-((totalLines - 1) * 0.58)}em`;
  }

  return "1.15em";
}

const wheelSegments = computed<WheelSegment[]>(() => {
  return participants.value.map((name, index) => {
    const startAngle = index * segmentAngle.value;
    const endAngle = (index + 1) * segmentAngle.value;
    const midAngle = startAngle + segmentAngle.value / 2;
    const labelPoint = angleToPoint(midAngle, labelRadius.value);

    return {
      index,
      name,
      color: SEGMENT_COLORS[index % SEGMENT_COLORS.length],
      startAngle,
      endAngle,
      midAngle,
      path: createSlicePath(startAngle, endAngle),
      labelX: labelPoint.x,
      labelY: labelPoint.y,
      textRotation: getTextRotation(midAngle),
      labelLines: splitNameForWheelLabel(name, labelMaxCharsPerLine.value),
    };
  });
});

function setNameInputRef(
  element: Element | ComponentPublicInstance | null,
  index: number,
) {
  nameInputRefs.value[index] = element as HTMLInputElement | null;
}

async function focusRowNameInput(index: number) {
  await nextTick();
  nameInputRefs.value[index]?.focus();
}

async function addRow() {
  rows.value.push({ name: "" });
  await focusRowNameInput(rows.value.length - 1);
}

function removeRow(index: number) {
  rows.value.splice(index, 1);
  nameInputRefs.value.splice(index, 1);

  if (rows.value.length === 0) {
    rows.value = INITIAL_ROWS();
  }
}

function applyRawToRows() {
  error.value = "";

  const names = parseLines(raw.value);

  if (names.length === 0) {
    error.value = "Please paste at least one valid name.";
    return;
  }

  rows.value = names.map((name) => ({ name }));
  raw.value = names.join("\n");
  nameInputRefs.value = [];
}

function loadExample() {
  rows.value = [
    { name: "Kakada Ngen" },
    { name: "Mina Sok" },
    { name: "Sreynea Chhun" },
    { name: "John Smith" },
    { name: "Rotha Chan" },
    { name: "Minea Chea" },
  ];
  raw.value = rows.value.map((row) => row.name).join("\n");
  error.value = "";
}

function reset() {
  rows.value = INITIAL_ROWS();
  raw.value = "";
  error.value = "";
  shareCopied.value = false;
  isSpinning.value = false;
  wheelRotation.value = 0;
  lastWinner.value = "";
  nameInputRefs.value = [];

  if (shareTimer) {
    clearTimeout(shareTimer);
    shareTimer = null;
  }

  stopSpinAnimation();
}

function buildSharePayload() {
  const payload: SharePayload = {
    t: participants.value.join("\n"),
  };

  const json = JSON.stringify(payload);

  return btoa(unescape(encodeURIComponent(json)))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function readSharePayload(value: string) {
  const padded =
    value.replaceAll("-", "+").replaceAll("_", "/") +
    "=".repeat((4 - (value.length % 4)) % 4);

  const json = decodeURIComponent(escape(atob(padded)));
  const payload = JSON.parse(json) as SharePayload;

  if (typeof payload.t === "string" && payload.t.trim()) {
    const names = parseLines(payload.t);
    rows.value = names.length
      ? names.map((name) => ({ name }))
      : INITIAL_ROWS();
    raw.value = names.join("\n");
  }
}

function flashShareCopied(ms = 1500) {
  shareCopied.value = true;

  if (shareTimer) clearTimeout(shareTimer);

  shareTimer = setTimeout(() => {
    shareCopied.value = false;
    shareTimer = null;
  }, ms);
}

async function shareLink() {
  const s = buildSharePayload();
  await router.replace({ query: { s } });

  const url = `${window.location.origin}${route.path}?s=${encodeURIComponent(s)}`;
  await navigator.clipboard.writeText(url);
  flashShareCopied();
}

function getWinningIndexFromRotation(rotation: number) {
  if (participants.value.length === 0) return -1;

  const normalizedRotation = ((rotation % 360) + 360) % 360;
  const pointerAngle = (360 - normalizedRotation + 0.0001) % 360;

  return Math.min(
    participants.value.length - 1,
    Math.floor(pointerAngle / segmentAngle.value),
  );
}

function easeOutQuint(value: number) {
  return 1 - Math.pow(1 - value, 5);
}

function stopSpinAnimation() {
  if (spinAnimationFrameId !== null) {
    cancelAnimationFrame(spinAnimationFrameId);
    spinAnimationFrameId = null;
  }
}

async function ensureAudioContext() {
  if (!import.meta.client) return null;

  if (!audioContext.value) {
    const AudioContextClass =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;

    if (!AudioContextClass) return null;

    audioContext.value = new AudioContextClass();
  }

  if (audioContext.value.state === "suspended") {
    await audioContext.value.resume();
  }

  return audioContext.value;
}

function playTone(
  frequency: number,
  durationMs: number,
  options?: {
    volume?: number;
    type?: OscillatorType;
    delayMs?: number;
  },
) {
  const context = audioContext.value;
  if (!context) return;

  const volume = options?.volume ?? 0.03;
  const type = options?.type ?? "sine";
  const delayMs = options?.delayMs ?? 0;

  const oscillator = context.createOscillator();
  const gainNode = context.createGain();

  const startAt = context.currentTime + delayMs / 1000;
  const endAt = startAt + durationMs / 1000;

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startAt);

  gainNode.gain.setValueAtTime(0.0001, startAt);
  gainNode.gain.exponentialRampToValueAtTime(volume, startAt + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, endAt);

  oscillator.connect(gainNode);
  gainNode.connect(context.destination);

  oscillator.start(startAt);
  oscillator.stop(endAt + 0.02);
}

function playTickSound() {
  playTone(980, 24, {
    volume: 0.018,
    type: "square",
  });
}

function playWinSound() {
  playTone(659, 130, {
    volume: 0.04,
    type: "triangle",
    delayMs: 0,
  });

  playTone(784, 150, {
    volume: 0.04,
    type: "triangle",
    delayMs: 130,
  });

  playTone(1046, 260, {
    volume: 0.045,
    type: "triangle",
    delayMs: 280,
  });
}

async function getConfettiLauncher() {
  if (!import.meta.client) return null;

  if (confettiLauncher) {
    return confettiLauncher;
  }

  try {
    const module = await import("canvas-confetti");
    const confetti = module.default;

    if (confettiCanvasRef.value) {
      confettiLauncher = confetti.create(confettiCanvasRef.value, {
        resize: true,
        useWorker: true,
      });
    } else {
      confettiLauncher = confetti;
    }

    return confettiLauncher;
  } catch {
    return null;
  }
}

async function launchConfetti() {
  const fire = await getConfettiLauncher();
  if (!fire) return;

  const originY = isFullscreen.value ? 0.35 : 0.42;

  fire({
    particleCount: 120,
    spread: 90,
    startVelocity: 38,
    scalar: 0.95,
    origin: { y: originY, x: 0.5 },
  });

  fire({
    particleCount: 80,
    spread: 120,
    startVelocity: 30,
    scalar: 0.8,
    origin: { y: originY, x: 0.22 },
  });

  fire({
    particleCount: 80,
    spread: 120,
    startVelocity: 30,
    scalar: 0.8,
    origin: { y: originY, x: 0.78 },
  });
}

function syncFullscreenState() {
  if (!import.meta.client) return;
  isFullscreen.value = document.fullscreenElement === wheelStageRef.value;
}

async function toggleWheelFullscreen() {
  if (!import.meta.client || !wheelStageRef.value) return;

  try {
    if (document.fullscreenElement === wheelStageRef.value) {
      await document.exitFullscreen();
      return;
    }

    await wheelStageRef.value.requestFullscreen();
  } catch {
    // ignore fullscreen failure
  }
}

async function runLuckyDraw() {
  if (!canSpin.value) return;

  await ensureAudioContext();

  const people = participants.value;
  const winnerIndex = Math.floor(Math.random() * people.length);
  const winnerName = people[winnerIndex];

  const winnerCenterAngle =
    winnerIndex * segmentAngle.value + segmentAngle.value / 2;

  const startRotation = wheelRotation.value;
  const normalizedCurrentRotation = ((startRotation % 360) + 360) % 360;
  const targetRotation = (360 - winnerCenterAngle + 360) % 360;
  const rotationDelta =
    FULL_TURNS * 360 +
    ((targetRotation - normalizedCurrentRotation + 360) % 360);

  isSpinning.value = true;
  lastWinner.value = "";

  stopSpinAnimation();

  let animationStartTime: number | null = null;
  let previousIndex = getWinningIndexFromRotation(startRotation);

  const animate = (timestamp: number) => {
    if (animationStartTime === null) {
      animationStartTime = timestamp;
    }

    const elapsed = timestamp - animationStartTime;
    const progress = Math.min(elapsed / SPIN_DURATION_MS, 1);
    const easedProgress = easeOutQuint(progress);
    const nextRotation = startRotation + rotationDelta * easedProgress;

    wheelRotation.value = nextRotation;

    const currentIndex = getWinningIndexFromRotation(nextRotation);
    if (currentIndex !== previousIndex && currentIndex !== -1) {
      playTickSound();
      previousIndex = currentIndex;
    }

    if (progress < 1) {
      spinAnimationFrameId = requestAnimationFrame(animate);
      return;
    }

    wheelRotation.value = startRotation + rotationDelta;
    isSpinning.value = false;
    lastWinner.value = winnerName;
    spinAnimationFrameId = null;

    playWinSound();
    launchConfetti();
  };

  spinAnimationFrameId = requestAnimationFrame(animate);
}

watch(
  rows,
  () => {
    error.value = "";
    raw.value = participants.value.join("\n");
  },
  { deep: true },
);

onMounted(() => {
  const s = route.query.s;

  if (typeof s === "string" && s.trim()) {
    try {
      readSharePayload(s.trim());
    } catch {
      // ignore invalid payload
    }
  }

  if (import.meta.client) {
    document.addEventListener("fullscreenchange", syncFullscreenState);
    syncFullscreenState();
  }
});

onBeforeUnmount(() => {
  if (shareTimer) clearTimeout(shareTimer);
  stopSpinAnimation();

  if (import.meta.client) {
    document.removeEventListener("fullscreenchange", syncFullscreenState);
  }

  if (audioContext.value && audioContext.value.state !== "closed") {
    audioContext.value.close();
  }
});
</script>
