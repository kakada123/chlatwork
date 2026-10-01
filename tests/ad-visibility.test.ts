import assert from "node:assert/strict";
import test from "node:test";
import { canShowAdsForUser } from "../app/lib/ad-visibility.ts";

test("ads wait until the current session has been resolved", () => {
  for (const user of [null, { name: null }, { name: "Other" }]) {
    assert.equal(canShowAdsForUser(false, user), false);
  }
});

test("Kakada sees no ads regardless of capitalization or surrounding spaces", () => {
  for (const name of ["Kakada", "kakada", "KaKada", " Kakada "]) {
    assert.equal(canShowAdsForUser(true, { name }), false);
  }
});

test("resolved guests and other users remain eligible for ads", () => {
  for (const user of [null, { name: null }, { name: "" }, { name: "Other" }]) {
    assert.equal(canShowAdsForUser(true, user), true);
  }
});

test("the exemption matches the full name rather than a substring", () => {
  for (const name of ["Kakada Team", "Other Kakada", "Kakadas"]) {
    assert.equal(canShowAdsForUser(true, { name }), true);
  }
});
