<script setup lang="ts">
defineProps<{
  covered: boolean;
  rolling: boolean;
  revealing?: boolean;
}>();
</script>

<template>
  <div
    class="kla-bowl-stage"
    :class="{
      'kla-bowl-stage--covered': covered,
      'kla-bowl-stage--rolling': rolling,
      'kla-bowl-stage--revealing': revealing,
    }"
  >
    <div class="kla-bowl-set">
      <div class="kla-bowl-ground-shadow" aria-hidden="true" />

      <div class="kla-bowl-plate" aria-hidden="true">
        <div class="kla-bowl-plate-well" />
      </div>

      <div class="kla-bowl-dice">
        <slot />
      </div>

      <div class="kla-bowl-cover" aria-hidden="true">
        <div class="kla-bowl-knob" />
        <div class="kla-bowl-cover-body">
          <span class="kla-bowl-mark">ខ្លាឃ្លោក</span>
        </div>
        <div class="kla-bowl-cover-rim" />
      </div>
    </div>

    <span class="kla-bowl-state">
      {{ rolling ? "កំពុងក្រឡុកចាន…" : covered ? "គ្រាប់នៅក្រោមគម្រប 👀" : "បើកចានហើយ! ✨" }}
    </span>
  </div>
</template>

<style scoped>
.kla-bowl-stage {
  position: relative;
  min-height: 17rem;
  overflow: hidden;
  isolation: isolate;
}

.kla-bowl-set {
  position: relative;
  width: min(100%, 27rem);
  height: 14.5rem;
  margin-inline: auto;
  transform-origin: 50% 78%;
}

.kla-bowl-ground-shadow {
  position: absolute;
  right: 10%;
  bottom: 1.25rem;
  left: 10%;
  height: 1.35rem;
  border-radius: 999px;
  background: rgb(0 0 0 / 52%);
  filter: blur(12px);
}

.kla-bowl-plate {
  position: absolute;
  right: 4%;
  bottom: 1.65rem;
  left: 4%;
  height: 8.3rem;
  border: 3px solid #d7a936;
  border-radius: 50%;
  background:
    radial-gradient(ellipse at center, #fffdf3 0 49%, #f3d88e 50% 64%, #9d2f2f 65% 70%, #f9e8ad 71% 100%);
  box-shadow:
    inset 0 -16px 22px rgb(120 53 15 / 18%),
    0 16px 24px rgb(0 0 0 / 26%);
}

.kla-bowl-plate-well {
  position: absolute;
  inset: 19% 16%;
  border: 1px solid rgb(146 64 14 / 22%);
  border-radius: 50%;
  box-shadow: inset 0 9px 18px rgb(120 53 15 / 12%);
}

.kla-bowl-dice {
  position: absolute;
  right: 13%;
  bottom: 4.15rem;
  left: 13%;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.65rem;
  opacity: 1;
  transform: translateY(0) scale(1);
  transition:
    opacity 180ms ease 240ms,
    transform 620ms cubic-bezier(0.16, 1, 0.3, 1) 180ms;
}

.kla-bowl-dice :deep(.kla-die-scene) {
  --kla-die-size: 3.5rem;
}

.kla-bowl-dice :deep(.kla-die-scene:nth-child(1)) {
  transform: translateY(0.3rem) rotate(-4deg);
}

.kla-bowl-dice :deep(.kla-die-scene:nth-child(2)) {
  transform: translateY(-0.2rem) rotate(2deg);
}

.kla-bowl-dice :deep(.kla-die-scene:nth-child(3)) {
  transform: translateY(0.25rem) rotate(4deg);
}

.kla-bowl-cover {
  position: absolute;
  right: 7%;
  bottom: 2.3rem;
  left: 7%;
  z-index: 4;
  height: 11.8rem;
  visibility: hidden;
  opacity: 0;
  transform: translate3d(42%, -9.5rem, 0) rotate(16deg) scale(0.78);
  transform-origin: 50% 92%;
  transition:
    transform 620ms cubic-bezier(0.22, 0.8, 0.24, 1),
    opacity 180ms ease 360ms,
    visibility 0s linear 620ms;
}

.kla-bowl-stage--covered .kla-bowl-cover {
  visibility: visible;
  opacity: 1;
  transform: translate3d(0, 0, 0) rotate(0deg) scale(1);
  transition:
    transform 420ms cubic-bezier(0.22, 0.8, 0.24, 1),
    opacity 120ms ease,
    visibility 0s;
}

.kla-bowl-stage--covered .kla-bowl-dice {
  opacity: 0;
  transform: translateY(1.4rem) scale(0.8);
  transition-delay: 0ms;
}

.kla-bowl-knob {
  position: absolute;
  top: -0.55rem;
  left: 50%;
  width: 4.4rem;
  height: 1.7rem;
  border: 2px solid #d7a936;
  border-radius: 50%;
  background: linear-gradient(180deg, #ffe69a, #b52e30 64%, #6f1721);
  box-shadow: 0 5px 8px rgb(0 0 0 / 24%);
  transform: translateX(-50%);
}

.kla-bowl-cover-body {
  position: absolute;
  inset: 0 1.1rem 1.1rem;
  display: grid;
  place-items: center;
  border: 3px solid #d7a936;
  border-radius: 48% 48% 44% 44% / 58% 58% 35% 35%;
  background:
    radial-gradient(circle at 35% 24%, rgb(255 255 255 / 38%), transparent 25%),
    linear-gradient(145deg, #e95b4f 0%, #aa2731 48%, #651924 100%);
  box-shadow:
    inset -18px -16px 28px rgb(51 7 16 / 26%),
    0 14px 28px rgb(0 0 0 / 32%);
}

.kla-bowl-mark {
  border: 1px solid rgb(255 226 139 / 60%);
  border-radius: 999px;
  padding: 0.45rem 1.25rem;
  color: #ffe69a;
  font-size: 1rem;
  font-weight: 900;
  letter-spacing: 0.05em;
  text-shadow: 0 2px 5px rgb(58 7 13 / 60%);
}

.kla-bowl-cover-rim {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: 2.15rem;
  border: 3px solid #d7a936;
  border-radius: 50%;
  background: linear-gradient(180deg, #f36b58 0%, #8f2029 56%, #57131c 100%);
  box-shadow: 0 9px 14px rgb(0 0 0 / 30%);
}

.kla-bowl-state {
  position: absolute;
  bottom: 0;
  left: 50%;
  z-index: 6;
  border: 1px solid rgb(252 211 77 / 24%);
  border-radius: 999px;
  background: rgb(5 18 35 / 78%);
  padding: 0.38rem 0.8rem;
  color: rgb(254 243 199 / 80%);
  font-size: 0.75rem;
  font-weight: 700;
  white-space: nowrap;
  transform: translateX(-50%);
}

.kla-bowl-stage--rolling .kla-bowl-set {
  animation: kla-bowl-shake 145ms ease-in-out infinite alternate;
}

.kla-bowl-stage--rolling .kla-bowl-ground-shadow {
  animation: kla-bowl-shadow 145ms ease-in-out infinite alternate;
}

.kla-bowl-stage--revealing .kla-bowl-dice {
  animation: kla-bowl-dice-land 620ms cubic-bezier(0.16, 1, 0.3, 1) 120ms both;
}

@keyframes kla-bowl-shake {
  from { transform: translate3d(-7px, 1px, 0) rotate(-1.4deg); }
  to { transform: translate3d(7px, -2px, 0) rotate(1.4deg); }
}

@keyframes kla-bowl-shadow {
  from { opacity: 0.75; transform: scaleX(0.92); }
  to { opacity: 0.46; transform: scaleX(1.04); }
}

@keyframes kla-bowl-dice-land {
  0% { opacity: 0; transform: translateY(-1.2rem) scale(0.78); }
  70% { opacity: 1; transform: translateY(0.2rem) scale(1.04); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}

@media (min-width: 640px) {
  .kla-bowl-dice {
    gap: 0.9rem;
  }

  .kla-bowl-dice :deep(.kla-die-scene) {
    --kla-die-size: 4rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .kla-bowl-set,
  .kla-bowl-cover,
  .kla-bowl-dice,
  .kla-bowl-ground-shadow {
    animation: none !important;
    transition-duration: 80ms;
  }
}
</style>
