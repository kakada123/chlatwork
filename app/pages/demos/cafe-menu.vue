<script setup lang="ts">
import {
  BUSINESS_SERVICE_BY_SLUG,
  TELEGRAM_CONTACT,
} from "~/data/services";

const service = BUSINESS_SERVICE_BY_SLUG["qr-menu"];
const title = "Cafe QR Menu Demo | ChlatWork";
const description =
  "Preview a realistic mobile QR menu demo for a small Cambodian cafe or restaurant with Khmer and English menu content.";

const menuCategories = [
  {
    name: "Coffee",
    label: "កាហ្វេ",
    items: [
      {
        name: "Iced Latte",
        khmerName: "ឡាតេទឹកកក",
        description: "Fresh espresso, milk, and light caramel notes.",
        price: "$2.50",
      },
      {
        name: "Americano",
        khmerName: "កាហ្វេខ្មៅ",
        description: "Clean black coffee served hot or iced.",
        price: "$1.80",
      },
      {
        name: "Palm Sugar Cappuccino",
        khmerName: "កាពូជីណូស្ករត្នោត",
        description: "Creamy espresso with Cambodian palm sugar.",
        price: "$2.75",
      },
    ],
  },
  {
    name: "Food",
    label: "ម្ហូប",
    items: [
      {
        name: "Bai Sach Chrouk",
        khmerName: "បាយសាច់ជ្រូក",
        description: "Grilled pork rice with pickles and clear soup.",
        price: "$2.25",
      },
      {
        name: "Chicken Lok Lak",
        khmerName: "ឡុកឡាក់មាន់",
        description: "Pepper lime sauce, tomato, onion, and rice.",
        price: "$3.50",
      },
    ],
  },
  {
    name: "Drinks",
    label: "ភេសជ្ជៈ",
    items: [
      {
        name: "Passion Soda",
        khmerName: "សូដាក្រូចផាសិន",
        description: "Fresh passion fruit, soda, and mint.",
        price: "$2.20",
      },
      {
        name: "Lime Iced Tea",
        khmerName: "តែក្រូចឆ្មា",
        description: "Black tea, lime, honey, and ice.",
        price: "$1.90",
      },
    ],
  },
];

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogType: "website",
  ogUrl: "https://chlatwork.com/demos/cafe-menu",
  twitterCard: "summary_large_image",
  twitterTitle: title,
  twitterDescription: description,
});

useHead({
  link: [{ rel: "canonical", href: "https://chlatwork.com/demos/cafe-menu" }],
});
</script>

<template>
  <main class="mx-auto w-full max-w-[1180px] space-y-8">
    <section
      class="grid gap-6 rounded-2xl border border-slate-200 bg-[#ffffff] p-5 shadow-sm shadow-sky-100/80 dark:!border-slate-800 dark:!bg-slate-900 dark:shadow-black/20 lg:grid-cols-[minmax(0,1fr)_420px] lg:p-8"
    >
      <div class="space-y-5">
        <div class="space-y-3">
          <NuxtLink
            :to="service.route"
            class="inline-flex text-sm font-semibold text-sky-700 hover:text-sky-900 dark:text-cyan-300 dark:hover:text-cyan-200"
          >
            QR Menu Website service
          </NuxtLink>
          <p class="text-xs font-bold uppercase text-sky-700 dark:text-cyan-300">
            Demo menu
          </p>
          <h1 class="max-w-3xl text-3xl font-black leading-tight text-slate-950 dark:text-white sm:text-4xl">
            A QR menu demo for a small Cambodian cafe.
          </h1>
          <p class="max-w-3xl text-base leading-7 text-slate-600 dark:text-slate-300">
            This preview shows how a simple QR menu can look on a customer phone:
            brand area, Khmer and English product names, category sections, and
            clear prices for quick ordering.
          </p>
        </div>

        <div class="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900 dark:!border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
          Demo only — customized for your business after order.
        </div>

        <div class="flex flex-col gap-3 sm:flex-row">
          <NuxtLink
            :to="service.route"
            class="inline-flex h-12 items-center justify-center rounded-xl bg-slate-950 px-6 text-sm font-bold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-300 dark:!bg-white dark:text-slate-950 dark:hover:!bg-cyan-100"
          >
            Order QR Menu
          </NuxtLink>
          <a
            :href="TELEGRAM_CONTACT.href"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex h-12 items-center justify-center rounded-xl border border-slate-200 bg-[#ffffff] px-6 text-sm font-bold text-slate-950 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-300 dark:!border-slate-800 dark:!bg-slate-900/70 dark:text-white dark:hover:!bg-slate-800"
          >
            Contact on Telegram
          </a>
        </div>
      </div>

      <aside class="mx-auto w-full max-w-[390px] rounded-[28px] border border-slate-200 bg-slate-950 p-3 shadow-2xl shadow-slate-300/50 dark:!border-slate-800 dark:!bg-black dark:ring-1 dark:ring-slate-700 dark:shadow-black/40">
        <div class="overflow-hidden rounded-[22px] bg-[#fffaf0] text-slate-950 dark:!bg-slate-900 dark:text-white">
          <header class="bg-[linear-gradient(135deg,#0f766e,#14532d)] p-5 text-white dark:bg-[linear-gradient(135deg,#064e3b,#0f172a)]">
            <div class="flex items-center gap-3">
              <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/95 text-lg font-black text-emerald-900 shadow-sm dark:!bg-emerald-100 dark:text-emerald-950">
                SC
              </div>
              <div>
                <p class="text-lg font-black">Sovan Cafe & Kitchen</p>
                <p class="text-sm text-white/80">សុវណ្ណ កាហ្វេ</p>
              </div>
            </div>
            <p class="mt-4 text-sm leading-6 text-white/[0.82]">
              Fresh coffee, Khmer breakfast, and quick lunch near Phnom Penh.
            </p>
          </header>

          <div class="space-y-5 p-4">
            <div class="flex gap-2 overflow-x-auto pb-1">
              <span
                v-for="category in menuCategories"
                :key="category.name"
                class="shrink-0 rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
              >
                {{ category.name }} / {{ category.label }}
              </span>
            </div>

            <section
              v-for="category in menuCategories"
              :key="category.name"
              class="space-y-3"
            >
              <div class="flex items-end justify-between border-b border-emerald-900/10 pb-2 dark:!border-slate-700">
                <h2 class="text-base font-black">
                  {{ category.name }}
                </h2>
                <p class="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                  {{ category.label }}
                </p>
              </div>

              <article
                v-for="item in category.items"
                :key="item.name"
                class="rounded-2xl border border-emerald-900/10 bg-[#ffffff] p-3 shadow-sm dark:!border-slate-700 dark:!bg-slate-800"
              >
                <div class="flex gap-3">
                  <div class="h-16 w-16 shrink-0 rounded-2xl bg-[linear-gradient(135deg,#fde68a,#fb923c)] dark:bg-[linear-gradient(135deg,#0f766e,#334155)]" />
                  <div class="min-w-0 flex-1">
                    <div class="flex items-start justify-between gap-3">
                      <div>
                        <h3 class="text-sm font-black">{{ item.name }}</h3>
                        <p class="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                          {{ item.khmerName }}
                        </p>
                      </div>
                      <p class="shrink-0 text-sm font-black text-emerald-900 dark:text-emerald-200">
                        {{ item.price }}
                      </p>
                    </div>
                    <p class="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                      {{ item.description }}
                    </p>
                  </div>
                </div>
              </article>
            </section>
          </div>
        </div>
      </aside>
    </section>
  </main>
</template>
