<template>
  <section class="px-5 py-20 sm:px-8 lg:px-12">
    <div
      class="relative mx-auto max-w-7xl overflow-hidden rounded-[32px] border border-gray-200/80 bg-white/75 px-6 py-14 text-center shadow-2xl shadow-slate-200/80 backdrop-blur-xl sm:px-10 dark:border-white/10 dark:bg-white/[0.08] dark:shadow-black/25"
    >
      <div
        class="cta-glow absolute left-1/2 top-0 h-44 w-72 -translate-x-1/2 rounded-full bg-gradient-to-r from-teal-300 via-cyan-300 to-fuchsia-300 opacity-45 blur-3xl dark:from-[#0a84ff] dark:via-[#5e5ce6] dark:to-[#bf5af2]"
        aria-hidden="true"
      />
      <div class="relative">
        <h2 class="text-3xl font-black tracking-tight text-gray-950 dark:text-white sm:text-5xl">
          Pick a tool and get things done.
        </h2>
        <p class="mx-auto mt-4 max-w-2xl text-base leading-7 text-gray-600 dark:text-white/[0.62]">
          Every tool is built to stay fast, focused, and easy to return to when
          work gets busy.
        </p>
        <div class="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <NuxtLink
            to="/tools"
            class="inline-flex h-12 items-center justify-center rounded-2xl bg-gradient-to-r from-teal-300 to-cyan-300 px-6 text-sm font-black text-slate-950 shadow-xl shadow-teal-200/70 transition hover:-translate-y-0.5 hover:from-teal-200 hover:to-cyan-200 focus:outline-none focus:ring-2 focus:ring-teal-400 dark:from-[#0a84ff] dark:to-[#5e5ce6] dark:text-white dark:shadow-black/20 dark:hover:from-[#409cff] dark:hover:to-[#7d7aff]"
          >
            View All Tools
          </NuxtLink>
          <NuxtLink
            to="/contact"
            class="inline-flex h-12 items-center justify-center rounded-2xl border border-gray-300 bg-white px-6 text-sm font-bold text-gray-950 shadow-lg shadow-slate-200/70 transition hover:-translate-y-0.5 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-400 dark:border-white/[0.14] dark:bg-white/[0.08] dark:text-white dark:shadow-black/20 dark:hover:bg-white/[0.12] dark:focus:ring-white/50"
          >
            Request a Tool
          </NuxtLink>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.cta-glow {
  animation: cta-pulse 8s ease-in-out infinite;
}

@keyframes cta-pulse {
  0%,
  100% {
    opacity: 0.28;
    transform: translateX(-50%) scale(0.94);
  }

  50% {
    opacity: 0.48;
    transform: translateX(-50%) scale(1.08);
  }
}

@media (prefers-reduced-motion: reduce) {
  .cta-glow {
    animation: none;
  }
}
</style>
