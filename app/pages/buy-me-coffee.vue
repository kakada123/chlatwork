<script setup lang="ts">
import { useAppI18n } from "~/composables/useAppI18n";
import { useLanguage } from "~/composables/useLanguage";

const { t } = useAppI18n();

const { isKhmer } = useLanguage();

const title = computed(() =>
  t("shared.layouts_default.support_chlat_work"),
);
const description = computed(() =>
  t("shared.pages_buy_me_coffee.support_the_chlat_work_tool_project_through_khqr_aba"),
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
  showToast(t("shared.pages_buy_me_coffee.link_copied"));
};
</script>

<template>
  <main class="mx-auto w-full max-w-[1440px] space-y-6">
    <header class="flex items-center gap-3">
      <div class="min-w-0">
        <h1 class="text-xl font-bold">{{ t("shared.layouts_default.support_chlat_work") }}</h1>
        <p class="max-w-2xl text-sm text-gray-500 dark:text-white/55">
          {{ t("shared.pages_buy_me_coffee.chlat_work_is_a_small_independent_tool_project_support") }}
        </p>
      </div>
    </header>

    <section
      class="space-y-5 rounded-2xl bg-white p-6 shadow dark:bg-white/[0.07]"
      aria-labelledby="support-qr-title"
    >
      <div class="space-y-1">
        <h2 id="support-qr-title" class="text-lg font-semibold">
          {{ t("shared.pages_buy_me_coffee.khqr_payment") }}
        </h2>
        <p class="text-sm text-gray-500 dark:text-white/55">
          {{ t("shared.pages_buy_me_coffee.scan_with_aba_bakong_or_any_khqr_compatible_banking") }}
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
          {{ t("shared.pages_buy_me_coffee.save_qr") }}
        </a>

        <button
          class="flex-1 rounded-xl border py-3 font-semibold hover:bg-gray-100 dark:hover:bg-white/[0.08]"
          @click="copyLink"
        >
          {{ t("shared.pages_buy_me_coffee.copy_link") }}
        </button>
      </div>

      <div
        class="rounded-xl bg-gray-100 p-4 text-sm text-gray-700 dark:bg-white/[0.08] dark:text-white/70"
      >
        {{ t("shared.pages_buy_me_coffee.if_the_scan_does_not_work_increase_screen_brightness") }}
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
