import assert from "node:assert/strict";
import test from "node:test";
import english from "../app/locales/en/index.ts";
import khmer from "../app/locales/km/index.ts";
import { hasTranslation, translateMessage } from "../app/lib/i18n.ts";

test("all semantic message keys have both English and Khmer copy", () => {
  assert.deepEqual(Object.keys(khmer).sort(), Object.keys(english).sort());
  for (const [key, value] of Object.entries(english)) {
    assert.match(key, /^[a-zA-Z][\w.-]+$/u, key);
    assert.equal(typeof value, "string", key);
    assert.equal(typeof (khmer as Record<string, unknown>)[key], "string", key);
    assert.ok(!(/^en(?:-[A-Z]+)?$/.test(value) && /^km(?:-[A-Z]+)?$/.test((khmer as Record<string, string>)[key]!)), `${key}: locale control values are not messages`);
  }
});

test("Vue I18n resolves the requested keyed API without request-wide language mutation", async () => {
  assert.equal(translateMessage("en", "tools.qr.generate"), "Generate");
  assert.equal(translateMessage("km", "tools.qr.generate"), "បង្កើត");
  const results = await Promise.all(Array.from({ length: 20 }, async (_, index) =>
    translateMessage(index % 2 ? "en" : "km", "tools.qr.generate"),
  ));
  assert.deepEqual(results, Array.from({ length: 20 }, (_, index) => index % 2 ? "Generate" : "បង្កើត"));
  assert.equal(translateMessage("km", "constructor"), "constructor");
  assert.equal(hasTranslation("km", "__proto__"), false);
});

test("message functions preserve literal symbols and all authored message text", () => {
  for (const [locale, catalog] of Object.entries({ en: english, km: khmer })) {
    for (const [key, value] of Object.entries(catalog)) assert.equal(translateMessage(locale as "en" | "km", key), value, `${locale}: ${key}`);
  }
});

test("named placeholders retain zero, escape no user content implicitly and ignore inherited values", () => {
  const key = Object.keys(english).find(key => (english as Record<string, string>)[key]?.includes("{count}"));
  assert.ok(key, "at least one real count message exists");
  const original = (english as Record<string, string>)[key]!;
  assert.equal(translateMessage("en", key, { count: 0 }), original.replaceAll("{count}", "0"));
  assert.equal(translateMessage("en", key, { count: "<person>@example.test | {original}" }), original.replaceAll("{count}", "<person>@example.test | {original}"));
  assert.equal(translateMessage("en", key, Object.create({ count: "inherited" })), original);
});
