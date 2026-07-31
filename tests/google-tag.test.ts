import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const readProjectFile = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("Google tag is installed once with denied consent defaults first", () => {
  const config = readProjectFile("nuxt.config.ts");
  const tagUrls = config.match(
    /https:\/\/www\.googletagmanager\.com\/gtag\/js/g,
  );

  assert.equal(tagUrls?.length, 1);
  assert.ok(
    config.indexOf('gtag("consent", "default"') <
      config.indexOf("www.googletagmanager.com/gtag/js"),
  );

  for (const consentType of [
    "analytics_storage",
    "ad_storage",
    "ad_user_data",
    "ad_personalization",
  ]) {
    assert.match(config, new RegExp(`${consentType}: "denied"`));
  }
});

test("SPA page views use the configured measurement ID without reinserting the tag", () => {
  const plugin = readProjectFile("app/plugins/google-tag.client.ts");

  assert.match(plugin, /window\.gtag\("event", "page_view"/);
  assert.match(plugin, /send_to: measurementId/);
  assert.match(plugin, /lastTrackedPath/);
  assert.doesNotMatch(plugin, /createElement\("script"\)/);
});

test("consent updates require an explicit CMP integration event", () => {
  const consent = readProjectFile("app/lib/google-consent.ts");
  const notice = readProjectFile("app/composables/useCookieNotice.ts");

  assert.match(consent, /GOOGLE_CONSENT_UPDATE_EVENT/);
  assert.match(consent, /window\.gtag\?\.\("consent", "update"/);
  assert.doesNotMatch(notice, /updateGoogleConsent|announceGoogleConsentUpdate/);
});
