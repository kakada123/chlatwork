<script setup lang="ts">
import type { groupApi } from "~/services/group-workspaces.service";
defineProps<{ directory: Awaited<ReturnType<typeof groupApi.khqr>> }>();
</script>
<template>
  <section class="rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-900">
    <h2 class="font-semibold">Group KHQR</h2>
    <p class="mt-2 text-sm text-slate-500">
      User-provided images. Each member manages their own KHQR privately.
    </p>
    <div class="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
      <figure v-for="member in directory.items" :key="member.memberKey">
        <img
          :src="member.imageUrl"
          :alt="`${member.displayName} KHQR`"
          loading="lazy"
          class="aspect-square w-full rounded-xl bg-white object-contain p-2"
        />
        <figcaption class="mt-2 break-words text-center text-sm">
          {{ member.displayName }}
        </figcaption>
      </figure>
    </div>
    <p v-if="!directory.items.length" class="mt-4 text-sm text-slate-500">
      No member has shared a KHQR yet.
    </p>
  </section>
</template>
