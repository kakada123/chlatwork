<script setup lang="ts">
import { ref } from "vue";
import WifiQrPoster from "~/components/wifi-qr/WifiQrPoster.vue";
import type {
  Security,
  PrintTheme,
  PosterSize,
} from "~/pages/tools/wifi-qr.vue";

const props = defineProps<{
  printMode: boolean;
  qrSvg: string;
  ssid: string;
  security: Security;
  displayPassword: string;
  theme: PrintTheme;
  posterSize: PosterSize;
  shopName: string;
  tagline: string;
  showPassword: boolean;
  showDontShare: boolean;
  khmerHeadline: string;
  enHeadline: string;
}>();

const posterComp = ref<InstanceType<typeof WifiQrPoster> | null>(null);

defineExpose({
  getPosterEl: () => posterComp.value?.getEl?.() ?? null,
});
</script>

<template>
  <div class="rounded-2xl border bg-white p-4 shadow-sm">
    <div v-if="props.printMode" class="space-y-3">
      <div class="flex items-center justify-between">
        <p class="text-sm font-semibold text-gray-900">Poster preview</p>
        <span class="text-xs text-gray-500">{{ props.posterSize }}</span>
      </div>

      <WifiQrPoster
        ref="posterComp"
        :qrSvg="props.qrSvg"
        :ssid="props.ssid"
        :security="props.security"
        :displayPassword="props.displayPassword"
        :theme="props.theme"
        :posterSize="props.posterSize"
        :shopName="props.shopName"
        :tagline="props.tagline"
        :showPassword="props.showPassword"
        :showDontShare="props.showDontShare"
        :khmerHeadline="props.khmerHeadline"
        :enHeadline="props.enHeadline"
      />
    </div>

    <div
      v-else
      class="flex flex-col items-center justify-center text-center space-y-3"
    >
      <div v-if="props.qrSvg">
        <div
          v-html="props.qrSvg"
          class="[&>svg]:w-[260px] [&>svg]:h-[260px]"
        ></div>

        <p class="text-sm text-gray-500 mt-2">
          Scan with camera → connect to
          <span class="font-semibold text-gray-900">{{ props.ssid }}</span>
        </p>
      </div>

      <p v-else class="text-sm text-gray-500">Enter SSID to generate QR</p>
    </div>
  </div>
</template>
