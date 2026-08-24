<script setup lang="ts">
import { LockKeyhole, X } from "lucide-vue-next";

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ close: []; success: [] }>();
const errorMessage = ref("");
const dialog = ref<HTMLDivElement | null>(null);
let previousOverflow = "";

watch(() => props.open, async (open) => {
  if (!import.meta.client) return;
  if (open) {
    errorMessage.value = "";
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    await nextTick();
    dialog.value?.focus();
  } else {
    document.body.style.overflow = previousOverflow;
  }
});

onBeforeUnmount(() => {
  if (import.meta.client) document.body.style.overflow = previousOverflow;
});

function completeLogin() {
  emit("success");
  emit("close");
}
</script>

<template>
  <Teleport to="body">
    <Transition enter-active-class="transition duration-150 ease-out" enter-from-class="opacity-0" leave-active-class="transition duration-100 ease-in" leave-to-class="opacity-0">
      <div v-if="props.open" class="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" @click.self="emit('close')">
        <div ref="dialog" role="dialog" aria-modal="true" aria-labelledby="login-dialog-title" tabindex="-1" class="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl outline-none dark:border-white/15 dark:bg-[#101214] sm:p-7" @keydown.esc.prevent="emit('close')">
          <div class="flex items-start justify-between gap-4">
            <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100 text-sky-700 dark:bg-cyan-300/10 dark:text-cyan-200">
              <LockKeyhole class="h-5 w-5" aria-hidden="true" />
            </div>
            <button type="button" class="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-white/50 dark:hover:bg-white/10 dark:hover:text-white" aria-label="Close login dialog" @click="emit('close')">
              <X class="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          <h2 id="login-dialog-title" class="mt-5 text-2xl font-semibold text-slate-950 dark:text-white">Sign in to continue</h2>
          <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-white/60">View protected results and keep your calculations safely connected to your account.</p>
          <p v-if="errorMessage" role="alert" class="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:bg-red-500/10 dark:text-red-300">{{ errorMessage }}</p>
          <AuthSocialAuthButtons @success="completeLogin" @error="errorMessage = $event" />
          <p class="mt-5 text-center text-xs leading-5 text-slate-500 dark:text-white/40">By continuing, you agree to the <NuxtLink to="/terms" class="underline">Terms</NuxtLink> and acknowledge the <NuxtLink to="/privacy-policy" class="underline">Privacy Policy</NuxtLink>.</p>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
