<script setup lang="ts">
import QRCode from "qrcode";
import { ref, watch } from "vue";

const ssid = ref("");
const password = ref("");
const security = ref<"WPA" | "WEP" | "nopass">("WPA");
const hidden = ref(false);

const qrDataUrl = ref("");
const payload = ref("");

const escapeWifi = (v: string) => v.replace(/([\\;,:"])/g, "\\$1"); // safer for weird SSID like "Cafe;Wifi"

const buildWifiPayload = () => {
  const S = escapeWifi(ssid.value.trim());
  const P = escapeWifi(password.value);
  const T = security.value;

  return `WIFI:T:${T};S:${S};P:${T === "nopass" ? "" : P};H:${hidden.value};;`;
};

const generate = async () => {
  payload.value = buildWifiPayload();

  if (!ssid.value.trim()) {
    qrDataUrl.value = "";
    return;
  }

  qrDataUrl.value = await QRCode.toDataURL(payload.value, {
    width: 320,
    margin: 2,
  });
};

watch([ssid, password, security, hidden], generate, { immediate: true });
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

        <div class="pt-2 flex gap-2">
          <button
            class="rounded-xl bg-gray-900 px-4 py-2 text-white disabled:opacity-50"
            :disabled="!qrDataUrl"
            @click="navigator.clipboard.writeText(payload)"
          >
            Copy payload
          </button>

          <a
            v-if="qrDataUrl"
            :href="qrDataUrl"
            download="wifi-qr.png"
            class="rounded-xl border px-4 py-2"
          >
            Download PNG
          </a>
        </div>
      </div>

      <!-- Preview -->
      <div
        class="rounded-2xl border bg-white p-5 shadow-sm flex flex-col items-center justify-center"
      >
        <div v-if="qrDataUrl" class="text-center space-y-3">
          <img :src="qrDataUrl" class="w-[260px] h-[260px]" />
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
