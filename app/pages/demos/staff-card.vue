<script setup lang="ts">
import { BUSINESS_SERVICE_BY_SLUG } from "~/data/services";

const service = BUSINESS_SERVICE_BY_SLUG["custom-business-tool"];
const title = "Staff Card Generator Demo | ChlatWork";
const description =
  "Preview a professional staff card generator demo with company branding, staff details, QR placeholder, and contact information.";

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogType: "website",
  ogUrl: "https://chlatwork.com/demos/staff-card",
  twitterCard: "summary_large_image",
  twitterTitle: title,
  twitterDescription: description,
});

useHead({
  link: [{ rel: "canonical", href: "https://chlatwork.com/demos/staff-card" }],
});
</script>

<template>
  <main class="mx-auto w-full max-w-[1180px] space-y-8">
    <section
      class="grid gap-6 rounded-2xl border border-slate-200 bg-[#ffffff] p-5 shadow-sm shadow-sky-100/80 dark:!border-slate-800 dark:!bg-slate-900 dark:shadow-black/20 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1fr)] lg:p-8"
    >
      <div class="space-y-5">
        <div class="space-y-3">
          <NuxtLink
            :to="service.route"
            class="inline-flex text-sm font-semibold text-sky-700 hover:text-sky-900 dark:text-cyan-300 dark:hover:text-cyan-200"
          >
            Custom Business Tool service
          </NuxtLink>
          <p class="text-xs font-bold uppercase text-sky-700 dark:text-cyan-300">
            Demo staff card
          </p>
          <h1 class="max-w-3xl text-3xl font-black leading-tight text-slate-950 dark:text-white sm:text-4xl">
            A clean staff card generator preview for business teams.
          </h1>
          <p class="max-w-3xl text-base leading-7 text-slate-600 dark:text-slate-300">
            This demo shows the kind of custom internal tool ChlatWork can build:
            enter staff details, keep branding consistent, and prepare cards for
            printing or sharing.
          </p>
        </div>

        <div class="flex flex-col gap-3 sm:flex-row">
          <NuxtLink
            :to="service.route"
            class="inline-flex h-12 items-center justify-center rounded-xl bg-slate-950 px-6 text-sm font-bold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-300 dark:!bg-white dark:text-slate-950 dark:hover:!bg-cyan-100"
          >
            Order Custom Tool
          </NuxtLink>
          <NuxtLink
            to="/pricing"
            class="inline-flex h-12 items-center justify-center rounded-xl border border-slate-200 bg-[#ffffff] px-6 text-sm font-bold text-slate-950 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-300 dark:!border-slate-800 dark:!bg-slate-900/70 dark:text-white dark:hover:!bg-slate-800"
          >
            View pricing
          </NuxtLink>
        </div>
      </div>

      <div class="grid gap-4 md:grid-cols-2">
        <article class="overflow-hidden rounded-[24px] border border-slate-200 bg-[#ffffff] text-slate-950 shadow-xl shadow-slate-200/70 dark:!border-slate-700 dark:shadow-black/35 dark:ring-1 dark:ring-slate-700">
          <header class="bg-[linear-gradient(135deg,#0f172a,#0e7490)] p-5 text-white">
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="text-lg font-black">ChlatWork Co.</p>
                <p class="text-xs font-semibold text-white/70">
                  Staff Identification Card
                </p>
              </div>
              <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#ffffff] text-sm font-black text-slate-950">
                CW
              </div>
            </div>
          </header>

          <div class="p-5">
            <div class="mx-auto flex h-28 w-28 items-center justify-center rounded-full border-4 border-white bg-[linear-gradient(135deg,#bae6fd,#c4b5fd)] text-3xl font-black text-slate-800 shadow-lg">
              SN
            </div>
            <div class="mt-4 text-center">
              <h2 class="text-xl font-black">Sokha Narin</h2>
              <p class="text-sm font-semibold text-cyan-700">
                Operations Supervisor
              </p>
              <p class="mt-1 text-xs text-slate-500">
                ប្រធានប្រតិបត្តិការ
              </p>
            </div>

            <dl class="mt-5 space-y-3 rounded-2xl bg-slate-50 p-4 text-sm">
              <div class="flex justify-between gap-4">
                <dt class="font-semibold text-slate-500">Staff ID</dt>
                <dd class="font-black">CW-0268</dd>
              </div>
              <div class="flex justify-between gap-4">
                <dt class="font-semibold text-slate-500">Department</dt>
                <dd class="font-black">Operations</dd>
              </div>
              <div class="flex justify-between gap-4">
                <dt class="font-semibold text-slate-500">Phone</dt>
                <dd class="font-black">012 345 678</dd>
              </div>
            </dl>
          </div>
        </article>

        <article class="rounded-[24px] border border-slate-200 bg-[#ffffff] p-5 text-slate-950 shadow-xl shadow-slate-200/70 dark:!border-slate-700 dark:shadow-black/35 dark:ring-1 dark:ring-slate-700">
          <div class="flex h-full flex-col justify-between gap-6">
            <div>
              <p class="text-xs font-black uppercase text-slate-400">
                Verification
              </p>
              <h2 class="mt-2 text-xl font-black">
                Scan to confirm staff profile
              </h2>
              <p class="mt-2 text-sm leading-6 text-slate-500">
                A real custom tool can generate QR codes that open a staff
                profile, contact card, or internal verification page.
              </p>
            </div>

            <div class="mx-auto grid h-40 w-40 grid-cols-5 gap-1 rounded-2xl border border-slate-200 bg-[#ffffff] p-3">
              <span class="rounded bg-slate-950" />
              <span class="rounded bg-slate-950" />
              <span class="rounded bg-slate-100" />
              <span class="rounded bg-slate-950" />
              <span class="rounded bg-slate-950" />
              <span class="rounded bg-slate-950" />
              <span class="rounded bg-slate-100" />
              <span class="rounded bg-slate-950" />
              <span class="rounded bg-slate-100" />
              <span class="rounded bg-slate-950" />
              <span class="rounded bg-slate-100" />
              <span class="rounded bg-slate-950" />
              <span class="rounded bg-slate-950" />
              <span class="rounded bg-slate-100" />
              <span class="rounded bg-slate-100" />
              <span class="rounded bg-slate-950" />
              <span class="rounded bg-slate-100" />
              <span class="rounded bg-slate-100" />
              <span class="rounded bg-slate-950" />
              <span class="rounded bg-slate-950" />
              <span class="rounded bg-slate-950" />
              <span class="rounded bg-slate-950" />
              <span class="rounded bg-slate-100" />
              <span class="rounded bg-slate-100" />
              <span class="rounded bg-slate-950" />
            </div>

            <div class="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-500">
              ChlatWork Co.<br />
              Phnom Penh, Cambodia<br />
              staff.chlatwork.com/CW-0268
            </div>
          </div>
        </article>
      </div>
    </section>
  </main>
</template>
