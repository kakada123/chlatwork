<script setup lang="ts">
import {
  findToolDirectoryCategoryBySlug,
  getToolsForDirectoryCategory,
} from "~/data/tool-categories";
import ToolDirectoryCard from "~/components/tools/ToolDirectoryCard.vue";

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
  <main v-if="category" class="mx-auto w-full max-w-[1200px] space-y-8">
    <header class="space-y-3 border-b border-slate-200 pb-5 dark:border-white/10">
      <NuxtLink
        to="/tools"
        class="inline-flex text-sm font-semibold text-sky-700 hover:text-sky-900 dark:text-cyan-300 dark:hover:text-cyan-200"
      >
        All tools
      </NuxtLink>

      <div class="space-y-2">
        <h1 class="text-3xl font-black text-slate-950 dark:text-white sm:text-4xl">
          {{ category.title }}
        </h1>
        <p class="max-w-3xl text-sm text-slate-500 dark:text-white/55">
          {{ category.intro }}
        </p>
      </div>
    </header>

    <ul class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <li
        v-for="tool in tools"
        :key="tool.key"
        class="h-full"
      >
        <ToolDirectoryCard :tool-key="tool.key" :name="tool.name" :route="tool.route" :description="tool.description" :meta="tool.category" />
      </li>
    </ul>
  </main>
</template>
