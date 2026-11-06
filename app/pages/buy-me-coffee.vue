<script setup lang="ts">
import { useLanguage } from "~/composables/useLanguage";

const { isKhmer } = useLanguage();

const title = computed(() =>
  isKhmer.value ? "គាំទ្រ ChlatWork" : "Support ChlatWork",
);
const description = computed(() =>
  isKhmer.value
    ? "គាំទ្រគម្រោងឧបករណ៍ ChlatWork តាមរយៈ KHQR, ABA ឬ Bakong។"
    : "Support the ChlatWork tool project through KHQR, ABA, or Bakong.",
);

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogType: "website",
  ogUrl: "https://chlatwork.com/buy-me-coffee",
  ogImage: "https://chlatwork.com/images/khqr.png",
  twitterCard: "summary_large_image",
  twitterTitle: title,
  twitterDescription: description,
  twitterImage: "https://chlatwork.com/images/khqr.png",
});

useHead({
  link: [{ rel: "canonical", href: "https://chlatwork.com/buy-me-coffee" }],
});

const qrSrc = "/images/khqr.png";

const toast = reactive({ show: false, message: "" });
let toastTimer: ReturnType<typeof setTimeout> | null = null;

const showToast = (message: string) => {
  toast.message = message;
  toast.show = true;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (toast.show = false), 1400);
};

const copyLink = async () => {
  if (!process.client) return;
  await navigator.clipboard.writeText(`${location.origin}/buy-me-coffee`);
  showToast(isKhmer.value ? "បានចម្លងតំណភ្ជាប់" : "Link copied");
};
</script>

<template>
  <main class="mx-auto w-full max-w-[1440px] space-y-6">
    <header class="flex items-center gap-3">
      <div class="min-w-0">
        <h1 class="text-xl font-bold">{{ isKhmer ? "គាំទ្រ ChlatWork" : "Support ChlatWork" }}</h1>
        <p class="max-w-2xl text-sm text-gray-500 dark:text-white/55">
          {{ isKhmer
            ? "ChlatWork គឺជាគម្រោងឧបករណ៍ឯករាជ្យខ្នាតតូចមួយ។ ការគាំទ្រជួយចំណាយលើការបង្ហោះគេហទំព័រ ការធ្វើតេស្ត និងការថែទាំឧបករណ៍ឥតគិតថ្លៃក្នុង Browser។"
            : "ChlatWork is a small independent tool project. Support helps cover hosting, testing, and maintenance for free browser tools." }}
        </p>
      </div>
    </header>

    <section
      class="space-y-5 rounded-2xl bg-white p-6 shadow dark:bg-white/[0.07]"
      aria-labelledby="support-qr-title"
    >
      <div class="space-y-1">
        <h2 id="support-qr-title" class="text-lg font-semibold">
          {{ isKhmer ? "ការទូទាត់តាម KHQR" : "KHQR payment" }}
        </h2>
        <p class="text-sm text-gray-500 dark:text-white/55">
          {{ isKhmer
            ? "ស្កេនជាមួយ ABA, Bakong ឬកម្មវិធីធនាគារណាមួយដែលគាំទ្រ KHQR។"
            : "Scan with ABA, Bakong, or any KHQR-compatible banking app." }}
        </p>
      </div>

      <div class="flex justify-center">
        <img
          :src="qrSrc"
          alt="KHQR QR Code"
          class="w-72 h-72 rounded-xl border bg-white object-contain"
          loading="lazy"
        />
      </div>

      <div class="flex gap-3">
        <a
          :href="qrSrc"
          download
          class="flex-1 text-center rounded-xl bg-gray-900 text-white py-3 font-semibold hover:opacity-90"
        >
          {{ isKhmer ? "រក្សាទុក QR" : "Save QR" }}
        </a>

        <button
          class="flex-1 rounded-xl border py-3 font-semibold hover:bg-gray-100 dark:hover:bg-white/[0.08]"
          @click="copyLink"
        >
          {{ isKhmer ? "ចម្លងតំណភ្ជាប់" : "Copy link" }}
        </button>
      </div>

      <div
        class="rounded-xl bg-gray-100 p-4 text-sm text-gray-700 dark:bg-white/[0.08] dark:text-white/70"
      >
        {{ isKhmer
          ? "ប្រសិនបើការស្កេនមិនដំណើរការ សូមបង្កើនពន្លឺអេក្រង់ ឬបើករូបភាព QR ដោយផ្ទាល់មុនពេលស្កេន។"
          : "If the scan does not work, increase screen brightness or open the QR image directly before scanning." }}
      </div>
    </section>

    <Transition name="fade">
      <div
        v-if="toast.show"
        class="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 rounded-xl bg-black text-white px-4 py-2 text-sm shadow"
      >
        {{ toast.message }}
      </div>
    </Transition>
  </main>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.18s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
