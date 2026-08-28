interface TelegramMiniAppApi {
  initData: string;
  initDataUnsafe?: { start_param?: string };
  openLink(url: string): void;
  ready(): void;
}

interface Window {
  Telegram?: { WebApp?: TelegramMiniAppApi };
}
