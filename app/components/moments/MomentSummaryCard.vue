<script setup lang="ts">
import {
  CalendarClock,
  ExternalLink,
  Images,
  Trash2,
} from "lucide-vue-next";
import { getMomentOccasion } from "~/data/moments";
import type { MomentSummary } from "~/types/moment";

const props = withDefaults(
  defineProps<{
    moment: MomentSummary;
    deletable?: boolean;
    deleting?: boolean;
    stacked?: boolean;
  }>(),
  { deletable: false, deleting: false, stacked: false },
);
const emit = defineEmits<{ delete: [moment: MomentSummary] }>();
const { locale, copy, isKhmer, localizeMomentPath } = useMomentLanguage();
const managerCopy = computed(() => copy.value.manager);

const statusKind = computed(() => {
  if (props.moment.status === "DRAFT") return "draft";
  if (
    props.moment.publishAt &&
    new Date(props.moment.publishAt) > new Date()
  ) {
    return "scheduled";
  }
  return "published";
});
const statusLabel = computed(() => managerCopy.value[statusKind.value]);
const createdDate = computed(() =>
  new Intl.DateTimeFormat(locale.value === "km" ? "km-KH" : undefined, {
    dateStyle: "medium",
  }).format(new Date(props.moment.createdAt)),
);
</script>

<template>
  <article
    class="moment-summary-card"
    :class="{ 'is-khmer': isKhmer, 'is-stacked': stacked }"
    :lang="isKhmer ? 'km' : 'en'"
  >
    <div class="flex items-start justify-between gap-3">
      <span class="text-3xl" aria-hidden="true">{{
        getMomentOccasion(moment.occasion).emoji
      }}</span>
      <span
        class="rounded-full px-2.5 py-1 text-xs font-bold"
        :class="
          statusKind === 'published'
            ? 'bg-green-50 text-green-700 dark:bg-green-300/10 dark:text-green-300'
            : 'bg-amber-50 text-amber-700 dark:bg-amber-300/10 dark:text-amber-200'
        "
        >{{ statusLabel }}</span
      >
    </div>

    <h3 class="mt-4 text-xl font-semibold">{{ moment.title }}</h3>
    <p class="mt-1 text-sm text-slate-500 dark:text-white/50">
      {{ managerCopy.forRecipient(moment.recipientName) }}
    </p>

    <div
      class="mt-4 flex flex-wrap gap-3 text-xs text-slate-500 dark:text-white/45"
    >
      <span class="inline-flex items-center gap-1">
        <Images class="h-3.5 w-3.5" aria-hidden="true" />
        {{ managerCopy.photos(moment._count.media) }}
      </span>
      <span class="inline-flex items-center gap-1">
        <CalendarClock class="h-3.5 w-3.5" aria-hidden="true" />
        {{ createdDate }}
      </span>
    </div>

    <div v-if="moment.rsvpSummary" class="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-rose-50/70 p-3 text-center dark:bg-rose-300/[0.06] sm:grid-cols-4">
      <span><strong class="block text-sm text-emerald-700 dark:text-emerald-300">{{ moment.rsvpSummary.yes }}</strong><small>{{ managerCopy.attending(moment.rsvpSummary.yes) }}</small></span>
      <span><strong class="block text-sm text-amber-700 dark:text-amber-200">{{ moment.rsvpSummary.maybe }}</strong><small>{{ managerCopy.maybeCount(moment.rsvpSummary.maybe) }}</small></span>
      <span><strong class="block text-sm text-slate-700 dark:text-white/70">{{ moment.rsvpSummary.no }}</strong><small>{{ managerCopy.declined(moment.rsvpSummary.no) }}</small></span>
      <span><strong class="block text-sm text-rose-700 dark:text-rose-300">{{ moment.rsvpSummary.guests }}</strong><small>{{ managerCopy.expectedGuests(moment.rsvpSummary.guests) }}</small></span>
    </div>

    <div
      class="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-white/10"
    >
      <NuxtLink
        v-if="moment.status === 'PUBLISHED'"
        :to="localizeMomentPath(`/m/${moment.slug}`)"
        target="_blank"
        class="inline-flex items-center gap-1.5 text-sm font-bold text-rose-600 hover:text-rose-800 dark:text-rose-300 dark:hover:text-rose-200"
      >
        <ExternalLink class="h-4 w-4" aria-hidden="true" />
        {{ managerCopy.open }}
      </NuxtLink>
      <span v-else class="text-xs text-slate-400 dark:text-white/40">
        {{ managerCopy.notShared }}
      </span>

      <button
        v-if="deletable"
        type="button"
        class="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-50 dark:text-red-300 dark:hover:bg-red-400/10"
        :disabled="deleting"
        @click="emit('delete', moment)"
      >
        <Trash2 class="h-4 w-4" aria-hidden="true" />
        {{ deleting ? managerCopy.deleting : managerCopy.delete }}
      </button>
    </div>
  </article>
</template>

<style scoped>
.moment-summary-card {
  height: 100%;
  border: 1px solid rgb(226 232 240);
  border-radius: 1rem;
  background: white;
  padding: 1.25rem;
  box-shadow: 0 1px 2px rgb(15 23 42 / 0.05);
}
.moment-summary-card.is-stacked {
  height: auto;
}
.moment-summary-card.is-khmer,
.moment-summary-card.is-khmer h3 {
  font-family: "Hanuman", ui-sans-serif, system-ui, sans-serif;
  line-height: 1.7;
  letter-spacing: 0;
}
:global(html.dark .moment-summary-card) {
  border-color: rgb(255 255 255 / 0.1);
  background: rgb(255 255 255 / 0.05);
  box-shadow: none;
}
</style>
