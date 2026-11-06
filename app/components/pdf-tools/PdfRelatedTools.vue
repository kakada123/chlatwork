<script setup lang="ts">
import { useAppI18n } from "~/composables/useAppI18n";
const { isKhmer } = useLanguage();
import { localizePdfTool } from "~/data/pdf-tools-km";
import type { PdfToolDef } from "~/data/pdf-tools";
import ToolDirectoryCard from "~/components/tools/ToolDirectoryCard.vue";

const { t } = useAppI18n();

defineProps<{
  tools: PdfToolDef[];
}>();
</script>

<template>
  <section class="space-y-3">
    <h2 class="text-lg font-black text-slate-950 dark:text-white">{{ t("tools.pdf.relatedTools") }}</h2>
    <div class="grid gap-3 sm:grid-cols-3">
      <ToolDirectoryCard
        v-for="tool in tools"
        :key="tool.key"
        :tool-key="tool.key"
        :name="localizePdfTool(tool, (isKhmer ? 'km' : 'en')).name"
        :route="tool.route"
      />
    </div>
  </section>
</template>
