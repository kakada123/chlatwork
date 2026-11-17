import assert from "node:assert/strict";
import test from "node:test";
import {
  validatePrepFiles,
  uploadPrepFiles,
  prepResourceUrl,
  canPreviewPrepResource,
} from "../app/lib/prephub-attachments.ts";

const photo = (name: string) =>
  new File(["image"], name, { type: "image/png" });
test("attachment selection validates the entire batch before uploading", () => {
  assert.equal(
    validatePrepFiles([photo("one.png"), photo("two.png")], 18),
    null,
  );
  assert.equal(
    validatePrepFiles([photo("one.png"), photo("two.png")], 19),
    "count",
  );
  assert.equal(validatePrepFiles([new File([], "empty.png")]), "size");
  assert.equal(
    validatePrepFiles([photo("one.png"), photo("script.svg")]),
    "type",
  );
  assert.equal(
    validatePrepFiles([
      new File([new Uint8Array(5 * 1024 * 1024)], "limit.pdf"),
    ]),
    null,
  );
  assert.equal(
    validatePrepFiles([
      new File([new Uint8Array(5 * 1024 * 1024 + 1)], "large.pdf"),
    ]),
    "size",
  );
});
test("uploading uses one file per request and retains only failed or unattempted files for retry", async () => {
  const pending = [photo("one.png"), photo("two.png"), photo("three.png")];
  const sent: string[] = [];
  const send = async (form: FormData) => {
    assert.equal([...form.keys()].join(), "file");
    const file = form.get("file") as File;
    sent.push(file.name);
    if (file.name === "two.png") throw new Error("Upload failed");
  };
  await assert.rejects(
    uploadPrepFiles(pending, send, {
      uploaded: (file) => pending.splice(pending.indexOf(file), 1),
    }),
    /Upload failed/,
  );
  assert.deepEqual(sent, ["one.png", "two.png"]);
  assert.deepEqual(
    pending.map((file) => file.name),
    ["two.png", "three.png"],
  );
  const retried: string[] = [];
  assert.equal(
    await uploadPrepFiles(
      pending,
      async (form) => {
        retried.push((form.get("file") as File).name);
      },
      { uploaded: (file) => pending.splice(pending.indexOf(file), 1) },
    ),
    true,
  );
  assert.deepEqual(retried, ["two.png", "three.png"]);
  assert.equal(pending.length, 0);
});
test("a canceled upload queue never starts the next file or reports stale completion", async () => {
  let current = true;
  let sent = 0,
    completed = 0;
  assert.equal(
    await uploadPrepFiles(
      [photo("one.png"), photo("two.png")],
      async () => {
        sent++;
        current = false;
      },
      { current: () => current, uploaded: () => completed++ },
    ),
    false,
  );
  assert.equal(sent, 1);
  assert.equal(completed, 0);
});
test("preview URLs preserve private and capability routes and reject external bases", () => {
  assert.equal(
    prepResourceUrl("subject", "photo", undefined, true),
    "/api/prephub/subjects/subject/resources/photo?preview=1",
  );
  assert.equal(
    prepResourceUrl("subject", "pdf", "/api/prephub/public/token/resources"),
    "/api/prephub/public/token/resources/pdf",
  );
  assert.throws(() =>
    prepResourceUrl("subject", "pdf", "https://example.com/resources"),
  );
  assert.equal(canPreviewPrepResource({ mimeType: "image/svg+xml" }), false);
  assert.equal(canPreviewPrepResource({ mimeType: "application/pdf" }), true);
  assert.equal(canPreviewPrepResource({ mimeType: "image/webp" }), true);
});
