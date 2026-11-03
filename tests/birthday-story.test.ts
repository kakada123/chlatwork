import assert from "node:assert/strict";
import test from "node:test";
import { createBirthdayStorySettings, getBirthdayStoryScenes, readBirthdayStorySettings, validBirthdayMemoryDate, BIRTHDAY_STORY_THEMES } from "../app/lib/birthday-story.ts";
import { readBirthdayStorySettings as readBackendSettings } from "../api/src/moments/birthday-story.ts";
import { buildPreviewMoment, getMomentFormError } from "../app/lib/moments.ts";
import type { MomentDraft } from "../app/types/moment.ts";

const draft: MomentDraft = {
  recipientName: "សុភា", occasion: "BIRTHDAY", title: "រីករាយថ្ងៃកំណើត", message: "សូមជូនពរឱ្យមានសុភមង្គល។", secretMessage: "ជួបគ្នាល្ងាចនេះ។", theme: "ROMANTIC",
  specialDate: "", publishAt: "", eventDate: "", venueName: "", eventAddress: "", mapUrl: "", dressCode: "", eventSchedule: "", hostName: "", pollQuestion: "", pollOptions: ["", ""], pollIdentityMode: "ANONYMOUS",
};

test("birthday story defaults preserve Simple Mode and factory state is independent", () => {
  const first = createBirthdayStorySettings(), second = createBirthdayStorySettings();
  assert.equal(first.enabled, false);
  assert.equal(first.scenes.length, 6);
  first.cake.candles = 12;
  first.scenes.pop();
  assert.equal(second.cake.candles, 3);
  assert.equal(second.scenes.length, 6);
  assert.equal(readBirthdayStorySettings(undefined), null);
});

test("frontend and independent API accept the same settings without sharing runtime source", () => {
  for (const theme of BIRTHDAY_STORY_THEMES) {
    const settings = { ...createBirthdayStorySettings(), enabled: true, theme: theme.value, memories: [{ caption: "  ថ្ងៃដ៏ល្អ  ", date: "2024-02-29" }] };
    const parsed = readBirthdayStorySettings(settings)!;
    assert.deepEqual(readBackendSettings(settings), parsed);
    assert.equal(parsed.memories[0]!.caption, "ថ្ងៃដ៏ល្អ");
    assert.notEqual(parsed.cake, settings.cake);
  }
});

test("malformed or incoherent story settings are rejected identically by both deployments", () => {
  const defaults = createBirthdayStorySettings();
  for (const change of [
    { version: 2 }, { enabled: "true" }, { theme: "UNKNOWN" }, { scenes: [] },
    { scenes: ["cake", "gift"] }, { scenes: ["celebration", "message"] }, { scenes: ["message", "message"] },
    { scenes: ["unknown"] }, { cake: { design: "CLASSIC", candles: 13 } }, { cake: { design: "RAW", candles: 3 } },
    { cake: { design: "CLASSIC", candles: 1.5 } }, { teaser: "x".repeat(161) },
    { memories: [{ caption: "x", date: "2026-02-29" }] }, { memories: [{ caption: "x".repeat(201), date: "" }] },
    { memories: Array(11).fill({ caption: "", date: "" }) }, { allowReplay: "true" }, { allowReactions: null },
  ]) {
    assert.equal(readBirthdayStorySettings({ ...defaults, ...change }), null, JSON.stringify(change));
    assert.equal(readBackendSettings({ ...defaults, ...change }), null, JSON.stringify(change));
  }
});

test("scene order respects disabled and missing content, with a safe message fallback", () => {
  const settings = createBirthdayStorySettings();
  settings.enabled = true;
  settings.scenes = ["gift", "secret", "message", "cake", "memories", "celebration"];
  assert.deepEqual(getBirthdayStoryScenes(settings, { photoCount: 0, hasSecret: false }), ["gift", "message", "cake", "celebration"]);
  settings.scenes = ["memories", "secret"];
  assert.deepEqual(getBirthdayStoryScenes(settings, { photoCount: 0, hasSecret: false }), ["message"]);
  assert.equal(validBirthdayMemoryDate("2026-02-29"), false);
  assert.equal(validBirthdayMemoryDate("2024-02-29"), true);
});

test("preview persists story metadata and Story Mode can omit photos or a disabled secret", () => {
  const settings = { ...createBirthdayStorySettings(), enabled: true, scenes: ["gift", "message", "celebration"] as const };
  const storyDraft = { ...draft, birthdayStory: { ...settings, scenes: [...settings.scenes] }, secretMessage: "" };
  assert.equal(getMomentFormError(storyDraft, 0), "");
  const preview = buildPreviewMoment(storyDraft, []);
  assert.deepEqual(preview.blocks[0]!.data.birthdayStory, storyDraft.birthdayStory);
  assert.equal(preview.blocks.find((block) => block.type === "MESSAGE")!.data.message, draft.message);
  assert.ok(getMomentFormError(draft, 0));
  assert.equal(buildPreviewMoment({ ...storyDraft, occasion: "WEDDING" }, []).blocks[0]!.data.birthdayStory, undefined);
});
