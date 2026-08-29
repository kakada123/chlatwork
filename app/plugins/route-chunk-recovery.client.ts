const RELOAD_STORAGE_KEY = "chlatwork:route-chunk-reload";
const RELOAD_COOLDOWN_MS = 10_000;

export default defineNuxtPlugin(() => {
  window.addEventListener("vite:preloadError", (event) => {
    const lastReloadAt = Number(window.sessionStorage.getItem(RELOAD_STORAGE_KEY));

    if (Number.isFinite(lastReloadAt) && Date.now() - lastReloadAt < RELOAD_COOLDOWN_MS) {
      return;
    }

    // Recover an old open deployment only when its lazy route chunk is genuinely unavailable.
    event.preventDefault();
    window.sessionStorage.setItem(RELOAD_STORAGE_KEY, String(Date.now()));
    window.location.reload();
  });
});
