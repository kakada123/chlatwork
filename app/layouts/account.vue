<template>
  <div class="account-layout">
    <NuxtLayout name="default">
      <slot />
    </NuxtLayout>
  </div>
</template>

<style scoped>
@media (min-width: 1024px) {
  /* Reuse the shared chrome while giving the account workspace the remaining viewport. */
  .account-layout {
    height: 100dvh;
    overflow: hidden;
  }

  .account-layout :deep(> div) {
    height: 100%;
    min-height: 0;
  }

  .account-layout :deep(.site-header) {
    flex-shrink: 0;
  }

  .account-layout :deep(> div > .flex-1) {
    display: flex;
    min-height: 0;
  }

  .account-layout :deep(> div > .flex-1 > .site-container) {
    min-height: 0;
    padding-block: 1.25rem;
  }

  .account-layout :deep(.site-content) {
    min-height: 0;
  }

  /* Trust and policy links remain available in the account Information section. */
  .account-layout :deep(.site-footer) {
    display: none;
  }
}
</style>
