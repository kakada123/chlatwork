import assert from "node:assert/strict";
import test from "node:test";
import {
  createStopwatch,
  elapsedStopwatchTime,
  formatStopwatchTime,
  pauseStopwatch,
  recordStopwatchLap,
  resetStopwatch,
  startStopwatch,
} from "../app/lib/stopwatch.ts";

test("measures elapsed time after a background gap without counting ticks", () => {
  const state = createStopwatch();
  startStopwatch(state, 1_000);
  assert.equal(elapsedStopwatchTime(state, 91_250), 90_250);
  startStopwatch(state, 95_000);
  assert.equal(elapsedStopwatchTime(state, 100_000), 99_000);
});

test("pause and resume exclude paused time across multiple sessions", () => {
  const state = createStopwatch();
  startStopwatch(state, 100);
  pauseStopwatch(state, 1_350);
  assert.equal(elapsedStopwatchTime(state, 60_000), 1_250);
  pauseStopwatch(state, 70_000);
  startStopwatch(state, 80_000);
  pauseStopwatch(state, 82_500);
  assert.equal(elapsedStopwatchTime(state, 90_000), 3_750);
});

test("laps capture split and total time and exclude paused intervals", () => {
  const state = createStopwatch();
  assert.equal(recordStopwatchLap(state, 1_000), null);
  startStopwatch(state, 1_000);
  assert.deepEqual(recordStopwatchLap(state, 2_200), {
    number: 1,
    splitMs: 1_200,
    totalMs: 1_200,
  });
  pauseStopwatch(state, 3_000);
  assert.equal(recordStopwatchLap(state, 50_000), null);
  startStopwatch(state, 60_000);
  assert.deepEqual(recordStopwatchLap(state, 60_700), {
    number: 2,
    splitMs: 1_500,
    totalMs: 2_700,
  });
  assert.equal(state.laps.length, 2);
});

test("reset stops a running stopwatch, clears laps and starts the next session at zero", () => {
  const state = createStopwatch();
  startStopwatch(state, 10);
  recordStopwatchLap(state, 200);
  resetStopwatch(state);
  assert.equal(state.startedAt, null);
  assert.equal(elapsedStopwatchTime(state, 10_000), 0);
  assert.deepEqual(state.laps, []);
  startStopwatch(state, 20_000);
  assert.equal(elapsedStopwatchTime(state, 21_000), 1_000);
});

test("formats hundredths without rounding into the next second or wrapping long hours", () => {
  for (const [milliseconds, expected] of [
    [0, "00:00:00.00"],
    [999, "00:00:00.99"],
    [60_010, "00:01:00.01"],
    [3_661_230, "01:01:01.23"],
    [360_000_000, "100:00:00.00"],
  ] as const) {
    assert.equal(formatStopwatchTime(milliseconds), expected);
  }
});
