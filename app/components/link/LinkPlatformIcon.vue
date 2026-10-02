<script setup lang="ts">
import { Globe, Mail, Phone } from "lucide-vue-next";
import {
  siInstagram,
  siFacebook,
  siTiktok,
  siYoutube,
  siTelegram,
  siGithub,
  siX,
  siDiscord,
  siWhatsapp,
} from "simple-icons";
import { getLinkPlatform } from "~/lib/link-profile";
const props = defineProps<{ url: string }>();
const platform = computed(() => getLinkPlatform(props.url));
const icons = {
  instagram: siInstagram,
  facebook: siFacebook,
  tiktok: siTiktok,
  youtube: siYoutube,
  telegram: siTelegram,
  github: siGithub,
  x: siX,
  discord: siDiscord,
  whatsapp: siWhatsapp,
};
const icon = computed(() => icons[platform.value as keyof typeof icons]);
</script>

<template>
  <svg v-if="icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path :d="icon.path" />
  </svg>
  <svg
    v-else-if="platform === 'linkedin'"
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <rect x="3" y="9" width="4" height="12" rx=".5" />
    <circle cx="5" cy="5" r="2" />
    <path d="M10 9h4v2c1-2 7-3 7 4v6h-4v-6c0-3-3-3-3 0v6h-4Z" />
  </svg>
  <Mail v-else-if="platform === 'email'" aria-hidden="true" />
  <Phone v-else-if="platform === 'phone'" aria-hidden="true" />
  <Globe v-else aria-hidden="true" />
</template>
