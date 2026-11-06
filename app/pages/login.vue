<script setup lang="ts">
import { useAppI18n } from "~/composables/useAppI18n";
import { useLanguage } from "~/composables/useLanguage";
import { safeReturnPath } from "~/lib/product-domains";

const { t } = useAppI18n();
definePageMeta({ middleware: "guest" });

const { isKhmer } = useLanguage();

useSeoMeta({
  title: computed(() => t("shared.pages_login.login_chlat_work")),
  robots: "noindex, nofollow",
});

const route = useRoute();
const errorMessage = ref("");

function redirectTarget() {
  const value = route.query.redirect;
  return safeReturnPath(value);
}

</script>

<template>
  <div class="mx-auto flex min-h-[calc(100dvh-10rem)] max-w-md items-center px-4 py-12">
    <section class="w-full rounded-3xl border border-black/10 bg-white p-6 shadow-xl dark:border-white/15 dark:bg-neutral-950 sm:p-8">
      <NuxtLink to="/" class="text-sm font-bold text-sky-600 dark:text-cyan-300">ChlatWork</NuxtLink>
      <h1 class="mt-4 text-3xl font-semibold">
        {{ t("shared.pages_login.welcome_to_chlat_work") }}
      </h1>
      <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
        {{ t("shared.pages_login.continue_securely_with_google_or_telegram") }}
      </p>

      <p v-if="errorMessage" role="alert" class="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:bg-red-500/10 dark:text-red-300">{{ errorMessage }}</p>

      <AuthSocialAuthButtons @success="navigateTo(redirectTarget())" @error="errorMessage = $event" />
    </section>
  </div>
</template>
