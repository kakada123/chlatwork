<script setup lang="ts">
import { ArrowUpRight, Link2 } from "lucide-vue-next";
import type { LinkProfile, ProfileLink } from "~/types/link-profile";
import { LINK_THEMES } from "~/lib/link-profile";
import LinkPlatformIcon from "./LinkPlatformIcon.vue";
const props = defineProps<{ profile: LinkProfile; preview?: boolean }>();
const emit = defineEmits<{ click: [link: ProfileLink] }>();
const preset = computed(
  () =>
    LINK_THEMES.find((theme) => theme.id === props.profile.theme) ??
    LINK_THEMES[0],
);
const dark = computed(() =>
  props.profile.colorMode === "preset"
    ? preset.value.dark
    : props.profile.colorMode === "dark",
);
const style = computed(() => {
  const profile = props.profile;
  let background: string = preset.value.background;
  if (profile.backgroundMode === "solid") background = profile.backgroundColor;
  if (profile.backgroundMode === "gradient")
    background = `linear-gradient(150deg, ${profile.backgroundColor}, ${profile.gradientColor})`;
  if (profile.backgroundMode === "image" && profile.backgroundUrl)
    background = `linear-gradient(${dark.value ? "#02061780, #020617b3" : "#ffffff80, #ffffffb3"}), url(${JSON.stringify(profile.backgroundUrl)}) center / cover`;
  return {
    background,
    color: dark.value ? "#f8fafc" : "#0f172a",
    fontFamily:
      profile.font === "serif"
        ? "Georgia, serif"
        : profile.font === "mono"
          ? "ui-monospace, monospace"
          : "inherit",
    "--link-radius":
      profile.radius === "pill"
        ? "999px"
        : profile.radius === "square"
          ? "4px"
          : "18px",
    "--link-accent": preset.value.accent,
    colorScheme: dark.value ? "dark" : "light",
  };
});
const links = computed(() =>
  props.profile.links.filter((link) => link.isEnabled),
);
</script>

<template>
  <div
    class="link-profile"
    :class="{ 'link-dark': dark, 'link-preview': preview }"
    :style="style"
  >
    <div class="link-content">
      <div class="link-avatar">
        <img
          v-if="profile.avatarUrl"
          :src="profile.avatarUrl"
          :alt="profile.displayName"
          referrerpolicy="no-referrer"
        />
        <span v-else aria-hidden="true">{{
          (profile.displayName || "You").slice(0, 1).toUpperCase()
        }}</span>
      </div>
      <h1>{{ profile.displayName || "Your name" }}</h1>
      <p v-if="profile.headline" class="link-headline">
        {{ profile.headline }}
      </p>
      <p v-if="profile.bio" class="link-bio">{{ profile.bio }}</p>
      <div class="link-list">
        <component
          :is="preview ? 'button' : 'a'"
          v-for="(link, index) in links"
          :key="link.id || index"
          :type="preview ? 'button' : undefined"
          :href="preview ? undefined : link.url"
          :target="/^https?:/i.test(link.url) ? '_blank' : undefined"
          rel="noopener noreferrer nofollow ugc"
          class="link-button"
          :class="`button-${profile.buttonStyle}`"
          :aria-label="`${link.title}${/^https?:/i.test(link.url) ? ' (opens in a new tab)' : ''}`"
          @click="!preview && emit('click', link)"
        >
          <LinkPlatformIcon :url="link.url" class="link-icon" /><span>{{
            link.title || "Your link"
          }}</span
          ><ArrowUpRight class="link-arrow" aria-hidden="true" />
        </component>
      </div>
      <p v-if="preview && !links.length" class="link-empty">
        Your links will appear here.
      </p>
      <slot />
      <NuxtLink v-if="profile.showBranding" to="/link" class="link-brand"
        ><Link2 :size="16" aria-hidden="true" /> Made with ChlatWork</NuxtLink
      >
    </div>
  </div>
</template>

<style scoped>
.link-profile {
  min-height: 100svh;
  width: 100%;
  padding: 64px 24px 32px;
}
.link-preview {
  min-height: 650px;
  padding: 44px 22px 28px;
}
.link-content {
  max-width: 480px;
  margin: auto;
  text-align: center;
}
.link-avatar {
  width: 96px;
  height: 96px;
  margin: 0 auto 22px;
  overflow: hidden;
  border-radius: 50%;
  background: #ffffff40;
  border: 3px solid #ffffff80;
  box-shadow: 0 8px 30px #00000012;
  display: grid;
  place-items: center;
  font-size: 36px;
}
.link-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
h1 {
  font-size: 28px;
  font-weight: 750;
  line-height: 1.25;
  overflow-wrap: anywhere;
}
.link-headline {
  margin-top: 8px;
  font-size: 15px;
  opacity: 0.8;
  overflow-wrap: anywhere;
}
.link-bio {
  margin: 18px auto 0;
  max-width: 380px;
  font-size: 14px;
  line-height: 1.7;
  white-space: pre-line;
  overflow-wrap: anywhere;
}
.link-list {
  display: grid;
  gap: 14px;
  margin-top: 32px;
}
.link-button {
  display: flex;
  align-items: center;
  gap: 16px;
  min-height: 62px;
  padding: 15px 20px;
  border: 1px solid #0f172a15;
  border-radius: var(--link-radius);
  background: #fff;
  color: #0f172a;
  box-shadow: 0 4px 16px #00000006;
  text-align: left;
  transition:
    transform 0.15s,
    box-shadow 0.15s;
}
.link-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px #00000012;
}
.link-button:focus-visible {
  outline: 3px solid var(--link-accent);
  outline-offset: 4px;
}
.link-button span {
  flex: 1;
  font-size: 15px;
  font-weight: 600;
  overflow-wrap: anywhere;
  min-width: 0;
}
.link-icon {
  width: 21px;
  height: 21px;
  flex-shrink: 0;
}
.link-arrow {
  width: 17px;
  opacity: 0.5;
  flex-shrink: 0;
}
.link-dark .link-button {
  background: #ffffff12;
  color: #f8fafc;
  border-color: #ffffff30;
}
.link-button.button-outline {
  background: transparent;
  color: inherit;
  border: 1.5px solid currentColor;
  box-shadow: none;
}
.link-button.button-glass {
  background: #ffffff55;
  color: inherit;
  border-color: #ffffff80;
  backdrop-filter: blur(16px);
}
.link-dark .link-button.button-glass {
  background: #ffffff18;
  border-color: #ffffff30;
}
.link-brand {
  margin: 36px auto 0;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 12px;
  opacity: 0.75;
}
.link-empty {
  margin-top: 36px;
  font-size: 13px;
  opacity: 0.6;
}
@media (prefers-reduced-motion: reduce) {
  .link-button {
    transition: none;
  }
  .link-button:hover {
    transform: none;
  }
}
</style>
