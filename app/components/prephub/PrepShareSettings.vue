<script setup lang="ts">
import {
  Check,
  Copy,
  ExternalLink,
  Globe,
  LockKeyhole,
  RefreshCw,
  Link2,
} from "lucide-vue-next";
import type { PrepSharing } from "~/lib/prephub";
const props = defineProps<{ subjectId: string }>();
const { t } = useAppI18n();
const { request, owner, error, busy, fail } = usePrepHub();
const { linkTo } = useProductDomain();
const origin = useRequestURL().origin,
  route = useRoute();
const settings = ref<PrepSharing | null>(null),
  loading = ref(true),
  includeAttachments = ref(false),
  feedback = ref(""),
  confirmAction = ref<"stop" | "replace" | null>(null),
  linkField = ref<HTMLInputElement | null>(null);
const link = computed(() => {
  if (!settings.value?.enabled || !settings.value.token) return "";
  const url = new URL(
    linkTo(`/prephub/shared/${settings.value.token}`),
    origin,
  );
  if (/^#section-[\w-]+$/.test(route.hash)) url.hash = route.hash;
  return url.href;
});
async function load() {
  loading.value = true;
  error.value = "";
  try {
    settings.value = await request<PrepSharing>(
      `/subjects/${props.subjectId}/sharing`,
    );
    includeAttachments.value = settings.value.includeAttachments;
  } catch (e) {
    fail(e);
  } finally {
    loading.value = false;
  }
}
async function save(regenerate = false) {
  if (busy.value) return;
  busy.value = true;
  error.value = "";
  feedback.value = "";
  try {
    settings.value = await request<PrepSharing>(
      `/subjects/${props.subjectId}/sharing`,
      {
        method: "PUT",
        body: {
          includeAttachments: includeAttachments.value,
          ...(regenerate ? { regenerate: true } : {}),
        },
      },
    );
    confirmAction.value = null;
    feedback.value = t(
      regenerate ? "prephub.shareReplaced" : "prephub.shareSaved",
    );
  } catch (e) {
    fail(e);
  } finally {
    busy.value = false;
  }
}
async function stop() {
  if (busy.value) return;
  busy.value = true;
  error.value = "";
  feedback.value = "";
  try {
    settings.value = await request<PrepSharing>(
      `/subjects/${props.subjectId}/sharing`,
      { method: "DELETE" },
    );
    includeAttachments.value = false;
    confirmAction.value = null;
    feedback.value = t("prephub.shareStopped");
  } catch (e) {
    fail(e);
  } finally {
    busy.value = false;
  }
}
async function copy() {
  feedback.value = "";
  try {
    await navigator.clipboard.writeText(link.value);
    feedback.value = t("prephub.linkCopied");
  } catch {
    linkField.value?.focus();
    linkField.value?.select();
    feedback.value = t("prephub.copyManually");
  }
}
watch(owner, () => {
  settings.value = null;
  feedback.value = "";
  confirmAction.value = null;
});
onMounted(load);
</script>
<template>
  <div class="space-y-4">
    <p v-if="loading" role="status" class="text-sm text-slate-500">
      {{ t("prephub.loading") }}
    </p>
    <div
      v-if="error"
      role="alert"
      class="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-200"
    >
      {{ error
      }}<button
        v-if="!settings"
        type="button"
        class="prep-button mt-2"
        :disabled="busy || loading"
        @click="load"
      >
        {{ t("prephub.retry") }}
      </button>
    </div>
    <template v-if="settings">
      <div
        class="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/5"
      >
        <component
          :is="settings.enabled ? Globe : LockKeyhole"
          class="mt-0.5 size-5 shrink-0 text-sky-700 dark:text-sky-300"
          aria-hidden="true"
        />
        <div>
          <h3 class="font-semibold">
            {{
              t(
                settings.enabled
                  ? "prephub.shareAnyone"
                  : "prephub.sharePrivate",
              )
            }}
          </h3>
          <p class="mt-1 text-sm text-slate-600 dark:text-white/65">
            {{
              t(
                settings.enabled
                  ? "prephub.shareLiveHelp"
                  : "prephub.sharePrivateHelp",
              )
            }}
          </p>
        </div>
      </div>
      <p class="text-sm leading-relaxed text-slate-600 dark:text-white/70">
        {{ t("prephub.shareDisclosure") }}
      </p>
      <label
        class="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 dark:border-white/10"
        ><input
          v-model="includeAttachments"
          type="checkbox"
          class="mt-0.5 size-5 shrink-0"
          :disabled="busy"
        /><span
          ><span class="block text-sm font-semibold">{{
            t("prephub.shareFiles")
          }}</span
          ><span class="mt-1 block text-xs text-slate-500">{{
            t("prephub.shareFilesHelp")
          }}</span></span
        ></label
      >
      <template v-if="settings.enabled">
        <label class="prep-label"
          >{{ t("prephub.shareLink")
          }}<input
            ref="linkField"
            :value="link"
            readonly
            type="url"
            class="prep-input"
            @focus="($event.target as HTMLInputElement).select()"
        /></label>
        <div class="grid grid-cols-2 gap-2">
          <button
            type="button"
            class="prep-primary"
            :disabled="busy"
            @click="copy"
          >
            <Copy class="size-4" aria-hidden="true" />{{
              t("prephub.copyLink")
            }}</button
          ><a
            :href="link"
            target="_blank"
            rel="noopener noreferrer"
            class="prep-button"
            ><ExternalLink class="size-4" aria-hidden="true" />{{
              t("prephub.openShared")
            }}</a
          >
        </div>
        <button
          v-if="includeAttachments !== settings.includeAttachments"
          type="button"
          class="prep-primary w-full"
          :disabled="busy"
          @click="save()"
        >
          <Check class="size-4" aria-hidden="true" />{{
            t("prephub.shareSaveSettings")
          }}
        </button>
        <div
          v-if="!confirmAction"
          class="flex flex-wrap justify-between gap-2 border-t border-slate-200 pt-3 dark:border-white/10"
        >
          <button
            type="button"
            class="prep-button"
            :disabled="busy"
            @click="confirmAction = 'replace'"
          >
            <RefreshCw class="size-4" aria-hidden="true" />{{
              t("prephub.replaceLink")
            }}</button
          ><button
            type="button"
            class="prep-button text-red-700 dark:text-red-300"
            :disabled="busy"
            @click="confirmAction = 'stop'"
          >
            {{ t("prephub.stopSharing") }}
          </button>
        </div>
        <div
          v-else
          class="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30"
        >
          <p class="text-sm">
            {{
              t(
                confirmAction === "stop"
                  ? "prephub.stopSharingConfirm"
                  : "prephub.replaceLinkConfirm",
              )
            }}
          </p>
          <div class="flex flex-wrap gap-2">
            <button
              type="button"
              class="prep-primary"
              :disabled="busy"
              @click="confirmAction === 'stop' ? stop() : save(true)"
            >
              {{
                t(
                  confirmAction === "stop"
                    ? "prephub.stopSharing"
                    : "prephub.replaceLink",
                )
              }}</button
            ><button
              type="button"
              class="prep-button"
              :disabled="busy"
              @click="confirmAction = null"
            >
              {{ t("prephub.cancel") }}
            </button>
          </div>
        </div>
      </template>
      <button
        v-else
        type="button"
        class="prep-primary w-full"
        :disabled="busy"
        @click="save()"
      >
        <Link2 class="size-4" aria-hidden="true" />{{
          t("prephub.enableSharing")
        }}
      </button>
    </template>
    <p v-if="busy" role="status" class="text-sm text-slate-500">
      {{ t("prephub.saving") }}
    </p>
    <p
      v-if="feedback"
      role="status"
      class="text-sm text-emerald-700 dark:text-emerald-300"
    >
      {{ feedback }}
    </p>
  </div>
</template>
