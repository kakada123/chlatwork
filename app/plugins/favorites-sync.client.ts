export default defineNuxtPlugin(() => {
  const { user, isReady } = useAuth();
  const { favoritesLastLoadedAt, loadFavorites } = useAccountFavorites();
  const focusRefreshMaxAgeMs = 60_000;

  function refreshFocusedAccount() {
    if (!isReady.value || !user.value) return;
    if (Date.now() - favoritesLastLoadedAt.value < focusRefreshMaxAgeMs) return;
    void loadFavorites(true);
  }

  // Revalidate stale account data without refetching on every Telegram focus transition.
  window.addEventListener("focus", refreshFocusedAccount);
  onScopeDispose(() => window.removeEventListener("focus", refreshFocusedAccount));
});
