<script setup lang="ts">
import { inlineParts } from "~/lib/prephub";
defineProps<{ text: string }>();
</script>
<template>
  <div class="whitespace-pre-wrap break-words text-sm leading-relaxed">
    <template v-for="(part, i) in inlineParts(text)" :key="i"
      ><strong v-if="part.type === 'strong'">{{ part.text }}</strong
      ><em v-else-if="part.type === 'em'">{{ part.text }}</em
      ><code
        v-else-if="part.type === 'code'"
        class="rounded bg-slate-100 px-1 dark:bg-white/10"
        >{{ part.text }}</code
      ><template v-else>{{ part.text }}</template></template
    >
  </div>
</template>
