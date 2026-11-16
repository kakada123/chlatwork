<script setup lang="ts">
import {
  Globe,
  Eye,
  CalendarDays,
  CheckCircle2,
  Clock,
  RefreshCw,
} from "lucide-vue-next";
import type { PrepSharedSubject } from "~/lib/prephub";
import PrepSection from "~/components/prephub/PrepSection.vue";
import PrepFormattedText from "~/components/prephub/PrepFormattedText.vue";
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
  <main class="prephub mx-auto max-w-5xl space-y-4 pb-8">
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
      <header class="prep-panel space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <span
            class="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-700 dark:text-sky-300"
            ><Globe class="size-4" aria-hidden="true" />{{
              t("prephub.sharedWorkspace")
            }}</span
          ><span
            class="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600 dark:bg-white/10 dark:text-white/70"
            ><Eye class="size-3.5" aria-hidden="true" />{{
              t("prephub.readOnly")
            }}</span
          >
        </div>
        <div>
          <p class="text-xs font-semibold text-slate-500">
            {{ t(`prephub.${subject.category}`) }} ·
            {{ t(`prephub.${subject.status}`) }}
          </p>
          <h1 class="mt-1 break-words text-xl font-bold sm:text-3xl">
            {{ subject.title }}
          </h1>
          <PrepFormattedText
            v-if="subject.description"
            :text="subject.description"
            class="mt-2 text-slate-600 dark:text-white/70"
          />
        </div>
        <div
          v-if="subject.goal"
          class="rounded-xl bg-sky-50 p-3 dark:bg-sky-950/30"
        >
          <h2 class="text-xs font-semibold text-sky-800 dark:text-sky-200">
            {{ t("prephub.goal") }}
          </h2>
          <PrepFormattedText :text="subject.goal" class="mt-1" />
        </div>
        <dl class="grid gap-3 text-sm sm:grid-cols-2">
          <div v-if="subject.eventAt" class="flex items-start gap-2">
            <CalendarDays
              class="mt-0.5 size-4 shrink-0 text-slate-400"
              aria-hidden="true"
            />
            <div>
              <dt class="text-xs text-slate-500">
                {{ t("prephub.sharedEventAt") }}
              </dt>
              <dd>{{ date(subject.eventAt) }}</dd>
            </div>
          </div>
          <div v-if="subject.deadlineAt" class="flex items-start gap-2">
            <Clock
              class="mt-0.5 size-4 shrink-0 text-slate-400"
              aria-hidden="true"
            />
            <div>
              <dt class="text-xs text-slate-500">
                {{ t("prephub.sharedDeadline") }}
              </dt>
              <dd>{{ date(subject.deadlineAt) }}</dd>
            </div>
          </div>
        </dl>
        <div v-if="subject.progress.total" class="space-y-2">
          <div
            class="flex flex-wrap items-center justify-between gap-2 text-sm"
          >
            <span class="inline-flex items-center gap-1.5"
              ><CheckCircle2
                class="size-4 text-emerald-600"
                aria-hidden="true"
              />{{
                t("prephub.progressCount", {
                  completed: subject.progress.completed,
                  total: subject.progress.total,
                })
              }}</span
            ><span class="text-slate-500">{{ subject.progress.percent }}%</span>
          </div>
          <div
            role="progressbar"
            :aria-label="t('prephub.progress')"
            :aria-valuenow="subject.progress.percent"
            :aria-valuemin="0"
            :aria-valuemax="100"
            class="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10"
          >
            <div
              class="h-full rounded-full bg-sky-600"
              :style="{ width: `${subject.progress.percent}%` }"
            />
          </div>
        </div>
        <p class="text-xs leading-relaxed text-slate-500">
          {{ t("prephub.sharedReadOnlyHelp") }} {{ t("prephub.updated") }}
          {{ date(subject.updatedAt) }} · {{ subject.timeZone }}
        </p>
      </header>
      <nav
        v-if="sections.length > 1"
        class="flex gap-2 overflow-x-auto pb-1"
        :aria-label="t('prephub.sections')"
      >
        <a
          v-for="section in sections"
          :key="section.id"
          :href="`#section-${section.id}`"
          class="prep-button shrink-0 bg-white dark:bg-neutral-950"
          >{{ section.title }}</a
        >
      </nav>
      <PrepSection
        v-for="section in sections"
        :key="section.id"
        :section="section"
        :subject-id="subject.id"
        :time-zone="subject.timeZone"
        :busy="false"
        read-only
        :resource-base="`/api/prephub/public/${token}/resources`"
        :mutate="denyMutation"
        :confirm="noConfirmation"
      />
      <p v-if="!sections.length" class="prep-panel text-sm text-slate-500">
        {{ t("prephub.sharedEmpty") }}
      </p>
      <p
        v-if="!subject.includeAttachments"
        class="text-center text-xs text-slate-500"
      >
        {{ t("prephub.sharedFilesExcluded") }}
      </p>
    </template>
  </main>
</template>
