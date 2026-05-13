<script setup lang="ts">
import type { LandingTool } from "~/data/tools";

const props = defineProps<{
  tools: LandingTool[];
}>();

type OrbitLayout = {
  top: string;
  left: string;
  rotate: string;
  delay: string;
  glow: string;
};

const featuredToolKeys = [
  "qr",
  "json-formatter",
  "image-compress",
  "expense-tracker",
  "text-to-voice",
  "jwt-decoder",
  "password-generator",
  "calculator",
];

const orbitLayouts: OrbitLayout[] = [
  {
    top: "4%",
    left: "18%",
    rotate: "-10deg",
    delay: "-1.6s",
    glow: "rgba(16,185,129,0.52)",
  },
  {
    top: "0%",
    left: "58%",
    rotate: "-7deg",
    delay: "-5.2s",
    glow: "rgba(139,92,246,0.56)",
  },
  {
    top: "10%",
    left: "86%",
    rotate: "-8deg",
    delay: "-3.1s",
    glow: "rgba(59,130,246,0.5)",
  },
  {
    top: "35%",
    left: "20%",
    rotate: "-8deg",
    delay: "-7.4s",
    glow: "rgba(244,63,94,0.48)",
  },
  {
    top: "64%",
    left: "21%",
    rotate: "-10deg",
    delay: "-2.6s",
    glow: "rgba(236,72,153,0.5)",
  },
  {
    top: "70%",
    left: "54%",
    rotate: "-7deg",
    delay: "-6.1s",
    glow: "rgba(20,184,166,0.48)",
  },
  {
    top: "70%",
    left: "86%",
    rotate: "-11deg",
    delay: "-4.3s",
    glow: "rgba(245,158,11,0.5)",
  },
  {
    top: "40%",
    left: "88%",
    rotate: "-6deg",
    delay: "-8.1s",
    glow: "rgba(14,165,233,0.5)",
  },
];

const orbitTools = computed(() =>
  featuredToolKeys
    .map((key, index) => {
      const tool =
        props.tools.find((item) => item.key === key) ?? props.tools[index];
      const layout = orbitLayouts[index];

      if (!tool || !layout) {
        return null;
      }

      return { tool, layout };
    })
    .filter(
      (item): item is { tool: LandingTool; layout: OrbitLayout } =>
        item !== null,
    ),
);

const mobileTools = computed(() => orbitTools.value.slice(0, 4));

const stats = computed(() => [
  {
    label: `${props.tools.length}+ Tools`,
    caption: "And counting",
    paths: [
      "M5 15.5 4 20l4.5-1 8.8-8.8a4.2 4.2 0 0 0-5.9-5.9L5 15.5Z",
      "M14 6l4 4",
      "M8.5 18.5l-3-3",
      "M14.5 3.8c1.8.2 3.5 1 4.7 2.3 1.3 1.3 2.1 2.9 2.3 4.7",
    ],
    accent: "from-sky-400 to-violet-500",
  },
  {
    label: "100% Browser Friendly",
    caption: "No installation required",
    paths: [
      "M12 3l7 4v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V7l7-4Z",
      "M9 12l2 2 4-4",
    ],
    accent: "from-violet-400 to-cyan-400",
  },
  {
    label: "Fast & Secure",
    caption: "Works offline, stays private",
    paths: ["M13 2 4 14h7l-1 8 9-12h-7l1-8Z"],
    accent: "from-amber-300 to-orange-500",
  },
]);
</script>

<template>
  <section
    class="relative overflow-hidden bg-[linear-gradient(135deg,#020712_0%,#070b17_45%,#02040b_100%)] px-5 py-12 text-white sm:px-8 lg:px-12 lg:py-12 xl:py-14"
  >
    <div class="hero-star-field absolute inset-0" aria-hidden="true" />
    <div
      class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent"
      aria-hidden="true"
    />

    <div
      class="relative z-10 mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center"
    >
      <div class="max-w-2xl">
        <NuxtLink
          to="/"
          class="inline-flex items-center gap-3 text-white"
          aria-label="ChlatWork home"
        >
          <img
            src="/assets/chlart-work.png"
            alt=""
            class="h-10 w-10 rounded-xl object-contain"
          />
          <span class="text-lg font-bold">ChlatWork</span>
        </NuxtLink>

        <h1
          class="mt-12 max-w-2xl text-5xl font-black leading-[1.04] text-white sm:text-6xl lg:text-7xl"
        >
          Simple tools that get things
          <span
            class="block bg-gradient-to-r from-fuchsia-400 via-violet-400 to-sky-400 bg-clip-text text-transparent"
          >
            done.
          </span>
        </h1>

        <p class="mt-6 max-w-xl text-lg leading-8 text-slate-300 sm:text-xl">
          Fast, clean, and practical tools for daily work, developers, and
          creators.
        </p>

        <div class="mt-9 flex flex-col gap-3 sm:flex-row">
          <NuxtLink
            to="/tools"
            class="inline-flex h-12 items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-cyan-400 via-blue-500 to-fuchsia-500 px-7 text-sm font-bold text-white shadow-[0_18px_50px_rgba(59,130,246,0.34)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_60px_rgba(168,85,247,0.4)] focus:outline-none focus:ring-2 focus:ring-cyan-200"
          >
            Explore Tools
            <svg
              viewBox="0 0 24 24"
              class="h-5 w-5"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M5 12h14" />
              <path d="m13 6 6 6-6 6" />
            </svg>
          </NuxtLink>

          <NuxtLink
            to="/tools"
            class="inline-flex h-12 items-center justify-center gap-3 rounded-2xl border border-white/16 bg-white/[0.04] px-7 text-sm font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur transition hover:-translate-y-0.5 hover:border-white/28 hover:bg-white/[0.08] focus:outline-none focus:ring-2 focus:ring-white/50"
          >
            Developer Tools
            <svg
              viewBox="0 0 24 24"
              class="h-5 w-5"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="m8 9-4 3 4 3" />
              <path d="m16 9 4 3-4 3" />
              <path d="m14 5-4 14" />
            </svg>
          </NuxtLink>
        </div>
      </div>

      <div class="relative mx-auto w-full max-w-[650px] lg:h-[460px]">
        <div
          class="hero-orbit hero-orbit-one hidden lg:block"
          aria-hidden="true"
        />
        <div
          class="hero-orbit hero-orbit-two hidden lg:block"
          aria-hidden="true"
        />
        <div
          class="hero-orbit hero-orbit-three hidden lg:block"
          aria-hidden="true"
        />

        <div
          class="relative z-10 mx-auto flex h-48 w-48 items-center justify-center rounded-[30px] border border-white/16 bg-[linear-gradient(145deg,rgba(14,23,42,0.92),rgba(6,11,24,0.96))] shadow-[0_28px_90px_rgba(37,99,235,0.22),inset_0_1px_0_rgba(255,255,255,0.12)] sm:h-56 sm:w-56 lg:absolute lg:left-1/2 lg:top-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rotate-[-6deg]"
        >
          <div
            class="flex h-32 w-32 items-center justify-center rounded-[26px] bg-[linear-gradient(145deg,rgba(255,255,255,0.07),rgba(255,255,255,0.02))] sm:h-36 sm:w-36"
          >
            <img
              src="/assets/chlart-work.png"
              alt="ChlatWork"
              class="h-24 w-24 rounded-3xl object-contain sm:h-28 sm:w-28"
            />
          </div>
        </div>

        <div class="mt-8 grid grid-cols-2 gap-3 lg:hidden">
          <NuxtLink
            v-for="item in mobileTools"
            :key="item.tool.key"
            :to="item.tool.route"
            class="group rounded-2xl border border-white/12 bg-white/[0.06] p-3 shadow-xl shadow-black/20 backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/[0.1] focus:outline-none focus:ring-2 focus:ring-cyan-200"
          >
            <span
              class="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-lg shadow-black/20"
              :class="item.tool.accent"
              aria-hidden="true"
            >
              <svg
                viewBox="0 0 24 24"
                class="h-5 w-5"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path
                  v-for="path in item.tool.iconPaths"
                  :key="path"
                  :d="path"
                />
              </svg>
            </span>
            <span class="block truncate text-sm font-bold text-white">
              {{ item.tool.name }}
            </span>
          </NuxtLink>
        </div>

        <NuxtLink
          v-for="item in orbitTools"
          :key="item.tool.key"
          :to="item.tool.route"
          class="hero-tool-card group absolute hidden w-[132px] rounded-2xl border border-white/12 bg-white/[0.08] p-3 text-white shadow-2xl backdrop-blur-xl transition hover:z-20 hover:-translate-y-1 hover:border-white/24 hover:bg-white/[0.12] focus:outline-none focus:ring-2 focus:ring-cyan-200 lg:block"
          :style="{
            top: item.layout.top,
            left: item.layout.left,
            '--card-rotate': item.layout.rotate,
            '--float-delay': item.layout.delay,
            '--card-glow': item.layout.glow,
          }"
        >
          <span
            class="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg shadow-black/25 transition group-hover:scale-105"
            :class="item.tool.accent"
            aria-hidden="true"
          >
            <svg
              viewBox="0 0 24 24"
              class="h-7 w-7"
              fill="none"
              stroke="currentColor"
              stroke-width="1.9"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path v-for="path in item.tool.iconPaths" :key="path" :d="path" />
            </svg>
          </span>
          <span
            class="block truncate text-center text-xs font-bold leading-tight text-white"
          >
            {{ item.tool.name }}
          </span>
        </NuxtLink>
      </div>

      <div
        class="rounded-2xl border border-white/10 bg-white/[0.05] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur lg:col-span-2"
      >
        <div class="grid gap-3 md:grid-cols-3 md:divide-x md:divide-white/10">
          <div
            v-for="stat in stats"
            :key="stat.label"
            class="flex items-center gap-4 px-2 py-2 md:px-6"
          >
            <span
              class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg shadow-black/25"
              :class="stat.accent"
              aria-hidden="true"
            >
              <svg
                viewBox="0 0 24 24"
                class="h-6 w-6"
                fill="none"
                stroke="currentColor"
                stroke-width="1.9"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path v-for="path in stat.paths" :key="path" :d="path" />
              </svg>
            </span>
            <span class="min-w-0">
              <span class="block text-base font-bold leading-6 text-white">
                {{ stat.label }}
              </span>
              <span class="block text-sm text-slate-400">
                {{ stat.caption }}
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.hero-star-field {
  background-image:
    radial-gradient(circle, rgb(255 255 255 / 0.72) 1px, transparent 1.5px),
    radial-gradient(circle, rgb(125 211 252 / 0.5) 1px, transparent 1.6px);
  background-position:
    28px 32px,
    140px 90px;
  background-size:
    180px 160px,
    260px 220px;
  opacity: 0.28;
}

.hero-orbit {
  position: absolute;
  left: 50%;
  top: 50%;
  border: 1px solid rgb(139 92 246 / 0.24);
  border-radius: 9999px;
  pointer-events: none;
  transform: translate(-50%, -50%) rotate(-8deg);
}

.hero-orbit-one {
  width: 74%;
  height: 42%;
}

.hero-orbit-two {
  width: 94%;
  height: 56%;
  border-color: rgb(56 189 248 / 0.16);
  transform: translate(-50%, -50%) rotate(8deg);
}

.hero-orbit-three {
  width: 62%;
  height: 34%;
  border-color: rgb(236 72 153 / 0.18);
  transform: translate(-50%, -50%) rotate(18deg);
}

.hero-tool-card {
  animation: hero-tool-float 9s ease-in-out infinite;
  animation-delay: var(--float-delay);
  box-shadow:
    0 20px 44px rgb(0 0 0 / 0.35),
    0 0 36px var(--card-glow),
    inset 0 1px 0 rgb(255 255 255 / 0.12);
  transform: translate3d(-50%, 0, 0) rotate(var(--card-rotate));
}

@keyframes hero-tool-float {
  0%,
  100% {
    transform: translate3d(-50%, 0, 0) rotate(var(--card-rotate));
  }

  50% {
    transform: translate3d(-50%, -14px, 0) rotate(var(--card-rotate));
  }
}

@media (prefers-reduced-motion: reduce) {
  .hero-tool-card {
    animation: none;
  }
}
</style>
