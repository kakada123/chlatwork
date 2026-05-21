import {
  createCookieConsentPreferences,
  readStoredCookieConsent,
  syncConsentScripts,
  writeStoredCookieConsent,
  type CookieConsentPreferences,
} from "~/lib/cookie-consent";

function defaultCookieConsentPreferences() {
  return createCookieConsentPreferences();
}

export function useCookieConsent() {
  const isInitialized = useState("cookie-consent:initialized", () => false);
  const hasStoredChoice = useState("cookie-consent:has-stored-choice", () => false);
  const isBannerVisible = useState("cookie-consent:banner-visible", () => false);
  const isSettingsOpen = useState("cookie-consent:settings-open", () => false);
  const preferences = useState<CookieConsentPreferences>(
    "cookie-consent:preferences",
    defaultCookieConsentPreferences,
  );

  const initializeCookieConsent = () => {
    if (!process.client || isInitialized.value) {
      return;
    }

    const storedPreferences = readStoredCookieConsent();

    if (storedPreferences) {
      preferences.value = storedPreferences;
      hasStoredChoice.value = true;
      isBannerVisible.value = false;
      syncConsentScripts(storedPreferences);
    } else {
      preferences.value = defaultCookieConsentPreferences();
      hasStoredChoice.value = false;
      isBannerVisible.value = true;
      syncConsentScripts(preferences.value);
    }

    isInitialized.value = true;
  };

  const openSettings = () => {
    isSettingsOpen.value = true;
    isBannerVisible.value = false;
  };

  const closeSettings = () => {
    isSettingsOpen.value = false;
    isBannerVisible.value = !hasStoredChoice.value;
  };

  const savePreferences = (
    nextPreferences: Partial<Pick<CookieConsentPreferences, "analytics" | "ads">>,
  ) => {
    const normalizedPreferences = createCookieConsentPreferences(nextPreferences);

    preferences.value = normalizedPreferences;
    hasStoredChoice.value = true;
    isBannerVisible.value = false;
    isSettingsOpen.value = false;

    writeStoredCookieConsent(normalizedPreferences);

    // Optional scripts are synced only after the saved choice changes.
    syncConsentScripts(normalizedPreferences);
  };

  const acceptAll = () => savePreferences({ analytics: true, ads: true });
  const rejectOptional = () => savePreferences({ analytics: false, ads: false });

  return {
    acceptAll,
    closeSettings,
    hasStoredChoice,
    initializeCookieConsent,
    isBannerVisible,
    isSettingsOpen,
    openSettings,
    preferences,
    rejectOptional,
    savePreferences,
  };
}
