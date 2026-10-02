<script setup lang="ts">
import { ArrowRight, Link2, Palette, QrCode } from "lucide-vue-next";
import LinkProfileCard from "~/components/link/LinkProfileCard.vue";
import { createLinkProfile, LINK_THEMES } from "~/lib/link-profile";
const sample = ref({
  ...createLinkProfile("Ngen Kakada"),
  slug: "kakada",
  headline: "Backend Developer",
  bio: "Building useful stuff. Sharing what I love.",
  theme: "purple",
  links: [
    { title: "My GitHub", url: "https://github.com", isEnabled: true },
    { title: "Let’s connect", url: "https://linkedin.com", isEnabled: true },
    { title: "Message me", url: "https://t.me", isEnabled: true },
    { title: "My website", url: "https://chlatwork.com", isEnabled: true },
  ],
});
useSeoMeta({
  title: "ChlatWork Link — All your links, one beautiful page",
  description:
    "Create your own public profile with custom themes, social links, a QR code, and simple analytics.",
});
</script>

<template>
  <main
    class="mx-auto grid max-w-6xl items-center gap-12 px-5 py-12 sm:px-8 lg:grid-cols-[1fr_360px] lg:py-20"
  >
    <section>
      <p
        class="mb-5 flex items-center gap-2 text-sm font-semibold text-sky-600 dark:text-cyan-300"
      >
        <Link2 :size="20" /> ChlatWork Link
      </p>
      <h1
        class="max-w-xl text-4xl font-bold leading-tight tracking-tight sm:text-6xl"
      >
        All your links.<br />One page.<br /><span
          class="text-sky-600 dark:text-cyan-300"
          >Entirely you.</span
        >
      </h1>
      <p
        class="mt-6 max-w-lg text-lg leading-relaxed text-slate-500 dark:text-white/60"
      >
        Your work, your socials, your next big thing. Give everything you share
        a beautiful home.
      </p>
      <NuxtLink
        to="/account/link"
        class="mt-8 inline-flex items-center gap-3 rounded-2xl bg-sky-600 px-6 py-4 font-semibold text-white"
        >Create your page <ArrowRight :size="19"
      /></NuxtLink>
      <p class="mt-3 text-xs text-slate-500 dark:text-white/50">
        Choose your style → Add your links → Share anywhere
      </p>
      <div class="mt-10 grid gap-4 text-sm sm:grid-cols-3">
        <p class="flex items-center gap-2">
          <Link2 :size="18" class="text-sky-500" /> Any link, any platform
        </p>
        <p class="flex items-center gap-2">
          <Palette :size="18" class="text-violet-500" /> Eight theme presets
        </p>
        <p class="flex items-center gap-2">
          <QrCode :size="18" class="text-emerald-500" /> Shareable QR code
        </p>
      </div>
      <div class="mt-10 flex flex-wrap gap-3" aria-label="Try a theme">
        <button
          v-for="theme in LINK_THEMES"
          :key="theme.id"
          type="button"
          :aria-label="`Preview ${theme.name}`"
          :aria-pressed="sample.theme === theme.id"
          class="size-9 rounded-full border-2 ring-offset-2 transition"
          :class="
            sample.theme === theme.id
              ? 'border-sky-500 ring-2 ring-sky-400'
              : 'border-slate-200'
          "
          :style="{ background: theme.background }"
          @click="
            sample.theme = theme.id;
            sample.buttonStyle = theme.id === 'glass' ? 'glass' : 'solid';
            sample.font = theme.id === 'developer' ? 'mono' : 'sans';
          "
        />
      </div>
    </section>
    <aside
      class="mx-auto w-full max-w-[360px] overflow-hidden rounded-[38px] border-[8px] border-slate-900 shadow-2xl"
      aria-label="Example profile"
    >
      <LinkProfileCard :profile="sample" preview />
    </aside>
  </main>
</template>
