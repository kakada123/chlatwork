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
    <header class="space-y-3">
      <p class="text-xs font-bold uppercase tracking-[0.18em] text-sky-700 dark:text-cyan-300">
        ChlatWork Posts
      </p>
      <h1 class="text-3xl font-black text-slate-950 dark:text-white sm:text-5xl">
        Technology and business briefings
      </h1>
      <p class="max-w-3xl text-base leading-7 text-slate-600 dark:text-white/65">
        Editorial updates on AI, software engineering, security, startups,
        Cambodia&apos;s digital economy, and financial-market themes.
      </p>
    </header>

    <section class="grid gap-5">
      <NuxtLink
        v-for="post in POSTS"
        :key="post.slug"
        :to="post.path"
        class="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-lg dark:border-white/10 dark:bg-white/[0.06] dark:hover:bg-white/[0.10]"
      >
        <img
          :src="post.imagePath"
          :alt="post.imageAlt"
          class="mb-5 aspect-[1200/630] w-full rounded-2xl object-cover"
          width="1200"
          height="630"
          loading="eager"
          decoding="async"
        />
        <div class="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-white/50">
          <time :datetime="post.publishedAt">{{ post.displayDate }}</time>
          <span aria-hidden="true">•</span>
          <span>{{ post.readingMinutes }} min read</span>
        </div>
        <h2 class="mt-3 text-2xl font-black text-slate-950 transition group-hover:text-sky-700 dark:text-white dark:group-hover:text-cyan-200">
          {{ post.title }}
        </h2>
        <p class="mt-3 max-w-3xl text-sm leading-7 text-slate-600 dark:text-white/65">
          {{ post.description }}
        </p>
        <span class="mt-5 inline-flex text-sm font-bold text-sky-700 dark:text-cyan-300">
          Read briefing →
        </span>
      </NuxtLink>
    </section>
  </main>
</template>
