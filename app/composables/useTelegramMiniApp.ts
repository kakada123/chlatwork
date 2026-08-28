export function getTelegramMiniApp() {
  return import.meta.client ? window.Telegram?.WebApp : undefined;
}

export function useTelegramMiniApp() {
  const webApp = getTelegramMiniApp();
  return {
    webApp,
    isMiniApp: Boolean(webApp?.initData),
  };
}
