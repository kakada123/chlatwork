<script setup lang="ts">
import {
  BUSINESS_SERVICES,
  TELEGRAM_CONTACT,
  type BusinessService,
} from "~/data/services";

const props = defineProps<{
  service: BusinessService;
}>();

const relatedServices = computed(() =>
  BUSINESS_SERVICES.filter((service) => service.slug !== props.service.slug),
);
</script>

<template>
  <main class="mx-auto w-full max-w-[1180px] space-y-8">
    <section
      class="overflow-hidden rounded-2xl border border-sky-100/90 bg-white/85 shadow-sm shadow-sky-100/80 dark:border-white/10 dark:bg-white/[0.07] dark:shadow-black/20"
    >
      <div
        class="grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:p-8"
      >
        <div class="space-y-5">
          <div class="space-y-3">
            <NuxtLink
              to="/pricing"
              class="inline-flex text-sm font-semibold text-sky-700 hover:text-sky-900 dark:text-cyan-300 dark:hover:text-cyan-200"
            >
              View pricing
            </NuxtLink>
            <p class="text-xs font-bold uppercase text-sky-700 dark:text-cyan-300">
              {{ service.eyebrow }}
            </p>
            <h1
              class="max-w-4xl text-3xl font-black leading-tight text-slate-950 dark:text-white sm:text-4xl"
            >
              {{ service.title }}
            </h1>
            <p class="max-w-3xl text-base leading-7 text-slate-600 dark:text-white/65">
              {{ service.description }}
            </p>
          </div>

          <div class="flex flex-wrap gap-3">
            <span
              class="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 dark:border-white/10 dark:bg-white/[0.05] dark:text-white/75"
            >
              From {{ service.startingPrice }}
            </span>
            <span
              class="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 dark:border-white/10 dark:bg-white/[0.05] dark:text-white/75"
            >
              {{ service.deliveryTime }}
            </span>
          </div>

          <div class="flex flex-col gap-3 sm:flex-row">
            <a
              :href="TELEGRAM_CONTACT.href"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex h-12 items-center justify-center rounded-xl bg-slate-950 px-6 text-sm font-bold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-300 dark:bg-white dark:text-slate-950 dark:hover:bg-cyan-100"
            >
              Message on Telegram
            </a>
            <NuxtLink
              :to="service.demoRoute"
              class="inline-flex h-12 items-center justify-center rounded-xl border border-sky-200 bg-sky-50 px-6 text-sm font-bold text-sky-800 transition hover:bg-sky-100 focus:outline-none focus:ring-2 focus:ring-sky-300 dark:border-cyan-300/20 dark:bg-cyan-300/10 dark:text-cyan-100 dark:hover:bg-cyan-300/15"
            >
              View demo
            </NuxtLink>
            <NuxtLink
              to="/pricing"
              class="inline-flex h-12 items-center justify-center rounded-xl border border-slate-200 bg-white px-6 text-sm font-bold text-slate-950 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-300 dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/[0.10]"
            >
              Compare services
            </NuxtLink>
          </div>
        </div>

        <aside
          class="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-300/20 dark:bg-emerald-300/10"
        >
          <h2 class="text-sm font-black text-emerald-950 dark:text-emerald-50">
            What you get
          </h2>
          <ul class="mt-4 space-y-3">
            <li
              v-for="highlight in service.highlights"
              :key="highlight"
              class="flex gap-3 text-sm leading-6 text-emerald-900/85 dark:text-emerald-100/80"
            >
              <span
                class="mt-2 h-2 w-2 shrink-0 rounded-full bg-emerald-500"
                aria-hidden="true"
              />
              <span>{{ highlight }}</span>
            </li>
          </ul>
          <p class="mt-5 text-sm leading-6 text-emerald-900/75 dark:text-emerald-100/70">
            No online checkout yet. Scope, delivery, and payment are confirmed
            manually on Telegram first.
          </p>
        </aside>
      </div>
    </section>

    <section class="grid gap-4 lg:grid-cols-2">
      <article
        class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.06]"
      >
        <h2 class="text-xl font-black text-slate-950 dark:text-white">
          Included in this service
        </h2>
        <ul class="mt-4 space-y-3">
          <li
            v-for="feature in service.features"
            :key="feature"
            class="flex gap-3 text-sm leading-6 text-slate-600 dark:text-white/65"
          >
            <span
              class="mt-2 h-2 w-2 shrink-0 rounded-full bg-sky-500"
              aria-hidden="true"
            />
            <span>{{ feature }}</span>
          </li>
        </ul>
      </article>

      <article
        class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.06]"
      >
        <h2 class="text-xl font-black text-slate-950 dark:text-white">
          Best fit
        </h2>
        <ul class="mt-4 space-y-3">
          <li
            v-for="item in service.idealFor"
            :key="item"
            class="flex gap-3 text-sm leading-6 text-slate-600 dark:text-white/65"
          >
            <span
              class="mt-2 h-2 w-2 shrink-0 rounded-full bg-fuchsia-500"
              aria-hidden="true"
            />
            <span>{{ item }}</span>
          </li>
        </ul>
      </article>
    </section>

    <section
      class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.06]"
    >
      <h2 class="text-xl font-black text-slate-950 dark:text-white">
        How the work starts
      </h2>
      <ol class="mt-4 grid gap-3 md:grid-cols-2">
        <li
          v-for="(step, index) in service.process"
          :key="step"
          class="flex gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600 dark:border-white/10 dark:bg-white/[0.05] dark:text-white/65"
        >
          <span
            class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-950 text-xs font-black text-white dark:bg-white dark:text-slate-950"
          >
            {{ index + 1 }}
          </span>
          <span class="pt-0.5">{{ step }}</span>
        </li>
      </ol>
    </section>

    <section class="space-y-3">
      <h2 class="text-xl font-black text-slate-950 dark:text-white">
        Other ChlatWork services
      </h2>
      <div class="grid gap-3 md:grid-cols-2">
        <NuxtLink
          v-for="relatedService in relatedServices"
          :key="relatedService.slug"
          :to="relatedService.route"
          class="rounded-2xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-md dark:border-white/10 dark:bg-white/[0.06] dark:hover:bg-white/[0.10]"
        >
          <h3 class="text-sm font-black text-slate-950 dark:text-white">
            {{ relatedService.name }}
          </h3>
          <p class="mt-2 line-clamp-2 text-xs leading-5 text-slate-500 dark:text-white/55">
            {{ relatedService.description }}
          </p>
          <p class="mt-3 text-xs font-bold text-sky-700 dark:text-cyan-300">
            From {{ relatedService.startingPrice }}
          </p>
        </NuxtLink>
      </div>
    </section>
  </main>
</template>
