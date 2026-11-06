import assert from "node:assert/strict";
import test from "node:test";
import { getPortfolioCopy } from "../app/data/portfolio-km.ts";
import { BUSINESS_SERVICES } from "../app/data/services.ts";
import { localizeBusinessService } from "../app/data/services-km.ts";
import { localizeBotCode } from "../app/lib/bot-ui-copy.ts";

const khmer = /[\u1780-\u17ff]/;

test("portfolio Khmer copy covers prose while keeping identity, links and visual assets intact", () => {
  const english = getPortfolioCopy("en");
  const translated = getPortfolioCopy("km");
  assert.equal(translated.profile.name, english.profile.name);
  assert.match(translated.profile.tagline, khmer);
  for (const text of [...translated.about, ...translated.highlights]) assert.match(text, khmer);
  for (const group of ["skills", "projects", "workingStyle"] as const) {
    assert.equal(translated[group].length, english[group].length);
    translated[group].forEach((item, index) => {
      assert.match(item.description, khmer);
      assert.deepEqual(item.icon, english[group][index].icon);
    });
  }
  assert.deepEqual(translated.contacts.map(item => item.href), english.contacts.map(item => item.href));
  assert.deepEqual(getPortfolioCopy("en"), english);
});

test("business service translations preserve route and price contracts", () => {
  for (const original of BUSINESS_SERVICES) {
    const translated = localizeBusinessService(original, "km");
    assert.equal(translated.slug, original.slug);
    assert.equal(translated.route, original.route);
    assert.equal(translated.startingPrice, original.startingPrice);
    for (const field of ["name", "shortName", "title", "description", "metaTitle", "metaDescription", "priceNote", "deliveryTime"] as const) assert.match(translated[field], khmer);
    for (const field of ["highlights", "features", "idealFor", "process"] as const) {
      assert.equal(translated[field].length, original[field].length);
      translated[field].forEach(value => assert.match(value, khmer));
    }
    assert.equal(localizeBusinessService(original, "en"), original);
  }
});

test("bot display formatting translates known codes and preserves unknown future codes", () => {
  assert.equal(localizeBotCode("APPROVED", "km"), "បានអនុម័ត");
  assert.equal(localizeBotCode("VOTE_RESET", "km"), "បានកំណត់ការបោះឆ្នោតឡើងវិញ");
  assert.equal(localizeBotCode("APPROVED", "en"), "APPROVED");
  assert.equal(localizeBotCode("FUTURE_EVENT", "km"), "FUTURE_EVENT");
});
