import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildMomentTitle,
  buildPreviewMoment,
  getMomentCounterCopy,
  getMomentFormError,
  isValidMomentDate,
} from "../app/lib/moments.ts";
import type { MomentDraft } from "../app/types/moment.ts";

const draft: MomentDraft = {
  recipientName: "Neth",
  occasion: "ANNIVERSARY",
  title: "Our favorite story",
  message: "Every day is better with you.",
  secretMessage: "Dinner is waiting at seven. ❤️",
  theme: "ROMANTIC",
  specialDate: "2025-05-22",
  publishAt: "",
};

const readProjectFile = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("Moment titles and dates are deterministic", () => {
  assert.equal(
    buildMomentTitle("Neth", "BIRTHDAY"),
    "🎂 Happy Birthday, Neth!",
  );
  assert.equal(isValidMomentDate("2026-02-29"), false);
  assert.equal(isValidMomentDate("2024-02-29"), true);
  assert.deepEqual(getMomentCounterCopy("2025-05-22", new Date(2025, 4, 24)), {
    value: 2,
    unit: "days",
    label: "of memories together",
  });
});

test("preview uses ordered extensible blocks and photos", () => {
  const preview = buildPreviewMoment(draft, ["blob:one", "blob:two"]);
  assert.deepEqual(
    preview.blocks.map((block) => block.type),
    ["HERO", "MESSAGE", "GALLERY", "COUNTER", "SECRET"],
  );
  assert.deepEqual(
    preview.media.map((media) => media.position),
    [0, 1],
  );
  assert.equal(getMomentFormError(draft, 2), "");
  assert.equal(
    getMomentFormError({ ...draft, secretMessage: " " }, 2),
    "Add the secret surprise message.",
  );
});

test("published Moment surfaces are unlisted and validate image content", () => {
  const viewer = readProjectFile("app/pages/m/[slug].vue");
  const service = readProjectFile("api/src/moments/moments.service.ts");
  const sql = readProjectFile("database/updates/2026-08-24-create-moments.sql");

  assert.match(viewer, /noindex, nofollow, noarchive/);
  assert.match(service, /detectImageMime/);
  assert.match(service, /MAX_ACTIVE_MOMENTS = 3/);
  assert.match(service, /randomBytes\(8\)/);
  assert.match(service, /where: \{ id: momentId, creatorId: userId \}/);
  assert.match(service, /MomentBlockType\.SECRET/);
  assert.match(sql, /CREATE TABLE "moment_blocks"/);
  assert.match(sql, /"content" BYTEA/);
  assert.match(sql, /^BEGIN;$/m);
  assert.match(sql, /^COMMIT;$/m);
  assert.doesNotMatch(sql, /DROP TABLE|TRUNCATE|DELETE FROM/);
});
