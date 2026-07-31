<script setup lang="ts">
import { EDITORIAL_AUTHOR, EDITORIAL_BYLINE } from "~/data/editorial-identity";
import { findPostByPath } from "~/data/posts";

const route = useRoute();
const siteUrl = "https://chlatwork.com";
const post = computed(() => findPostByPath(route.path));
const canonicalUrl = computed(() =>
  post.value ? `${siteUrl}${post.value.path}` : `${siteUrl}/posts`,
);

watchEffect(() => {
  if (!post.value) {
    throw createError({
      statusCode: 404,
      statusMessage: "Post not found",
    });
  }
});

useSeoMeta({
  title: computed(() => post.value?.title ?? "Post — ChlatWork"),
  description: computed(() => post.value?.description ?? ""),
  ogTitle: computed(() => post.value?.title ?? "Post — ChlatWork"),
  ogDescription: computed(() => post.value?.description ?? ""),
  ogType: "article",
  ogUrl: canonicalUrl,
  ogImage: `${siteUrl}/og-home.png`,
  twitterCard: "summary_large_image",
  twitterTitle: computed(() => post.value?.title ?? "Post — ChlatWork"),
  twitterDescription: computed(() => post.value?.description ?? ""),
  twitterImage: `${siteUrl}/og-home.png`,
});

useHead(() => {
  const currentPost = post.value;

  if (!currentPost) {
    return {};
  }

  return {
    link: [{ rel: "canonical", href: canonicalUrl.value }],
    script: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "NewsArticle",
          headline: currentPost.title,
          description: currentPost.description,
          datePublished: currentPost.publishedAt,
          dateModified: currentPost.updatedAt,
          mainEntityOfPage: canonicalUrl.value,
          author: {
            "@type": "Person",
            name: EDITORIAL_AUTHOR.name,
            url: `${siteUrl}${EDITORIAL_AUTHOR.profilePath}`,
          },
          publisher: {
            "@type": "Organization",
            name: "ChlatWork",
            url: siteUrl,
            logo: {
              "@type": "ImageObject",
              url: `${siteUrl}/logo.png`,
            },
          },
        }),
      },
    ],
  };
});
</script>

<template>
  <main
    v-if="post"
    class="mx-auto w-full max-w-[920px] space-y-10 text-slate-950 dark:text-white"
  >
    <header class="space-y-5">
      <NuxtLink
        to="/posts"
        class="inline-flex text-sm font-bold text-sky-700 hover:text-sky-900 dark:text-cyan-300 dark:hover:text-cyan-100"
      >
        All posts
      </NuxtLink>

      <div class="space-y-4">
        <p class="text-xs font-bold uppercase tracking-[0.18em] text-sky-700 dark:text-cyan-300">
          Daily Briefing
        </p>
        <h1 class="text-4xl font-black leading-tight sm:text-6xl">
          {{ post.title }}
        </h1>
        <p class="text-lg leading-8 text-slate-600 dark:text-white/65">
          {{ post.dek }}
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-white/50">
        <span>{{ EDITORIAL_BYLINE }}</span>
        <span aria-hidden="true">•</span>
        <time :datetime="post.publishedAt">{{ post.displayDate }}</time>
        <span aria-hidden="true">•</span>
        <span>{{ post.readingMinutes }} min read</span>
      </div>

      <div class="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-sky-950 to-cyan-800 p-7 text-white shadow-xl sm:p-10">
        <div class="grid gap-6 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <p class="text-xs font-bold uppercase tracking-[0.2em] text-cyan-200">
              AI • Software • Business • Cambodia • Markets
            </p>
            <p class="mt-4 max-w-2xl text-xl font-black leading-8 sm:text-3xl">
              Infrastructure, engineering discipline, security, and measurable
              value define today&apos;s AI landscape.
            </p>
          </div>
          <span class="text-6xl" aria-hidden="true">📰</span>
        </div>
      </div>
    </header>

    <article class="space-y-10">
      <section
        v-for="section in post.sections"
        :key="section.number"
        class="space-y-5 border-b border-slate-200 pb-10 last:border-b-0 dark:border-white/10"
      >
        <div class="flex items-start gap-4">
          <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-xl dark:bg-cyan-300/10">
            {{ section.icon }}
          </span>
          <div>
            <p class="text-xs font-bold uppercase tracking-wide text-sky-700 dark:text-cyan-300">
              {{ section.number }}. {{ section.category }}
            </p>
            <h2 class="mt-1 text-2xl font-black leading-tight sm:text-3xl">
              {{ section.title }}
            </h2>
          </div>
        </div>

        <p
          v-for="paragraph in section.paragraphs"
          :key="paragraph"
          class="text-base leading-8 text-slate-600 dark:text-white/70"
        >
          {{ paragraph }}
        </p>

        <div class="rounded-2xl border border-sky-200 bg-sky-50 p-5 dark:border-cyan-300/20 dark:bg-cyan-300/10">
          <h3 class="font-black text-sky-950 dark:text-cyan-100">
            Why it matters
          </h3>
          <ul class="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-sky-900/85 dark:text-cyan-100/80">
            <li v-for="item in section.whyItMatters" :key="item">{{ item }}</li>
          </ul>
        </div>
      </section>
    </article>

    <section class="grid gap-5 md:grid-cols-2">
      <div class="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.06]">
        <h2 class="text-xl font-black">⚡ Developer Watch</h2>
        <ul class="mt-4 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-600 dark:text-white/65">
          <li v-for="item in post.developerWatch" :key="item">{{ item }}</li>
        </ul>
      </div>

      <div class="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.06]">
        <h2 class="text-xl font-black">🔒 Security Watch</h2>
        <ul class="mt-4 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-600 dark:text-white/65">
          <li v-for="item in post.securityWatch" :key="item">{{ item }}</li>
        </ul>
      </div>
    </section>

    <section class="rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/[0.06]">
      <h2 class="text-2xl font-black">📈 Market Snapshot</h2>
      <ul class="mt-4 space-y-3">
        <li
          v-for="item in post.marketSnapshot"
          :key="item"
          class="flex gap-3 text-sm leading-7 text-slate-600 dark:text-white/65"
        >
          <span class="mt-2.5 h-2 w-2 shrink-0 rounded-full bg-sky-500" />
          <span>{{ item }}</span>
        </li>
      </ul>
    </section>

    <section class="rounded-3xl bg-slate-950 p-6 text-white sm:p-8">
      <h2 class="text-2xl font-black">Key Takeaways</h2>
      <ol class="mt-5 space-y-3">
        <li
          v-for="(item, index) in post.keyTakeaways"
          :key="item"
          class="flex gap-3 text-sm leading-7 text-white/75"
        >
          <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cyan-300 text-xs font-black text-slate-950">
            {{ index + 1 }}
          </span>
          <span>{{ item }}</span>
        </li>
      </ol>
    </section>

    <aside class="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-7 text-amber-900 dark:border-amber-300/20 dark:bg-amber-300/10 dark:text-amber-100/80">
      <strong class="font-black">Editorial note:</strong>
      {{ post.editorialNote }}
    </aside>
  </main>
</template>
