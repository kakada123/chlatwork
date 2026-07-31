export const GOOGLE_CONSENT_UPDATE_EVENT =
  "chlatwork:google-consent-update";

export type GoogleConsentState = "granted" | "denied";

export type GoogleConsentUpdate = {
  analytics_storage: GoogleConsentState;
  ad_storage: GoogleConsentState;
  ad_user_data: GoogleConsentState;
  ad_personalization: GoogleConsentState;
};

export function updateGoogleConsent(consent: GoogleConsentUpdate) {
  if (!import.meta.client) {
    return;
  }

  window.gtag?.("consent", "update", consent);
}

export function announceGoogleConsentUpdate(consent: GoogleConsentUpdate) {
  if (!import.meta.client) {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<GoogleConsentUpdate>(GOOGLE_CONSENT_UPDATE_EVENT, {
      detail: consent,
    }),
  );
}
