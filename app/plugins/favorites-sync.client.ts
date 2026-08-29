export default defineNuxtPlugin(() => {
  const { user, isReady } = useAuth();
  const { loadFavorites } = useAccountFavorites();

  function refreshFocusedAccount() {
    if (isReady.value && user.value) void loadFavorites(true);
  }

  // Revalidate after another tab or device may have changed the account's server-owned favorites.
  window.addEventListener("focus", refreshFocusedAccount);
  onScopeDispose(() => window.removeEventListener("focus", refreshFocusedAccount));
});
