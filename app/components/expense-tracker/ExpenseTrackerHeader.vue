<script setup lang="ts">
type ExpenseShareState = "idle" | "busy" | "copied" | "shared" | "ready";
type ExpenseSaveState =
  | "idle"
  | "login-required"
  | "logging-in"
  | "saving"
  | "saved"
  | "error";

const props = defineProps<{
  shareState: ExpenseShareState;
  shareUrl: string;
  saveState: ExpenseSaveState;
  saveMessage: string;
  savedRecordId: string;
  isLoggedIn: boolean;
  profileLabel: string;
}>();

const emit = defineEmits<{
  (e: "reset"): void;
  (e: "login"): void;
  (e: "save"): void;
  (e: "share"): void;
  (e: "logout"): void;
}>();

const shareLabel = computed(() => {
  if (props.shareState === "busy") return "Preparing link";
  if (props.shareState === "copied") return "Link copied";
  if (props.shareState === "shared") return "Link shared";
  if (props.shareState === "ready") return "Link ready";

  return "Share link";
});

const isShareConfirmed = computed(() =>
  ["copied", "shared", "ready"].includes(props.shareState),
);

const saveLabel = computed(() => {
  if (props.saveState === "logging-in") return "Logging in";
  if (props.saveState === "saving") return "Saving";
  if (props.saveState === "saved") return "Saved";
  if (props.saveState === "login-required") return "Login to save";

  return "Save";
});

const isSaveBusy = computed(() =>
  props.saveState === "logging-in" || props.saveState === "saving",
);

function selectShareUrl(event: FocusEvent) {
  const input = event.target as HTMLInputElement | null;
  input?.select();
}
</script>

<template>
  <div
    class="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between"
  >
    <div>
      <h1 class="text-xl font-bold leading-tight">Expense Tracker</h1>
      <p class="mt-2 max-w-xl text-gray-600 dark:text-white/60">
        Track your spending with budget + insights. No signup, just vibes.
      </p>
    </div>

    <div class="flex flex-col gap-2 sm:items-end">
      <div class="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <button
          class="w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 dark:border-white/10 dark:bg-white/[0.06] dark:text-white/75 dark:hover:bg-white/[0.10] dark:hover:text-white sm:w-auto"
          type="button"
          @click="emit('reset')"
        >
          Reset
        </button>

        <button
          v-if="!isLoggedIn"
          class="w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 dark:border-white/10 dark:bg-white/[0.06] dark:text-white/75 dark:hover:bg-white/[0.10] dark:hover:text-white sm:w-auto"
          type="button"
          @click="emit('login')"
        >
          Login
        </button>

        <button
          class="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-gray-700 transition hover:bg-gray-100 disabled:cursor-wait disabled:opacity-70 dark:border-white/10 dark:bg-white/[0.06] dark:text-white/75 dark:hover:bg-white/[0.10] dark:hover:text-white sm:w-auto"
          type="button"
          :aria-busy="isSaveBusy"
          :aria-label="saveLabel"
          :disabled="isSaveBusy"
          @click="emit('save')"
        >
          <svg
            v-if="saveState !== 'saved'"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            class="h-4 w-4"
          >
            <path
              fill="currentColor"
              d="M17 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7l-4-4Zm-5 16a3 3 0 1 1 0-6 3 3 0 0 1 0 6Zm3-10H5V5h10v4Z"
            />
          </svg>
          <svg
            v-else
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            class="h-4 w-4"
          >
            <path
              fill="currentColor"
              d="M9.55 18.2 4.8 13.45l1.4-1.4 3.35 3.35 8.25-8.25 1.4 1.4-9.65 9.65Z"
            />
          </svg>

          <span class="text-sm font-medium">
            {{ saveLabel }}
          </span>
        </button>

        <button
          class="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-black px-4 py-2 text-white transition hover:opacity-90 disabled:cursor-wait disabled:opacity-70 dark:bg-cyan-200 dark:text-slate-950 dark:hover:bg-cyan-100 sm:w-auto"
          type="button"
          :aria-busy="shareState === 'busy'"
          :aria-label="shareLabel"
          :disabled="shareState === 'busy'"
          @click="emit('share')"
        >
          <svg
            v-if="!isShareConfirmed"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            class="h-4 w-4"
          >
            <path
              fill="currentColor"
              d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7a2.5 2.5 0 0 0 0-1.39l7-4.11A2.99 2.99 0 1 0 14 5a2.9 2.9 0 0 0 .05.52l-7 4.11a3 3 0 1 0 0 4.74l7.05 4.11c-.03.17-.05.34-.05.52a3 3 0 1 0 3-2.92Z"
            />
          </svg>
          <svg
            v-else
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            class="h-4 w-4"
          >
            <path
              fill="currentColor"
              d="M9.55 18.2 4.8 13.45l1.4-1.4 3.35 3.35 8.25-8.25 1.4 1.4-9.65 9.65Z"
            />
          </svg>

          <span class="text-sm font-medium">
            {{ shareLabel }}
          </span>
        </button>
      </div>

      <div
        v-if="saveMessage || isLoggedIn"
        class="w-full text-xs text-gray-500 dark:text-white/50 sm:max-w-xs sm:text-right"
      >
        <p v-if="saveMessage">{{ saveMessage }}</p>
        <p v-if="savedRecordId" class="mt-1 font-mono">
          {{ savedRecordId }}
        </p>
        <p v-if="isLoggedIn && profileLabel" class="mt-1">
          {{ profileLabel }}
        </p>
        <button
          v-if="isLoggedIn"
          class="mt-1 font-semibold text-gray-700 underline-offset-2 hover:underline dark:text-white/70"
          type="button"
          @click="emit('logout')"
        >
          Logout save session
        </button>
      </div>

      <div v-if="shareState === 'ready' && shareUrl" class="w-full sm:max-w-xs">
        <label class="sr-only" for="expense-share-url">
          Expense Tracker share URL
        </label>
        <input
          id="expense-share-url"
          class="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-xs text-gray-700 outline-none focus:ring-2 focus:ring-black/10 dark:border-white/10 dark:bg-white/[0.06] dark:text-white/75 dark:focus:ring-cyan-200/15"
          readonly
          :value="shareUrl"
          @focus="selectShareUrl"
        />
        <p class="mt-1 text-xs text-gray-500 dark:text-white/50">
          Your browser blocked auto-copy. Tap the field to select the link.
        </p>
      </div>
    </div>
  </div>
</template>
