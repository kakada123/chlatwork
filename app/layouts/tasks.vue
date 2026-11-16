<script setup lang="ts">
import { ListChecks, UserRound, Moon, Sun } from "lucide-vue-next";
const { t } = useAppI18n(),
  { languageLabel, switchLanguage } = useLanguage(),
  { isDark, toggleColorMode, nextColorModeLabel } = useColorMode(),
  { linkTo, config } = useProductDomain();
</script>
<template>
  <div
    class="min-h-screen bg-[var(--app-color-page-bg)] text-slate-950 dark:bg-black dark:text-white"
  >
    <NuxtLoadingIndicator color="#0369a1" />
    <header
      class="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-white/10 dark:bg-neutral-950/95"
    >
      <div
        class="mx-auto flex min-h-16 max-w-[1400px] items-center justify-between gap-3 px-4"
      >
        <NuxtLink
          :to="linkTo('/tasks')"
          class="flex min-h-11 min-w-0 items-center gap-2 font-bold text-sky-800 dark:text-sky-300"
          ><ListChecks class="size-6 shrink-0" aria-hidden="true" /><span>{{
            t("tasks.name")
          }}</span></NuxtLink
        >
        <nav class="flex items-center gap-1" :aria-label="t('tasks.name')">
          <a
            :href="config.mainOrigin"
            class="hidden min-h-11 items-center px-2 text-xs sm:inline-flex"
            >ChlatWork</a
          ><button
            type="button"
            class="min-h-11 rounded-xl px-2 text-xs font-semibold"
            @click="switchLanguage"
          >
            {{ languageLabel }}</button
          ><button
            type="button"
            class="grid size-11 place-items-center rounded-xl"
            :aria-label="nextColorModeLabel"
            @click="toggleColorMode"
          >
            <Sun v-if="isDark" class="size-5" aria-hidden="true" /><Moon
              v-else
              class="size-5"
              aria-hidden="true"
            /></button
          ><NuxtLink
            to="/account"
            class="grid size-11 place-items-center rounded-xl"
            :aria-label="t('shared.common.account')"
            ><UserRound class="size-5" aria-hidden="true"
          /></NuxtLink>
        </nav>
      </div>
    </header>
    <slot />
  </div>
</template>
