export const COOKIE_NOTICE_STORAGE_KEY = "chlatwork_cookie_notice_closed";
export const COOKIE_NOTICE_OPEN_EVENT = "chlatwork:open-cookie-notice";

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
