<script setup lang="ts">
import type {
  Security,
  PrintTheme,
  PosterSize,
} from "~/lib/wifi-qr";

const { isKhmer } = useLanguage();

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
      <label class="text-sm font-medium">{{ isKhmer ? "ឈ្មោះ Wi-Fi (SSID)" : "Wi-Fi Name (SSID)" }}</label>
      <input
        v-model="ssid"
        class="mt-1 h-11 w-full rounded-xl border px-3"
        placeholder="e.g. ChlatCafe"
      />
    </div>

    <div class="grid gap-3 sm:grid-cols-2">
      <div>
        <label class="text-sm font-medium">{{ isKhmer ? "ប្រព័ន្ធសុវត្ថិភាព" : "Security" }}</label>
        <ModernSelect
          v-model="security"
          class="mt-1 h-11 w-full rounded-xl border px-3"
        >
          <option value="WPA">WPA / WPA2</option>
          <option value="WEP">WEP</option>
          <option value="nopass">{{ isKhmer ? "គ្មានពាក្យសម្ងាត់" : "No password" }}</option>
        </ModernSelect>
      </div>

      <div>
        <label class="text-sm font-medium">{{ isKhmer ? "ពាក្យសម្ងាត់" : "Password" }}</label>
        <input
          v-model="password"
          :disabled="security === 'nopass'"
          class="mt-1 h-11 w-full rounded-xl border px-3 disabled:bg-gray-100"
          placeholder="e.g. 12345678"
        />
      </div>
    </div>

    <div class="flex flex-wrap gap-4">
      <label class="flex items-center gap-2 text-sm">
        <input type="checkbox" v-model="hidden" />
        {{ isKhmer ? "បណ្ដាញលាក់ឈ្មោះ" : "Hidden network" }}
      </label>

      <label class="flex items-center gap-2 text-sm">
        <input type="checkbox" v-model="printMode" />
        {{ isKhmer ? "ផ្ទាំង Poster សម្រាប់បោះពុម្ព" : "Print template" }}
      </label>
    </div>

    <!-- Poster options -->
    <div v-if="printMode" class="rounded-2xl border bg-gray-50 p-3 space-y-3">
      <div class="grid gap-3 sm:grid-cols-2">
        <div>
          <label class="text-sm font-medium">{{ isKhmer ? "ឈ្មោះហាង (ស្រេចចិត្ត)" : "Shop name (optional)" }}</label>
          <input
            v-model="shopName"
            class="mt-1 h-11 w-full rounded-xl border px-3"
            placeholder="e.g. ChlatCafe"
          />
        </div>

        <div>
          <label class="text-sm font-medium">{{ isKhmer ? "ពាក្យស្លោក (ស្រេចចិត្ត)" : "Tagline (optional)" }}</label>
          <input
            v-model="tagline"
            class="mt-1 h-11 w-full rounded-xl border px-3"
            placeholder="e.g. Thanks for visiting!"
          />
        </div>
      </div>

      <div class="grid gap-3 sm:grid-cols-2">
        <div>
          <label class="text-sm font-medium">{{ isKhmer ? "រចនាប័ទ្ម" : "Style" }}</label>
          <ModernSelect
            v-model="theme"
            class="mt-1 h-11 w-full rounded-xl border px-3"
          >
            <option value="cute">{{ isKhmer ? "គួរឱ្យស្រលាញ់ (Cute)" : "Cute" }}</option>
            <option value="modern">{{ isKhmer ? "ទាន់សម័យ (Modern)" : "Modern" }}</option>
            <option value="minimal">{{ isKhmer ? "សាមញ្ញ (Minimal)" : "Minimal" }}</option>
          </ModernSelect>
        </div>

        <div>
          <label class="text-sm font-medium">{{ isKhmer ? "ទំហំ Poster" : "Poster size" }}</label>
          <ModernSelect
            v-model="posterSize"
            class="mt-1 h-11 w-full rounded-xl border px-3"
          >
            <option value="A5">A5</option>
            <option value="A4">A4</option>
          </ModernSelect>
        </div>
      </div>

      <div class="grid gap-2 sm:grid-cols-2">
        <label class="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            v-model="showPassword"
            :disabled="security === 'nopass'"
          />
          {{ isKhmer ? "បង្ហាញពាក្យសម្ងាត់" : "Show password" }}
        </label>

        <label class="flex items-center gap-2 text-sm">
          <input type="checkbox" v-model="showDontShare" />
          {{ isKhmer ? "កំណត់សម្គាល់ \"ហាមចែករំលែក\"" : "“Don’t share” note" }}
        </label>
      </div>

      <div class="grid gap-3 sm:grid-cols-2">
        <div>
          <label class="text-sm font-medium">{{ isKhmer ? "ចំណងជើងភាសាខ្មែរ" : "Khmer headline" }}</label>
          <input
            v-model="khmerHeadline"
            class="mt-1 h-11 w-full rounded-xl border px-3"
          />
        </div>

        <div>
          <label class="text-sm font-medium">{{ isKhmer ? "ចំណងជើងភាសាអង់គ្លេស" : "English headline" }}</label>
          <input
            v-model="enHeadline"
            class="mt-1 h-11 w-full rounded-xl border px-3"
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
          {{ isKhmer ? "បោះពុម្ព" : "Print" }}
        </button>

        <button
          class="rounded-xl border px-4 py-2 text-sm font-semibold disabled:opacity-50"
          :disabled="!ssid.trim()"
          @click="emit('export-poster')"
        >
          {{ isKhmer ? "ទាញយក Poster" : "Export PNG" }}
        </button>
      </div>

      <!-- Template OFF -->
      <div v-else class="grid grid-cols-2 gap-2">
        <button
          class="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          :disabled="!props.payload"
          @click="emit('copy-payload')"
        >
          {{ isKhmer ? "ចម្លង" : "Copy" }}
        </button>

        <a
          v-if="props.qrDataUrl"
          :href="props.qrDataUrl"
          :download="props.qrFileName"
          class="rounded-xl border px-4 py-2 text-sm font-semibold text-center"
        >
          {{ isKhmer ? "ទាញយក" : "Download" }}
        </a>

        <button
          v-else
          class="rounded-xl border px-4 py-2 text-sm font-semibold disabled:opacity-50"
          :disabled="!ssid.trim()"
          @click="emit('generate-qr-png')"
        >
          {{ isKhmer ? "បង្កើត PNG" : "Generate PNG" }}
        </button>
      </div>

      <button
        v-if="!printMode"
        class="mt-2 w-full rounded-xl border px-4 py-2 text-sm text-gray-700 disabled:opacity-50"
        :disabled="!props.payload"
        @click="emit('share-qr')"
      >
        {{ isKhmer ? "ចែករំលែក / រក្សាទុក" : "Share / Save" }}
      </button>

      <p class="mt-2 text-xs text-gray-500">
        {{ isKhmer ? "គន្លឹះ៖ លើ iPhone ចុច Share → Save Image ដើម្បីរក្សាទុកក្នុងរូបថត។" : "Tip: On iPhone, tap Share → Save Image." }}
      </p>
    </div>
  </div>
</template>
