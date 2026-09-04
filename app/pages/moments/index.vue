<script setup lang="ts">
import { Plus } from "lucide-vue-next";
import MomentLanguageToggle from "~/components/moments/MomentLanguageToggle.vue";
import MomentSummaryCard from "~/components/moments/MomentSummaryCard.vue";
import MomentInvitationGuests from "~/components/moments/MomentInvitationGuests.vue";
import MomentVotingResults from "~/components/moments/MomentVotingResults.vue";
import ConfirmDialog from "~/components/ui/ConfirmDialog.vue";
import type { MomentPollSummary, MomentSummary } from "~/types/moment";

definePageMeta({ middleware: "auth" });

const { copy, isKhmer, localizeMomentPath } = useMomentLanguage();
const managerCopy = computed(() => copy.value.manager);

useSeoMeta({
  title: () => `${managerCopy.value.title} | ChlatWork`,
  description: () => managerCopy.value.description,
  robots: "noindex, nofollow",
});
const { data, status, error } =
  await useFetch<MomentSummary[]>("/api/moments/mine");
const moments = computed(() => data.value ?? []);
const deletingId = ref("");
const deleteError = ref("");
const momentPendingDelete = ref<MomentSummary | null>(null);
const resettingVoteId = ref("");
const voteResetError = ref("");
const momentPendingVoteReset = ref<MomentSummary | null>(null);

function requestMomentDelete(moment: MomentSummary) {
  momentPendingVoteReset.value = null;
  momentPendingDelete.value = moment;
  deleteError.value = "";
}

function requestVoteReset(moment: MomentSummary) {
  momentPendingDelete.value = null;
  momentPendingVoteReset.value = moment;
  voteResetError.value = "";
}

async function removeMoment() {
  const moment = momentPendingDelete.value;
  if (!moment) return;
  deletingId.value = moment.id;
  deleteError.value = "";
  try {
    await $fetch(`/api/moments/${moment.id}`, { method: "DELETE" });
    data.value = moments.value.filter((item) => item.id !== moment.id);
    momentPendingDelete.value = null;
  } catch {
    deleteError.value = managerCopy.value.deleteError;
  } finally {
    deletingId.value = "";
  }
}

async function resetVotes() {
  const moment = momentPendingVoteReset.value;
  if (!moment) return;
  resettingVoteId.value = moment.id;
  voteResetError.value = "";
  try {
    const pollSummary = await $fetch<MomentPollSummary>(`/api/moments/${moment.id}/votes`, { method: "DELETE" });
    data.value = moments.value.map((item) => item.id === moment.id ? { ...item, pollSummary } : item);
    momentPendingVoteReset.value = null;
  } catch {
    voteResetError.value = managerCopy.value.resetVotesError;
  } finally {
    resettingVoteId.value = "";
  }
}
</script>

<template>
  <div
    class="moments-manager mx-auto max-w-5xl"
    :class="{ 'is-khmer': isKhmer }"
    :lang="isKhmer ? 'km' : 'en'"
  >
    <header
      class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
    >
      <div>
        <p
          class="text-xs font-bold uppercase tracking-[.16em] text-rose-600 dark:text-rose-300"
        >
          ChlatWork Moments
        </p>
        <h1 class="mt-2">{{ managerCopy.title }}</h1>
        <p class="mt-2 text-sm text-slate-600 dark:text-white/60">
          {{ managerCopy.description }}
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <MomentLanguageToggle />
        <NuxtLink
          :to="localizeMomentPath('/moments/create')"
          class="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-3 text-sm font-bold text-white hover:bg-rose-700"
          ><Plus class="h-4 w-4" />{{ managerCopy.create }}</NuxtLink
        >
      </div>
    </header>

    <p
      v-if="deleteError || voteResetError"
      class="mt-5 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700 dark:bg-red-400/10 dark:text-red-300"
      role="alert"
    >
      {{ deleteError || voteResetError }}
    </p>

    <div v-if="status === 'pending'" class="mt-8 grid gap-4 sm:grid-cols-2">
      <div
        v-for="item in 2"
        :key="item"
        class="h-52 animate-pulse rounded-2xl bg-slate-200/70 dark:bg-white/10"
      />
    </div>

    <section
      v-else-if="error"
      class="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800 dark:border-red-300/20 dark:bg-red-400/10 dark:text-red-200"
    >
      <h2 class="text-lg font-semibold">{{ managerCopy.loadErrorTitle }}</h2>
      <p class="mt-2 text-sm">{{ managerCopy.loadErrorCopy }}</p>
    </section>

    <section
      v-else-if="moments.length === 0"
      class="mt-8 rounded-3xl border border-dashed border-rose-200 bg-rose-50/60 p-10 text-center dark:border-rose-300/20 dark:bg-rose-300/5"
    >
      <p class="text-4xl" aria-hidden="true">💝</p>
      <h2 class="mt-4 text-2xl font-semibold">
        {{ managerCopy.emptyTitle }}
      </h2>
      <p
        class="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600 dark:text-white/60"
      >
        {{ managerCopy.emptyCopy }}
      </p>
      <NuxtLink
        :to="localizeMomentPath('/moments/create')"
        class="mt-5 inline-flex rounded-xl bg-rose-600 px-4 py-3 text-sm font-bold text-white"
        >{{ managerCopy.create }}</NuxtLink
      >
    </section>

    <ul v-else class="mt-8 grid gap-4 sm:grid-cols-2">
      <li
        v-for="moment in moments"
        :key="moment.id"
        class="min-w-0"
        :class="{ 'sm:col-span-2': ['INVITATION', 'VOTING'].includes(moment.occasion) }"
      >
        <MomentSummaryCard
          :moment="moment"
          deletable
          :deleting="deletingId === moment.id"
          :stacked="['INVITATION', 'VOTING'].includes(moment.occasion)"
          @delete="requestMomentDelete"
        />
        <MomentInvitationGuests v-if="moment.occasion === 'INVITATION' && moment.status === 'PUBLISHED'" :moment="moment" />
        <MomentVotingResults v-if="moment.occasion === 'VOTING' && moment.status === 'PUBLISHED'" :moment="moment" :resetting="resettingVoteId === moment.id" @reset="requestVoteReset" />
      </li>
    </ul>

    <ConfirmDialog
      :open="Boolean(momentPendingDelete)"
      :title="managerCopy.deleteDialogTitle"
      :description="managerCopy.deleteConfirm(momentPendingDelete?.title ?? '')"
      :confirm-label="managerCopy.delete"
      :cancel-label="managerCopy.cancelDelete"
      :busy="Boolean(deletingId)"
      :busy-label="managerCopy.deleting"
      :locale="isKhmer ? 'km' : 'en'"
      @close="momentPendingDelete = null"
      @confirm="removeMoment"
    />
    <ConfirmDialog
      :open="Boolean(momentPendingVoteReset)"
      :title="managerCopy.resetVotesDialogTitle"
      :description="managerCopy.resetVotesConfirm(momentPendingVoteReset?.title ?? '', momentPendingVoteReset?.pollSummary?.totalVotes ?? 0)"
      :confirm-label="managerCopy.resetVotes"
      :cancel-label="managerCopy.keepVotes"
      :busy="Boolean(resettingVoteId)"
      :busy-label="managerCopy.resettingVotes"
      :locale="isKhmer ? 'km' : 'en'"
      @close="momentPendingVoteReset = null"
      @confirm="resetVotes"
    />
  </div>
</template>

<style scoped>
.moments-manager.is-khmer {
  font-family: "Hanuman", ui-sans-serif, system-ui, sans-serif;
  line-height: 1.75;
}
</style>
