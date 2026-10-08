export type YoutubeQuality = 360 | 480 | 720 | 1080;
export type YoutubePreview = {
  videoId: string;
  title: string;
  thumbnailUrl: string;
  durationSeconds: number;
  qualities: YoutubeQuality[];
};
export type YoutubeJobView = {
  id: string;
  status: "preparing" | "ready" | "failed" | "cancelled" | "expired";
  expiresAt: string | null;
  fileName?: string;
  sizeBytes?: number;
  errorCode?: string;
};
export type YoutubeDownloaderState = {
  phase: "idle" | "previewing" | "previewed" | "preparing" | "ready" | "ticket";
  preview: YoutubePreview | null;
  job: YoutubeJobView | null;
  errorCode: string | null;
};

type Dependencies = {
  request(path: string, options?: { method?: string; body?: unknown }): Promise<unknown>;
  schedule(callback: () => void, delayMs: number): unknown;
  unschedule(handle: unknown): void;
  onChange(state: YoutubeDownloaderState): void;
};

function errorCode(error: unknown) {
  const value = error as {
    statusCode?: number;
    status?: number;
    data?: { code?: unknown; data?: { code?: unknown } };
    response?: { status?: number; _data?: { data?: { code?: unknown } } };
  };
  const status = value?.statusCode ?? value?.status ?? value?.response?.status;
  const code = value?.data?.data?.code ?? value?.data?.code ?? value?.response?._data?.data?.code;
  if (status === 502 && code === "UPSTREAM_AUTH_REQUIRED") return "UPSTREAM_AUTH_REQUIRED";
  return status === 401 || status === 403
    ? "AUTH_REQUIRED"
    : status === 429
      ? "CAPACITY"
      : status === 404
        ? "NOT_FOUND"
        : status === 413
          ? "TOO_LARGE"
          : status === 400
            ? "UNSUPPORTED_VIDEO"
            : status === 503
              ? "UNAVAILABLE"
              : status === 504
                ? "TIMEOUT"
                : "DOWNLOAD_FAILED";
}

export function createYoutubeDownloaderController(deps: Dependencies) {
  const state: YoutubeDownloaderState = {
    phase: "idle",
    preview: null,
    job: null,
    errorCode: null,
  };
  let generation = 0;
  let disposed = false;
  let timer: unknown = null;
  let url = "";
  let attempts = 0;
  const changed = () => {
    if (!disposed) deps.onChange({ ...state });
  };
  const clearTimer = () => {
    if (timer !== null) deps.unschedule(timer);
    timer = null;
  };
  const current = (version: number) => !disposed && version === generation;
  const removeJob = (id: string) =>
    deps.request(`/api/youtube-downloader/jobs/${encodeURIComponent(id)}`, { method: "DELETE" });
  const cancelQuietly = (id: string) => {
    void removeJob(id).catch(() => undefined);
  };

  function reset() {
    generation++;
    clearTimer();
    if (state.job) cancelQuietly(state.job.id);
    Object.assign(state, { phase: "idle", preview: null, job: null, errorCode: null });
    url = "";
    changed();
  }

  async function preview(input: string) {
    if (disposed) return;
    reset();
    const version = generation;
    url = input.trim();
    state.phase = "previewing";
    changed();
    try {
      const result = (await deps.request("/api/youtube-downloader/preview", {
        method: "POST",
        body: { url },
      })) as YoutubePreview;
      if (!current(version)) return;
      state.preview = result;
      state.phase = "previewed";
    } catch (error) {
      if (!current(version)) return;
      state.phase = "idle";
      state.errorCode = errorCode(error);
    }
    changed();
  }

  function schedulePoll(version: number) {
    if (!current(version) || state.phase !== "preparing") return;
    timer = deps.schedule(() => {
      timer = null;
      void poll(version);
    }, 2000);
  }

  async function poll(version: number) {
    if (!current(version) || !state.job) return;
    try {
      const result = (await deps.request(
        `/api/youtube-downloader/jobs/${encodeURIComponent(state.job.id)}`,
      )) as YoutubeJobView;
      if (!current(version)) return;
      state.job = result;
      if (result.status === "ready") state.phase = "ready";
      else if (result.status !== "preparing") {
        state.phase = "previewed";
        state.errorCode =
          result.errorCode ?? (result.status === "expired" ? "NOT_FOUND" : "DOWNLOAD_FAILED");
      } else if (++attempts > 165) {
        cancelQuietly(result.id);
        state.phase = "previewed";
        state.errorCode = "TIMEOUT";
      }
    } catch (error) {
      if (!current(version)) return;
      // Stop after a request error so login expiry or an API restart cannot poll forever.
      if (state.job) cancelQuietly(state.job.id);
      state.phase = "previewed";
      state.errorCode = errorCode(error);
    }
    changed();
    schedulePoll(version);
  }

  async function prepare(quality: YoutubeQuality) {
    if (
      disposed ||
      !state.preview?.qualities.includes(quality) ||
      !["previewed", "ready"].includes(state.phase)
    )
      return;
    generation++;
    const version = generation;
    clearTimer();
    if (state.job) cancelQuietly(state.job.id);
    state.job = null;
    state.errorCode = null;
    state.phase = "preparing";
    attempts = 0;
    changed();
    try {
      const result = (await deps.request("/api/youtube-downloader/jobs", {
        method: "POST",
        body: { url, quality },
      })) as YoutubeJobView;
      if (!current(version)) {
        cancelQuietly(result.id);
        return;
      }
      state.job = result;
      schedulePoll(version);
    } catch (error) {
      if (!current(version)) return;
      state.phase = "previewed";
      state.errorCode = errorCode(error);
    }
    changed();
  }

  async function cancel() {
    generation++;
    clearTimer();
    const job = state.job;
    state.job = null;
    state.phase = state.preview ? "previewed" : "idle";
    state.errorCode = null;
    const version = generation;
    changed();
    if (job) {
      try {
        await removeJob(job.id);
      } catch (error) {
        if (current(version)) {
          state.errorCode = errorCode(error);
          changed();
        }
      }
    }
  }

  async function download() {
    if (disposed || state.phase !== "ready" || !state.job) return null;
    const version = generation;
    state.phase = "ticket";
    state.errorCode = null;
    changed();
    try {
      const result = (await deps.request(
        `/api/youtube-downloader/jobs/${encodeURIComponent(state.job.id)}/ticket`,
        { method: "POST" },
      )) as { downloadUrl: string };
      if (!current(version)) return null;
      const target = new URL(result.downloadUrl);
      const local = ["localhost", "127.0.0.1", "[::1]"].includes(target.hostname);
      if (
        (target.protocol !== "https:" && !(local && target.protocol === "http:")) ||
        target.username ||
        target.password ||
        target.search ||
        target.hash ||
        !/^\/youtube-downloader\/files\/[a-f0-9]{64}$/.test(target.pathname)
      )
        throw new Error();
      state.phase = "ready";
      changed();
      return target.href;
    } catch (error) {
      if (!current(version)) return null;
      state.errorCode = errorCode(error);
      state.phase = "ready";
      changed();
      return null;
    }
  }

  function dispose() {
    reset();
    disposed = true;
  }
  return { state, preview, prepare, cancel, reset, download, dispose };
}
