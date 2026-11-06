<script setup lang="ts">
import { useAppI18n } from "~/composables/useAppI18n";
import DeveloperCommandsPage from "~/components/developer-commands/DeveloperCommandsPage.vue";

const { t } = useAppI18n();

const { isKhmer } = useLanguage();
const title = computed(() => t("tools.developerCommands.developerCommandsDockerGitNestJsLinuxMoreChlat"));
const description = computed(() => t("tools.developerCommands.searchCustomizeAndCopyPracticalDeveloperCommandsForDocker"));
const canonical = "https://chlatwork.com/developer-commands";

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogType: "website",
  ogUrl: canonical,
  twitterCard: "summary_large_image",
  twitterTitle: title,
  twitterDescription: description,
});

useHead({ link: [{ rel: "canonical", href: canonical }] });
</script>

<template><DeveloperCommandsPage /></template>
