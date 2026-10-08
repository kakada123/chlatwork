import assert from "node:assert/strict";
import test from "node:test";
import {
  createYoutubeDownloaderController,
  type YoutubePreview,
  type YoutubeJobView,
} from "../app/lib/youtube-downloader.ts";

const preview: YoutubePreview = {
  videoId: "BaW_jenozKc",
  title: "Fixture",
  thumbnailUrl: "https://i.ytimg.com/vi/BaW_jenozKc/hqdefault.jpg",
  durationSeconds: 60,
  qualities: [720],
};
const preparing: YoutubeJobView = {
  id: "12345678-1234-4234-8234-123456789abc",
  status: "preparing",
  expiresAt: null,
};
const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};
const deferred = <T>() => {
  let resolve!: (result: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
};

function harness(
  request: (path: string, options?: { method?: string; body?: unknown }) => Promise<unknown>,
) {
  const scheduled = new Map<number, () => void>();
  let serial = 0;
  const controller = createYoutubeDownloaderController({
    request,
    schedule: (callback) => {
      const id = ++serial;
      scheduled.set(id, callback);
      return id;
    },
    unschedule: (id) => {
      scheduled.delete(id as number);
    },
    onChange: () => {},
  });
  return {
    controller,
    scheduled,
    poll: async () => {
      const [id, callback] = scheduled.entries().next().value!;
      scheduled.delete(id);
      callback();
      await flush();
    },
  };
}

test("input changes invalidate an older preview response", async () => {
  const old = deferred<YoutubePreview>();
  const { controller } = harness(async () => old.promise);
  const request = controller.preview("old");
  controller.reset();
  old.resolve(preview);
  await request;
  assert.equal(controller.state.preview, null);
  assert.equal(controller.state.phase, "idle");
});

test("a job created after reset is cancelled without replacing state", async () => {
  const created = deferred<YoutubeJobView>();
  const deleted: string[] = [];
  const { controller } = harness(async (path, options) => {
    if (path.endsWith("/preview")) return preview;
    if (options?.method === "DELETE") {
      deleted.push(path);
      return;
    }
    return created.promise;
  });
  await controller.preview("url");
  const request = controller.prepare(720);
  controller.reset();
  created.resolve(preparing);
  await request;
  assert.deepEqual(deleted, [`/api/youtube-downloader/jobs/${preparing.id}`]);
  assert.equal(controller.state.job, null);
});

test("terminal status stops polling and a fresh ticket is requested only on click", async () => {
  let ticketRequests = 0;
  const { controller, scheduled, poll } = harness(async (path, options) => {
    if (path.endsWith("/preview")) return preview;
    if (path.endsWith("/ticket")) {
      ticketRequests++;
      return {
        downloadUrl: `https://downloads.example.test/youtube-downloader/files/${"a".repeat(64)}`,
        expiresAt: "later",
      };
    }
    if (options?.method === "POST") return preparing;
    return {
      ...preparing,
      status: "ready",
      fileName: "video.mp4",
      sizeBytes: 100,
      expiresAt: new Date(Date.now() + 600000).toISOString(),
    };
  });
  await controller.preview("url");
  await controller.prepare(720);
  assert.equal(scheduled.size, 1);
  await poll();
  assert.equal(controller.state.phase, "ready");
  assert.equal(scheduled.size, 0);
  assert.equal(ticketRequests, 0);
  assert.match((await controller.download())!, /^https:\/\/downloads\.example\.test/);
  assert.equal(ticketRequests, 1);
});

test("inflight polling cannot restore a cancelled job", async () => {
  const polled = deferred<YoutubeJobView>();
  const { controller, scheduled, poll } = harness(async (path, options) => {
    if (path.endsWith("/preview")) return preview;
    if (options?.method === "DELETE") return;
    if (options?.method === "POST") return preparing;
    return polled.promise;
  });
  await controller.preview("url");
  await controller.prepare(720);
  await poll();
  await controller.cancel();
  polled.resolve({ ...preparing, status: "ready" });
  await flush();
  assert.equal(controller.state.phase, "previewed");
  assert.equal(scheduled.size, 0);
});

test("disposing clears polling and requests cancellation", async () => {
  let cancellations = 0;
  const { controller, scheduled } = harness(async (path, options) => {
    if (path.endsWith("/preview")) return preview;
    if (options?.method === "DELETE") {
      cancellations++;
      return;
    }
    return preparing;
  });
  await controller.preview("url");
  await controller.prepare(720);
  controller.dispose();
  await flush();
  assert.equal(scheduled.size, 0);
  assert.equal(cancellations, 1);
});

test("login, capacity and restart failures have actionable error codes", async () => {
  for (const [status, expected] of [
    [401, "AUTH_REQUIRED"],
    [429, "CAPACITY"],
    [404, "NOT_FOUND"],
    [503, "UNAVAILABLE"],
  ] as const) {
    const { controller } = harness(async () => {
      throw { statusCode: status };
    });
    await controller.preview("url");
    assert.equal(controller.state.errorCode, expected);
  }
});

test("untrusted or malformed ticket URLs cannot trigger navigation", async () => {
  const { controller, poll } = harness(async (path, options) => {
    if (path.endsWith("/preview")) return preview;
    if (path.endsWith("/ticket")) return { downloadUrl: "javascript:alert(1)" };
    if (options?.method === "POST") return preparing;
    return { ...preparing, status: "ready" };
  });
  await controller.preview("url");
  await controller.prepare(720);
  await poll();
  assert.equal(await controller.download(), null);
  assert.equal(controller.state.errorCode, "DOWNLOAD_FAILED");
});
