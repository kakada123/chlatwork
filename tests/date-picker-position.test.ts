import assert from "node:assert/strict";
import test from "node:test";
import { getDatePickerPosition } from "../app/lib/date-picker-position.ts";

const anchor = { left: 180, top: 560, bottom: 604 };
const popup = { width: 352, height: 400 };
const viewport = { width: 1024, height: 768 };

test("expense calendar opens fully above its date field", () => {
  const position = getDatePickerPosition(anchor, popup, viewport, "top");
  assert.equal(position.top, 152);
  assert.ok(position.top + popup.height < anchor.top);
});

test("calendar flips upward when there is insufficient room below", () => {
  assert.equal(getDatePickerPosition(anchor, popup, viewport, "bottom").top, 152);
});

test("calendar keeps opening below when space is available", () => {
  const position = getDatePickerPosition({ ...anchor, top: 80, bottom: 124 }, popup, viewport, "bottom");
  assert.equal(position.top, 132);
});

test("calendar stays within the viewport on a short, narrow screen", () => {
  const position = getDatePickerPosition(
    { left: 280, top: 140, bottom: 184 }, popup, { width: 320, height: 300 }, "top",
  );
  assert.equal(position.left, 12);
  assert.equal(position.top, 12);
  assert.equal(position.maxHeight, 276);
});

test("mobile calendar remains a bottom sheet", () => {
  const position = getDatePickerPosition(anchor, { width: 296, height: 240 }, { width: 320, height: 640 }, "top", true);
  assert.equal(position.top, 388);
  assert.equal(position.left, 12);
});
