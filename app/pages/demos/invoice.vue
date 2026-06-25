<script setup lang="ts">
import { BUSINESS_SERVICE_BY_SLUG } from "~/data/services";

const service = BUSINESS_SERVICE_BY_SLUG["invoice-generator"];
const title = "Invoice Generator Demo | ChlatWork";
const description =
  "Preview a realistic invoice and receipt generator demo with Khmer and English labels, line items, subtotal, discount, and total.";

const invoiceItems = [
  { description: "QR menu setup", khmer: "រៀបចំមីនុយ QR", quantity: 1, price: 49 },
  { description: "Menu item data entry", khmer: "បញ្ចូលទិន្នន័យមុខម្ហូប", quantity: 1, price: 15 },
  { description: "QR poster design", khmer: "រចនាផ្ទាំង QR", quantity: 2, price: 5 },
];

const subtotal = invoiceItems.reduce(
  (total, item) => total + item.quantity * item.price,
  0,
);
const discount = 5;
const total = subtotal - discount;

function formatUsd(amount: number) {
  return `$${amount.toFixed(2)}`;
}

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogType: "website",
  ogUrl: "https://chlatwork.com/demos/invoice",
  twitterCard: "summary_large_image",
  twitterTitle: title,
  twitterDescription: description,
});

useHead({
  link: [{ rel: "canonical", href: "https://chlatwork.com/demos/invoice" }],
});
</script>

<template>
  <main class="mx-auto w-full max-w-[1180px] space-y-8">
    <section
      class="grid gap-6 rounded-2xl border border-sky-100/90 bg-white/85 p-5 shadow-sm shadow-sky-100/80 dark:border-white/10 dark:bg-white/[0.07] dark:shadow-black/20 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1fr)] lg:p-8"
    >
      <div class="space-y-5">
        <div class="space-y-3">
          <NuxtLink
            :to="service.route"
            class="inline-flex text-sm font-semibold text-sky-700 hover:text-sky-900 dark:text-cyan-300 dark:hover:text-cyan-200"
          >
            Invoice / Receipt Generator service
          </NuxtLink>
          <p class="text-xs font-bold uppercase text-sky-700 dark:text-cyan-300">
            Demo invoice
          </p>
          <h1 class="max-w-3xl text-3xl font-black leading-tight text-slate-950 dark:text-white sm:text-4xl">
            A branded invoice preview for small business work.
          </h1>
          <p class="max-w-3xl text-base leading-7 text-slate-600 dark:text-white/65">
            This is a visual demo of the document your custom invoice tool can
            generate. PDF export is not part of this demo page yet.
          </p>
        </div>

        <div class="flex flex-col gap-3 sm:flex-row">
          <NuxtLink
            :to="service.route"
            class="inline-flex h-12 items-center justify-center rounded-xl bg-slate-950 px-6 text-sm font-bold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-300 dark:bg-white dark:text-slate-950 dark:hover:bg-cyan-100"
          >
            Order Invoice Tool
          </NuxtLink>
          <NuxtLink
            to="/pricing"
            class="inline-flex h-12 items-center justify-center rounded-xl border border-slate-200 bg-white px-6 text-sm font-bold text-slate-950 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-300 dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/[0.10]"
          >
            View pricing
          </NuxtLink>
        </div>
      </div>

      <article class="rounded-2xl border border-slate-200 bg-white p-5 text-slate-950 shadow-xl shadow-slate-200/70 dark:border-white/10 dark:shadow-black/20">
        <header class="flex flex-col gap-5 border-b border-slate-200 pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div class="flex items-center gap-3">
              <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-sm font-black text-white">
                CW
              </div>
              <div>
                <p class="text-lg font-black">ChlatWork Studio</p>
                <p class="text-sm text-slate-500">សេវាកម្មឧបករណ៍អាជីវកម្ម</p>
              </div>
            </div>
            <p class="mt-4 text-sm leading-6 text-slate-500">
              Phnom Penh, Cambodia<br />
              Telegram: t.me/kakadangen
            </p>
          </div>
          <div class="text-left sm:text-right">
            <h2 class="text-2xl font-black">Invoice</h2>
            <p class="text-sm font-semibold text-slate-500">វិក្កយបត្រ / Receipt</p>
            <p class="mt-3 text-sm text-slate-500">No. INV-2026-0625</p>
            <p class="text-sm text-slate-500">Date: 25 Jun 2026</p>
          </div>
        </header>

        <section class="grid gap-4 border-b border-slate-200 py-5 sm:grid-cols-2">
          <div>
            <p class="text-xs font-black uppercase text-slate-400">
              Bill to / អតិថិជន
            </p>
            <p class="mt-2 font-black">Sovan Cafe & Kitchen</p>
            <p class="text-sm leading-6 text-slate-500">
              Street 123, Phnom Penh<br />
              Contact: 012 345 678
            </p>
          </div>
          <div class="rounded-2xl bg-slate-50 p-4">
            <p class="text-xs font-black uppercase text-slate-400">
              Payment status
            </p>
            <p class="mt-2 text-sm font-black text-emerald-700">
              Paid / បានទូទាត់
            </p>
            <p class="mt-1 text-sm text-slate-500">
              Cash or bank transfer
            </p>
          </div>
        </section>

        <section class="overflow-hidden">
          <div class="hidden grid-cols-[1fr_70px_90px_90px] gap-3 border-b border-slate-200 py-3 text-xs font-black uppercase text-slate-400 sm:grid">
            <span>Item / មុខទំនិញ</span>
            <span class="text-right">Qty</span>
            <span class="text-right">Price</span>
            <span class="text-right">Total</span>
          </div>

          <div class="divide-y divide-slate-200">
            <div
              v-for="item in invoiceItems"
              :key="item.description"
              class="grid gap-2 py-4 text-sm sm:grid-cols-[1fr_70px_90px_90px] sm:gap-3"
            >
              <div>
                <p class="font-black">{{ item.description }}</p>
                <p class="text-xs font-semibold text-slate-500">{{ item.khmer }}</p>
              </div>
              <p class="text-slate-500 sm:text-right">{{ item.quantity }}</p>
              <p class="text-slate-500 sm:text-right">{{ formatUsd(item.price) }}</p>
              <p class="font-black sm:text-right">
                {{ formatUsd(item.quantity * item.price) }}
              </p>
            </div>
          </div>
        </section>

        <section class="ml-auto mt-5 w-full max-w-sm space-y-3">
          <div class="flex justify-between text-sm text-slate-500">
            <span>Subtotal / សរុបរង</span>
            <span>{{ formatUsd(subtotal) }}</span>
          </div>
          <div class="flex justify-between text-sm text-slate-500">
            <span>Discount / បញ្ចុះតម្លៃ</span>
            <span>-{{ formatUsd(discount) }}</span>
          </div>
          <div class="flex justify-between rounded-2xl bg-slate-950 px-4 py-3 text-base font-black text-white">
            <span>Total / សរុប</span>
            <span>{{ formatUsd(total) }}</span>
          </div>
        </section>
      </article>
    </section>
  </main>
</template>
