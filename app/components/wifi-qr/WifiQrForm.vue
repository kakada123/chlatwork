<script setup lang="ts">
import type {
  Security,
  PrintTheme,
  PosterSize,
} from "~/pages/tools/wifi-qr.vue";

const props = defineProps<{
  payload: string;
  qrDataUrl: string;
  qrFileName: string;
}>();

const emit = defineEmits<{
  (e: "copy-payload"): void;
  (e: "generate-qr-png"): void;
  (e: "share-qr"): void;
  (e: "print-poster"): void;
  (e: "export-poster"): void;
}>();

const ssid = defineModel<string>("ssid", { default: "" });
const password = defineModel<string>("password", { default: "" });
const security = defineModel<Security>("security", { default: "WPA" });
const hidden = defineModel<boolean>("hidden", { default: false });

const printMode = defineModel<boolean>("printMode", { default: false });
const theme = defineModel<PrintTheme>("theme", { default: "cute" });
const posterSize = defineModel<PosterSize>("posterSize", { default: "A5" });

const showPassword = defineModel<boolean>("showPassword", { default: true });
const showDontShare = defineModel<boolean>("showDontShare", { default: true });

const shopName = defineModel<string>("shopName", { default: "" });
const tagline = defineModel<string>("tagline", { default: "" });

const khmerHeadline = defineModel<string>("khmerHeadline", {
  default: "ស្កេនដើម្បីភ្ជាប់ Wi-Fi",
});
const enHeadline = defineModel<string>("enHeadline", {
  default: "Scan to connect to Wi-Fi",
});
</script>

<template>
  <div class="space-y-3 rounded-2xl border bg-white p-4 shadow-sm">
    <div>
      <label class="text-sm font-medium">Wi-Fi Name (SSID)</label>
      <input
        v-model="ssid"
        class="mt-1 w-full rounded-xl border px-3 py-2"
        placeholder="e.g. ChlatCafe"
      />
    </div>

    <div class="grid gap-3 sm:grid-cols-2">
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
    </div>

    <div class="flex flex-wrap gap-4">
      <label class="flex items-center gap-2 text-sm">
        <input type="checkbox" v-model="hidden" />
        Hidden network
      </label>

      <label class="flex items-center gap-2 text-sm">
        <input type="checkbox" v-model="printMode" />
        Print template
      </label>
    </div>

    <!-- Poster options -->
    <div v-if="printMode" class="rounded-2xl border bg-gray-50 p-3 space-y-3">
      <div class="grid gap-3 sm:grid-cols-2">
        <div>
          <label class="text-sm font-medium">Shop name (optional)</label>
          <input
            v-model="shopName"
            class="mt-1 w-full rounded-xl border px-3 py-2"
            placeholder="e.g. ChlatCafe"
          />
        </div>

        <div>
          <label class="text-sm font-medium">Tagline (optional)</label>
          <input
            v-model="tagline"
            class="mt-1 w-full rounded-xl border px-3 py-2"
            placeholder="e.g. Thanks for visiting!"
          />
        </div>
      </div>

      <div class="grid gap-3 sm:grid-cols-2">
        <div>
          <label class="text-sm font-medium">Style</label>
          <select
            v-model="theme"
            class="mt-1 w-full rounded-xl border px-3 py-2"
          >
            <option value="cute">Cute</option>
            <option value="modern">Modern</option>
            <option value="minimal">Minimal</option>
          </select>
        </div>

        <div>
          <label class="text-sm font-medium">Poster size</label>
          <select
            v-model="posterSize"
            class="mt-1 w-full rounded-xl border px-3 py-2"
          >
            <option value="A5">A5</option>
            <option value="A4">A4</option>
          </select>
        </div>
      </div>

      <div class="grid gap-2 sm:grid-cols-2">
        <label class="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            v-model="showPassword"
            :disabled="security === 'nopass'"
          />
          Show password
        </label>

        <label class="flex items-center gap-2 text-sm">
          <input type="checkbox" v-model="showDontShare" />
          “Don’t share” note
        </label>
      </div>

      <div class="grid gap-3 sm:grid-cols-2">
        <div>
          <label class="text-sm font-medium">Khmer headline</label>
          <input
            v-model="khmerHeadline"
            class="mt-1 w-full rounded-xl border px-3 py-2"
          />
        </div>

        <div>
          <label class="text-sm font-medium">English headline</label>
          <input
            v-model="enHeadline"
            class="mt-1 w-full rounded-xl border px-3 py-2"
          />
        </div>
      </div>
    </div>

    <!-- ✅ Actions (clean + minimal) -->
    <div class="pt-1">
      <!-- Template ON -->
      <div v-if="printMode" class="grid grid-cols-2 gap-2">
        <button
          class="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          :disabled="!ssid.trim()"
          @click="emit('print-poster')"
        >
          Print
        </button>

        <button
          class="rounded-xl border px-4 py-2 text-sm font-semibold disabled:opacity-50"
          :disabled="!ssid.trim()"
          @click="emit('export-poster')"
        >
          Export PNG
        </button>
      </div>

      <!-- Template OFF -->
      <div v-else class="grid grid-cols-2 gap-2">
        <button
          class="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          :disabled="!props.payload"
          @click="emit('copy-payload')"
        >
          Copy
        </button>

        <a
          v-if="props.qrDataUrl"
          :href="props.qrDataUrl"
          :download="props.qrFileName"
          class="rounded-xl border px-4 py-2 text-sm font-semibold text-center"
        >
          Download
        </a>

        <button
          v-else
          class="rounded-xl border px-4 py-2 text-sm font-semibold disabled:opacity-50"
          :disabled="!ssid.trim()"
          @click="emit('generate-qr-png')"
        >
          Generate PNG
        </button>
      </div>

      <button
        v-if="!printMode"
        class="mt-2 w-full rounded-xl border px-4 py-2 text-sm text-gray-700 disabled:opacity-50"
        :disabled="!props.payload"
        @click="emit('share-qr')"
      >
        Share / Save
      </button>

      <p class="mt-2 text-xs text-gray-500">
        Tip: On iPhone, tap <b>Share</b> → <b>Save Image</b>.
      </p>
    </div>
  </div>
</template>
