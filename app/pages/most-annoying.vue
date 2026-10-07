<script setup lang="ts">
import { createSwatSoundPlayer } from "~/lib/cockroach-sound";

definePageMeta({ layout: false, blankCanvas: true, pageTransition: false });
useSeoMeta({
  title: "The Most Annoying Page Ever | ChlatWork",
  description:
    "Runaway buttons. Endless loading. Notifications that refuse to leave. Welcome to the chaos.",
  robots: "noindex, nofollow",
});

interface Notice {
  id: number;
  title: string;
  message: string;
  x: number;
  y: number;
}

const messages = [
  ["A quick interruption", "Just checking whether you are still annoyed."],
  ["Almost there!", "Your patience is downloading. Please wait forever."],
  ["One more thing…", "This notification could have been absolutely nothing."],
  ["Congratulations!", "You have unlocked another notification."],
  ["Are you sure?", "We are not sure either. Let’s ask again."],
  ["Very important update", "Nothing has changed. You’re welcome."],
] as const;
const floaters = ["🙃", "why?", "✳", "WAIT", "👀", "99%", "oops", "↗"];
const started = ref(false);
const paused = ref(false);
const soundEnabled = ref(false);
const reducedMotion = ref(false);
const tabHidden = ref(false);
const interruptions = ref(0);
const progress = ref(99);
const status = ref("Everything is fine. Suspiciously fine.");
const notices = shallowRef<Notice[]>([]);
const playground = ref<HTMLElement | null>(null);
const runaway = ref<HTMLButtonElement | null>(null);
const buttonPosition = shallowRef<{ x: number; y: number } | null>(null);
const active = computed(
  () => started.value && !paused.value && !tabHidden.value,
);
let timer: ReturnType<typeof setInterval> | undefined;
let media: MediaQueryList | undefined;
let soundPlayer: ReturnType<typeof createSwatSoundPlayer> | undefined;
let noticeId = 0;
let disposed = false;

function ping() {
  if (!active.value || !soundEnabled.value || disposed) return;
  // Reuse short, locally generated effects; nothing plays before the sound button is pressed.
  soundPlayer ??= createSwatSoundPlayer();
  soundPlayer.play(interruptions.value % 2 === 0);
}

function silence() {
  soundEnabled.value = false;
  soundPlayer?.dispose();
  soundPlayer = undefined;
}

function addNotice(title?: string, message?: string) {
  // The joke can multiply, but the DOM and notification count stay bounded for long visits.
  if (!active.value || disposed || notices.value.length >= 6) return;
  const copy = messages[noticeId % messages.length]!;
  notices.value = [
    ...notices.value,
    {
      id: ++noticeId,
      title: title ?? copy[0],
      message: message ?? copy[1],
      x: 8 + Math.random() * 65,
      y: 4 + Math.random() * 48,
    },
  ];
  interruptions.value++;
  ping();
}

function closeNotice(id: number) {
  if (!notices.value.some((notice) => notice.id === id)) return;
  notices.value = notices.value.filter((notice) => notice.id !== id);
  if (!active.value) return;
  addNotice(
    "You closed a notification",
    "We made two more. That seemed helpful.",
  );
  addNotice();
}

function resetTimer() {
  if (timer !== undefined) clearInterval(timer);
  timer = undefined;
  if (!active.value || disposed) return;
  timer = setInterval(() => {
    if (!active.value || disposed) return;
    progress.value = progress.value >= 99 ? 97 : progress.value + 1;
    status.value =
      progress.value === 99
        ? "99%. Just one more eternity."
        : "Recalculating the recalculation…";
    addNotice();
  }, 2200);
}

function startChaos() {
  if (disposed) return;
  started.value = true;
  paused.value = false;
  status.value = "Excellent choice. Terrible consequences.";
  addNotice("Welcome to the chaos", "Try closing this. Go on.");
  resetTimer();
}

function togglePause() {
  if (!started.value) return;
  paused.value = !paused.value;
  if (paused.value) silence();
  status.value = paused.value
    ? "A moment of peace. You earned it."
    : "Peace was nice while it lasted.";
  resetTimer();
}

function toggleSound() {
  if (!active.value || disposed) return;
  if (soundEnabled.value) silence();
  else {
    soundEnabled.value = true;
    ping();
  }
}

function dodge(event: PointerEvent) {
  // Keyboard focus stays stable, and touch users can tap normally rather than chase a hover target.
  if (
    !active.value ||
    reducedMotion.value ||
    event.pointerType === "touch" ||
    !playground.value ||
    !runaway.value ||
    document.activeElement === runaway.value
  )
    return;
  const width = Math.max(
    0,
    playground.value.clientWidth - runaway.value.offsetWidth - 24,
  );
  const height = Math.max(
    0,
    playground.value.clientHeight - runaway.value.offsetHeight - 24,
  );
  const current = buttonPosition.value ?? {
    x: width / 2 + 12,
    y: height / 2 + 12,
  };
  const x = 12 + Math.random() * width;
  const y = 12 + Math.random() * height;
  buttonPosition.value = {
    x:
      Math.abs(x - current.x) < width / 3
        ? current.x < width / 2
          ? width + 12
          : 12
        : x,
    y,
  };
  interruptions.value++;
  status.value = "You almost had it. Almost.";
  ping();
}

function catchButton() {
  if (!started.value) startChaos();
  if (!active.value) return;
  progress.value = 1;
  status.value = "You caught it! Your reward: start over.";
  addNotice(
    "Nice click. Anyway…",
    "Your progress has been reset to 1%. Enjoy.",
  );
}

function visibilityChanged() {
  tabHidden.value = document.hidden;
  if (tabHidden.value) silence();
  resetTimer();
}

function motionChanged() {
  reducedMotion.value = !!media?.matches;
  if (reducedMotion.value) buttonPosition.value = null;
}

function resizePlayground() {
  buttonPosition.value = null;
}

onMounted(() => {
  media = window.matchMedia("(prefers-reduced-motion: reduce)");
  motionChanged();
  media.addEventListener("change", motionChanged);
  document.addEventListener("visibilitychange", visibilityChanged);
  window.addEventListener("resize", resizePlayground);
  tabHidden.value = document.hidden;
});

onBeforeUnmount(() => {
  disposed = true;
  if (timer !== undefined) clearInterval(timer);
  silence();
  media?.removeEventListener("change", motionChanged);
  document.removeEventListener("visibilitychange", visibilityChanged);
  window.removeEventListener("resize", resizePlayground);
});
</script>

<template>
  <main
    class="annoying-page"
    :class="{ 'chaos-active': active, 'motion-reduced': reducedMotion }"
  >
    <header class="control-bar">
      <NuxtLink to="/" class="brand"
        >chlatwork<span>CHAOS LAB / 001</span></NuxtLink
      >
      <div class="controls">
        <button
          type="button"
          :disabled="!active"
          :aria-pressed="soundEnabled"
          @click="toggleSound"
        >
          {{ soundEnabled ? "Sound on" : "Sound off" }}
        </button>
        <button
          type="button"
          :disabled="!started"
          :aria-pressed="paused"
          @click="togglePause"
        >
          {{ paused ? "Resume" : "Pause" }}
        </button>
        <NuxtLink to="/" class="exit">Exit ↗</NuxtLink>
      </div>
    </header>

    <div class="ticker" aria-hidden="true">
      <div>
        <span v-for="number in 8" :key="number"
          >PLEASE WAIT ✳ JUST ONE MORE SECOND ✳</span
        >
      </div>
    </div>

    <section class="experience">
      <div class="intro">
        <p class="eyebrow"><span /> CERTIFIED WASTE OF YOUR TIME</p>
        <h1>THE MOST<br /><span>ANNOYING</span><br />PAGE. <em>ever.</em></h1>
        <p class="intro-copy">
          Nothing works quite how you want it to.<br />Everything works exactly
          how we intended.
        </p>
        <button type="button" class="start-button" @click="startChaos">
          {{ started ? "Make it worse" : "Start chaos" }}
          <span aria-hidden="true">↗</span>
        </button>
        <div class="score">
          <strong>{{ interruptions }}</strong
          ><span>tiny inconveniences<br />and counting.</span>
        </div>
      </div>

      <div class="challenge">
        <div class="window-bar">
          <div class="window-dots" aria-hidden="true"><i /><i /><i /></div>
          <span>patience.exe</span><span aria-hidden="true">↗</span>
        </div>
        <div class="challenge-body">
          <div class="loading-label">
            <span>YOUR PATIENCE IS UPDATING</span
            ><strong>{{ progress }}%</strong>
          </div>
          <div class="progress-track" aria-hidden="true">
            <div :style="{ width: `${progress}%` }" />
          </div>
          <p class="loading-caption">Estimated time remaining: yes.</p>
          <div ref="playground" class="playground">
            <span class="target-label" aria-hidden="true">ONE SIMPLE TASK</span>
            <button
              ref="runaway"
              type="button"
              class="runaway-button"
              :class="{ 'has-position': buttonPosition }"
              :style="
                buttonPosition
                  ? {
                      left: `${buttonPosition.x}px`,
                      top: `${buttonPosition.y}px`,
                    }
                  : undefined
              "
              @pointerenter="dodge"
              @click="catchButton"
            >
              Do NOT click <span aria-hidden="true">☺</span>
            </button>
            <span class="target-footer"
              >It’s just a button. How hard can it be?</span
            >
          </div>
          <p class="status" role="status" aria-live="polite">{{ status }}</p>
        </div>
        <span class="sticker" aria-hidden="true">100%<br />UNHELPFUL</span>
      </div>
    </section>

    <div class="floaters" aria-hidden="true">
      <span
        v-for="(item, index) in floaters"
        :key="index"
        :style="{
          '--index': index,
          left: `${8 + ((index * 13) % 85)}%`,
          top: `${15 + ((index * 17) % 70)}%`,
        }"
        >{{ item }}</span
      >
    </div>
    <div class="notice-layer" aria-label="Silly notifications">
      <article
        v-for="notice in notices"
        :key="notice.id"
        class="notice"
        :style="{
          left: `clamp(12px, ${notice.x}%, calc(100% - 282px))`,
          top: `${notice.y}%`,
        }"
      >
        <div class="notice-heading">
          <span>✳ FRIENDLY INTERRUPTION</span
          ><button
            type="button"
            :aria-label="`Close: ${notice.title}`"
            @click="closeNotice(notice.id)"
          >
            ×
          </button>
        </div>
        <h2>{{ notice.title }}</h2>
        <p>{{ notice.message }}</p>
        <button
          type="button"
          class="notice-action"
          @click="closeNotice(notice.id)"
        >
          Okay, go away ↗
        </button>
      </article>
    </div>
    <footer class="page-footer">
      <span>A VERY UNNECESSARY CHLATWORK EXPERIMENT</span
      ><span>No rush. You’re going nowhere.</span>
    </footer>
  </main>
</template>

<style scoped>
.annoying-page {
  position: relative;
  min-height: 100svh;
  overflow: clip;
  background: #ff715b;
  color: #241c26;
  font-family: ui-sans-serif, system-ui, sans-serif;
}
.control-bar {
  position: sticky;
  top: 0;
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: max(20px, env(safe-area-inset-top))
    max(24px, env(safe-area-inset-right)) 20px
    max(24px, env(safe-area-inset-left));
  border-bottom: 2px solid #241c26;
  background: #ff715b;
}
.brand {
  display: flex;
  flex-direction: column;
  gap: 4px;
  color: inherit;
  text-decoration: none;
  font-size: 22px;
  font-weight: 900;
  letter-spacing: -1px;
}
.brand span {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 2px;
}
.controls {
  display: flex;
  gap: 8px;
}
.controls button,
.exit {
  min-height: 44px;
  padding: 10px 16px;
  border: 1.5px solid #241c26;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 800;
  color: inherit;
  text-decoration: none;
  background: transparent;
  cursor: pointer;
}
.controls button:disabled {
  opacity: 0.45;
  cursor: default;
}
.exit {
  background: #241c26;
  color: #fff6e7;
}
button:focus-visible,
a:focus-visible {
  outline: 3px solid #284ddf;
  outline-offset: 4px;
}
.ticker {
  position: relative;
  z-index: 2;
  overflow: hidden;
  padding: 10px 0;
  border-bottom: 2px solid #241c26;
  background: #e9ee7c;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 2px;
}
.ticker > div {
  display: flex;
  width: max-content;
  animation: ticker-scroll 30s linear infinite;
  animation-play-state: paused;
}
.ticker span {
  padding-right: 36px;
}
.experience {
  position: relative;
  z-index: 3;
  display: grid;
  grid-template-columns: 1.15fr 1fr;
  align-items: center;
  gap: 60px;
  width: min(1180px, calc(100% - 80px));
  margin: 72px auto 64px;
}
.eyebrow {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 24px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 2px;
}
.eyebrow > span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #241c26;
}
h1 {
  margin: 0;
  font-size: clamp(46px, 6.8vw, 90px);
  font-weight: 950;
  line-height: 0.95;
  letter-spacing: -5px;
}
h1 > span {
  color: #fff6e7;
  text-shadow: 3px 3px #241c26;
}
h1 em {
  display: inline-block;
  font-family: Georgia, serif;
  font-weight: 500;
  font-size: 0.6em;
  letter-spacing: -3px;
  transform: rotate(-12deg);
}
.intro-copy {
  margin: 28px 0;
  font-size: 14px;
  line-height: 1.7;
}
.start-button {
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 48px;
  min-height: 58px;
  padding: 14px 22px;
  border: 2px solid #241c26;
  background: #e9ee7c;
  box-shadow: 5px 5px #241c26;
  font-size: 16px;
  font-weight: 850;
  cursor: pointer;
}
.start-button:active {
  transform: translate(3px, 3px);
  box-shadow: 2px 2px #241c26;
}
.start-button > span {
  font-size: 26px;
}
.score {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-top: 32px;
}
.score strong {
  font-size: 40px;
  font-variant-numeric: tabular-nums;
  letter-spacing: -2px;
  line-height: 1;
}
.score > span {
  font-size: 10px;
  line-height: 1.5;
}
.challenge {
  position: relative;
  border: 2px solid #241c26;
  background: #fff6e7;
  box-shadow: 10px 10px #241c26;
  transform: rotate(2deg);
}
.window-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  border-bottom: 2px solid #241c26;
  font-family: monospace;
  font-size: 12px;
}
.window-dots {
  display: flex;
  gap: 5px;
}
.window-dots i {
  width: 9px;
  height: 9px;
  border: 1.5px solid #241c26;
  border-radius: 50%;
}
.window-dots i:first-child {
  background: #ff715b;
}
.challenge-body {
  padding: 28px 24px 20px;
}
.loading-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 1px;
}
.loading-label strong {
  font-size: 24px;
  letter-spacing: -1px;
}
.progress-track {
  height: 14px;
  margin-top: 12px;
  padding: 2px;
  border: 1.5px solid #241c26;
}
.progress-track > div {
  height: 100%;
  background: #284ddf;
  transition: width 350ms ease;
}
.loading-caption {
  margin: 8px 0 24px;
  font-size: 10px;
  color: #655b64;
}
.playground {
  position: relative;
  height: 240px;
  overflow: hidden;
  border: 1.5px dashed #afa29e;
  background: radial-gradient(#d7cbc3 1px, transparent 1px);
  background-size: 14px 14px;
}
.target-label,
.target-footer {
  position: absolute;
  left: 12px;
  pointer-events: none;
  font-size: 9px;
  font-weight: 750;
  letter-spacing: 1px;
  color: #655b64;
}
.target-label {
  top: 12px;
}
.target-footer {
  bottom: 12px;
  letter-spacing: 0;
}
.runaway-button {
  position: absolute;
  top: 50%;
  left: 50%;
  display: flex;
  align-items: center;
  gap: 12px;
  transform: translate(-50%, -50%);
  min-height: 48px;
  padding: 12px 16px;
  border: 2px solid #241c26;
  border-radius: 8px;
  white-space: nowrap;
  background: #ff715b;
  box-shadow: 3px 3px #241c26;
  font-size: 13px;
  font-weight: 850;
  cursor: pointer;
}
.runaway-button.has-position {
  transform: none;
}
.runaway-button > span {
  font-size: 22px;
  line-height: 1;
}
.status {
  min-height: 32px;
  margin: 16px 0 0;
  font-size: 11px;
  line-height: 1.5;
}
.sticker {
  position: absolute;
  bottom: -25px;
  right: -24px;
  display: grid;
  align-content: center;
  width: 98px;
  height: 98px;
  border: 2px solid #241c26;
  border-radius: 50%;
  background: #e9ee7c;
  text-align: center;
  font-size: 12px;
  font-weight: 900;
  transform: rotate(-15deg);
}
.floaters {
  position: absolute;
  inset: 130px 0 0;
  pointer-events: none;
  z-index: 1;
  overflow: hidden;
}
.floaters > span {
  position: absolute;
  font-family: Georgia, serif;
  font-size: 28px;
  font-weight: 800;
  opacity: 0.25;
  animation: float-around calc(7s + var(--index) * 1s) ease-in-out infinite
    alternate;
  animation-delay: calc(var(--index) * -1s);
  animation-play-state: paused;
}
.notice-layer {
  position: fixed;
  z-index: 20;
  inset: 112px 0 max(16px, env(safe-area-inset-bottom));
  pointer-events: none;
}
.notice {
  position: absolute;
  width: min(270px, calc(100% - 24px));
  padding: 14px;
  border: 2px solid #241c26;
  background: #e9ee7c;
  box-shadow: 6px 6px #241c26;
  pointer-events: auto;
  animation:
    notice-arrive 200ms ease-out,
    notice-wiggle 5s ease-in-out 200ms infinite alternate;
}
.notice:nth-child(even) {
  background: #fff6e7;
}
.notice-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 8px;
  font-weight: 800;
  letter-spacing: 1px;
}
.notice-heading > button {
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  margin: -10px -10px -10px 0;
  border: 0;
  background: transparent;
  font-size: 26px;
  cursor: pointer;
}
.notice h2 {
  margin: 14px 0 8px;
  font-size: 19px;
  font-weight: 900;
  letter-spacing: -0.5px;
  line-height: 1.2;
}
.notice p {
  margin: 0;
  font-size: 12px;
  line-height: 1.6;
}
.notice-action {
  min-height: 44px;
  margin-top: 12px;
  padding: 8px 0;
  border: 0;
  background: transparent;
  text-decoration: underline;
  text-underline-offset: 4px;
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
}
.page-footer {
  position: relative;
  z-index: 3;
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 24px 40px max(24px, env(safe-area-inset-bottom));
  border-top: 1px solid rgb(36 28 38 / 30%);
  font-size: 9px;
  letter-spacing: 1px;
}
.chaos-active .ticker > div,
.chaos-active .floaters > span {
  animation-play-state: running;
}
.annoying-page:not(.chaos-active) .notice {
  animation-play-state: paused;
}
@keyframes ticker-scroll {
  to {
    transform: translateX(-50%);
  }
}
@keyframes float-around {
  from {
    transform: translate(0, 0) rotate(-12deg);
  }
  to {
    transform: translate(36px, 54px) rotate(16deg);
  }
}
@keyframes notice-arrive {
  from {
    opacity: 0;
    transform: translateY(12px) rotate(-3deg);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
@keyframes notice-wiggle {
  from {
    transform: translateY(0) rotate(-1deg);
  }
  to {
    transform: translateY(8px) rotate(1deg);
  }
}
@media (max-width: 800px) {
  .experience {
    grid-template-columns: 1fr;
    gap: 40px;
    width: min(480px, calc(100% - 48px));
    margin: 40px auto 56px;
  }
  h1 {
    font-size: clamp(44px, 11vw, 70px);
    letter-spacing: -3px;
  }
  .intro-copy {
    margin: 20px 0;
  }
  .challenge {
    transform: rotate(1deg);
  }
  .sticker {
    right: -10px;
    width: 82px;
    height: 82px;
    font-size: 10px;
  }
  .control-bar {
    position: sticky;
    top: 0;
    gap: 8px;
    padding-left: 12px;
    padding-right: 12px;
  }
  .brand {
    font-size: 18px;
  }
  .brand span {
    font-size: 7px;
    letter-spacing: 1px;
  }
  .controls {
    gap: 4px;
  }
  .controls button,
  .exit {
    padding: 10px;
    font-size: 10px;
  }
  .page-footer {
    flex-direction: column;
    padding-left: 24px;
    padding-right: 24px;
  }
}
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation: none !important;
    transition: none !important;
  }
}
.motion-reduced .ticker > div,
.motion-reduced .floaters > span,
.motion-reduced .notice {
  animation: none;
}
.motion-reduced .progress-track > div {
  transition: none;
}
</style>
