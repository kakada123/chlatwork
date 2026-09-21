<script setup lang="ts">
import type { PdfToolDef } from "~/data/pdf-tools";
import ToolDirectoryCard from "~/components/tools/ToolDirectoryCard.vue";

defineProps<{
  tools: PdfToolDef[];
}>();
</script>

<template>
  <section class="space-y-3">
    <h2 class="text-lg font-black text-slate-950 dark:text-white">Related tools</h2>
    <div class="grid gap-3 sm:grid-cols-3">
      <ToolDirectoryCard
        v-for="tool in tools"
        :key="tool.key"
        :tool-key="tool.key"
        :name="tool.name"
        :route="tool.route"
      />
    </div>
  </section>
</template>
