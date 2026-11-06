<script setup lang="ts">
import { useAppI18n } from "~/composables/useAppI18n";
import { QrCode, RefreshCw, Upload, X } from "lucide-vue-next";

const { t } = useAppI18n();

const { isKhmer } = useLanguage();

type Member = {
  key: string;
  displayName: string;
  imageUrl: string | null;
  source: "upload" | "none";
  updatedAt: string | null;
};

type Group = { chatId: string; title: string; memberCount: number };
type GroupRoster = { chatId: string; members: Member[] };
// Keep this secondary panel out of the dashboard's server-rendering waterfall.
const { data: groups, status: groupsStatus, error: groupsError, refresh: refreshGroups } = await useFetch<Group[]>("/api/admin/member-khqr/groups", { server: false, lazy: true });
const selectedChatId = ref(groups.value?.[0]?.chatId ?? "");
const { data: roster, status, error, refresh } = await useFetch<GroupRoster>("/api/admin/member-khqr", {
  query: computed(() => ({ chatId: selectedChatId.value })),
  server: false,
  lazy: true,
  immediate: false,
  watch: false,
});
// Never show an earlier group's response while a new selection is loading.
const members = computed(() => roster.value?.chatId === selectedChatId.value ? roster.value.members : []);
const selectedGroup = computed(() => groups.value?.find((group) => group.chatId === selectedChatId.value));
const search = ref("");
const visibleMembers = computed(() => (members.value ?? []).filter((member) =>
  `${member.displayName} ${member.key}`.normalize("NFKC").toLowerCase()
    .includes(search.value.normalize("NFKC").trim().toLowerCase()),
));
const failedImages = ref<Record<string, boolean>>({});
const fileInput = ref<HTMLInputElement | null>(null);
const previewPanel = ref<HTMLElement | null>(null);
const target = ref<{ member: Member; chatId: string } | null>(null);
const selection = ref<{ member: Member; chatId: string; file: File; preview: string } | null>(null);
const saving = ref(false);
const feedback = ref("");
const uploadError = ref("");

function clearSelection() {
  if (selection.value) URL.revokeObjectURL(selection.value.preview);
  selection.value = null;
}

function pick(member: Member) {
  target.value = { member, chatId: selectedChatId.value };
  fileInput.value?.click();
}

async function selectFile(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = "";
  if (!file || !target.value || target.value.chatId !== selectedChatId.value) return;
  feedback.value = "";
  uploadError.value = "";
  if (file.size > 2 * 1024 * 1024 || !file.size) {
    uploadError.value = t("shared.components_admin_member_khqr_manager.choose_a_png_or_jpeg_image_up_to_2");
    return;
  }
  clearSelection();
  selection.value = { ...target.value, file, preview: URL.createObjectURL(file) };
  await nextTick();
  previewPanel.value?.scrollIntoView({ behavior: "smooth", block: "center" });
  previewPanel.value?.focus({ preventScroll: true });
}

async function save() {
  if (!selection.value || saving.value) return;
  const pending = selection.value;
  saving.value = true;
  uploadError.value = "";
  const form = new FormData();
  form.append("image", pending.file);
  try {
    const result = await $fetch<{ imageUrl: string }>(`/api/admin/member-khqr/${pending.member.key}`, {
      method: "POST",
      headers: { "x-khqr-upload": "1" },
      query: { chatId: pending.chatId },
      body: form,
    });
    // Update from the confirmed write so a later list-refresh failure cannot
    // turn a successful replacement into an apparent failed upload.
    if (roster.value?.chatId === pending.chatId) {
      roster.value.members = roster.value.members.map((member) => member.key === pending.member.key
        ? { ...member, imageUrl: result.imageUrl, source: "upload" as const } : member);
    }
    delete failedImages.value[result.imageUrl];
    feedback.value = t("shared.components_admin_member_khqr_manager.khqr_saved_for", { pendingMemberDisplayName: pending.member.displayName });
    clearSelection();
  } catch (cause) {
    const failure = cause as { data?: { message?: string; statusMessage?: string } };
    uploadError.value = failure.data?.message ?? failure.data?.statusMessage ?? t("shared.components_admin_member_khqr_manager.upload_failed_please_try_again");
  } finally {
    saving.value = false;
  }
}

watch(selectedChatId, (chatId) => {
  clearSelection();
  target.value = null;
  search.value = "";
  feedback.value = "";
  uploadError.value = "";
  if (chatId) void refresh();
}, { immediate: true });

watch(groups, (available) => {
  if (!available?.some((group) => group.chatId === selectedChatId.value)) {
    selectedChatId.value = available?.[0]?.chatId ?? "";
  }
});

async function reload() {
  // A temporary image request failure must not hide the preview after refresh.
  failedImages.value = {};
  const previousChatId = selectedChatId.value;
  await refreshGroups();
  // A changed selection already triggers its own roster request through the watcher.
  await nextTick();
  if (selectedChatId.value && selectedChatId.value === previousChatId) {
    await refresh();
  }
}

onBeforeUnmount(clearSelection);
</script>

<template>
  <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#101214] sm:p-6" aria-labelledby="member-khqr-title">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p class="text-xs font-bold uppercase tracking-[0.16em] text-sky-700 dark:text-cyan-300">{{ t("shared.components_admin_member_khqr_manager.telegram_group") }}</p>
        <h2 id="member-khqr-title" class="mt-1 text-xl font-semibold">{{ t("shared.components_admin_activity_dashboard.member_khqr") }}</h2>
        <p class="mt-2 max-w-2xl text-sm text-slate-500 dark:text-white/50">{{ t("shared.components_admin_member_khqr_manager.choose_a_telegram_group_to_view_its_members_and") }}</p>
        <p class="mt-1 text-xs text-slate-500 dark:text-white/50">{{ t("shared.components_admin_member_khqr_manager.png_or_jpeg_up_to_2_mb") }}</p>
      </div>
      <button type="button" class="grid size-10 place-items-center rounded-xl border border-slate-200 disabled:opacity-50 dark:border-white/15" :aria-label="t(&quot;shared.components_admin_member_khqr_manager.refresh_member_khqr&quot;)" :disabled="status === 'pending' || saving" @click="reload()">
        <RefreshCw class="size-4" :class="{ 'animate-spin': status === 'pending' }" aria-hidden="true" />
      </button>
    </div>
    <label class="mt-5 block text-sm font-medium">
      {{ t("shared.components_admin_member_khqr_manager.telegram_group") }}
      <ModernSelect v-model="selectedChatId" class="mt-2 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm disabled:opacity-50 dark:border-white/15 dark:bg-[#101214]" :disabled="saving || !groups?.length">
        <option value="" disabled>{{ t("shared.components_admin_member_khqr_manager.select_a_group") }}</option>
        <option v-for="group in groups" :key="group.chatId" :value="group.chatId">{{ group.title }} · {{ group.memberCount }} {{ t("shared.components_admin_member_khqr_manager.members") }}</option>
      </ModernSelect>
    </label>
    <p v-if="selectedGroup" class="mt-2 text-xs text-slate-500 dark:text-white/50">{{ t("shared.components_admin_member_khqr_manager.group") }} {{ selectedGroup.chatId }}{{ t("shared.components_admin_member_khqr_manager.only_active_members_observed_in_this_group_appear_missing") }}</p>
    <p v-else-if="groupsStatus === 'idle' || groupsStatus === 'pending'" role="status" class="mt-3 text-sm text-slate-500 dark:text-white/50">{{ t("shared.components_admin_member_khqr_manager.loading_groups") }}</p>
    <p v-else-if="!groupsError" class="mt-3 text-sm text-slate-500 dark:text-white/50">{{ t("shared.components_admin_member_khqr_manager.no_groups_with_known_active_members_yet") }}</p>
    <p v-if="groupsError" role="alert" class="mt-4 text-sm text-red-600 dark:text-red-300">{{ t("shared.components_admin_member_khqr_manager.telegram_groups_could_not_be_loaded_try_refreshing") }}</p>
    <input ref="fileInput" type="file" accept="image/png,image/jpeg,.png,.jpg,.jpeg" class="hidden" :aria-label="t(&quot;shared.components_admin_member_khqr_manager.member_khqr_image&quot;)" @change="selectFile" />
    <p v-if="error" role="alert" class="mt-4 text-sm text-red-600 dark:text-red-300">{{ t("shared.components_admin_member_khqr_manager.member_khqr_could_not_be_loaded_try_refreshing") }}</p>
    <p v-if="uploadError" role="alert" class="mt-4 text-sm text-red-600 dark:text-red-300">{{ uploadError }}</p>
    <p v-if="feedback" role="status" class="mt-4 text-sm text-emerald-700 dark:text-emerald-300">{{ feedback }}</p>

    <div v-if="selection" ref="previewPanel" tabindex="-1" class="mt-5 rounded-2xl border border-sky-200 bg-sky-50 p-4 outline-none dark:border-cyan-300/20 dark:bg-cyan-400/5">
      <h3 class="font-semibold">{{ t("shared.components_admin_member_khqr_manager.save_khqr_for") }} {{ selection.member.displayName }}?</h3>
      <p class="mt-1 text-sm text-slate-600 dark:text-white/60">{{ t("shared.components_admin_member_khqr_manager.check_the_recipient_name_and_qr_before_saving_this") }}</p>
      <img :src="selection.preview" :alt="t(&quot;shared.components_admin_member_khqr_manager.new_khqr_for&quot;, { selectionMemberDisplayName: selection.member.displayName })" class="mt-4 max-h-72 w-full rounded-xl bg-white object-contain p-3" />
      <div class="mt-4 flex flex-wrap gap-3">
        <button type="button" class="min-h-11 rounded-xl bg-sky-800 px-5 text-sm font-semibold text-white disabled:opacity-50 dark:bg-cyan-700" :disabled="saving" @click="save">{{ saving ? t("shared.common.saving") : t("shared.components_admin_member_khqr_manager.save_khqr") }}</button>
        <button type="button" class="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 px-4 text-sm font-semibold disabled:opacity-50 dark:border-white/20" :disabled="saving" @click="clearSelection"><X class="size-4" aria-hidden="true" />{{ t("shared.common.cancel") }}</button>
      </div>
    </div>

    <label v-if="selectedChatId" class="mt-5 block">
      <span class="sr-only">{{ t("shared.components_admin_member_khqr_manager.search_members") }}</span>
      <input v-model="search" type="search" :placeholder="t(&quot;shared.components_admin_member_khqr_manager.search_members_2&quot;)" class="min-h-11 w-full rounded-xl border border-slate-200 bg-transparent px-4 text-sm outline-none focus:ring-2 focus:ring-sky-500 dark:border-white/15" />
    </label>
    <p v-if="status === 'pending'" role="status" class="mt-5 text-sm text-slate-500">{{ t("shared.components_admin_member_khqr_manager.loading_members") }}</p>
    <p v-else-if="selectedChatId && !error && !visibleMembers.length" class="mt-5 text-sm text-slate-500">{{ t("shared.components_admin_member_khqr_manager.no_members_found_in_this_group") }}</p>
    <div class="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <article v-for="member in visibleMembers" :key="member.key" class="flex flex-col rounded-2xl border border-slate-200 p-4 dark:border-white/10">
        <h3 class="font-semibold">{{ member.displayName }}</h3>
        <div class="mt-3 flex h-48 items-center justify-center overflow-hidden rounded-xl bg-slate-50 dark:bg-white/5">
          <a v-if="member.imageUrl && !failedImages[member.imageUrl]" :href="member.imageUrl" target="_blank" rel="noopener noreferrer" :aria-label="t(&quot;shared.components_admin_member_khqr_manager.view_khqr_for&quot;, { memberDisplayName: member.displayName })" class="h-full w-full bg-white p-2">
            <img :src="member.imageUrl" :alt="t(&quot;shared.components_admin_member_khqr_manager.khqr_for&quot;, { memberDisplayName: member.displayName })" class="h-full w-full object-contain" loading="lazy" @error="failedImages[member.imageUrl!] = true" />
          </a>
          <div v-else class="px-3 text-center text-slate-400 dark:text-white/40"><QrCode class="mx-auto size-8" aria-hidden="true" /><p class="mt-2 text-xs">{{ t("shared.components_admin_member_khqr_manager.no_khqr_available_yet") }}</p></div>
        </div>
        <button type="button" class="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-semibold transition hover:bg-slate-50 disabled:opacity-50 dark:border-white/15 dark:hover:bg-white/5" :disabled="saving" :aria-label="t(&quot;shared.components_admin_member_khqr_manager.upload_khqr_for&quot;, { memberDisplayName: member.displayName })" @click="pick(member)"><Upload class="size-4" aria-hidden="true" />{{ member.imageUrl && !failedImages[member.imageUrl] ? t("shared.components_admin_member_khqr_manager.replace_image") : t("shared.components_admin_member_khqr_manager.upload_image") }}</button>
      </article>
    </div>
  </section>
</template>
