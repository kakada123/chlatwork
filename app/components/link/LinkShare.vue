<script setup lang="ts">
import { useAppI18n } from "~/composables/useAppI18n";
import { useProductCopy } from "~/composables/useProductCopy";
import { Copy, Download, Share2, ExternalLink } from "lucide-vue-next";
import { useLanguage } from "~/composables/useLanguage";

const { t } = useAppI18n();

const { productText } = useProductCopy();

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
    error.value = t("products.links.could_not_create_the_qr_code_please_try_again");
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
    message.value = t("products.links.link_copied_alternative");
  } catch {
    error.value = t("products.links.could_not_copy_select_the_url_and_copy_it_manually_alternative");
  }
}
async function share() {
  error.value = "";
  if (!navigator.share) return copyUrl();
  try {
    await navigator.share({ title: props.title, url: props.url });
  } catch (err) {
    if ((err as Error).name !== "AbortError")
      error.value = t("products.links.could_not_share_this_page_try_copying_the_url_alternative");
  }
}
</script>

<template>
  <div class="link-share">
    <p v-if="!published">
      {{ t("products.links.publish_your_page_to_enable_sharing_and_qr_download") }}
    </p>
    <template v-else>
      <label class="share-url-label"
        >{{ t("products.links.your_public_page") }}<input
          :value="url"
          readonly
          :aria-label="t(&quot;products.links.public_profile_url&quot;)"
          @focus="($event.target as HTMLInputElement).select()"
      /></label>
      <div class="share-actions">
        <button type="button" @click="copyUrl">
          <Copy :size="16" aria-hidden="true" /> {{ t("products.links.copy_link") }}
        </button>
        <button type="button" @click="share">
          <Share2 :size="16" aria-hidden="true" /> {{ t("products.common.share") }}
        </button>
        <a :href="url" target="_blank" rel="noopener noreferrer"
          ><ExternalLink :size="16" aria-hidden="true" /> {{ t("products.links.open_page") }}</a
        >
      </div>
      <img
        v-if="qr"
        :src="qr"
        class="share-qr"
        :alt="t(&quot;products.links.qr_code_for_this_profile&quot;)"
        width="220"
        height="220"
      />
      <a
        v-if="qr"
        :href="qr"
        download="chlatwork-link-qr.png"
        class="share-download"
        ><Download :size="16" aria-hidden="true" /> {{ t("products.links.download_qr_code") }}</a
      >
    </template>
    <p v-if="message" role="status">{{ message }}</p>
    <p v-if="error" role="alert">{{ productText(error) }}</p>
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
