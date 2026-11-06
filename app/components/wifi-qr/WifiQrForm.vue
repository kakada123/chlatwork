<script setup lang="ts">
import { translateMessage } from "~/lib/i18n";
import { useAppI18n } from "~/composables/useAppI18n";
import type {
  Security,
  PrintTheme,
  PosterSize,
} from "~/lib/wifi-qr";

const { t } = useAppI18n();

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
  default: () => translateMessage("km", "tools.wifiQr.poster.headlineKhmer"),
});
const enHeadline = defineModel<string>("enHeadline", {
  default: () => translateMessage("en", "tools.wifiQr.poster.headlineEnglish"),
});
</script>

<template>
  <div class="space-y-3 rounded-2xl border bg-white p-4 shadow-sm">
    <div>
      <label class="text-sm font-medium">{{ t("tools.wifiQr.wiFiNameSsid") }}</label>
      <input
        v-model="ssid"
        class="mt-1 h-11 w-full rounded-xl border px-3"
        :placeholder="t(&quot;tools.wifiQr.eGChlatCafe&quot;)"
      />
    </div>

    <div class="grid gap-3 sm:grid-cols-2">
      <div>
        <label class="text-sm font-medium">{{ t("tools.wifiQr.security") }}</label>
        <ModernSelect
          v-model="security"
          class="mt-1 h-11 w-full rounded-xl border px-3"
        >
          <option value="WPA">WPA / WPA2</option>
          <option value="WEP">WEP</option>
          <option value="nopass">{{ t("tools.wifiQr.noPassword") }}</option>
        </ModernSelect>
      </div>

      <div>
        <label class="text-sm font-medium">{{ t("tools.wifiQr.password") }}</label>
        <input
          v-model="password"
          :disabled="security === 'nopass'"
          class="mt-1 h-11 w-full rounded-xl border px-3 disabled:bg-gray-100"
          :placeholder="t(&quot;tools.wifiQr.eG12345678&quot;)"
        />
      </div>
    </div>

    <div class="flex flex-wrap gap-4">
      <label class="flex items-center gap-2 text-sm">
        <input type="checkbox" v-model="hidden" />
        {{ t("tools.wifiQr.hiddenNetwork") }}
      </label>

      <label class="flex items-center gap-2 text-sm">
        <input type="checkbox" v-model="printMode" />
        {{ t("tools.wifiQr.printTemplate") }}
      </label>
    </div>

    <!-- Poster options -->
    <div v-if="printMode" class="rounded-2xl border bg-gray-50 p-3 space-y-3">
      <div class="grid gap-3 sm:grid-cols-2">
        <div>
          <label class="text-sm font-medium">{{ t("tools.wifiQr.shopNameOptional") }}</label>
          <input
            v-model="shopName"
            class="mt-1 h-11 w-full rounded-xl border px-3"
            :placeholder="t(&quot;tools.wifiQr.eGChlatCafe&quot;)"
          />
        </div>

        <div>
          <label class="text-sm font-medium">{{ t("tools.wifiQr.taglineOptional") }}</label>
          <input
            v-model="tagline"
            class="mt-1 h-11 w-full rounded-xl border px-3"
            :placeholder="t(&quot;tools.wifiQr.eGThanksForVisiting&quot;)"
          />
        </div>
      </div>

      <div class="grid gap-3 sm:grid-cols-2">
        <div>
          <label class="text-sm font-medium">{{ t("tools.wifiQr.style") }}</label>
          <ModernSelect
            v-model="theme"
            class="mt-1 h-11 w-full rounded-xl border px-3"
          >
            <option value="cute">{{ t("tools.wifiQr.cute") }}</option>
            <option value="modern">{{ t("tools.wifiQr.modern") }}</option>
            <option value="minimal">{{ t("tools.wifiQr.minimal") }}</option>
          </ModernSelect>
        </div>

        <div>
          <label class="text-sm font-medium">{{ t("tools.wifiQr.posterSize") }}</label>
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
          {{ t("tools.wifiQr.showPassword") }}
        </label>

        <label class="flex items-center gap-2 text-sm">
          <input type="checkbox" v-model="showDontShare" />
          {{ t("tools.wifiQr.donTShareNote") }}
        </label>
      </div>

      <div class="grid gap-3 sm:grid-cols-2">
        <div>
          <label class="text-sm font-medium">{{ t("tools.wifiQr.khmerHeadline") }}</label>
          <input
            v-model="khmerHeadline"
            class="mt-1 h-11 w-full rounded-xl border px-3"
          />
        </div>

        <div>
          <label class="text-sm font-medium">{{ t("tools.wifiQr.englishHeadline") }}</label>
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
          {{ t("tools.wifiQr.print") }}
        </button>

        <button
          class="rounded-xl border px-4 py-2 text-sm font-semibold disabled:opacity-50"
          :disabled="!ssid.trim()"
          @click="emit('export-poster')"
        >
          {{ t("tools.wifiQr.exportPng") }}
        </button>
      </div>

      <!-- Template OFF -->
      <div v-else class="grid grid-cols-2 gap-2">
        <button
          class="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          :disabled="!props.payload"
          @click="emit('copy-payload')"
        >
          {{ t("tools.wifiQr.copy") }}
        </button>

        <a
          v-if="props.qrDataUrl"
          :href="props.qrDataUrl"
          :download="props.qrFileName"
          class="rounded-xl border px-4 py-2 text-sm font-semibold text-center"
        >
          {{ t("tools.wifiQr.download") }}
        </a>

        <button
          v-else
          class="rounded-xl border px-4 py-2 text-sm font-semibold disabled:opacity-50"
          :disabled="!ssid.trim()"
          @click="emit('generate-qr-png')"
        >
          {{ t("tools.wifiQr.generatePng") }}
        </button>
      </div>

      <button
        v-if="!printMode"
        class="mt-2 w-full rounded-xl border px-4 py-2 text-sm text-gray-700 disabled:opacity-50"
        :disabled="!props.payload"
        @click="emit('share-qr')"
      >
        {{ t("tools.wifiQr.shareSave") }}
      </button>

      <p class="mt-2 text-xs text-gray-500">
        {{ t("tools.wifiQr.tipOnIPhoneTapShareSaveImage") }}
      </p>
    </div>
  </div>
</template>
