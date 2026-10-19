export type StopwatchLap = {
  number: number;
  splitMs: number;
  totalMs: number;
};

export type StopwatchState = {
  elapsedMs: number;
  startedAt: number | null;
  laps: StopwatchLap[];
};

export function createStopwatch(): StopwatchState {
  return { elapsedMs: 0, startedAt: null, laps: [] };
}

export function elapsedStopwatchTime(state: StopwatchState, now: number) {
  // Derive elapsed time from a monotonic clock, so background throttling cannot lose ticks.
  return (
    state.elapsedMs +
    (state.startedAt === null ? 0 : Math.max(0, now - state.startedAt))
  );
}

export function startStopwatch(state: StopwatchState, now: number) {
  if (state.startedAt === null) state.startedAt = now;
}

export function pauseStopwatch(state: StopwatchState, now: number) {
  state.elapsedMs = elapsedStopwatchTime(state, now);
  state.startedAt = null;
}

export function resetStopwatch(state: StopwatchState) {
  state.elapsedMs = 0;
  state.startedAt = null;
  state.laps = [];
}

export function recordStopwatchLap(
  state: StopwatchState,
  now: number,
): StopwatchLap | null {
  if (state.startedAt === null) return null;
  const totalMs = elapsedStopwatchTime(state, now);
  const lap = {
    number: state.laps.length + 1,
    splitMs: totalMs - (state.laps.at(-1)?.totalMs ?? 0),
    totalMs,
  };
  state.laps.push(lap);
  return lap;
}

export function formatStopwatchTime(milliseconds: number) {
  const hundredths = Math.floor(Math.max(0, milliseconds) / 10);
  const hours = Math.floor(hundredths / 360_000);
  const minutes = Math.floor(hundredths / 6_000) % 60;
  const seconds = Math.floor(hundredths / 100) % 60;
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}.${pad(hundredths % 100)}`;
}
