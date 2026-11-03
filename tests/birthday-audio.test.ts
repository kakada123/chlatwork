import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";
import {
  formatBirthdayAudioTime,
  readBirthdayAudioCatalog,
  readBirthdayAudioClip,
} from "../app/lib/birthday-audio.ts";
import { BIRTHDAY_AUDIO_TRACKS } from "../api/src/moments/birthday-audio.ts";
import { createBirthdayAudioPlayer } from "../app/lib/birthday-audio-player.ts";
import { buildPreviewMoment } from "../app/lib/moments.ts";
import type { MomentDraft } from "../app/types/moment.ts";

test("local birthday preview carries the saved clip without leaking it into another occasion", () => {
  const birthdayAudio = { trackId: "hbd-001", startMs: 5000, endMs: 9000 };
  const draft: MomentDraft = {
    birthdayAudio, recipientName: "Neth", occasion: "BIRTHDAY", title: "Birthday",
    message: "A lovely day", secretMessage: "See you soon", theme: "CUTE",
    specialDate: "", publishAt: "", eventDate: "", venueName: "", eventAddress: "",
    mapUrl: "", dressCode: "", eventSchedule: "", hostName: "", pollQuestion: "",
    pollOptions: ["", ""], pollIdentityMode: "ANONYMOUS",
  };
  const hero = buildPreviewMoment(draft, []).blocks[0]!;
  assert.deepEqual(hero.data.birthdayAudio, birthdayAudio);
  assert.notEqual(hero.data.birthdayAudio, birthdayAudio);
  assert.equal(buildPreviewMoment({ ...draft, occasion: "WEDDING" }, []).blocks[0]!.data.birthdayAudio, undefined);
});

test("birthday catalog points at all ten bundled audio files", () => {
  assert.equal(BIRTHDAY_AUDIO_TRACKS.length, 10);
  assert.equal(new Set(BIRTHDAY_AUDIO_TRACKS.map((track) => track.id)).size, 10);
  for (const track of BIRTHDAY_AUDIO_TRACKS) {
    assert.ok(existsSync(new URL(`../api/src/moments/assets/hbd/${track.fileName}`, import.meta.url)), track.fileName);
    assert.ok(track.durationMs > 1000);
  }
  assert.equal(formatBirthdayAudioTime(65_900), "1:05");
});

test("only catalog tracks with finite integer boundaries and at least one second are playable", () => {
  const track = BIRTHDAY_AUDIO_TRACKS[0]!;
  const tracks = BIRTHDAY_AUDIO_TRACKS.map(({ id, title, durationMs }) => ({ id, title, durationMs, src: `/api/moments/birthday-audio/${id}` }));
  const read = (value: unknown) => readBirthdayAudioClip(value, tracks);
  const valid = { trackId: track.id, startMs: 10_000, endMs: 20_000 };
  assert.deepEqual(read({ ...valid, src: "https://untrusted.test/a.mp3" }), valid);
  assert.deepEqual(read({ ...valid, startMs: 0, endMs: track.durationMs }), {
    trackId: track.id, startMs: 0, endMs: track.durationMs,
  });
  for (const invalid of [null, [], "audio", { ...valid, trackId: "../../private" },
    { ...valid, startMs: -1 }, { ...valid, startMs: "1000" },
    { ...valid, endMs: 10_999 }, { ...valid, endMs: 10_000 },
    { ...valid, endMs: Infinity }, { ...valid, endMs: NaN },
    { ...valid, startMs: 0.5 }, { ...valid, endMs: track.durationMs + 1 }]) {
    assert.equal(read(invalid), null);
  }
});

test("public catalog accepts only bounded metadata and same-origin backend audio routes", () => {
  const track = { id: "hbd-001", title: "Birthday", durationMs: 20_000, src: "/api/moments/birthday-audio/hbd-001" };
  assert.deepEqual(readBirthdayAudioCatalog([{ ...track, fileName: "internal.m4a" }]), [track]);
  for (const invalid of [null, {}, [track, track], [{ ...track, src: "https://untrusted.test/audio" }],
    [{ ...track, id: "../private" }], [{ ...track, durationMs: -1 }], [{ ...track, durationMs: Infinity }]]) {
    assert.throws(() => readBirthdayAudioCatalog(invalid));
  }
});

class FakeAudio extends EventTarget {
  src = "";
  currentTime = 0;
  duration = 60;
  readyState = 0;
  playbackRate = 1;
  paused = true;
  plays = 0;
  failPlay = false;
  pendingPlay?: Promise<void>;
  load() { this.readyState = 0; }
  async play() {
    this.plays++;
    if (this.failPlay) throw new Error("browser blocked playback");
    if (this.pendingPlay) await this.pendingPlay;
    this.paused = false;
  }
  pause() { this.paused = true; }
  metadata() { this.readyState = 1; this.dispatchEvent(new Event("loadedmetadata")); }
  tick(seconds: number) { this.currentTime = seconds; this.dispatchEvent(new Event("timeupdate")); }
}

function playerFixture(loop = false) {
  const audio = new FakeAudio();
  const states: string[] = [];
  const player = createBirthdayAudioPlayer(audio as unknown as HTMLAudioElement, {
    loop, onState: (state) => states.push(state),
  });
  return { audio, player, states };
}

test("clip preview requests playback in the tap, starts at the media fragment and stops at the chosen end", async () => {
  const { audio, player, states } = playerFixture();
  try {
    const pending = player.play("/audio/hbd/track.m4a", { startMs: 5000, endMs: 9000 });
    assert.equal(audio.plays, 1);
    assert.equal(audio.src, "/audio/hbd/track.m4a#t=5,9");
    audio.metadata();
    await pending;
    assert.equal(audio.currentTime, 5);
    assert.equal(audio.paused, false);
    audio.tick(9);
    assert.equal(audio.paused, true);
    assert.equal(states.at(-1), "paused");
  } finally { player.destroy(); }
});

test("background playback loops the trimmed region and contains seeks", async () => {
  const { audio, player } = playerFixture(true);
  try {
    const pending = player.play("/audio/hbd/track.m4a", { startMs: 5000, endMs: 9000 });
    audio.metadata();
    await pending;
    audio.tick(9);
    assert.equal(audio.currentTime, 5);
    assert.equal(audio.paused, false);
    audio.currentTime = 2;
    audio.dispatchEvent(new Event("seeking"));
    assert.equal(audio.currentTime, 5);
    audio.dispatchEvent(new Event("ended"));
    await Promise.resolve();
    assert.equal(audio.currentTime, 5);
  } finally { player.destroy(); }
});

test("pausing while metadata is loading cancels the pending start", async () => {
  const { audio, player } = playerFixture();
  const pending = player.play("/audio/hbd/track.m4a", { startMs: 5000, endMs: 9000 });
  player.pause();
  audio.metadata();
  await pending;
  assert.equal(audio.plays, 1);
  assert.equal(audio.paused, true);
  player.destroy();
});

test("switching tracks cancels the obsolete metadata wait", async () => {
  const { audio, player } = playerFixture();
  try {
    const first = player.play("/first.m4a", { startMs: 1000, endMs: 3000 });
    const second = player.play("/second.m4a", { startMs: 5000, endMs: 9000 });
    audio.metadata();
    await Promise.all([first, second]);
    assert.equal(audio.src, "/second.m4a#t=5,9");
    assert.equal(audio.currentTime, 5);
    assert.equal(audio.plays, 2);
  } finally { player.destroy(); }
});

test("a late play promise cannot resume audio after pause or disposal", async () => {
  for (const dispose of [false, true]) {
    const { audio, player } = playerFixture();
    let finish!: () => void;
    audio.pendingPlay = new Promise<void>((resolve) => { finish = resolve; });
    const pending = player.play("/track.m4a", { startMs: 0, endMs: 9000 });
    audio.metadata();
    await Promise.resolve();
    if (dispose) player.destroy(); else player.pause();
    finish();
    await pending;
    assert.equal(audio.paused, true);
    player.destroy();
  }
});

test("canceling before metadata arrives also contains a late browser play result", async () => {
  const { audio, player } = playerFixture();
  let finish!: () => void;
  audio.pendingPlay = new Promise<void>((resolve) => { finish = resolve; });
  const pending = player.play("/track.m4a", { startMs: 0, endMs: 9000 });
  player.pause();
  await pending;
  finish();
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(audio.paused, true);
  player.destroy();
});

test("playback rejection and media errors produce a recoverable error state", async () => {
  const { audio, player, states } = playerFixture();
  try {
    audio.failPlay = true;
    const pending = player.play("/track.m4a", { startMs: 0, endMs: 9000 });
    audio.metadata();
    await pending;
    assert.equal(states.at(-1), "error");
    assert.equal(audio.paused, true);
    audio.failPlay = false;
    await player.play("/track.m4a", { startMs: 0, endMs: 9000 });
    assert.equal(states.at(-1), "playing");
    audio.dispatchEvent(new Event("error"));
    assert.equal(states.at(-1), "error");
    assert.equal(audio.paused, true);
  } finally { player.destroy(); }
});
