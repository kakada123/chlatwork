<script setup lang="ts">
const root = ref<HTMLElement | null>(null);
let shell: HTMLElement | null = null;
let frame = 0;
function resizeViewport() {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(() => {
    // Mobile keyboards resize the visual viewport even when CSS viewport units stay unchanged.
    const height = window.visualViewport?.height ?? window.innerHeight;
    shell?.style.setProperty("--moment-editor-viewport-height", `${height}px`);
  });
}
onMounted(() => {
  shell = root.value?.closest<HTMLElement>(".app-shell") ?? null;
  resizeViewport();
  window.addEventListener("resize", resizeViewport);
  window.visualViewport?.addEventListener("resize", resizeViewport);
});
onBeforeUnmount(() => {
  cancelAnimationFrame(frame);
  window.removeEventListener("resize", resizeViewport);
  window.visualViewport?.removeEventListener("resize", resizeViewport);
  shell?.style.removeProperty("--moment-editor-viewport-height");
});
</script>

<template>
  <div ref="root" class="moment-editor-layout">
    <NuxtLayout name="default"><slot /></NuxtLayout>
  </div>
</template>

<style scoped>
/* Chrome takes its natural height; only the active form panel owns vertical scrolling. */
.moment-editor-layout { flex: 1; min-height: 0; overflow: hidden; }
.moment-editor-layout :deep(> div) { height: 100%; min-height: 0; }
.moment-editor-layout :deep(> div > header) { flex-shrink: 0; }
.moment-editor-layout :deep(> div > .flex-1) { display: flex; min-height: 0; }
.moment-editor-layout :deep(> div > .flex-1 > .site-container) { flex: 1; min-height: 0; padding-block: .65rem; }
.moment-editor-layout :deep(.site-content) { display: flex; min-height: 0; overflow: hidden; }
.moment-editor-layout :deep(.moments-creator:not(.birthday-wizard)) { overflow-y: auto; }
/* Keep mobile navigation in flow instead of guessing a bottom inset or overlapping the form. */
.moment-editor-layout :deep(> div > nav) { position: static; flex-shrink: 0; }
.moment-editor-layout :deep(.site-footer) { display: none; }
@media (min-width: 640px) {
  .moment-editor-layout :deep(> div > .flex-1 > .site-container) { padding-block: 1rem; }
}
</style>
