<script setup lang="ts">
import {
  findToolDirectoryCategoryBySlug,
  getToolsForDirectoryCategory,
} from "~/data/tool-categories";
import { TOOL_ICON_CLASSES, TOOL_ICON_PATHS } from "~/lib/tool-registry";

const route = useRoute();
const siteUrl = "https://chlatwork.com";
const categorySlug = computed(() => String(route.params.categorySlug ?? ""));
const category = computed(() =>
  findToolDirectoryCategoryBySlug(categorySlug.value),
);
const tools = computed(() =>
  category.value ? getToolsForDirectoryCategory(category.value) : [],
);
const pageTitle = computed(() =>
  category.value ? `${category.value.title} - ChlatWork` : "Tools - ChlatWork",
);
const pageDescription = computed(() => category.value?.description ?? "");
const canonicalUrl = computed(() =>
  category.value ? `${siteUrl}${category.value.path}` : `${siteUrl}/tools`,
);

watchEffect(() => {
  if (!category.value) {
    throw createError({
      statusCode: 404,
      statusMessage: "Tool category not found",
    });
  }
});

useSeoMeta({
  title: pageTitle,
  description: pageDescription,
  ogTitle: pageTitle,
  ogDescription: pageDescription,
  ogType: "website",
  ogUrl: canonicalUrl,
  twitterCard: "summary_large_image",
  twitterTitle: pageTitle,
  twitterDescription: pageDescription,
});

useHead(() => ({
  link: [{ rel: "canonical", href: canonicalUrl.value }],
  script: [
    {
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Tools",
            item: `${siteUrl}/tools`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: category.value?.title ?? "Tool Category",
            item: canonicalUrl.value,
          },
        ],
      }),
    },
  ],
}));
</script>

<template>
  <main v-if="category" class="mx-auto w-full max-w-[1440px] space-y-8">
    <header class="space-y-3">
      <NuxtLink
        to="/tools"
        class="inline-flex text-sm font-semibold text-sky-700 hover:text-sky-900 dark:text-cyan-300 dark:hover:text-cyan-200"
      >
        All tools
      </NuxtLink>

      <div class="space-y-2">
        <p class="text-xs font-semibold uppercase text-sky-600 dark:text-cyan-300">
          Tool category
        </p>
        <h1 class="text-3xl font-black text-slate-950 dark:text-white sm:text-4xl">
          {{ category.title }}
        </h1>
        <p class="max-w-3xl text-sm leading-6 text-slate-600 dark:text-white/65">
          {{ category.intro }}
        </p>
      </div>
    </header>

    <section
      class="rounded-2xl border border-sky-100 bg-white/75 p-4 text-sm leading-6 text-slate-600 shadow-sm shadow-sky-100/60 dark:border-white/10 dark:bg-white/[0.06] dark:text-white/65 dark:shadow-black/20"
    >
      {{ category.description }}
    </section>

    <section class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <NuxtLink
        v-for="tool in tools"
        :key="tool.key"
        :to="tool.route"
        class="group flex h-full flex-col rounded-[22px] border border-white/80 bg-white/75 p-4 text-left shadow-lg shadow-sky-100/80 backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-sky-200 hover:bg-white/95 focus:outline-none focus:ring-2 focus:ring-sky-300 dark:border-white/10 dark:bg-white/[0.09] dark:text-white dark:shadow-black/20 dark:hover:border-white/20 dark:hover:bg-white/[0.14]"
      >
        <div class="flex items-start gap-3">
          <span
            class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-sm ring-1 ring-black/5 transition duration-300 group-hover:scale-110 group-hover:-rotate-3 dark:ring-white/10"
            :class="TOOL_ICON_CLASSES[tool.key] || TOOL_ICON_CLASSES.calculator"
            aria-hidden="true"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              class="h-5 w-5"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path
                v-for="path in TOOL_ICON_PATHS[tool.key] ||
                TOOL_ICON_PATHS.calculator"
                :key="path"
                :d="path"
              />
            </svg>
          </span>

          <div class="min-w-0">
            <h2 class="text-base font-black text-slate-950 dark:text-white">
              {{ tool.name }}
            </h2>
            <p class="mt-2 line-clamp-3 text-sm leading-6 text-slate-600 dark:text-white/65">
              {{ tool.description }}
            </p>
          </div>
        </div>

        <div class="mt-auto flex items-center justify-between gap-3 pt-5">
          <span class="text-xs font-semibold uppercase text-slate-400">
            {{ tool.status }}
          </span>
          <span
            class="text-sm font-bold text-sky-700 transition group-hover:translate-x-1 dark:text-cyan-300"
          >
            Open
          </span>
        </div>
      </NuxtLink>
    </section>
  </main>
</template>
