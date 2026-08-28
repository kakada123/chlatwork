export default defineNuxtPlugin(() => {
  const telegram = getTelegramMiniApp();
  const result = telegram?.initDataUnsafe?.start_param;
  if (result !== "google_linked" && result !== "google_failed") return;

  telegram.ready();
  // This untrusted field controls UX only; account identity still comes from server-verified initData.
  return navigateTo({
    path: "/account",
    query: { google: result === "google_linked" ? "linked" : "failed" },
  });
});
