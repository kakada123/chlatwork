<script setup lang="ts">
definePageMeta({ layout: "bot" });
const { session, user, state, bot } = useBotSession();
const qrLink = computed(() =>
  session.value?.botUsername
    ? `https://t.me/${session.value.botUsername}?start=myqr`
    : null,
);
</script>
<template>
  <section
    v-if="session && ['ready', 'pending'].includes(state)"
    class="space-y-5 rounded-2xl bg-white p-6 shadow-sm dark:bg-slate-900"
  >
    <h1 class="text-2xl font-bold">My account</h1>
    <p>{{ user?.name || "Telegram member" }}</p>
    <dl class="grid grid-cols-2 gap-4 text-sm">
      <div>
        <dt class="text-slate-500">Manager status</dt>
        <dd class="mt-1">
          {{ session.managerStatus.toLowerCase().replaceAll("_", " ") }}
        </dd>
      </div>
      <div>
        <dt class="text-slate-500">Shared AI credits</dt>
        <dd class="mt-1 text-xl font-semibold">{{ session.balance }}</dd>
      </div>
    </dl>
    <p class="text-sm text-slate-500">
      Creator and ChlatWork use this personal balance. AI requires personal
      approval. Free group features do not spend credits.
    </p>
    <a
      v-if="qrLink"
      :href="qrLink"
      class="inline-block rounded-xl bg-violet-600 px-4 py-2 text-white"
      >Manage my KHQR privately</a
    >
    <p class="text-sm text-slate-500">
      Upload, preview and confirm your KHQR in the bot. Current membership in an
      active connected group or personal approval is required.
    </p>
    <NuxtLink
      :to="{ path: '/bot/groups', query: { bot } }"
      class="block text-sm text-violet-600"
      >Back to My Groups</NuxtLink
    >
  </section>
</template>
