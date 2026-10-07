<script setup lang="ts">
import { createSwatSoundPlayer } from "~/lib/cockroach-sound";

definePageMeta({
  layout: false,
  blankCanvas: true,
  pageTransition: false,
});

useSeoMeta({
  title: "Cockroach Screen | ChlatWork",
  description:
    "A swarm of cockroaches crawling across a blank screen. Works on your phone or computer.",
  ogTitle: "Cockroach Screen | ChlatWork",
  ogDescription: "Cockroaches everywhere. Open it on your phone or computer.",
  ogImage: "https://chlatwork.com/cockroach.webp",
  robots: "noindex, nofollow",
});
useHead({
  bodyAttrs: { class: "cockroach-page" },
});

interface Roach {
  id: number;
  x: number;
  y: number;
  size: number;
  heading: number;
  targetHeading: number;
  speed: number;
  nextTurn: number;
  pause: number;
  phase: number;
  dead: boolean;
  element?: HTMLImageElement;
}

const stage = ref<HTMLElement | null>(null);
const slipper = ref<HTMLImageElement | null>(null);
const slipperReady = ref(false);
// DOM transforms update outside Vue's reactive graph to keep a dense mobile swarm inexpensive.
const roaches = shallowRef<Roach[]>([]);
const deadRoaches = computed(() => roaches.value.filter((roach) => roach.dead));
const strike = shallowRef<{ id: number; x: number; y: number } | null>(null);
const impact = shallowRef<{ id: number; x: number; y: number } | null>(null);
const soundEnabled = ref(true);
let soundPlayer: ReturnType<typeof createSwatSoundPlayer> | undefined;
let impactTimer: ReturnType<typeof setTimeout> | undefined;
let strikeId = 0;
let strikeTimer: ReturnType<typeof setTimeout> | undefined;
let viewport = { width: 0, height: 0 };
let pointer: { x: number; y: number } | null = null;
let animationFrame = 0;
let previousTime = 0;
let resizeObserver: ResizeObserver | undefined;
let reducedMotion: MediaQueryList | undefined;
let disposed = false;

const random = (min: number, max: number) => min + Math.random() * (max - min);

function createRoach(id: number): Roach {
  const heading = random(-Math.PI, Math.PI);
  const mobile = viewport.width < 640;
  return {
    id,
    x: random(0, viewport.width),
    y: random(0, viewport.height),
    size: mobile ? random(48, 82) : random(62, 112),
    heading,
    targetHeading: heading,
    speed: random(45, mobile ? 115 : 155),
    nextTurn: random(0.2, 1.8),
    pause: 0,
    phase: random(0, Math.PI * 2),
    dead: false,
  };
}

function bindSprite(element: unknown, roach: Roach) {
  if (element instanceof HTMLImageElement) roach.element = element;
}

function renderRoach(roach: Roach, seconds = 0) {
  // The supplied image faces diagonally upwards; align its head with the direction of travel.
  const angle = (roach.heading * 180) / Math.PI + 54;
  const wiggle =
    seconds && !roach.pause && !roach.dead
      ? Math.sin(seconds * 24 + roach.phase) * 1.4
      : 0;
  if (roach.element) {
    roach.element.style.transform = `translate3d(${roach.x.toFixed(2)}px, ${roach.y.toFixed(2)}px, 0) translate(-50%, -50%) rotate(${(angle + wiggle).toFixed(2)}deg)${roach.dead ? " scale(1.04, 0.76)" : ""}`;
    roach.element.style.visibility = "visible";
  }
}

function animate(now: number) {
  animationFrame = 0;
  // Clamp elapsed time after interruptions so a resumed tab never teleports the swarm.
  const elapsed = previousTime
    ? Math.min((now - previousTime) / 1000, 0.04)
    : 0;
  previousTime = now;
  for (const roach of roaches.value) {
    if (roach.dead) continue;
    roach.nextTurn -= elapsed;
    roach.pause = Math.max(0, roach.pause - elapsed);
    if (roach.nextTurn <= 0) {
      roach.targetHeading = roach.heading + random(-0.9, 0.9);
      roach.nextTurn = random(0.35, 1.8);
      if (Math.random() < 0.18) roach.pause = random(0.08, 0.35);
    }
    let fleeing = false;
    if (pointer) {
      const dx = roach.x - pointer.x;
      const dy = roach.y - pointer.y;
      if (dx * dx + dy * dy < 130 * 130) {
        roach.targetHeading = Math.atan2(dy, dx);
        roach.pause = 0;
        fleeing = true;
      }
    }
    // Turn inward near the edge rather than disappearing off-screen indefinitely.
    if (
      roach.x < 12 ||
      roach.x > viewport.width - 12 ||
      roach.y < 12 ||
      roach.y > viewport.height - 12
    ) {
      roach.targetHeading = Math.atan2(
        viewport.height / 2 - roach.y,
        viewport.width / 2 - roach.x,
      );
      roach.pause = 0;
    }
    const turn = Math.atan2(
      Math.sin(roach.targetHeading - roach.heading),
      Math.cos(roach.targetHeading - roach.heading),
    );
    roach.heading += turn * Math.min(1, elapsed * (fleeing ? 14 : 6));
    if (!roach.pause) {
      const distance = roach.speed * elapsed * (fleeing ? 2.3 : 1);
      roach.x = Math.max(
        0,
        Math.min(viewport.width, roach.x + Math.cos(roach.heading) * distance),
      );
      roach.y = Math.max(
        0,
        Math.min(viewport.height, roach.y + Math.sin(roach.heading) * distance),
      );
    }
    renderRoach(roach, now / 1000);
  }
  if (
    !disposed &&
    !document.hidden &&
    !reducedMotion?.matches &&
    roaches.value.some((roach) => !roach.dead)
  )
    animationFrame = requestAnimationFrame(animate);
}

function refreshMotion() {
  cancelAnimationFrame(animationFrame);
  animationFrame = 0;
  previousTime = 0;
  if (disposed || document.hidden) return;
  for (const roach of roaches.value) renderRoach(roach);
  // Respect the device's accessibility setting and stop all animation in background tabs.
  if (!reducedMotion?.matches && roaches.value.some((roach) => !roach.dead))
    animationFrame = requestAnimationFrame(animate);
}

async function resizeSwarm() {
  if (!stage.value || disposed) return;
  const width = stage.value.clientWidth;
  const height = stage.value.clientHeight;
  if (!width || !height) return;
  const previous = viewport;
  viewport = { width, height };
  // A bounded population keeps phones busy-looking without hundreds of compositor layers.
  // Retain existing insects on resize so a dead roach cannot respawn when the viewport grows again.
  const count = Math.max(
    roaches.value.length,
    Math.min(120, Math.max(44, Math.ceil((width * height) / 13000))),
  );
  roaches.value = Array.from({ length: count }, (_, id) => {
    const roach = roaches.value[id] ?? createRoach(id);
    if (previous.width && previous.height && id < roaches.value.length) {
      roach.x = (roach.x / previous.width) * width;
      roach.y = (roach.y / previous.height) * height;
    }
    return roach;
  });
  leavePointer();
  await nextTick();
  refreshMotion();
}

function movePointer(event: PointerEvent) {
  if (!stage.value) return;
  const bounds = stage.value.getBoundingClientRect();
  const point = {
    x: event.clientX - bounds.left,
    y: event.clientY - bounds.top,
  };
  pointer = reducedMotion?.matches ? null : point;
  if (slipper.value) {
    // Scale the supplied WebP in the DOM: native cursor images have browser-dependent size limits.
    slipper.value.style.transform = `translate3d(${point.x - 56}px, ${point.y - 28}px, 0) rotate(-18deg)`;
    slipper.value.style.visibility =
      slipperReady.value && event.pointerType !== "touch"
        ? "visible"
        : "hidden";
  }
}

function leavePointer() {
  pointer = null;
  if (slipper.value) slipper.value.style.visibility = "hidden";
}

function unavailableSlipper() {
  slipperReady.value = false;
  leavePointer();
}

function bodyPosition(roach: Roach) {
  // Antennae occupy much of the image: target the visible body instead of its transparent rectangle.
  const angle = roach.heading + (54 * Math.PI) / 180;
  const offsetX = -0.11 * roach.size;
  const offsetY = (0.17 * roach.size * 1465) / 1073;
  return {
    x: roach.x + offsetX * Math.cos(angle) - offsetY * Math.sin(angle),
    y: roach.y + offsetX * Math.sin(angle) + offsetY * Math.cos(angle),
  };
}

function bloodStyle(roach: Roach) {
  const body = bodyPosition(roach);
  return {
    left: `${body.x}px`,
    top: `${body.y}px`,
    width: `${roach.size * 0.85}px`,
    height: `${roach.size * 0.75}px`,
    transform: `translate(-50%, -50%) rotate(${roach.heading}rad)`,
  };
}

function swat(event: PointerEvent) {
  if (
    disposed ||
    !stage.value ||
    event.button !== 0 ||
    event.isPrimary === false
  )
    return;
  const bounds = stage.value.getBoundingClientRect();
  const point = {
    x: event.clientX - bounds.left,
    y: event.clientY - bounds.top,
  };
  if (
    point.x < 0 ||
    point.y < 0 ||
    point.x > viewport.width ||
    point.y > viewport.height
  )
    return;
  movePointer(event);
  if (impactTimer) clearTimeout(impactTimer);
  impactTimer = undefined;
  impact.value = null;
  strike.value = { id: ++strikeId, ...point };
  if (strikeTimer) clearTimeout(strikeTimer);
  strikeTimer = setTimeout(() => {
    strike.value = null;
    strikeTimer = undefined;
  }, 240);
  // Touch gets a forgiving hit target; take the topmost live insect when bodies overlap.
  const padding = event.pointerType === "touch" ? 12 : 4;
  const hit = [...roaches.value].reverse().find((roach) => {
    if (roach.dead) return false;
    const body = bodyPosition(roach);
    const dx = point.x - body.x;
    const dy = point.y - body.y;
    const along = dx * Math.cos(roach.heading) + dy * Math.sin(roach.heading);
    const across = -dx * Math.sin(roach.heading) + dy * Math.cos(roach.heading);
    return (
      (along / (roach.size * 0.43 + padding)) ** 2 +
        (across / (roach.size * 0.23 + padding)) ** 2 <=
      1
    );
  });
  if (soundEnabled.value) {
    soundPlayer ??= createSwatSoundPlayer();
    soundPlayer.play(!!hit);
  }
  if (!hit) return;
  impact.value = { id: strikeId, ...point };
  impactTimer = setTimeout(() => {
    impact.value = null;
    impactTimer = undefined;
  }, 420);
  hit.dead = true;
  hit.pause = 0;
  renderRoach(hit);
  // Publish only interaction changes; movement continues to use inexpensive direct DOM transforms.
  roaches.value = [...roaches.value];
  if (roaches.value.every((roach) => roach.dead)) {
    cancelAnimationFrame(animationFrame);
    animationFrame = 0;
    previousTime = 0;
  }
}

function toggleSound() {
  soundEnabled.value = !soundEnabled.value;
  if (!soundEnabled.value) {
    soundPlayer?.dispose();
    soundPlayer = undefined;
  }
}

onMounted(() => {
  reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  reducedMotion.addEventListener("change", refreshMotion);
  document.addEventListener("visibilitychange", refreshMotion);
  resizeObserver = new ResizeObserver(() => void resizeSwarm());
  if (stage.value) resizeObserver.observe(stage.value);
  void resizeSwarm();
});

onBeforeUnmount(() => {
  disposed = true;
  cancelAnimationFrame(animationFrame);
  if (strikeTimer) clearTimeout(strikeTimer);
  if (impactTimer) clearTimeout(impactTimer);
  soundPlayer?.dispose();
  resizeObserver?.disconnect();
  reducedMotion?.removeEventListener("change", refreshMotion);
  document.removeEventListener("visibilitychange", refreshMotion);
});
</script>

<template>
  <main
    ref="stage"
    class="cockroach-screen"
    :class="{ 'has-flip-flop': slipperReady }"
    aria-label="Swat crawling cockroaches with a flip-flop"
    @pointermove="movePointer"
    @pointerenter="movePointer"
    @pointerdown="swat"
    @pointerleave="leavePointer"
    @pointerup="
      (event) => {
        if (event.pointerType !== 'mouse') pointer = null;
      }
    "
    @pointercancel="leavePointer"
  >
    <h1 class="sr-only">Cockroach screen</h1>
    <p class="sr-only">
      Click or tap a cockroach to hit it with the flip-flop. Dead cockroaches
      stay on the screen. Motion follows your device's reduced-motion setting.
    </p>
    <div
      class="kill-counter"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <span>Killed</span>
      <strong>{{ deadRoaches.length }}</strong>
    </div>
    <div
      v-for="roach in deadRoaches"
      :key="`blood-${roach.id}`"
      class="blood-pool"
      :style="bloodStyle(roach)"
      aria-hidden="true"
    />
    <img
      v-for="roach in roaches"
      :key="roach.id"
      :ref="(element) => bindSprite(element, roach)"
      src="/cockroach.webp"
      :style="{ width: `${roach.size}px` }"
      class="cockroach"
      :class="{ 'is-dead': roach.dead }"
      width="1073"
      height="1465"
      alt=""
      aria-hidden="true"
      :draggable="false"
      decoding="async"
    />
    <img
      v-if="strike"
      :key="strike.id"
      src="/flip-flop.webp"
      class="flip-flop-strike"
      :style="{ left: `${strike.x - 64}px`, top: `${strike.y - 32}px` }"
      width="128"
      height="128"
      alt=""
      aria-hidden="true"
      :draggable="false"
    />
    <div
      v-if="impact"
      :key="`impact-${impact.id}`"
      class="hit-impact"
      :style="{ left: `${impact.x}px`, top: `${impact.y}px` }"
      aria-hidden="true"
    >
      <span class="impact-ring" />
      <i
        v-for="ray in 8"
        :key="ray"
        class="impact-ray"
        :style="{ '--angle': `${ray * 45}deg` }"
      />
    </div>
    <img
      ref="slipper"
      src="/flip-flop.webp"
      class="flip-flop-pointer"
      :class="{ 'is-hitting': !!strike }"
      width="112"
      height="112"
      alt=""
      aria-hidden="true"
      :draggable="false"
      @load="slipperReady = true"
      @error="unavailableSlipper"
    />
    <button
      type="button"
      class="sound-toggle"
      aria-label="Hit sounds"
      :aria-pressed="soundEnabled"
      :title="soundEnabled ? 'Mute hit sounds' : 'Enable hit sounds'"
      @pointerdown.stop
      @pointermove.stop="leavePointer"
      @pointerenter="leavePointer"
      @click.stop="toggleSound"
    >
      <span aria-hidden="true">{{ soundEnabled ? "🔊" : "🔇" }}</span>
    </button>
  </main>
</template>

<style scoped>
:global(body.cockroach-page) {
  overflow: hidden;
  overscroll-behavior: none;
  background: #fff;
}

.cockroach-screen {
  position: fixed;
  inset: 0;
  z-index: 20;
  overflow: hidden;
  background: #fff;
  touch-action: manipulation;
  user-select: none;
  cursor: crosshair;
}

.cockroach-screen.has-flip-flop {
  cursor: none;
}

/* Follow the existing site theme without changing the visitor's saved preference. */
:global(html.dark body.cockroach-page),
:global(html.dark .cockroach-screen) {
  background: #000;
}

.kill-counter {
  position: absolute;
  top: max(12px, env(safe-area-inset-top));
  left: max(12px, env(safe-area-inset-left));
  z-index: 6;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  border: 1px solid rgb(0 0 0 / 15%);
  border-radius: 999px;
  background: rgb(255 255 255 / 90%);
  color: #27272a;
  font-size: 14px;
  pointer-events: none;
}

.kill-counter strong {
  font-size: 20px;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

:global(html.dark .kill-counter) {
  border-color: rgb(255 255 255 / 20%);
  background: rgb(30 30 30 / 90%);
  color: #fafafa;
}

.cockroach {
  position: absolute;
  top: 0;
  left: 0;
  height: auto;
  visibility: hidden;
  pointer-events: none;
  will-change: transform;
  z-index: 3;
  filter: drop-shadow(1px 2px 1px rgb(0 0 0 / 18%));
}

.cockroach.is-dead {
  z-index: 2;
  will-change: auto;
  filter: saturate(0.35) brightness(0.7)
    drop-shadow(1px 1px 1px rgb(0 0 0 / 25%));
}

.blood-pool {
  position: absolute;
  z-index: 1;
  pointer-events: none;
  background:
    radial-gradient(ellipse at 48% 55%, #bb1024 0 29%, transparent 30%),
    radial-gradient(circle at 34% 40%, #cf1930 0 15%, transparent 16%),
    radial-gradient(circle at 65% 61%, #990a1a 0 17%, transparent 18%),
    radial-gradient(circle at 78% 29%, #c71229 0 5%, transparent 6%),
    radial-gradient(circle at 15% 65%, #c71229 0 4%, transparent 5%),
    radial-gradient(circle at 66% 87%, #c71229 0 3%, transparent 4%);
  animation: blood-appear 180ms ease-out both;
}

.flip-flop-strike {
  position: absolute;
  z-index: 4;
  pointer-events: none;
  transform-origin: 64px 32px;
  animation: swat 240ms ease-out both;
}

.flip-flop-pointer {
  position: absolute;
  left: 0;
  top: 0;
  z-index: 5;
  width: 112px;
  height: 112px;
  visibility: hidden;
  pointer-events: none;
  transform-origin: 56px 28px;
  will-change: transform;
}

.flip-flop-pointer.is-hitting {
  opacity: 0;
}

.hit-impact {
  position: absolute;
  z-index: 5;
  pointer-events: none;
}

.impact-ring {
  position: absolute;
  left: 0;
  top: 0;
  width: 52px;
  height: 52px;
  border: 3px solid #e52b3d;
  border-radius: 50%;
  box-shadow: 0 0 0 2px #ffd765;
  transform: translate(-50%, -50%);
  animation: impact-ring 420ms ease-out both;
}

.impact-ray {
  position: absolute;
  left: -3px;
  top: -7px;
  width: 6px;
  height: 14px;
  border-radius: 3px;
  background: #ffbb47;
  transform: rotate(var(--angle)) translateY(-30px);
  animation: impact-ray 380ms ease-out both;
}

.impact-ray:nth-child(even) {
  background: #d51d32;
}

.sound-toggle {
  position: absolute;
  right: max(12px, env(safe-area-inset-right));
  bottom: max(12px, env(safe-area-inset-bottom));
  z-index: 6;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border: 1px solid rgb(0 0 0 / 15%);
  border-radius: 50%;
  background: rgb(255 255 255 / 80%);
  cursor: pointer;
}

.sound-toggle:focus-visible {
  outline: 2px solid #38bdf8;
  outline-offset: 3px;
}
:global(html.dark .sound-toggle) {
  background: rgb(30 30 30 / 80%);
  border-color: rgb(255 255 255 / 20%);
}

@keyframes impact-ring {
  from {
    transform: translate(-50%, -50%) scale(0.25);
    opacity: 1;
  }
  to {
    transform: translate(-50%, -50%) scale(1.8);
    opacity: 0;
  }
}

@keyframes impact-ray {
  from {
    transform: rotate(var(--angle)) translateY(-12px) scaleY(0.5);
    opacity: 1;
  }
  to {
    transform: rotate(var(--angle)) translateY(-62px) scaleY(0.3);
    opacity: 0;
  }
}

@keyframes swat {
  0% {
    transform: scale(1.55) rotate(-18deg);
  }
  40% {
    transform: scale(0.86) rotate(8deg);
  }
  65% {
    transform: scale(1) rotate(0deg);
    opacity: 1;
  }
  100% {
    transform: scale(1.15);
    opacity: 0;
  }
}

@keyframes blood-appear {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .flip-flop-strike,
  .blood-pool,
  .impact-ring,
  .impact-ray {
    animation: none;
  }
}
</style>
