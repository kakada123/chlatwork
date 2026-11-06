import { appI18nStubUrl } from "./helpers/product-locale-stubs.ts";
import assert from "node:assert/strict";
import test from "node:test";
import { createBirthdayStorySettings } from "../app/lib/birthday-story.ts";
import { alignBirthdayStoryMemories, moveBirthdayScene, reorderBirthdayPhotos, toggleBirthdayScene } from "../app/lib/birthday-story-editor.ts";

test("scene toggles retain one scene and restore fixed endpoints", () => {
  let scenes = createBirthdayStorySettings().scenes;
  for (const scene of [...scenes]) scenes = toggleBirthdayScene(scenes, scene);
  assert.deepEqual(scenes, ["celebration"]);
  scenes = toggleBirthdayScene(scenes, "gift");
  scenes = toggleBirthdayScene(scenes, "message");
  assert.deepEqual(scenes, ["gift", "message", "celebration"]);
  assert.deepEqual(toggleBirthdayScene(["message"], "message"), ["message"]);
});

test("interior scene movement cannot move the gift or finale", () => {
  const initial = createBirthdayStorySettings().scenes;
  assert.deepEqual(moveBirthdayScene(initial, "gift", 1), initial);
  assert.deepEqual(moveBirthdayScene(initial, "celebration", -1), initial);
  assert.deepEqual(moveBirthdayScene(initial, "cake", -1), initial);
  assert.deepEqual(moveBirthdayScene(initial, "secret", 1), initial);
  assert.deepEqual(moveBirthdayScene(initial, "cake", 1), ["gift", "memories", "cake", "message", "secret", "celebration"]);
  assert.deepEqual(initial, createBirthdayStorySettings().scenes);
});

test("photo reorder carries memory metadata by photo identity through preview and upload settings", () => {
  const settings = createBirthdayStorySettings();
  const photos = [
    { id: "one", url: "blob:one", caption: "First", date: "2020-01-02" },
    { id: "two", url: "blob:two", caption: "Second", date: "2021-03-04" },
    { id: "three", url: "blob:three" },
  ];
  const reordered = reorderBirthdayPhotos(photos, "two", 0);
  assert.deepEqual(reordered.map(photo => photo.id), ["two", "one", "three"]);
  assert.deepEqual(photos.map(photo => photo.id), ["one", "two", "three"]);
  assert.deepEqual(alignBirthdayStoryMemories(settings, reordered).memories, [
    { caption: "Second", date: "2021-03-04" },
    { caption: "First", date: "2020-01-02" },
    { caption: "", date: "" },
  ]);
  assert.deepEqual(settings.memories, []);
  assert.deepEqual(alignBirthdayStoryMemories(settings, []).memories, []);
  assert.deepEqual(reorderBirthdayPhotos(photos, "missing", 0), photos);
  assert.deepEqual(reorderBirthdayPhotos(photos, "one", -1), photos);
});
