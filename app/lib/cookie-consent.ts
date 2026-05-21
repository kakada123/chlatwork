export type CookieConsentPreferences = {
  version: 1;
  necessary: true;
  analytics: boolean;
  ads: boolean;
  updatedAt: string;
};

export const COOKIE_CONSENT_STORAGE_KEY = "chlatwork-cookie-consent-v1";
export const COOKIE_CONSENT_OPEN_EVENT = "chlatwork:open-cookie-settings";

const GOOGLE_ADSENSE_CLIENT = "ca-pub-4280865455316436";
const GOOGLE_ADSENSE_SCRIPT_ID = "chlatwork-google-adsense";
let activeScriptConsent = { analytics: false, ads: false };

declare global {
  interface Window {
    adsbygoogle?: unknown[];
    va?: (event: "beforeSend" | "event" | "pageview", properties?: unknown) => void;
    vaq?: [string, unknown?][];
  }
}

export function createCookieConsentPreferences(
  input: Partial<Pick<CookieConsentPreferences, "analytics" | "ads">> = {},
): CookieConsentPreferences {
  return {
    version: 1,
    necessary: true,
    analytics: Boolean(input.analytics),
    ads: Boolean(input.ads),
    updatedAt: new Date().toISOString(),
  };
}

export function readStoredCookieConsent() {
  if (!process.client) {
    return null;
  }

  try {
    const storedValue = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);

    if (!storedValue) {
      return null;
    }

    return normalizeCookieConsent(JSON.parse(storedValue));
  } catch {
    return null;
  }
}

export function writeStoredCookieConsent(preferences: CookieConsentPreferences) {
  if (!process.client) {
    return;
  }

  window.localStorage.setItem(
    COOKIE_CONSENT_STORAGE_KEY,
    JSON.stringify(preferences),
  );
}

export function syncConsentScripts(preferences: CookieConsentPreferences) {
  if (!process.client) {
    return;
  }

  // Keep optional third-party scripts behind saved consent instead of Nuxt head config.
  activeScriptConsent = {
    analytics: preferences.analytics,
    ads: preferences.ads,
  };

  if (preferences.analytics) {
    void loadVercelAnalytics();
  } else {
    disableVercelAnalytics();
  }

  if (preferences.ads) {
    loadGoogleAdsense();
  } else {
    disableGoogleAdsense();
  }
}

function normalizeCookieConsent(value: unknown) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<CookieConsentPreferences>;

  return {
    version: 1,
    necessary: true,
    analytics: Boolean(candidate.analytics),
    ads: Boolean(candidate.ads),
    updatedAt:
      typeof candidate.updatedAt === "string"
        ? candidate.updatedAt
        : new Date().toISOString(),
  } satisfies CookieConsentPreferences;
}

async function loadVercelAnalytics() {
  if (document.querySelector('script[data-sdkn^="@vercel/analytics"]')) {
    return;
  }

  const { inject } = await import("@vercel/analytics");

  if (!activeScriptConsent.analytics) {
    return;
  }

  inject({ framework: "nuxt" });
}

function disableVercelAnalytics() {
  document
    .querySelectorAll('script[data-sdkn^="@vercel/analytics"]')
    .forEach((script) => script.remove());

  window.va = undefined;
  window.vaq = [];
}

function loadGoogleAdsense() {
  if (document.getElementById(GOOGLE_ADSENSE_SCRIPT_ID)) {
    return;
  }

  window.adsbygoogle = window.adsbygoogle || [];

  const script = document.createElement("script");
  script.id = GOOGLE_ADSENSE_SCRIPT_ID;
  script.async = true;
  script.crossOrigin = "anonymous";
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${GOOGLE_ADSENSE_CLIENT}`;
  document.head.appendChild(script);
}

function disableGoogleAdsense() {
  document.getElementById(GOOGLE_ADSENSE_SCRIPT_ID)?.remove();
}
