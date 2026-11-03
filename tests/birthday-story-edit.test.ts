import assert from "node:assert/strict";
import test from "node:test";
import { createBirthdayStorySettings } from "../app/lib/birthday-story.ts";
import { hydrateBirthdayMoment } from "../app/lib/birthday-story-edit.ts";

const owned = {
  id: "owned", slug: "same-link", status: "PUBLISHED", recipientName: "Neth", occasion: "BIRTHDAY", title: "Birthday", theme: "ROMANTIC", publishAt: "2020-01-02T03:04:00.000Z", expiresAt: null,
  blocks: [
    { type: "HERO", data: { birthdayStory: { ...createBirthdayStorySettings(), enabled: true, theme: "LUXURY_GOLD", memories: [{ caption: "Earlier", date: "2020-01-01" }, { caption: "Later", date: "2021-01-01" }] }, birthdayAudio: { trackId: "happy-birthday", startMs: 0, endMs: 2000 } } },
    { type: "MESSAGE", data: { message: "Your existing letter" } },
    { type: "SECRET", data: { message: "Your existing secret" } },
    { type: "COUNTER", data: { date: "2000-01-01" } },
  ],
  media: [{ id: "two", position: 1, url: "/api/moments/owned/edit/media/two" }, { id: "one", position: 0, url: "/api/moments/owned/edit/media/one" }],
};

test("owned birthday hydration retains saved content and private photo metadata in position order", () => {
  const result = hydrateBirthdayMoment(owned);
  assert.equal(result.draft.recipientName, "Neth");
  assert.equal(result.draft.message, "Your existing letter");
  assert.equal(result.draft.secretMessage, "Your existing secret");
  assert.equal(result.draft.birthdayStory?.theme, "LUXURY_GOLD");
  assert.equal(result.draft.birthdayAudio?.endMs, 2000);
  assert.equal(result.draft.specialDate, "2000-01-01");
  assert.equal(new Date(result.draft.publishAt).toISOString(), owned.publishAt);
  assert.deepEqual(result.photos.map(photo => [photo.existingMediaId, photo.caption]), [["one", "Earlier"], ["two", "Later"]]);
  assert.ok(result.photos.every(photo => photo.url.includes("/edit/media/")));
});

test("legacy birthdays hydrate Simple Mode and malformed owned responses reject", () => {
  const legacy = hydrateBirthdayMoment({ ...owned, publishAt: null, blocks: [{ type: "MESSAGE", data: { message: "Hello" } }] });
  assert.equal(legacy.draft.birthdayStory?.enabled, false);
  assert.equal(legacy.draft.publishAt, "");
  assert.throws(() => hydrateBirthdayMoment({ ...owned, occasion: "VOTING" }));
  assert.throws(() => hydrateBirthdayMoment({ ...owned, publishAt: "invalid date" }));
  assert.throws(() => hydrateBirthdayMoment({ ...owned, media: [{ id: "foreign", position: 0, url: "https://external.test/image" }] }));
  assert.throws(() => hydrateBirthdayMoment({ ...owned, blocks: [{ type: "HERO", data: { birthdayStory: { enabled: true } } }] }));
});

test("atomic edit form aligns mixed existing/new order and counts only new uploaded file bytes", async () => {
  const { buildBirthdayEditForm, BIRTHDAY_EDIT_TOO_LARGE } = await import("../app/lib/birthday-story-edit.ts");
  const file = new File(["new image"], "new.webp", { type: "image/webp" });
  const body = buildBirthdayEditForm({ title: "Updated" }, [{ existingMediaId: "existing" }, { file }, { existingMediaId: "last" }]);
  assert.deepEqual(JSON.parse(body.get("payload") as string), { moment: { title: "Updated" }, photoOrder: ["existing", "new:0", "last"] });
  assert.equal(body.getAll("files").length, 1);
  assert.throws(() => buildBirthdayEditForm({}, [{ file: new File([new Uint8Array(4_000_000)], "large.webp") }]), { message: BIRTHDAY_EDIT_TOO_LARGE });
  assert.throws(() => buildBirthdayEditForm({}, [{}]));
});

test("owner hydration keeps birthday unlock separate from public story metadata", () => {
  const saved = hydrateBirthdayMoment({ ...owned, birthdayUnlock: { day: 29, month: 2 } });
  assert.deepEqual(saved.draft.birthdayUnlock, { day: 29, month: 2 });
  assert.equal("birthdayUnlock" in saved.draft.birthdayStory!, false);
  assert.equal(hydrateBirthdayMoment({ ...owned, birthdayUnlock: null }).draft.birthdayUnlock, null);
  assert.throws(() => hydrateBirthdayMoment({ ...owned, birthdayUnlock: { day: 31, month: 4 } }));
});
