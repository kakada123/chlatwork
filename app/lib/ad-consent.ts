export const CERTIFIED_AD_CONSENT_READY_EVENT =
  "chlatwork:certified-ad-consent-ready";

type TcfData = {
  eventStatus?: "tcloaded" | "cmpuishown" | "useractioncomplete";
  gdprApplies?: boolean;
  tcString?: string;
};

type TcfApi = (
  command: "addEventListener",
  version: 2,
  callback: (data: TcfData, success: boolean) => void,
) => void;

declare global {
  interface Window {
    __tcfapi?: TcfApi;
  }
}

export function announceCertifiedAdConsentReady() {
  if (!import.meta.client) {
    return;
  }

  window.dispatchEvent(new Event(CERTIFIED_AD_CONSENT_READY_EVENT));
}

export function listenForCertifiedAdConsent(onReady: () => void) {
  if (!import.meta.client || typeof window.__tcfapi !== "function") {
    return;
  }

  window.__tcfapi("addEventListener", 2, (data, success) => {
    if (!success) {
      return;
    }

    const hasResolvedChoice =
      data.gdprApplies === false ||
      (Boolean(data.tcString) &&
        (data.eventStatus === "tcloaded" ||
          data.eventStatus === "useractioncomplete"));

    if (hasResolvedChoice) {
      onReady();
    }
  });
}
