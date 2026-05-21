import {
  closeCookieNotice,
  isCookieNoticeClosed,
} from "~/lib/cookie-notice";

export function useCookieNotice() {
  const isNoticeVisible = useState("cookie-notice:visible", () => false);

  const initializeCookieNotice = () => {
    if (!process.client) {
      return;
    }

    isNoticeVisible.value = !isCookieNoticeClosed();
  };

  const showCookieNotice = () => {
    isNoticeVisible.value = true;
  };

  const dismissCookieNotice = () => {
    // This notice is informational only; closing it never changes analytics or ad loading.
    closeCookieNotice();
    isNoticeVisible.value = false;
  };

  return {
    dismissCookieNotice,
    initializeCookieNotice,
    isNoticeVisible,
    showCookieNotice,
  };
}
