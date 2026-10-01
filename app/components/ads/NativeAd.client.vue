<template>
  <section
    class="mt-8 overflow-hidden"
    aria-label="Advertisement"
  >
    <p class="mb-2 text-center text-xs text-slate-500 dark:text-white/50">
      {{ isKhmer ? "ពាណិជ្ជកម្ម" : "Advertisement" }}
    </p>
    <div ref="adHost">
      <div id="container-5d4bd0416bc83aa83b06fe7a1483af82"></div>
    </div>
  </section>
</template>

<script setup lang="ts">
const { isKhmer } = useLanguage();
const adHost = ref<HTMLDivElement | null>(null);

onMounted(() => {
  // Insert only after the container exists; Vue templates do not execute scripts.
  const script = document.createElement("script");
  script.async = true;
  script.setAttribute("data-cfasync", "false");
  script.src =
    "https://pl31601583.profitableratecpmnetwork.com/5d4bd0416bc83aa83b06fe7a1483af82/invoke.js";
  adHost.value?.appendChild(script);
});
</script>
