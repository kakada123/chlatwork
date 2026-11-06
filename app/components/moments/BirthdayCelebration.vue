<script setup lang="ts">
import { useAppI18n } from "~/composables/useAppI18n";
import confetti, { type ConfettiCannon } from "canvas-confetti";
import { computed, onBeforeUnmount, onMounted, ref } from "vue";



const props = withDefaults(defineProps<{ preview?: boolean; locale?: "en" | "km"; autoCelebrate?: boolean; showControls?: boolean }>(), {
  preview: false,
  locale: "en",
  autoCelebrate: true,
  showControls: true,
});
const { t } = useAppI18n(computed(() => props.locale === "km"));
const canvas = ref<HTMLCanvasElement | null>(null);
const reducedMotion = ref(true);
const pageHidden = ref(false);
const celebrating = ref(false);
const announced = ref(false);
let cannon: ConfettiCannon | undefined;
let motionPreference: MediaQueryList | undefined;
let generation = 0;
let disposed = false;

const copy = computed(() => ({
  celebrate: t("products.moments.birthday_celebration.celebrate"), celebrating: t("products.moments.birthday_celebration.celebrating"), greeting: t("products.moments.birthday_celebration.greeting"),
}));

function stopBurst() {
  generation++;
  cannon?.reset();
  celebrating.value = false;
}

async function celebrate() {
  if (disposed || pageHidden.value || celebrating.value) return;
  announced.value = true;
  // Reduced-motion visitors receive the same celebration message without any animated canvas.
  if (reducedMotion.value || !canvas.value) return;
  try {
    cannon ??= confetti.create(canvas.value, { resize: true, useWorker: false, disableForReducedMotion: true });
    const token = ++generation;
    celebrating.value = true;
    const options = {
      particleCount: 55, spread: 68, startVelocity: 37, gravity: 1.05, decay: .93,
      ticks: 170, scalar: .95, colors: ["#fb7185", "#fbbf24", "#a78bfa", "#38bdf8", "#34d399"],
      disableForReducedMotion: true,
    };
    // Two short side bursts keep the birthday visible and bound repeated taps to one animation.
    await Promise.all([
      cannon({ ...options, angle: 58, origin: { x: .08, y: .66 } }),
      cannon({ ...options, angle: 122, origin: { x: .92, y: .66 } }),
    ]);
    if (!disposed && token === generation) celebrating.value = false;
  } catch {
    stopBurst();
    // Canvas support is optional; the birthday greeting and static decorations remain available.
  }
}

function updateMotionPreference() {
  reducedMotion.value = motionPreference?.matches ?? true;
  if (reducedMotion.value) stopBurst();
}

function updateVisibility() {
  pageHidden.value = document.hidden;
  if (pageHidden.value) stopBurst();
}

onMounted(() => {
  motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
  updateMotionPreference();
  updateVisibility();
  motionPreference.addEventListener("change", updateMotionPreference);
  document.addEventListener("visibilitychange", updateVisibility);
  if (!props.preview && props.autoCelebrate) void celebrate();
});
defineExpose({ celebrate });
onBeforeUnmount(() => {
  disposed = true;
  stopBurst();
  motionPreference?.removeEventListener("change", updateMotionPreference);
  document.removeEventListener("visibilitychange", updateVisibility);
});
</script>

<template>
  <div class="birthday-celebration">
    <canvas ref="canvas" class="birthday-burst" :class="{ 'is-preview': preview }" aria-hidden="true" />
    <div class="birthday-sparkle-shower" :class="{ 'is-paused': pageHidden, 'is-still': reducedMotion }" aria-hidden="true">
      <b v-for="index in 6" :key="`star-${index}`" :style="{ '--celebration-index': index }">✦</b>
      <em v-for="index in 6" :key="`ribbon-${index}`" :style="{ '--celebration-index': index }" />
    </div>
    <button v-if="showControls" type="button" class="birthday-celebrate-button" :disabled="celebrating || pageHidden" @click="celebrate">
      <span aria-hidden="true">🎉</span> {{ celebrating ? copy.celebrating : copy.celebrate }}
    </button>
    <p class="birthday-cheer" :class="{ 'sr-only': !showControls }" role="status" aria-live="polite">{{ announced ? copy.greeting : "" }}</p>
  </div>
</template>

<style scoped>
.birthday-celebration { display: contents; }
.birthday-burst { position: fixed; inset: 0; z-index: -1; width: 100%; height: 100%; pointer-events: none; }
.birthday-burst.is-preview { position: absolute; }
.birthday-sparkle-shower { position: absolute; z-index: -1; inset: 0; overflow: hidden; pointer-events: none; }
.birthday-sparkle-shower :where(b, em) { position: absolute; top: calc(var(--celebration-index) * 11%); left: calc(var(--celebration-index) * 16% - 5%); color: hsl(calc(var(--celebration-index) * 52deg) 85% 58%); opacity: .5; will-change: transform; }
.birthday-sparkle-shower b { font-size: clamp(.8rem, 2.5vw, 1.5rem); animation: birthday-star-drop calc(8s + var(--celebration-index) * .7s) linear infinite; animation-delay: calc(var(--celebration-index) * -1.8s); }
.birthday-sparkle-shower em { width: .5rem; height: 2.7rem; border: 2px solid currentColor; border-top: 0; border-bottom: 0; border-radius: 50%; animation: birthday-ribbon-drop calc(10s + var(--celebration-index) * .6s) linear infinite; animation-delay: calc(var(--celebration-index) * -2.1s); }
.birthday-sparkle-shower.is-paused :where(b, em) { animation-play-state: paused; }
.birthday-sparkle-shower.is-still :where(b, em) { animation: none; opacity: .28; will-change: auto; }
.birthday-celebrate-button { display: inline-flex; align-items: center; justify-content: center; gap: .5rem; min-height: 2.75rem; margin-top: 1rem; padding: .65rem 1.2rem; border: 1px solid var(--moment-accent); border-radius: 999px; background: var(--moment-surface); color: var(--moment-ink); font-family: "Hanuman", ui-sans-serif, system-ui, sans-serif; font-size: .85rem; font-weight: 800; box-shadow: 0 .4rem 1rem var(--moment-shadow); }
.birthday-celebrate-button:focus-visible { outline: 3px solid var(--moment-accent); outline-offset: 4px; }
.birthday-celebrate-button:disabled { opacity: .65; cursor: default; }
.birthday-cheer { min-height: 1.3rem; margin: .6rem 0 0; color: var(--moment-muted); font-size: .8rem; }
@keyframes birthday-star-drop { from { transform: translate3d(0,-22rem,0) rotate(0); } to { transform: translate3d(2rem,45rem,0) rotate(200deg); } }
@keyframes birthday-ribbon-drop { from { transform: translate3d(0,-25rem,0) rotate(-18deg); } to { transform: translate3d(-2rem,45rem,0) rotate(160deg); } }
@media (prefers-reduced-motion: reduce) { .birthday-sparkle-shower :where(b, em) { animation: none; opacity: .28; will-change: auto; } .birthday-burst { display: none; } }
</style>
