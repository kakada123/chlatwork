<script setup lang="ts">
import { Globe, Eye, RefreshCw } from "lucide-vue-next";
import type { PrepSharedSubject } from "~/lib/prephub";
import PrepNotebook from "~/components/prephub/PrepNotebook.vue";
import PrepOverview from "~/components/prephub/PrepOverview.vue";
import "~/assets/css/prephub.css";
definePageMeta({
  layout: "prep-public",
  blankCanvas: true,
  prepPublicShare: true,
});
const { t } = useAppI18n(),
  route = useRoute();
const token = computed(() => String(route.params.token));
useSeoMeta({
  title: () => t("prephub.publicTitle"),
  description: () => t("prephub.publicDescription"),
  robots: "noindex, nofollow, noarchive",
});
useHead({ meta: [{ name: "referrer", content: "no-referrer" }] });
const {
  data: subject,
  status,
  error,
  refresh,
} = await useFetch<PrepSharedSubject>(
  () => `/api/prephub/public/${encodeURIComponent(token.value)}`,
  { getCachedData: () => undefined },
);
const sections = computed(
  () =>
    subject.value?.sections.filter(
      (s) => s.type !== "ATTACHMENTS" || subject.value?.includeAttachments,
    ) ?? [],
);
function date(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    timeZone: subject.value?.timeZone || "Asia/Phnom_Penh",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
// The public renderer has no mutation controls or authenticated request client.
const denyMutation = async () => false;
const noConfirmation = () => {};
</script>
<template>
  <main class="prephub mx-auto max-w-6xl space-y-4 pb-8">
    <p
      v-if="status === 'pending'"
      role="status"
      class="prep-panel animate-pulse"
    >
      {{ t("prephub.loading") }}
    </p>
    <section
      v-else-if="error || !subject"
      class="prep-panel mx-auto max-w-lg space-y-3 py-6 text-center"
    >
      <Eye class="mx-auto size-8 text-slate-400" aria-hidden="true" />
      <h1 class="text-xl font-bold">
        {{
          t(
            error?.statusCode === 404
              ? "prephub.shareUnavailable"
              : "prephub.shareLoadError",
          )
        }}
      </h1>
      <p class="text-sm text-slate-500">
        {{
          t(
            error?.statusCode === 404
              ? "prephub.shareUnavailableHelp"
              : "prephub.shareLoadErrorHelp",
          )
        }}
      </p>
      <button
        v-if="error?.statusCode !== 404"
        type="button"
        class="prep-button"
        @click="refresh()"
      >
        <RefreshCw class="size-4" aria-hidden="true" />{{ t("prephub.retry") }}
      </button>
    </section>
    <template v-else>
      <PrepOverview :subject="subject" :time-zone="subject.timeZone"
        ><template #badge
          ><span
            class="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-700 dark:text-sky-300"
            ><Globe class="size-4" aria-hidden="true" />{{
              t("prephub.sharedWorkspace")
            }}
            · {{ t("prephub.readOnly") }}</span
          ></template
        ></PrepOverview
      >
      <p class="text-xs text-slate-500">
        {{ t("prephub.sharedReadOnlyHelp") }} {{ t("prephub.updated") }}
        {{ date(subject.updatedAt) }}
      </p>
      <PrepNotebook
        :sections="sections"
        :progress="subject.progress"
        :subject-id="subject.id"
        :time-zone="subject.timeZone"
        :mutate="denyMutation"
        :confirm="noConfirmation"
        read-only
        :resource-base="`/api/prephub/public/${token}/resources`"
      />
      <p
        v-if="!subject.includeAttachments"
        class="text-center text-xs text-slate-500"
      >
        {{ t("prephub.sharedFilesExcluded") }}
      </p>
    </template>
  </main>
</template>
