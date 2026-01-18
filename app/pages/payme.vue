<script setup lang="ts">
const title = "Buy me a coffee — ChlatWork";
const description = "Support ChlatWork via KHQR (ABA/Bakong).";

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogType: "website",
  ogUrl: "https://chlatwork.com/payme",
  ogImage: "https://chlatwork.com/images/khqr.png",
  twitterCard: "summary_large_image",
  twitterTitle: title,
  twitterDescription: description,
  twitterImage: "https://chlatwork.com/images/khqr.png",
});

useHead({
  link: [{ rel: "canonical", href: "https://chlatwork.com/payme" }],
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
  const url = `${location.origin}/payme`;
  await navigator.clipboard.writeText(url);
  showToast("Link copied ✅");
};
</script>

<template>
  <div class="mx-auto max-w-4xl px-4 py-6 space-y-4">
    <!-- Tool header (same vibe as other tools) -->
    <div class="flex items-center gap-3">
      <div class="h-10 w-10 rounded-2xl bg-gray-900" />
      <div class="min-w-0">
        <h1 class="text-xl font-bold">Buy me a coffee</h1>
        <p class="text-sm text-gray-500 truncate">
          Scan with ABA / Bakong / any KHQR app.
        </p>
      </div>
    </div>

    <div class="grid gap-4 md:grid-cols-2">
      <!-- Left: actions -->
      <div class="bg-white rounded-2xl shadow p-6 space-y-4">
        <div class="rounded-xl bg-gray-50 p-4 text-sm text-gray-700">
          Thanks for supporting ChlatWork ☕💛
        </div>

        <div class="flex gap-3">
          <a
            :href="qrSrc"
            download
            class="flex-1 text-center rounded-xl bg-gray-900 text-white py-3 font-semibold hover:opacity-90"
          >
            Save QR
          </a>

          <button
            class="flex-1 rounded-xl border py-3 font-semibold hover:bg-gray-100"
            @click="copyLink"
          >
            Copy link
          </button>
        </div>

        <div class="rounded-xl bg-gray-100 p-4 text-sm text-gray-700">
          If scan is blurry, try increasing screen brightness 😅
        </div>
      </div>

      <!-- Right: QR preview -->
      <div class="bg-white rounded-2xl shadow p-6">
        <div class="flex justify-center">
          <img
            :src="qrSrc"
            alt="KHQR QR Code"
            class="w-72 h-72 rounded-xl border bg-white object-contain"
            loading="lazy"
          />
        </div>
      </div>
    </div>

    <!-- ✅ Toast -->
    <Transition name="fade">
      <div
        v-if="toast.show"
        class="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 rounded-xl bg-black text-white px-4 py-2 text-sm shadow"
      >
        {{ toast.message }}
      </div>
    </Transition>
  </div>
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
