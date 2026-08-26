import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  deduplicateParticipants,
  findDuplicateParticipantNames,
  getEligibleParticipants,
  parseParticipantText,
} from "../app/lib/lucky-draw.ts";

test("lucky draw accepts newline and comma separated participant lists", () => {
  assert.deepEqual(
    parseParticipantText(" Vann Mey  \nSokha Lim,  Sophea   Kim\n"),
    ["Vann Mey", "Sokha Lim", "Sophea Kim"],
  );
});

test("duplicate cleanup is case insensitive and keeps the first entry", () => {
  const participants = ["Vann Mey", "sokha lim", "VANN MEY", "Sokha Lim", "Nita Phan"];

  assert.deepEqual(findDuplicateParticipantNames(participants), ["VANN MEY", "Sokha Lim"]);
  assert.deepEqual(deduplicateParticipants(participants), ["Vann Mey", "sokha lim", "Nita Phan"]);
});

test("no-repeat mode removes every previous winner from the next draw", () => {
  const participants = ["Vann Mey", "Sokha Lim", "Sophea Kim", "vann mey"];

  assert.deepEqual(
    getEligibleParticipants(participants, ["VANN MEY"], true),
    ["Sokha Lim", "Sophea Kim"],
  );
  assert.deepEqual(
    getEligibleParticipants(participants, ["VANN MEY"], false),
    participants,
  );
});

test("lucky draw page exposes draw controls and explains its privacy boundary", () => {
  const page = readFileSync("app/pages/tools/lucky-draw.vue", "utf8");

  assert.match(page, /No repeat winners/);
  assert.match(page, /Winner history/);
  assert.match(page, /Secure browser randomness/);
  assert.match(page, /shared link includes the participant list/);
  assert.match(page, /prefers-reduced-motion: reduce/);
});
