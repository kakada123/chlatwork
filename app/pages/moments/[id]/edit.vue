<script setup lang="ts">
import { useAppI18n } from "~/composables/useAppI18n";
import MomentCreator from "~/components/moments/MomentCreator.vue";

definePageMeta({ layout: "moment-editor", momentEditor: true });

const route = useRoute();
const { isKhmer } = useMomentLanguage();

const { t } = useAppI18n(isKhmer);
const id = computed(() => String(route.params.id ?? ""));
if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id.value)) {
  throw createError({ statusCode: 404, statusMessage: "Moment not found" });
}
useSeoMeta({ title: () => t("products.moments.edit_birthday_moment_chlat_work_moments"), robots: "noindex, nofollow, noarchive" });
</script>

<template><MomentCreator :key="id" :edit-id="id" /></template>
