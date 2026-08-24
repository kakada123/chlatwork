<script setup lang="ts">
const emit = defineEmits<{ login: [] }>();
const showLogin = ref(false);

function openLogin() {
  emit('login');
  showLogin.value = true;
}
</script>

<template>
  <section class="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-sky-200 bg-sky-50 p-6 text-center dark:border-cyan-300/25 dark:bg-cyan-300/10">
    <div class="flex h-12 w-12 items-center justify-center rounded-full bg-sky-600 text-xl text-white" aria-hidden="true">🔒</div>
    <h2 class="mt-4 text-xl font-semibold">Sign in to view your result</h2>
    <p class="mt-2 max-w-md text-sm text-gray-600 dark:text-white/65">
      Your current input stays on this page. After Google or Telegram login,
      ChlatWork returns you here to view and save the result.
    </p>
    <button type="button" class="mt-5 rounded-xl bg-sky-600 px-5 py-3 font-bold text-white transition hover:bg-sky-700" @click="openLogin">
      Continue to login
    </button>
    <AuthLoginDialog :open="showLogin" @close="showLogin = false" />
  </section>
</template>
