export type BirthdayAudioState = "loading" | "playing" | "paused" | "error";

/** Owns one audio element so canceled previews cannot start playing later. */
export function createBirthdayAudioPlayer(
  audio: HTMLAudioElement,
  options: { loop?: boolean; onState?: (state: BirthdayAudioState) => void } = {},
) {
  let generation = 0;
  let disposed = false;
  let wanted = false;
  let source = "";
  let clip = { startMs: 0, endMs: 0 };
  let boundaryTimer: ReturnType<typeof setTimeout> | undefined;
  let cancelMetadata: (() => void) | undefined;
  const state = (value: BirthdayAudioState) => { if (!disposed) options.onState?.(value); };
  const clearBoundary = () => { clearTimeout(boundaryTimer); boundaryTimer = undefined; };

  function pause() {
    generation++;
    wanted = false;
    cancelMetadata?.();
    clearBoundary();
    audio.pause();
    state("paused");
  }

  function fail() {
    pause();
    state("error");
  }

  function scheduleBoundary() {
    clearBoundary();
    if (!wanted || disposed || audio.paused) return;
    const remainingMs = (clip.endMs - audio.currentTime * 1000) / (audio.playbackRate || 1);
    boundaryTimer = setTimeout(checkBoundary, Math.max(15, remainingMs));
  }

  async function resume(token: number) {
    try {
      await audio.play();
      if (token !== generation || disposed || !wanted) {
        // A late browser play() result must honor pause/unmount, without stopping a newer preview.
        if (!wanted || disposed) audio.pause();
        return;
      }
      state("playing");
      scheduleBoundary();
    } catch {
      if (token === generation && !disposed) fail();
    }
  }

  function checkBoundary() {
    if (!wanted || disposed) return;
    const positionMs = audio.currentTime * 1000;
    if (positionMs >= clip.endMs - 10 || audio.ended) {
      if (!options.loop) { pause(); return; }
      audio.currentTime = clip.startMs / 1000;
      if (audio.paused || audio.ended) void resume(generation);
    } else if (positionMs < clip.startMs) {
      audio.currentTime = clip.startMs / 1000;
    }
    scheduleBoundary();
  }

  function waitForMetadata(): Promise<boolean> {
    if (audio.readyState >= 1) return Promise.resolve(true);
    return new Promise((resolve) => {
      const finish = (ready: boolean) => {
        audio.removeEventListener("loadedmetadata", loaded);
        audio.removeEventListener("error", errored);
        cancelMetadata = undefined;
        resolve(ready);
      };
      const loaded = () => finish(true);
      const errored = () => finish(false);
      cancelMetadata = () => finish(false);
      audio.addEventListener("loadedmetadata", loaded, { once: true });
      audio.addEventListener("error", errored, { once: true });
    });
  }

  async function play(src: string, selection: { startMs: number; endMs: number }) {
    if (disposed) return;
    pause();
    const token = generation;
    if (!Number.isFinite(selection.startMs) || !Number.isFinite(selection.endMs) ||
        selection.startMs < 0 || selection.endMs <= selection.startMs) { fail(); return; }
    clip = { ...selection };
    wanted = true;
    state("loading");
    try {
      const fragmentSource = `${src}#t=${clip.startMs / 1000},${clip.endMs / 1000}`;
      if (source !== fragmentSource || audio.error) {
        source = fragmentSource;
        // A media fragment keeps the initial decode at the trim start, even before metadata arrives.
        if (audio.getAttribute?.("src") !== fragmentSource || audio.error) {
          audio.src = fragmentSource;
          audio.load();
        }
      }
      const metadata = waitForMetadata();
      if (audio.readyState >= 1) audio.currentTime = clip.startMs / 1000;
      // Call play synchronously within the visitor's tap; Safari may reject it after an awaited load.
      const playback = audio.play().then(() => {
        if (!wanted || disposed) audio.pause();
        return true;
      }, () => {
        if (token === generation && !disposed) fail();
        return false;
      });
      const ready = await metadata;
      if (!ready || token !== generation || !wanted || disposed) return;
      // Metadata can differ slightly across decoders; never seek past the physical file.
      if (!Number.isFinite(audio.duration) || audio.duration * 1000 < clip.startMs + 1000) {
        fail(); return;
      }
      clip.endMs = Math.min(clip.endMs, Math.floor(audio.duration * 1000));
      audio.currentTime = clip.startMs / 1000;
      if (!await playback) return;
      if (token !== generation || disposed || !wanted) {
        if (!wanted || disposed) audio.pause();
        return;
      }
      state("playing");
      scheduleBoundary();
    } catch {
      if (token === generation && !disposed) fail();
    }
  }

  const events = ["timeupdate", "seeking", "ended", "ratechange", "playing"] as const;
  events.forEach((event) => audio.addEventListener(event, checkBoundary));
  audio.addEventListener("error", fail);
  return {
    play, pause,
    destroy() {
      pause();
      disposed = true;
      events.forEach((event) => audio.removeEventListener(event, checkBoundary));
      audio.removeEventListener("error", fail);
    },
  };
}
