import assert from "node:assert/strict";
import test from "node:test";
import { checkTranslationCalls } from "../scripts/check-i18n.mjs";

test("translation source checker rejects missing locale keys", () => {
  assert.deepEqual(checkTranslationCalls("t('tools.qr.generate')"), []);
  assert.match(checkTranslationCalls("t('tools.qr.missing_key')")[0].issue, /missing language entry/);
});

test("translation source checker checks named parameters without confusing machine locale choices", () => {
  assert.deepEqual(checkTranslationCalls("const locale = isKhmer ? 'km' : 'en'"), []);
  const findings = checkTranslationCalls("t('catalog.common.title')");
  assert.match(findings[0].issue, /missing parameters: name/);
  assert.deepEqual(checkTranslationCalls("t('catalog.common.title', { name: userName })"), []);
});
