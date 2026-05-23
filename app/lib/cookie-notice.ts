export const COOKIE_NOTICE_STORAGE_KEY = "chlatwork_cookie_notice_closed";
export const COOKIE_NOTICE_OPEN_EVENT = "chlatwork:open-cookie-notice";

type GoogleFundingChoices = {
  callbackQueue?: Array<() => void>;
  showRevocationMessage?: () => void;
};

declare global {
  interface Window {
    googlefc?: GoogleFundingChoices;
  }
}

export function isCookieNoticeClosed() {
  if (!process.client) {
    return true;
  }

  return window.localStorage.getItem(COOKIE_NOTICE_STORAGE_KEY) === "true";
}

export function closeCookieNotice() {
  if (!process.client) {
    return;
  }

  window.localStorage.setItem(COOKIE_NOTICE_STORAGE_KEY, "true");
}

export function reopenCookieNotice() {
  if (!process.client) {
    return;
  }

  window.localStorage.removeItem(COOKIE_NOTICE_STORAGE_KEY);
  window.dispatchEvent(new Event(COOKIE_NOTICE_OPEN_EVENT));
}

export function openPrivacyCookieSettings() {
  if (!process.client) {
    return false;
  }

  const googleFundingChoices = window.googlefc;

  if (typeof googleFundingChoices?.showRevocationMessage === "function") {
    // Google exposes this only when its certified CMP is available, so local dev and pre-approval pages fall back safely.
    googleFundingChoices.callbackQueue = googleFundingChoices.callbackQueue ?? [];
    googleFundingChoices.callbackQueue.push(googleFundingChoices.showRevocationMessage);

    return true;
  }

  reopenCookieNotice();

  return false;
}
