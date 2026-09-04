<script setup lang="ts">
import type { Component } from "vue";
import {
  Captions,
  Clapperboard,
  FileText,
  HeartHandshake,
  Languages,
  Lightbulb,
  ListVideo,
  MessageSquareText,
  PackageOpen,
  PenLine,
  Repeat2,
  Scissors,
  Share2,
  SpellCheck2,
  WandSparkles,
} from "lucide-vue-next";
import type { CreatorIconName } from "~/data/creator-tools";

const props = defineProps<{ name: CreatorIconName }>();

const icons: Record<CreatorIconName, Component> = {
  post: FileText,
  script: Clapperboard,
  hook: WandSparkles,
  ideas: Lightbulb,
  subtitle: Captions,
  caption: MessageSquareText,
  summary: ListVideo,
  "content-pack": PackageOpen,
  repurpose: Repeat2,
  social: Share2,
  shorten: Scissors,
  grammar: SpellCheck2,
  rewrite: PenLine,
  convert: Languages,
  humanize: HeartHandshake,
};

const icon = computed(() => icons[props.name]);
</script>

<template>
  <component :is="icon" aria-hidden="true" />
</template>
