<script setup lang="ts">
import { Copy, Download, Share2, ExternalLink } from "lucide-vue-next";
import { useLanguage } from "~/composables/useLanguage";

const { isKhmer } = useLanguage();
const props = defineProps<{ url: string; title: string; published: boolean }>();
const qr = ref("");
const message = ref("");
const error = ref("");
let qrRevision = 0;
async function generateQr() {
  const revision = ++qrRevision;
  qr.value = "";
  if (!props.url || !props.published) return;
  try {
    const QRCode = await import("qrcode");
    const data = await QRCode.toDataURL(props.url, {
      width: 640,
      margin: 3,
      errorCorrectionLevel: "M",
      color: { dark: "#0f172a", light: "#ffffff" },
    });
    if (revision === qrRevision) qr.value = data;
  } catch {
    error.value = isKhmer.value ? "មិនអាចបង្កើតកូដ QR បានទេ។ សូមព្យាយាមម្តងទៀត។" : "Could not create the QR code. Please try again.";
  }
}
onMounted(() => {
  void generateQr();
});
watch(
  () => [props.url, props.published],
  () => {
    if (import.meta.client) void generateQr();
  },
);
async function copyUrl() {
  error.value = "";
  try {
    await navigator.clipboard.writeText(props.url);
    message.value = isKhmer.value ? "បានចម្លងតំណភ្ជាប់។" : "Link copied.";
  } catch {
    error.value = isKhmer.value ? "មិនអាចចម្លងបានទេ។ សូមជ្រើសរើស URL ហើយចម្លងដោយផ្ទាល់ដៃ។" : "Could not copy. Select the URL and copy it manually.";
  }
}
async function share() {
  error.value = "";
  if (!navigator.share) return copyUrl();
  try {
    await navigator.share({ title: props.title, url: props.url });
  } catch (err) {
    if ((err as Error).name !== "AbortError")
      error.value = isKhmer.value ? "មិនអាចចែករំលែកទំព័រនេះបានទេ។ សូមសាកល្បងចម្លង URL។" : "Could not share this page. Try copying the URL.";
  }
}
</script>

<template>
  <div class="link-share">
    <p v-if="!published">
      {{ isKhmer ? "បោះផ្សាយទំព័ររបស់អ្នកដើម្បីអាចចែករំលែក និងទាញយក QR បាន។" : "Publish your page to enable sharing and QR download." }}
    </p>
    <template v-else>
      <label class="share-url-label"
        >{{ isKhmer ? "ទំព័រសាធារណៈរបស់អ្នក" : "Your public page" }}<input
          :value="url"
          readonly
          :aria-label="isKhmer ? 'URL ប្រវត្តិរូបសាធារណៈ' : 'Public profile URL'"
          @focus="($event.target as HTMLInputElement).select()"
      /></label>
      <div class="share-actions">
        <button type="button" @click="copyUrl">
          <Copy :size="16" aria-hidden="true" /> {{ isKhmer ? "ចម្លងតំណភ្ជាប់" : "Copy link" }}
        </button>
        <button type="button" @click="share">
          <Share2 :size="16" aria-hidden="true" /> {{ isKhmer ? "ចែករំលែក" : "Share" }}
        </button>
        <a :href="url" target="_blank" rel="noopener noreferrer"
          ><ExternalLink :size="16" aria-hidden="true" /> {{ isKhmer ? "បើកទំព័រ" : "Open page" }}</a
        >
      </div>
      <img
        v-if="qr"
        :src="qr"
        class="share-qr"
        :alt="isKhmer ? 'កូដ QR សម្រាប់ប្រវត្តិរូបនេះ' : 'QR code for this profile'"
        width="220"
        height="220"
      />
      <a
        v-if="qr"
        :href="qr"
        download="chlatwork-link-qr.png"
        class="share-download"
        ><Download :size="16" aria-hidden="true" /> {{ isKhmer ? "ទាញយកកូដ QR" : "Download QR code" }}</a
      >
    </template>
    <p v-if="message" role="status">{{ message }}</p>
    <p v-if="error" role="alert">{{ error }}</p>
  </div>
</template>

<style scoped>
.link-share {
  display: grid;
  gap: 18px;
  font-size: 14px;
}
.share-url-label {
  display: grid;
  gap: 8px;
  font-weight: 600;
}
input {
  width: 100%;
  padding: 12px;
  border: 1px solid #94a3b850;
  border-radius: 12px;
  background: transparent;
  color: inherit;
  font-weight: 400;
}
.share-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.share-actions button,
.share-actions a,
.share-download {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid #94a3b850;
  font-weight: 600;
}
.share-qr {
  background: white;
  border-radius: 18px;
  margin: 0 auto;
}
.share-download {
  justify-self: center;
}
</style>
