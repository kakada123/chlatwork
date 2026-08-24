<script setup lang="ts">
import { POSTS } from "~/data/posts";

const title = "ChlatWork Posts — Technology and Business Briefings";
const description =
  "ChlatWork editorial posts covering AI, software development, business, Cambodia's technology ecosystem, security, and markets.";

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogType: "website",
  ogUrl: "https://chlatwork.com/posts",
  twitterCard: "summary_large_image",
  twitterTitle: title,
  twitterDescription: description,
});

useHead({
  link: [{ rel: "canonical", href: "https://chlatwork.com/posts" }],
});
</script>

<template>
  <main class="mx-auto w-full max-w-[1120px] space-y-8">
    <header class="border-b border-slate-200 pb-5 dark:border-white/10">
      <h1 class="text-3xl font-black text-slate-950 dark:text-white sm:text-4xl">Posts</h1>
      <p class="mt-2 text-xs text-slate-500 dark:text-white/50">{{ POSTS.length }} briefings</p>
    </header>

    <section class="grid gap-5">
      <NuxtLink
        v-for="post in POSTS"
        :key="post.slug"
        :to="post.path"
        class="group grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 transition-colors hover:border-sky-400 hover:bg-sky-50/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-white/10 dark:bg-white/[0.05] dark:hover:border-cyan-300/40 dark:hover:bg-white/[0.08] sm:grid-cols-[220px_1fr] sm:items-center"
      >
        <img
          :src="post.imagePath"
          :alt="post.imageAlt"
          class="aspect-[1200/630] w-full rounded-xl object-cover"
          width="1200"
          height="630"
          loading="eager"
          decoding="async"
        />
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-white/50">
            <time :datetime="post.publishedAt">{{ post.displayDate }}</time>
            <span aria-hidden="true">•</span>
            <span>{{ post.readingMinutes }} min read</span>
          </div>
          <h2 class="mt-2 text-xl font-black text-slate-950 transition group-hover:text-sky-700 dark:text-white dark:group-hover:text-cyan-200">
            {{ post.title }}
          </h2>
          <span class="mt-3 inline-flex text-sm font-bold text-sky-700 dark:text-cyan-300">
            Read briefing →
          </span>
        </div>
      </NuxtLink>
    </section>
  </main>
</template>
