import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAlphabetVoiceEntries,
  buildEnglishNumberVoiceEntries,
} from "../app/lib/alphabet-voice.ts";

test("builds English and Khmer A-Z audio entries plus Khmer numbers from 0 to 100", () => {
  const entries = buildAlphabetVoiceEntries();

  assert.equal(entries.length, 153);
  assert.deepEqual(entries[0], {
    fileName: "A",
    language: "en",
    text: "A",
    voice: "english-default",
  });
  assert.deepEqual(entries[26], {
    fileName: "A-khmer",
    language: "km",
    text: "អេ",
    voice: "khmer-female-nisa",
  });
  assert.deepEqual(entries[51], {
    fileName: "Z-khmer",
    language: "km",
    text: "ហ្ស៊ី",
    voice: "khmer-female-nisa",
  });
  assert.deepEqual(entries[152], {
    fileName: "100",
    language: "km",
    text: "១០០",
    voice: "khmer-female-nisa",
  });
});

test("uses unique filenames for every generated audio file", () => {
  const fileNames = buildAlphabetVoiceEntries().map((entry) => entry.fileName);

  assert.equal(new Set(fileNames).size, fileNames.length);
});

test("builds English number audio entries from 0 to 100", () => {
  const entries = buildEnglishNumberVoiceEntries();

  assert.equal(entries.length, 101);
  assert.deepEqual(entries[0], {
    fileName: "0",
    language: "en",
    text: "0",
    voice: "english-default",
  });
  assert.deepEqual(entries[100], {
    fileName: "100",
    language: "en",
    text: "100",
    voice: "english-default",
  });
});
