<script setup lang="ts">
import { useAppI18n } from "~/composables/useAppI18n";
import { LoaderCircle } from "lucide-vue-next";
import { localizeDeveloperCommand, localizeCommandCategory } from "~/data/developer-commands-km";
import type { DeveloperCommand } from "~/types/developer-command";
import CommandCopyButton from "~/components/developer-commands/CommandCopyButton.vue";
import CommandCustomizer from "~/components/developer-commands/CommandCustomizer.vue";
import { useLanguage } from "~/composables/useLanguage";

const { t } = useAppI18n();

const { isKhmer } = useLanguage();
const props = withDefaults(
  defineProps<{ item: DeveloperCommand; favorite: boolean; requiresLogin?: boolean; saving?: boolean }>(),
  { requiresLogin: false, saving: false },
);
const displayedItem = computed(() => localizeDeveloperCommand(props.item, (isKhmer.value ? "km" : "en")));
const emit = defineEmits<{ favorite: []; copied: [command: string] }>();
const isCustomizing = ref(false);
const isExpanded = ref(false);
const values = reactive<Record<string, string>>(Object.fromEntries((props.item.variables ?? []).map((item) => [item.key, item.defaultValue])));
const generatedCommand = computed(() => {
  let result = props.item.command;
  for (const [key, value] of Object.entries(values)) result = result.replaceAll(`<${key}>`, value.trim());
  return result.split("\n").map((line) => line.replace(/ {2,}/g, " ").trimEnd()).join("\n").replace(/ +(?=\\?$)/gm, "");
});
const dangerClass = computed(() => ({ safe: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300", warning: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300", danger: "border-red-200 bg-red-50 text-red-700 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-300" }[props.item.danger]));
</script>

<template>
  <article class="rounded-xl border border-white/80 bg-white/80 p-3 shadow-sm shadow-sky-100/50 backdrop-blur-xl dark:border-slate-700/80 dark:bg-slate-900/90 dark:shadow-black/30">
    <div class="flex items-start gap-3">
      <button type="button" class="min-w-0 flex-1 text-left" :aria-expanded="isExpanded" @click="isExpanded = !isExpanded">
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-[10px] font-bold uppercase tracking-wide text-sky-700 dark:text-cyan-300">{{ localizeCommandCategory(item.category, (isKhmer ? 'km' : 'en')) }}</span>
          <span class="rounded-full border px-1.5 py-0.5 text-[10px] font-bold capitalize" :class="dangerClass">{{ t(`tools.developerCommands.danger.${item.danger}`) }}</span>
          <span v-if="item.context" class="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-300">{{ item.context }}</span>
        </div>
        <h2 class="mt-1 truncate text-sm font-black text-slate-950 dark:text-white">{{ displayedItem.title }}</h2>
      </button>
      <button type="button" class="shrink-0 rounded-lg p-1 text-lg leading-none transition hover:bg-slate-100 disabled:cursor-wait dark:hover:bg-slate-800" :class="favorite ? 'text-amber-500 dark:text-amber-300' : 'text-slate-300 dark:text-slate-600'" :aria-label="requiresLogin ? (t(&quot;tools.developerCommands.signInToAddFavorites&quot;)) : favorite ? (t(&quot;tools.developerCommands.removeFromFavorites&quot;)) : (t(&quot;tools.developerCommands.addToFavorites&quot;))" :aria-pressed="favorite" :aria-busy="saving" :disabled="saving" :title="requiresLogin ? (t(&quot;tools.developerCommands.signInToSaveFavorites&quot;)) : undefined" @click="emit('favorite')"><LoaderCircle v-if="saving" class="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /><span v-else aria-hidden="true">★</span></button>
    </div>

    <p v-if="isExpanded && item.consequence" class="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold leading-5 text-red-700 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-300"><span class="font-black">{{ t("tools.developerCommands.consequence") }}</span> {{ displayedItem.consequence }}</p>
    <div v-if="isExpanded && item.platform" class="mt-3 flex flex-wrap gap-1.5"><span v-for="platform in item.platform" :key="platform" class="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-bold uppercase text-slate-500 dark:bg-slate-800 dark:text-slate-300">{{ platform }}</span></div>

    <CommandCustomizer v-if="isExpanded && isCustomizing && item.variables" class="mt-3" :variables="displayedItem.variables" :values="values" @change="(key, value) => values[key] = value" />

    <pre class="mt-2 overflow-x-auto whitespace-pre rounded-lg border border-transparent bg-slate-950 px-2.5 py-2 font-mono text-xs text-cyan-100 dark:border-slate-700 dark:bg-black dark:text-cyan-200"><code>{{ generatedCommand }}</code></pre>
    <div class="mt-2 flex items-center justify-between gap-2">
      <button v-if="item.variables?.length" type="button" class="h-8 shrink-0 rounded-lg border border-slate-200 px-2 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:bg-slate-800" :aria-expanded="isCustomizing" @click="isExpanded = true; isCustomizing = !isCustomizing">{{ isCustomizing ? (t("tools.developerCommands.hide")) : (t("tools.developerCommands.customize")) }}</button>
      <span v-else />
      <CommandCopyButton :command="generatedCommand" @copied="emit('copied', generatedCommand)" />
    </div>
    <p v-if="isExpanded" class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">{{ displayedItem.description }}</p>
  </article>
</template>
