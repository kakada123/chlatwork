<script setup lang="ts">
import {
  KLA_KLOK_SYMBOLS,
  getKlaKlokSymbol,
  type KlaKlokSymbolId,
} from "~/lib/kla-klok";

const props = defineProps<{
  symbol: KlaKlokSymbolId;
  rolling?: boolean;
  rollIndex?: number;
  size?: "hero" | "game";
}>();

const symbol = computed(() => getKlaKlokSymbol(props.symbol));
const spinClass = computed(
  () => `kla-die-cube--spin-${Math.abs(props.rollIndex ?? 0) % 3}`,
);
</script>

<template>
  <div
    class="kla-die-scene"
    :class="[
      size === 'hero' ? 'kla-die-scene--hero' : 'kla-die-scene--game',
      { 'kla-die-scene--rolling': rolling },
    ]"
    :aria-label="`${symbol.labelKm} · ${symbol.labelEn}`"
    :aria-busy="rolling || undefined"
  >
    <div class="kla-die-shadow" aria-hidden="true" />
    <div
      class="kla-die-cube"
      :class="[
        `kla-die-cube--${symbol.id}`,
        spinClass,
        { 'kla-die-cube--rolling': rolling },
      ]"
      aria-hidden="true"
    >
      <div
        v-for="face in KLA_KLOK_SYMBOLS"
        :key="face.id"
        class="kla-die-face"
        :class="`kla-die-face--${face.id}`"
      >
        <span class="kla-die-glyph">{{ face.glyph }}</span>
        <span class="kla-die-label">{{ face.labelKm }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.kla-die-scene {
  --kla-die-size: 5rem;
  --kla-die-depth: calc(var(--kla-die-size) / 2);
  position: relative;
  width: var(--kla-die-size);
  height: var(--kla-die-size);
  perspective: 720px;
  flex: 0 0 auto;
}

.kla-die-scene--hero {
  --kla-die-size: 6rem;
}

.kla-die-cube {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
  transition: transform 560ms cubic-bezier(0.2, 0.85, 0.25, 1.15);
  will-change: transform;
}

.kla-die-face {
  position: absolute;
  inset: 0;
  display: grid;
  place-content: center;
  gap: 0.25rem;
  overflow: hidden;
  border: 1px solid rgb(252 211 77 / 65%);
  border-radius: 1.15rem;
  background:
    radial-gradient(circle at 28% 18%, rgb(255 255 255 / 90%), transparent 32%),
    linear-gradient(145deg, #fffdf4 0%, #f8e6bd 100%);
  color: #7c2d2d;
  text-align: center;
  backface-visibility: hidden;
  box-shadow: inset -8px -10px 18px rgb(120 53 15 / 12%);
}

.kla-die-glyph {
  font-size: calc(var(--kla-die-size) * 0.42);
  line-height: 1;
  filter: drop-shadow(0 3px 2px rgb(120 53 15 / 16%));
}

.kla-die-label {
  font-size: calc(var(--kla-die-size) * 0.12);
  font-weight: 800;
  line-height: 1;
}

.kla-die-face--tiger {
  transform: translateZ(var(--kla-die-depth));
}

.kla-die-face--gourd {
  transform: rotateY(180deg) translateZ(var(--kla-die-depth));
}

.kla-die-face--rooster {
  transform: rotateY(90deg) translateZ(var(--kla-die-depth));
}

.kla-die-face--shrimp {
  transform: rotateY(-90deg) translateZ(var(--kla-die-depth));
}

.kla-die-face--crab {
  transform: rotateX(90deg) translateZ(var(--kla-die-depth));
}

.kla-die-face--fish {
  transform: rotateX(-90deg) translateZ(var(--kla-die-depth));
}

.kla-die-cube--tiger {
  transform: rotateX(-6deg) rotateY(8deg);
}

.kla-die-cube--gourd {
  transform: rotateX(-6deg) rotateY(188deg);
}

.kla-die-cube--rooster {
  transform: rotateX(-6deg) rotateY(-82deg);
}

.kla-die-cube--shrimp {
  transform: rotateX(-6deg) rotateY(98deg);
}

.kla-die-cube--crab {
  transform: rotateX(-98deg) rotateZ(-4deg);
}

.kla-die-cube--fish {
  transform: rotateX(82deg) rotateZ(4deg);
}

.kla-die-shadow {
  position: absolute;
  right: 12%;
  bottom: -0.85rem;
  left: 12%;
  height: 0.7rem;
  border-radius: 999px;
  background: rgb(0 0 0 / 48%);
  filter: blur(7px);
  opacity: 0.65;
  transform: scaleX(1);
}

.kla-die-cube--rolling.kla-die-cube--spin-0 {
  animation: kla-die-spin-a 560ms linear infinite;
}

.kla-die-cube--rolling.kla-die-cube--spin-1 {
  animation: kla-die-spin-b 610ms linear infinite reverse;
}

.kla-die-cube--rolling.kla-die-cube--spin-2 {
  animation: kla-die-spin-c 530ms linear infinite;
}

.kla-die-scene--rolling .kla-die-shadow {
  animation: kla-die-shadow 280ms ease-in-out infinite alternate;
}

@keyframes kla-die-spin-a {
  from {
    transform: rotateX(0deg) rotateY(0deg) rotateZ(0deg) translateY(0);
  }
  50% {
    transform: rotateX(190deg) rotateY(270deg) rotateZ(14deg) translateY(-10px);
  }
  to {
    transform: rotateX(380deg) rotateY(540deg) rotateZ(0deg) translateY(0);
  }
}

@keyframes kla-die-spin-b {
  from {
    transform: rotateX(15deg) rotateY(0deg) rotateZ(0deg) translateY(0);
  }
  50% {
    transform: rotateX(280deg) rotateY(170deg) rotateZ(-18deg) translateY(-14px);
  }
  to {
    transform: rotateX(555deg) rotateY(380deg) rotateZ(0deg) translateY(0);
  }
}

@keyframes kla-die-spin-c {
  from {
    transform: rotateX(0deg) rotateY(20deg) rotateZ(0deg) translateY(0);
  }
  50% {
    transform: rotateX(165deg) rotateY(330deg) rotateZ(20deg) translateY(-8px);
  }
  to {
    transform: rotateX(360deg) rotateY(700deg) rotateZ(0deg) translateY(0);
  }
}

@keyframes kla-die-shadow {
  from {
    opacity: 0.7;
    transform: scaleX(1);
  }
  to {
    opacity: 0.25;
    transform: scaleX(0.65);
  }
}

@media (min-width: 640px) {
  .kla-die-scene--game {
    --kla-die-size: 6rem;
  }

  .kla-die-scene--hero {
    --kla-die-size: 8rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .kla-die-cube,
  .kla-die-cube--rolling,
  .kla-die-scene--rolling .kla-die-shadow {
    animation: none;
    transition-duration: 80ms;
  }
}
</style>
