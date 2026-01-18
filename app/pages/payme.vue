<template>
  <div class="min-h-screen bg-gray-50">
    <div class="mx-auto max-w-lg px-4 py-10">
      <div class="bg-white rounded-2xl shadow p-6">
        <h1 class="text-2xl font-bold">Buy me a coffee ☕</h1>
        <p class="mt-2 text-gray-600">Scan with ABA / Bakong / any KHQR app.</p>

        <!-- QR -->
        <div class="mt-6 flex justify-center">
          <img
            :src="qrSrc"
            alt="KHQR QR Code"
            class="w-72 h-72 rounded-xl border bg-white object-contain"
            loading="lazy"
          />
        </div>

        <!-- Actions -->
        <div class="mt-6 flex gap-3">
          <a
            :href="qrSrc"
            download
            class="flex-1 text-center rounded-xl bg-black text-white py-3 font-semibold hover:opacity-90"
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

        <!-- Optional note -->
        <div class="mt-6 rounded-xl bg-gray-100 p-4 text-sm text-gray-700">
          If the scan doesn’t work, try increasing screen brightness 😅
        </div>
      </div>

      <p class="mt-6 text-center text-xs text-gray-500">
        © {{ new Date().getFullYear() }} ChlatWork
      </p>
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

<script setup lang="ts">
useHead({
  title: "Buy me a coffee (KHQR) - ChlatWork",
  meta: [
    {
      name: "description",
      content: "Support ChlatWork via KHQR (ABA/Bakong).",
    },
    { property: "og:title", content: "Buy me a coffee ☕" },
    { property: "og:description", content: "Scan KHQR to support ChlatWork." },
    { property: "og:type", content: "website" },
    { property: "og:image", content: "https://chlatwork.com/images/khqr.png" },
  ],
});

const qrSrc = "/images/khqr.png";

const toast = reactive({
  show: false,
  message: "",
});

let toastTimer: ReturnType<typeof setTimeout> | null = null;

const showToast = (message: string) => {
  toast.message = message;
  toast.show = true;

  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.show = false;
  }, 1400);
};

const copyLink = async () => {
  const url = `${location.origin}/payme`;
  await navigator.clipboard.writeText(url);
  showToast("Link copied ✅");
};
</script>

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
