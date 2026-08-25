<script setup lang="ts">
import { ArrowRight, Gift, Heart, Images, Sparkles } from "lucide-vue-next";
</script>

<template>
  <section
    class="mt-16 overflow-hidden rounded-[2rem] border border-rose-200/80 bg-gradient-to-br from-rose-50 via-white to-amber-50 p-6 text-slate-950 shadow-sm dark:border-rose-300/15 dark:from-rose-400/10 dark:via-white/[0.04] dark:to-amber-300/10 dark:text-white sm:p-10"
    aria-labelledby="moments-home-title"
  >
    <div
      class="grid items-center gap-9 lg:grid-cols-[minmax(0,1fr)_minmax(320px,.8fr)]"
    >
      <div>
        <p
          class="flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-rose-600 dark:text-rose-300"
        >
          <Sparkles class="h-4 w-4" aria-hidden="true" /> ChlatWork Moments
        </p>
        <h2
          id="moments-home-title"
          class="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl"
        >
          Create a little place on the internet for someone special.
        </h2>
        <p
          class="mt-4 max-w-xl text-sm leading-7 text-slate-600 dark:text-white/65"
        >
          Turn a few photos and your own words into an interactive birthday,
          anniversary, friendship, or celebration page—complete with a hidden
          surprise.
        </p>
        <div
          class="mt-6 flex flex-wrap gap-2 text-xs font-semibold text-slate-600 dark:text-white/65"
        >
          <span
            class="rounded-full bg-white px-3 py-1.5 shadow-sm dark:bg-white/10"
            >4 beautiful themes</span
          >
          <span
            class="rounded-full bg-white px-3 py-1.5 shadow-sm dark:bg-white/10"
            >Private share link</span
          >
          <span
            class="rounded-full bg-white px-3 py-1.5 shadow-sm dark:bg-white/10"
            >QR included</span
          >
        </div>
        <NuxtLink
          to="/moments/create"
          class="mt-7 inline-flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-rose-600/15 transition hover:-translate-y-0.5 hover:bg-rose-700"
        >
          Create a Moment <ArrowRight class="h-4 w-4" aria-hidden="true" />
        </NuxtLink>
      </div>
      <div
        class="relative mx-auto w-full max-w-sm rounded-[1.6rem] border border-rose-100 bg-white p-5 shadow-2xl shadow-rose-900/10 dark:border-white/10 dark:bg-[#131116]"
      >
        <div
          class="absolute -right-4 -top-4 grid h-12 w-12 rotate-6 place-items-center rounded-2xl bg-rose-500 text-white shadow-lg"
        >
          <Gift class="h-6 w-6" aria-hidden="true" />
        </div>
        <p class="text-xs font-bold uppercase tracking-[.15em] text-rose-500">
          Happy Birthday
        </p>
        <p class="mt-2 font-serif text-3xl leading-tight">
          For someone wonderful ❤️
        </p>
        <div class="mt-5 grid grid-cols-2 gap-2">
          <div
            class="flex aspect-square items-center justify-center rounded-xl bg-rose-100 text-rose-400 dark:bg-rose-300/10"
          >
            <Images class="h-8 w-8" />
          </div>
          <div
            class="flex aspect-square translate-y-3 items-center justify-center rounded-xl bg-amber-100 text-amber-500 dark:bg-amber-300/10"
          >
            <Heart class="h-8 w-8 fill-current" />
          </div>
        </div>
        <div
          class="mt-7 h-2 w-4/5 rounded-full bg-slate-100 dark:bg-white/10"
        />
        <div
          class="mt-2 h-2 w-3/5 rounded-full bg-slate-100 dark:bg-white/10"
        />
      </div>
    </div>
  </section>
</template>
