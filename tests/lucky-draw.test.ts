import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  deduplicateParticipants,
  findDuplicateParticipantNames,
  formatWinnerListCsv,
  formatWinnerListText,
  getEligibleParticipants,
  parseLuckyDrawSession,
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

test("winner history can be copied as text and exported as CSV", () => {
  const winners = [
    { name: "Thida Khiev", note: "Do an exercise" },
    { name: 'Sokha "Lucky", Lim', note: "" },
  ];

  assert.equal(
    formatWinnerListText(winners),
    '1. Thida Khiev — Do an exercise\n2. Sokha "Lucky", Lim',
  );
  assert.equal(
    formatWinnerListCsv(winners),
    'Position,Winner,Note\r\n1,"Thida Khiev","Do an exercise"\r\n2,"Sokha ""Lucky"", Lim",""',
  );
});

test("winner history CSV neutralizes spreadsheet formulas in notes", () => {
  const csv = formatWinnerListCsv([
    { name: "Sophea Kim", note: '=HYPERLINK("https://example.com")' },
  ]);

  assert.equal(
    csv,
    'Position,Winner,Note\r\n1,"Sophea Kim","\'=HYPERLINK(""https://example.com"")"',
  );
});

test("lucky draw session restores only validated browser data", () => {
  const session = {
    version: 1,
    rows: ["Thida Khiev", "Sophea Kim"],
    raw: "Thida Khiev\nSophea Kim",
    preventRepeatWinners: true,
    showWinnerDialog: true,
    soundEnabled: false,
    spinSpeed: "standard",
    drawNote: "Do an exercise",
    winnerHistory: [{ name: "Thida Khiev", note: "Do an exercise" }],
    lastWinner: "Thida Khiev",
  };

  assert.deepEqual(parseLuckyDrawSession(JSON.stringify(session)), session);
  assert.equal(parseLuckyDrawSession("not-json"), null);
  assert.equal(
    parseLuckyDrawSession(JSON.stringify({ ...session, winnerHistory: [{ name: 42 }] })),
    null,
  );
});

test("lucky draw page exposes draw controls and explains its privacy boundary", () => {
  const page = readFileSync("app/pages/tools/lucky-draw.vue", "utf8");
  const tools = readFileSync("app/data/tools.ts", "utf8");
  const iconTones = readFileSync("app/lib/tool-icon-tones.ts", "utf8");

  assert.match(page, /No repeat winners/);
  assert.match(page, /Winner history/);
  assert.match(page, /Note for this spin/);
  assert.match(page, /Show winner in dialog/);
  assert.match(page, /role="dialog"/);
  assert.match(page, /aria-modal="true"/);
  assert.match(page, /z-\[140\]/);
  assert.match(page, /isWinnerDialogOpen \? 'fixed' : 'absolute'/);
  assert.match(page, /LuckyDrawWinnerResult/);
  assert.match(page, /v-if="lastWinner && !showWinnerDialog"/);
  assert.match(page, /v-model="drawNote"/);
  assert.match(page, /LUCKY_DRAW_SESSION_STORAGE_KEY/);
  assert.match(page, /localStorage\.setItem/);
  assert.match(page, /parseLuckyDrawSession/);
  assert.match(page, /const winnerNote = drawNote\.value\.trim\(\)/);
  assert.match(page, /winnerHistory\.value\.push\(\{ name: winnerName, note: winnerNote \}\)/);
  assert.doesNotMatch(
    page,
    /winnerHistory\.value\.push\(\{ name: winnerName, note: winnerNote \}\);\s+drawNote\.value = "";/,
  );
  assert.doesNotMatch(page, /v-model="winner\.note"/);
  assert.match(page, /Copy list/);
  assert.match(page, /Export CSV/);
  assert.match(page, /Secure browser randomness/);
  assert.doesNotMatch(page, /Share link|shareLink|buildSharePayload|readSharePayload/);
  assert.match(page, /prefers-reduced-motion: reduce/);
  assert.match(page, /isFullscreen\.value \|\| isWinnerDialogOpen\.value/);
  assert.match(page, /Dialog celebrations use the viewport edges/);
  assert.match(page, /angle: 62/);
  assert.match(page, /angle: 118/);
  assert.match(page, /angle: 270/);
  assert.match(page, /scalar: 0\.55/);
  assert.match(page, /scalar: 0\.45/);
  assert.match(page, /lg:grid-cols-\[minmax\(0,1fr\)_minmax\(280px,360px\)\]/);
  assert.match(page, /width: min\(72vh, 100%\)/);
  assert.match(page, /width: min\(48dvh, calc\(100vw - 2rem\)\)/);
  assert.match(page, /width: min\(36dvh, calc\(100vw - 5rem\)\)/);
  assert.match(page, /'has-results': winnerHistory\.length > 0/);
  assert.match(page, /\.wheel-stage:fullscreen \{\s+overflow-y: auto;/);
  assert.match(page, /\.wheel-stage:fullscreen \.wheel-stage-content \{\s+height: auto;\s+min-height: 100%;/);
  assert.match(page, /\.wheel-stage:fullscreen \.wheel-layout \{\s+flex: none;/);
  assert.match(page, /\.wheel-stage:fullscreen \.wheel-space \{\s+flex: none;\s+padding-bottom: 0\.5rem;/);
  assert.match(page, /\.wheel-stage:fullscreen \.wheel-note \{\s+margin-top: 1rem;/);
  assert.doesNotMatch(page, /max-h-\[38dvh\]/);
  assert.match(page, /grid-rows-\[auto_auto\]/);
  assert.match(page, /max-h-32 lg:max-h-48/);
  assert.match(page, /dark:bg-cyan-300 dark:text-slate-950/);
  assert.match(page, /mt-4 hidden lg:block/);
  assert.doesNotMatch(page, /fuchsia|purple|violet/);
  assert.match(tools, /"lucky-draw": "from-sky-400 to-cyan-300"/);
  assert.match(iconTones, /"lucky-draw": "blue"/);
});
