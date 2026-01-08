<script setup lang="ts">
import { ref, watch, computed, nextTick } from "vue";
import WifiQrForm from "~/components/wifi-qr/WifiQrForm.vue";
import WifiQrPreview from "~/components/wifi-qr/WifiQrPreview.vue";

export type Security = "WPA" | "WEP" | "nopass";
export type PrintTheme = "cute" | "modern" | "minimal";
export type PosterSize = "A4" | "A5";

const ssid = ref("");
const password = ref("");
const security = ref<Security>("WPA");
const hidden = ref(false);

const payload = ref("");
const qrSvg = ref("");
const qrDataUrl = ref("");

// poster options
const printMode = ref(false);
const theme = ref<PrintTheme>("cute");
const posterSize = ref<PosterSize>("A5");
const showPassword = ref(true);
const showDontShare = ref(true);
const shopName = ref("");
const tagline = ref("");
const khmerHeadline = ref("ស្កេនដើម្បីភ្ជាប់ Wi-Fi");
const enHeadline = ref("Scan to connect to Wi-Fi");

// ✅ ref to preview component (to grab poster DOM)
const previewRef = ref<InstanceType<typeof WifiQrPreview> | null>(null);

// SEO
const title = "Wi-Fi QR Generator — ChlatWork";
const description =
  "Generate a Wi-Fi QR code for iOS + Android. Scan to connect instantly.";

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogType: "website",
  ogUrl: "https://chlatwork.com/tools/wifi-qr",
  ogImage: "https://chlatwork.com/og/wifi-qr.png",
  ogImageWidth: "1200",
  ogImageHeight: "630",
  twitterCard: "summary_large_image",
  twitterTitle: title,
  twitterDescription: description,
  twitterImage: "https://chlatwork.com/og/wifi-qr.png",
});

useHead({
  link: [{ rel: "canonical", href: "https://chlatwork.com/tools/wifi-qr" }],
});

// helpers
const escapeWifi = (v: string) => v.replace(/([\\;,:"])/g, "\\$1");

const buildWifiPayload = () => {
  const S = escapeWifi(ssid.value.trim());
  const P = escapeWifi(password.value);
  const T = security.value;
  return `WIFI:T:${T};S:${S};P:${T === "nopass" ? "" : P};H:${hidden.value};;`;
};

const displayPassword = computed(() => {
  if (security.value === "nopass") return "";
  return password.value || "";
});

const qrFileName = computed(() => {
  const safeSsid = ssid.value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_]/g, "")
    .slice(0, 32);

  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");

  return `chlatwork-wifi-${safeSsid || "qr"}-${yyyy}-${mm}-${dd}.png`;
});

const posterFileName = computed(() => {
  const safeShop = shopName.value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_]/g, "")
    .slice(0, 24);

  return `chlatwork-wifi-poster-${safeShop || "shop"}-${posterSize.value}.png`;
});

// lazy imports (SSR-safe)
const loadQRCode = async () => (await import("qrcode")).default;
const loadHtmlToImage = async () => await import("html-to-image");

// QR SVG
const generateSvg = async () => {
  payload.value = buildWifiPayload();

  if (!ssid.value.trim()) {
    qrSvg.value = "";
    qrDataUrl.value = "";
    return;
  }

  const QRCode = await loadQRCode();
  qrSvg.value = await QRCode.toString(payload.value, {
    type: "svg",
    margin: 2,
    width: 260,
  });

  qrDataUrl.value = "";
};

// QR PNG (client)
const generateQrPng = async () => {
  if (!process.client) return;
  if (!payload.value) return;

  const QRCode = await loadQRCode();
  qrDataUrl.value = await QRCode.toDataURL(payload.value, {
    width: 320,
    margin: 2,
  });
};

const copyPayload = async () => {
  if (!process.client) return;
  if (!payload.value) return;
  await navigator.clipboard.writeText(payload.value);
};

const dataUrlToFile = async (dataUrl: string, name: string) => {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], name, { type: blob.type || "image/png" });
};

const shareQrPng = async () => {
  if (!process.client) return;

  if (!qrDataUrl.value) await generateQrPng();
  if (!qrDataUrl.value) return;

  const file = await dataUrlToFile(qrDataUrl.value, qrFileName.value);

  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({
      title: "Wi-Fi QR — ChlatWork",
      text: "Scan to connect instantly.",
      files: [file],
    });
    return;
  }

  const a = document.createElement("a");
  a.href = qrDataUrl.value;
  a.download = qrFileName.value;
  a.click();
};

// ✅ poster export (works with defineExpose())
const exportPosterPng = async () => {
  if (!process.client) return;
  if (!printMode.value) return;

  await generateSvg();
  await nextTick();

  const posterEl = previewRef.value?.getPosterEl?.();
  if (!posterEl) {
    alert("Poster element not found (ref is null).");
    return;
  }

  const { toPng } = await loadHtmlToImage();

  try {
    const dataUrl = await toPng(posterEl, {
      pixelRatio: 2,
      cacheBust: true,
      backgroundColor: "#ffffff",
      // ✅ helps when fonts/svg are annoying in some browsers
      skipFonts: false,
    });

    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = posterFileName.value;
    a.click();
  } catch (err) {
    console.error(err);
    alert("Export failed. Check console for details.");
  }
};

const triggerPrint = async () => {
  await generateSvg();
  if (!process.client) return;
  window.print();
};

// update QR when inputs change
watch([ssid, password, security, hidden], generateSvg, { immediate: true });

// UX: if no password, hide password line
watch(
  () => security.value,
  (s) => {
    if (s === "nopass") showPassword.value = false;
  }
);
</script>

<template>
  <div class="mx-auto max-w-4xl px-4 py-6 space-y-4">
    <div class="flex items-center gap-3">
      <div class="h-10 w-10 rounded-2xl bg-gray-900"></div>
      <div class="min-w-0">
        <h1 class="text-xl font-bold">Wi-Fi QR Generator</h1>
        <p class="text-sm text-gray-500 truncate">
          Generate a Wi-Fi QR for iOS + Android. Scan to connect instantly.
        </p>
      </div>
    </div>

    <div class="grid gap-4 md:grid-cols-2">
      <WifiQrForm
        v-model:ssid="ssid"
        v-model:password="password"
        v-model:security="security"
        v-model:hidden="hidden"
        v-model:printMode="printMode"
        v-model:theme="theme"
        v-model:posterSize="posterSize"
        v-model:shopName="shopName"
        v-model:tagline="tagline"
        v-model:showPassword="showPassword"
        v-model:showDontShare="showDontShare"
        v-model:khmerHeadline="khmerHeadline"
        v-model:enHeadline="enHeadline"
        :payload="payload"
        :qrDataUrl="qrDataUrl"
        :qrFileName="qrFileName"
        @copy-payload="copyPayload"
        @generate-qr-png="generateQrPng"
        @share-qr="shareQrPng"
        @print-poster="triggerPrint"
        @export-poster="exportPosterPng"
      />

      <WifiQrPreview
        ref="previewRef"
        :printMode="printMode"
        :qrSvg="qrSvg"
        :ssid="ssid"
        :security="security"
        :displayPassword="displayPassword"
        :theme="theme"
        :posterSize="posterSize"
        :shopName="shopName"
        :tagline="tagline"
        :showPassword="showPassword"
        :showDontShare="showDontShare"
        :khmerHeadline="khmerHeadline"
        :enHeadline="enHeadline"
      />
    </div>
  </div>
</template>
