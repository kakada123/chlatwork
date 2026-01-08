<script setup lang="ts">
import { ref, watch, computed } from "vue";

type Security = "WPA" | "WEP" | "nopass";

const ssid = ref("");
const password = ref("");
const security = ref<Security>("WPA");
const hidden = ref(false);

const payload = ref("");
const qrSvg = ref(""); // ✅ SSR-safe preview
const qrDataUrl = ref(""); // ✅ client-only PNG export

// ✅ SEO meta (SSR)
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

const escapeWifi = (v: string) => v.replace(/([\\;,:"])/g, "\\$1"); // safer for weird SSID like "Cafe;Wifi"

const buildWifiPayload = () => {
  const S = escapeWifi(ssid.value.trim());
  const P = escapeWifi(password.value);
  const T = security.value;

  return `WIFI:T:${T};S:${S};P:${T === "nopass" ? "" : P};H:${hidden.value};;`;
};

// ✅ nicer filename so it’s searchable in Downloads
const fileName = computed(() => {
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

// ✅ lazy import so SSR won't freak out
const loadQRCode = async () => (await import("qrcode")).default;

// ✅ SSR-friendly generator (SVG)
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

  // reset png export when values change
  qrDataUrl.value = "";
};

// ✅ client-only PNG export
const generatePng = async () => {
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

// helper: dataURL -> File
const dataUrlToFile = async (dataUrl: string, name: string) => {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], name, { type: blob.type || "image/png" });
};

// ✅ Share PNG (best for Save to Photos/Gallery)
const sharePng = async () => {
  if (!process.client) return;

  // ensure we have png
  if (!qrDataUrl.value) await generatePng();
  if (!qrDataUrl.value) return;

  const file = await dataUrlToFile(qrDataUrl.value, fileName.value);

  // Web Share API (mobile)
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({
      title: "Wi-Fi QR — ChlatWork",
      text: "Scan to connect instantly.",
      files: [file],
    });
    return;
  }

  // fallback: just download
  const a = document.createElement("a");
  a.href = qrDataUrl.value;
  a.download = fileName.value;
  a.click();
};

watch([ssid, password, security, hidden], generateSvg, { immediate: true });
</script>

<template>
  <div class="mx-auto max-w-3xl px-4 py-8">
    <div class="flex items-center gap-3 mb-6">
      <div class="h-10 w-10 rounded-2xl bg-gray-900"></div>
      <div>
        <h1 class="text-xl font-bold">Wi-Fi QR Generator</h1>
        <p class="text-sm text-gray-500">
          Scan to connect instantly (iOS + Android).
        </p>
      </div>
    </div>

    <div class="grid gap-6 md:grid-cols-2">
      <!-- Form -->
      <div class="space-y-4 rounded-2xl border bg-white p-5 shadow-sm">
        <div>
          <label class="text-sm font-medium">Wi-Fi Name (SSID)</label>
          <input
            v-model="ssid"
            class="mt-1 w-full rounded-xl border px-3 py-2"
            placeholder="e.g. ChlatCafe"
          />
        </div>

        <div>
          <label class="text-sm font-medium">Security</label>
          <select
            v-model="security"
            class="mt-1 w-full rounded-xl border px-3 py-2"
          >
            <option value="WPA">WPA / WPA2</option>
            <option value="WEP">WEP</option>
            <option value="nopass">No password</option>
          </select>
        </div>

        <div>
          <label class="text-sm font-medium">Password</label>
          <input
            v-model="password"
            :disabled="security === 'nopass'"
            class="mt-1 w-full rounded-xl border px-3 py-2 disabled:bg-gray-100"
            placeholder="e.g. 12345678"
          />
        </div>

        <label class="flex items-center gap-2 text-sm">
          <input type="checkbox" v-model="hidden" />
          Hidden network
        </label>

        <div class="pt-2 flex flex-wrap gap-2">
          <button
            class="rounded-xl bg-gray-900 px-4 py-2 text-white disabled:opacity-50"
            :disabled="!payload"
            @click="copyPayload"
          >
            Copy payload
          </button>

          <button
            class="rounded-xl border px-4 py-2 disabled:opacity-50"
            :disabled="!payload"
            @click="generatePng"
          >
            Generate PNG
          </button>

          <a
            v-if="qrDataUrl"
            :href="qrDataUrl"
            :download="fileName"
            class="rounded-xl border px-4 py-2"
          >
            Download PNG
          </a>

          <button
            class="rounded-xl border px-4 py-2 disabled:opacity-50"
            :disabled="!payload"
            @click="sharePng"
          >
            Share / Save to Photos
          </button>
        </div>

        <p class="text-xs text-gray-500">
          Tip: On iPhone, tap <b>Share</b> → <b>Save Image</b> to store it in
          Photos.
        </p>
      </div>

      <!-- Preview -->
      <div
        class="rounded-2xl border bg-white p-5 shadow-sm flex flex-col items-center justify-center"
      >
        <div v-if="qrSvg" class="text-center space-y-3">
          <div v-html="qrSvg" class="[&>svg]:w-[260px] [&>svg]:h-[260px]"></div>

          <p class="text-sm text-gray-500">
            Scan with camera → connect to
            <span class="font-semibold text-gray-900">{{ ssid }}</span>
          </p>
        </div>

        <p v-else class="text-sm text-gray-500">Enter SSID to generate QR</p>
      </div>
    </div>
  </div>
</template>
