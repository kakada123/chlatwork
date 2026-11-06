<script setup lang="ts">
import { useAppI18n } from "~/composables/useAppI18n";
import type { groupApi } from "~/services/group-workspaces.service";

const { t } = useAppI18n();

const { isKhmer } = useLanguage();
defineProps<{ directory: Awaited<ReturnType<typeof groupApi.khqr>> }>();
</script>
<template>
  <section class="rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-900">
    <h2 class="font-semibold">{{ t("shared.components_bot_group_khqr_directory.group_khqr") }}</h2>
    <p class="mt-2 text-sm text-slate-500">
      {{ t("shared.components_bot_group_khqr_directory.user_provided_images_each_member_manages_their_own_khqr") }}
    </p>
    <div class="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
      <figure v-for="member in directory.items" :key="member.memberKey">
        <img
          :src="member.imageUrl"
          :alt="t(&quot;shared.components_bot_group_khqr_directory.khqr&quot;, { memberDisplayName: member.displayName })"
          loading="lazy"
          class="aspect-square w-full rounded-xl bg-white object-contain p-2"
        />
        <figcaption class="mt-2 break-words text-center text-sm">
          {{ member.displayName }}
        </figcaption>
      </figure>
    </div>
    <p v-if="!directory.items.length" class="mt-4 text-sm text-slate-500">
      {{ t("shared.components_bot_group_khqr_directory.no_member_has_shared_a_khqr_yet") }}
    </p>
  </section>
</template>
