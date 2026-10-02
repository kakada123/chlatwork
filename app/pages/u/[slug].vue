<script setup lang="ts">
import { QrCode, Share2 } from "lucide-vue-next";
import LinkProfileCard from "~/components/link/LinkProfileCard.vue";
import LinkShare from "~/components/link/LinkShare.vue";
import type { LinkProfile, ProfileLink } from "~/types/link-profile";

definePageMeta({ layout: false, key: (route) => route.fullPath });
const route = useRoute();
const slug = String(route.params.slug || "");
const { data: profile, error } = await useFetch<LinkProfile>(
  `/api/public/profiles/${encodeURIComponent(slug)}`,
);
if (error.value || !profile.value)
  throw createError({
    statusCode: error.value?.statusCode || 404,
    statusMessage:
      error.value?.statusCode === 503
        ? "This page is temporarily unavailable."
        : "Profile not found.",
  });
const shareOpen = ref(false);
const publicUrl = computed(
  () => `https://chlatwork.com/u/${profile.value!.slug}`,
);
const title = computed(
  () =>
    profile.value?.seoTitle || `${profile.value?.displayName} | ChlatWork Link`,
);
const description = computed(
  () =>
    profile.value?.seoDescription ||
    profile.value?.bio ||
    profile.value?.headline ||
    `Explore ${profile.value?.displayName}’s links.`,
);
const ogImage = computed(
  () =>
    `https://chlatwork.com/api/public/profiles/${profile.value!.slug}/og-image`,
);
useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogUrl: publicUrl,
  ogImage,
  ogImageWidth: 1200,
  ogImageHeight: 630,
  ogType: "profile",
  twitterTitle: title,
  twitterDescription: description,
  twitterImage: ogImage,
  twitterCard: "summary_large_image",
  robots: "index, follow",
});
useHead(() => ({ link: [{ rel: "canonical", href: publicUrl.value }] }));
onMounted(() => {
  void $fetch(`/api/public/profiles/${profile.value!.slug}/view`, {
    method: "POST",
  }).catch(() => {});
});
function recordClick(link: ProfileLink) {
  if (!link.id) return;
  // Best-effort telemetry must never delay or block following a visitor's chosen link.
  void $fetch(
    `/api/public/profiles/${profile.value!.slug}/links/${link.id}/click`,
    { method: "POST", keepalive: true },
  ).catch(() => {});
}
</script>

<template>
  <main v-if="profile">
    <LinkProfileCard :profile="profile" @click="recordClick">
      <div class="public-share-actions">
        <button
          type="button"
          :aria-expanded="shareOpen"
          aria-controls="profile-share"
          @click="shareOpen = !shareOpen"
        >
          <Share2 :size="16" aria-hidden="true" /> Share
          <QrCode :size="16" aria-hidden="true" />
        </button>
      </div>
      <div v-if="shareOpen" id="profile-share" class="public-share-panel">
        <LinkShare :url="publicUrl" :title="profile.displayName" published />
      </div>
    </LinkProfileCard>
  </main>
</template>

<style scoped>
.public-share-actions {
  display: flex;
  justify-content: center;
  margin-top: 28px;
}
.public-share-actions button {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 10px 18px;
  border: 1px solid #94a3b850;
  border-radius: 999px;
  font-size: 13px;
}
.public-share-panel {
  margin-top: 20px;
  padding: 20px;
  border-radius: 20px;
  background: #ffffffee;
  color: #0f172a;
  text-align: left;
}
</style>
