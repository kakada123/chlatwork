import assert from "node:assert/strict";
import test from "node:test";
import { getBirthdayWizardStages, parseBirthdayUnlock } from "../app/lib/birthday-wizard.ts";

test("birthday wizard separates primary tasks and omits story-only screens in Simple Mode", () => {
  assert.deepEqual(getBirthdayWizardStages(true), ["recipient", "template", "scenes", "music", "cake", "photos", "wish", "message", "secret", "unlock", "preview"]);
  assert.deepEqual(getBirthdayWizardStages(false), ["recipient", "template", "music", "photos", "wish", "message", "unlock", "preview"]);
});

test("birthday entry challenge validates real month/day pairs without a birth year", () => {
  assert.deepEqual(parseBirthdayUnlock("29", "02"), { day: 29, month: 2 });
  assert.deepEqual(parseBirthdayUnlock("1", "1"), { day: 1, month: 1 });
  for (const [day, month] of [["31", "04"], ["30", "02"], ["00", "01"], ["01", "13"], ["", ""], ["2x", "02"], ["001", "01"]]) assert.equal(parseBirthdayUnlock(day!, month!), null);
});
