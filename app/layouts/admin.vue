<template>
  <div class="admin-viewport">
    <!-- The admin overview owns the viewport; long detail panels scroll inside it. -->
    <slot />
  </div>
</template>

<style scoped>
.admin-viewport {
  height: 100dvh;
  min-height: 0;
  overflow: hidden;
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
}
</style>
