<script setup lang="ts">
import confetti from "canvas-confetti";
import { Gift, Heart, Image as ImageIcon, Sparkles } from "lucide-vue-next";
import { getMomentOccasion } from "~/data/moments";
import { getMomentCounterCopy, readMomentBlockText } from "~/lib/moments";
import type { ReadyMoment } from "~/types/moment";

const props = withDefaults(
  defineProps<{ moment: ReadyMoment; preview?: boolean }>(),
  {
    preview: false,
  },
);

const isSecretOpen = ref(false);
const isHolding = ref(false);
let holdTimer: ReturnType<typeof setTimeout> | null = null;

const heroBlock = computed(() =>
  props.moment.blocks.find((block) => block.type === "HERO"),
);
const messageBlock = computed(() =>
  props.moment.blocks.find((block) => block.type === "MESSAGE"),
);
const counterBlock = computed(() =>
  props.moment.blocks.find((block) => block.type === "COUNTER"),
);
const secretBlock = computed(() =>
  props.moment.blocks.find((block) => block.type === "SECRET"),
);
const heroTitle = computed(
  () => readMomentBlockText(heroBlock.value, "title") || props.moment.title,
);
const message = computed(() =>
  readMomentBlockText(messageBlock.value, "message"),
);
const secretMessage = computed(() =>
  readMomentBlockText(secretBlock.value, "message"),
);
const counter = computed(() =>
  getMomentCounterCopy(readMomentBlockText(counterBlock.value, "date")),
);
const occasion = computed(() => getMomentOccasion(props.moment.occasion));
const photos = computed(() =>
  [...props.moment.media].sort((a, b) => a.position - b.position),
);
const heroPhoto = computed(() => photos.value[0]);
const themeClass = computed(
  () => `moment-theme-${props.moment.theme.toLowerCase()}`,
);

function startHold() {
  if (isSecretOpen.value || holdTimer) return;
  isHolding.value = true;
  holdTimer = setTimeout(revealSecret, 1800);
}

function cancelHold() {
  if (holdTimer) clearTimeout(holdTimer);
  holdTimer = null;
  isHolding.value = false;
}

function revealSecret() {
  cancelHold();
  if (isSecretOpen.value) return;
  isSecretOpen.value = true;
  if (!import.meta.client) return;
  confetti({
    particleCount: 120,
    spread: 82,
    startVelocity: 34,
    origin: { y: 0.72 },
    colors: ["#fb7185", "#f9a8d4", "#f5d08a", "#ffffff"],
    disableForReducedMotion: true,
    zIndex: 80,
  });
}

onBeforeUnmount(cancelHold);
</script>

<template>
  <article
    class="moment-experience"
    :class="[themeClass, { 'is-preview': preview }]"
  >
    <div class="moment-glow moment-glow-one" aria-hidden="true" />
    <div class="moment-glow moment-glow-two" aria-hidden="true" />

    <header class="moment-hero">
      <div class="occasion-pill">
        <span aria-hidden="true">{{ occasion.emoji }}</span>
        {{ occasion.label }} Moment
      </div>
      <p class="eyebrow">A little place on the internet for</p>
      <h1>{{ heroTitle }}</h1>
      <p class="scroll-note">Made with care · Scroll to open</p>

      <figure v-if="heroPhoto" class="hero-photo-wrap">
        <img
          :src="heroPhoto.url"
          :alt="`A favorite memory with ${moment.recipientName}`"
          class="hero-photo"
        />
        <span class="photo-tape photo-tape-left" aria-hidden="true" />
        <span class="photo-tape photo-tape-right" aria-hidden="true" />
      </figure>
      <div
        v-else
        class="hero-placeholder"
        aria-label="Photo preview placeholder"
      >
        <ImageIcon class="h-9 w-9" aria-hidden="true" />
        <span>Your hero photo will appear here</span>
      </div>
    </header>

    <section
      class="moment-section message-section"
      aria-labelledby="moment-message-title"
    >
      <Sparkles class="section-icon" aria-hidden="true" />
      <p id="moment-message-title" class="section-kicker">A note for you</p>
      <p class="personal-message">“{{ message }}”</p>
      <Heart class="mx-auto mt-7 h-5 w-5 fill-current" aria-hidden="true" />
    </section>

    <section
      v-if="photos.length"
      class="moment-section"
      aria-labelledby="moment-gallery-title"
    >
      <p class="section-kicker">Our memories</p>
      <h2 id="moment-gallery-title">Tiny moments. Big feelings.</h2>
      <div class="photo-grid">
        <figure
          v-for="(photo, index) in photos"
          :key="photo.id"
          class="memory-photo"
          :class="`photo-${index % 5}`"
        >
          <img
            :src="photo.url"
            :alt="`Memory ${index + 1} with ${moment.recipientName}`"
            loading="lazy"
          />
          <figcaption>
            Memory {{ String(index + 1).padStart(2, "0") }}
          </figcaption>
        </figure>
      </div>
    </section>

    <section
      v-if="counter"
      class="counter-section"
      aria-label="Special date counter"
    >
      <p class="section-kicker">And counting</p>
      <div class="counter-value">{{ counter.value }}</div>
      <p class="counter-unit">{{ counter.unit }}</p>
      <p class="counter-label">
        {{ counter.label }} <span aria-hidden="true">♥</span>
      </p>
    </section>

    <section
      class="moment-section secret-section"
      aria-labelledby="secret-title"
    >
      <div class="gift-icon"><Gift class="h-7 w-7" aria-hidden="true" /></div>
      <p class="section-kicker">One last thing</p>
      <h2 id="secret-title">I have something else for you…</h2>

      <Transition name="secret-swap" mode="out-in">
        <div
          v-if="isSecretOpen"
          key="revealed"
          class="secret-message"
          role="status"
        >
          <Sparkles class="mx-auto h-6 w-6" aria-hidden="true" />
          <p>{{ secretMessage }}</p>
        </div>
        <button
          v-else
          key="closed"
          type="button"
          class="secret-button"
          :class="{ 'is-holding': isHolding }"
          @pointerdown.prevent="startHold"
          @pointerup="cancelHold"
          @pointerleave="cancelHold"
          @pointercancel="cancelHold"
          @keydown.enter.prevent="revealSecret"
          @keydown.space.prevent="startHold"
          @keyup.space.prevent="cancelHold"
        >
          <span class="secret-progress" aria-hidden="true" />
          <span class="relative z-10">Hold to open ❤️</span>
        </button>
      </Transition>
      <p v-if="!isSecretOpen" class="hold-hint">
        Press and hold for two seconds
      </p>
    </section>

    <footer class="moment-footer">
      <Heart class="h-4 w-4 fill-current" aria-hidden="true" />
      Made with ChlatWork Moments
    </footer>
  </article>
</template>

<style scoped>
.moment-experience {
  --moment-bg: #fff8f8;
  --moment-surface: rgba(255, 255, 255, 0.76);
  --moment-ink: #4c1427;
  --moment-muted: #8b5265;
  --moment-accent: #e84d76;
  --moment-accent-soft: #ffd4df;
  --moment-border: rgba(156, 45, 78, 0.15);
  --moment-shadow: rgba(92, 20, 47, 0.16);
  position: relative;
  isolation: isolate;
  overflow: hidden;
  min-height: 100vh;
  background:
    radial-gradient(
      circle at 15% 10%,
      var(--moment-accent-soft),
      transparent 27rem
    ),
    var(--moment-bg);
  color: var(--moment-ink);
  font-family: Georgia, "Times New Roman", serif;
}

.moment-theme-cute {
  --moment-bg: #fff9f1;
  --moment-surface: rgba(255, 255, 255, 0.8);
  --moment-ink: #542347;
  --moment-muted: #8c5a7e;
  --moment-accent: #a86ee6;
  --moment-accent-soft: #ffe1e9;
  --moment-border: rgba(139, 92, 196, 0.16);
  --moment-shadow: rgba(113, 64, 142, 0.16);
}

.moment-theme-minimal {
  --moment-bg: #f7f6f2;
  --moment-surface: rgba(255, 255, 255, 0.84);
  --moment-ink: #1c1c1c;
  --moment-muted: #696969;
  --moment-accent: #292929;
  --moment-accent-soft: #e6e2d9;
  --moment-border: rgba(28, 28, 28, 0.14);
  --moment-shadow: rgba(28, 28, 28, 0.12);
}

.moment-theme-elegant {
  --moment-bg: #10141d;
  --moment-surface: rgba(25, 31, 43, 0.84);
  --moment-ink: #fff8e9;
  --moment-muted: #c8bda8;
  --moment-accent: #d5b36b;
  --moment-accent-soft: #343122;
  --moment-border: rgba(218, 188, 123, 0.22);
  --moment-shadow: rgba(0, 0, 0, 0.35);
}

.moment-glow {
  position: absolute;
  z-index: -1;
  width: 22rem;
  height: 22rem;
  border-radius: 999px;
  background: var(--moment-accent-soft);
  filter: blur(70px);
  opacity: 0.55;
}
.moment-glow-one {
  right: -10rem;
  top: 34rem;
}
.moment-glow-two {
  bottom: 20rem;
  left: -12rem;
}
.moment-hero {
  margin: 0 auto;
  max-width: 920px;
  padding: 5rem 1.25rem 3rem;
  text-align: center;
}
.occasion-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  border: 1px solid var(--moment-border);
  border-radius: 999px;
  background: var(--moment-surface);
  padding: 0.55rem 0.9rem;
  color: var(--moment-muted);
  font-family: ui-sans-serif, system-ui, sans-serif;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  backdrop-filter: blur(12px);
}
.eyebrow,
.section-kicker {
  color: var(--moment-accent);
  font-family: ui-sans-serif, system-ui, sans-serif;
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}
.eyebrow {
  margin-top: 2.5rem;
}
.moment-hero h1 {
  margin: 1rem auto 0;
  max-width: 760px;
  font-size: clamp(2.55rem, 8vw, 5.8rem) !important;
  font-weight: 500 !important;
  line-height: 0.98;
  letter-spacing: -0.055em;
}
.scroll-note {
  margin-top: 1.4rem;
  color: var(--moment-muted);
  font-family: ui-sans-serif, system-ui, sans-serif;
  font-size: 0.82rem;
}
.hero-photo-wrap {
  position: relative;
  margin: 3.5rem auto 0;
  width: min(100%, 720px);
  transform: rotate(-1.2deg);
}
.hero-photo {
  aspect-ratio: 4 / 3;
  width: 100%;
  border: 0.8rem solid var(--moment-surface);
  border-radius: 1.2rem;
  object-fit: cover;
  box-shadow: 0 2rem 5rem var(--moment-shadow);
}
.photo-tape {
  position: absolute;
  top: -0.7rem;
  width: 5rem;
  height: 1.4rem;
  background: color-mix(in srgb, var(--moment-accent-soft) 82%, white);
  opacity: 0.82;
}
.photo-tape-left {
  left: 9%;
  transform: rotate(-7deg);
}
.photo-tape-right {
  right: 9%;
  transform: rotate(7deg);
}
.hero-placeholder {
  display: flex;
  margin: 3.5rem auto 0;
  aspect-ratio: 4/3;
  max-width: 720px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  border: 2px dashed var(--moment-border);
  border-radius: 1.5rem;
  background: var(--moment-surface);
  color: var(--moment-muted);
  font-family: ui-sans-serif, system-ui, sans-serif;
}
.moment-section {
  margin: 0 auto;
  max-width: 960px;
  padding: 5rem 1.25rem;
  text-align: center;
}
.message-section {
  max-width: 780px;
}
.section-icon {
  margin: 0 auto 1rem;
  height: 1.5rem;
  width: 1.5rem;
  color: var(--moment-accent);
}
.personal-message {
  margin-top: 1.5rem;
  white-space: pre-line;
  font-size: clamp(1.5rem, 4vw, 2.45rem);
  line-height: 1.5;
}
.moment-section h2 {
  margin-top: 0.75rem;
  font-size: clamp(2rem, 5vw, 3.2rem);
}
.photo-grid {
  display: grid;
  margin-top: 3rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
  align-items: start;
}
.memory-photo {
  border: 0.65rem solid var(--moment-surface);
  border-bottom-width: 2.4rem;
  border-radius: 0.65rem;
  background: var(--moment-surface);
  box-shadow: 0 1rem 2.6rem var(--moment-shadow);
  transform: rotate(-1.5deg);
}
.memory-photo.photo-1,
.memory-photo.photo-4 {
  transform: translateY(1rem) rotate(1.7deg);
}
.memory-photo.photo-2 {
  transform: rotate(0.8deg);
}
.memory-photo img {
  aspect-ratio: 1 / 1;
  width: 100%;
  object-fit: cover;
}
.memory-photo figcaption {
  height: 0;
  transform: translateY(0.55rem);
  color: var(--moment-muted);
  font-family: ui-sans-serif, system-ui, sans-serif;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.counter-section {
  margin: 3rem auto;
  max-width: 760px;
  padding: 6rem 1.25rem;
  text-align: center;
}
.counter-value {
  margin-top: 0.7rem;
  color: var(--moment-accent);
  font-size: clamp(5rem, 20vw, 10rem);
  line-height: 0.9;
  letter-spacing: -0.08em;
}
.counter-unit {
  margin-top: 0.5rem;
  font-size: 1.4rem;
}
.counter-label {
  margin-top: 1rem;
  color: var(--moment-muted);
  font-family: ui-sans-serif, system-ui, sans-serif;
}
.secret-section {
  padding-bottom: 7rem;
}
.gift-icon {
  display: flex;
  margin: 0 auto 1.5rem;
  height: 3.5rem;
  width: 3.5rem;
  align-items: center;
  justify-content: center;
  border-radius: 1rem;
  background: var(--moment-accent);
  color: white;
  box-shadow: 0 0.8rem 2rem var(--moment-shadow);
  transform: rotate(-5deg);
}
.secret-button {
  position: relative;
  margin-top: 2.25rem;
  min-width: min(100%, 19rem);
  overflow: hidden;
  border: 1px solid var(--moment-accent);
  border-radius: 999px;
  background: transparent;
  padding: 1rem 1.5rem;
  color: var(--moment-accent);
  font-family: ui-sans-serif, system-ui, sans-serif;
  font-weight: 800;
  touch-action: none;
}
.secret-progress {
  position: absolute;
  inset: 0;
  width: 0;
  background: var(--moment-accent);
}
.secret-button.is-holding {
  color: white;
}
.secret-button.is-holding .secret-progress {
  animation: hold-fill 1.8s linear forwards;
}
.hold-hint {
  margin-top: 0.8rem;
  color: var(--moment-muted);
  font-family: ui-sans-serif, system-ui, sans-serif;
  font-size: 0.75rem;
}
.secret-message {
  margin: 2.25rem auto 0;
  max-width: 620px;
  border: 1px solid var(--moment-border);
  border-radius: 1.5rem;
  background: var(--moment-surface);
  padding: 2rem;
  color: var(--moment-accent);
  box-shadow: 0 1rem 3rem var(--moment-shadow);
}
.secret-message p {
  margin-top: 1rem;
  white-space: pre-line;
  color: var(--moment-ink);
  font-size: clamp(1.35rem, 4vw, 2rem);
  line-height: 1.5;
}
.moment-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border-top: 1px solid var(--moment-border);
  padding: 1.5rem;
  color: var(--moment-muted);
  font-family: ui-sans-serif, system-ui, sans-serif;
  font-size: 0.75rem;
}
.secret-swap-enter-active,
.secret-swap-leave-active {
  transition:
    opacity 0.25s ease,
    transform 0.25s ease;
}
.secret-swap-enter-from,
.secret-swap-leave-to {
  opacity: 0;
  transform: translateY(0.5rem) scale(0.98);
}
@keyframes hold-fill {
  to {
    width: 100%;
  }
}
@media (min-width: 700px) {
  .photo-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 1.5rem;
  }
  .moment-hero {
    padding-top: 7rem;
  }
}
@media (prefers-reduced-motion: reduce) {
  .secret-button.is-holding .secret-progress {
    animation-duration: 0s;
  }
}
</style>
