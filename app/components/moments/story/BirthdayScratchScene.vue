<script setup lang="ts">import { computed } from "vue";

import { useAppI18n } from "~/composables/useAppI18n";
import { onMounted, ref } from "vue";


const props = withDefaults(defineProps<{ revealed: boolean; message: string; locale?: "en" | "km" }>(), { locale: "en" });
const { t } = useAppI18n(computed(() => props.locale === "km"));
const emit = defineEmits<{ reveal: [] }>();
const canvas = ref<HTMLCanvasElement | null>(null);
const progress = ref(0);
const cells = new Set<number>();
let activePointer: number | null = null;
let previous: { x: number; y: number } | null = null;
let context: CanvasRenderingContext2D | null = null;

onMounted(() => {
  try {
    context = canvas.value?.getContext("2d") ?? null;
    if (!context) return;
    context.fillStyle = "#a89aa9";
    context.fillRect(0, 0, 640, 400);
    context.fillStyle = "#ffffff";
    context.font = "48px sans-serif";
    context.textAlign = "center";
    context.fillText("✦  ✦  ✦", 320, 220);
    context.globalCompositeOperation = "destination-out";
    context.lineWidth = 64;
    context.lineCap = "round";
    context.lineJoin = "round";
  } catch { context = null; }
});

function point(event: PointerEvent) {
  const rect = canvas.value?.getBoundingClientRect();
  if (!rect?.width || !rect.height) return null;
  return { x: Math.max(0, Math.min(640, (event.clientX - rect.left) / rect.width * 640)), y: Math.max(0, Math.min(400, (event.clientY - rect.top) / rect.height * 400)) };
}
function scratch(event: PointerEvent) {
  if (event.pointerId !== activePointer || props.revealed) return;
  const current = point(event);
  if (!current) return;
  event.preventDefault();
  const start = previous ?? current;
  context?.beginPath(); context?.moveTo(start.x, start.y); context?.lineTo(current.x, current.y); context?.stroke();
  // Count covered areas, not pointer events: repeated tiny movements cannot reveal the card.
  const steps = Math.max(1, Math.ceil(Math.hypot(current.x - start.x, current.y - start.y) / 16));
  for (let step = 0; step <= steps; step++) {
    const x = start.x + (current.x - start.x) * step / steps;
    const y = start.y + (current.y - start.y) * step / steps;
    for (let row = 0; row < 12; row++) for (let col = 0; col < 20; col++) {
      if (Math.hypot((col + .5) * 32 - x, (row + .5) * (400 / 12) - y) <= 38) cells.add(row * 20 + col);
    }
  }
  previous = current;
  progress.value = Math.min(100, Math.round(cells.size / 240 / .42 * 100));
  if (progress.value >= 100) { activePointer = null; previous = null; emit("reveal"); }
}
function begin(event: PointerEvent) {
  if (props.revealed || activePointer !== null || (event.pointerType === "mouse" && event.button !== 0)) return;
  activePointer = event.pointerId;
  previous = null;
  canvas.value?.setPointerCapture?.(event.pointerId);
  scratch(event);
}
function end(event: PointerEvent) {
  if (event.pointerId !== activePointer) return;
  activePointer = null; previous = null;
  if (canvas.value?.hasPointerCapture?.(event.pointerId)) canvas.value.releasePointerCapture(event.pointerId);
}
</script>

<template>
  <div class="scratch-scene">
    <p class="story-description">{{ t("products.moments.scratch_the_card_to_discover_your_surprise_or_use_reveal_below") }}</p>
    <div v-if="!revealed" class="scratch-card"><span aria-hidden="true">🎁</span><canvas ref="canvas" width="640" height="400" aria-hidden="true" @pointerdown="begin" @pointermove="scratch" @pointerup="end" @pointercancel="end" @lostpointercapture="end" /></div>
    <div v-else class="scratch-message" role="region" :aria-label="t(&quot;products.moments.your_surprise&quot;)"><span aria-hidden="true">✨</span><p>{{ message }}</p></div>
    <p v-if="!revealed" role="status" class="scratch-progress">{{ progress }}%</p>
    <button v-if="!revealed" type="button" class="story-action" data-action="reveal-secret" @click="$emit('reveal')">{{ t("products.moments.reveal_surprise") }}</button>
  </div>
</template>

<style scoped>
.scratch-card { position: relative; display: grid; place-items: center; height: 14rem; margin: 1.5rem 0 .5rem; overflow: hidden; border: 1px solid var(--moment-border); border-radius: 1rem; background: var(--moment-accent-soft); }.scratch-card > span { font-size: 4rem; }.scratch-card canvas { position: absolute; inset: 0; width: 100%; height: 100%; touch-action: none; cursor: crosshair; }.scratch-progress { color: var(--moment-muted); font-size: .8rem; margin-bottom: .7rem; }.scratch-message { margin: 1.5rem 0; padding: 2rem; border: 1px solid var(--moment-border); border-radius: 1rem; background: var(--moment-accent-soft); }.scratch-message > span { font-size: 2rem; }.scratch-message p { margin-top: 1rem; white-space: pre-wrap; overflow-wrap: anywhere; line-height: 1.9; }
</style>
