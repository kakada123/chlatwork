import {
  createYoutubeDownloaderController,
  type YoutubeDownloaderState,
} from "~/lib/youtube-downloader";

export function useYoutubeDownloader() {
  const state = ref<YoutubeDownloaderState>({
    phase: "idle",
    preview: null,
    job: null,
    errorCode: null,
  });
  const controller = createYoutubeDownloaderController({
    request: (path, options) =>
      $fetch(path, {
        ...options,
        method: options?.method as "GET" | "POST" | "DELETE" | undefined,
      }),
    schedule: (callback, delay) => setTimeout(callback, delay),
    unschedule: (timer) => clearTimeout(timer as ReturnType<typeof setTimeout>),
    onChange: (value) => {
      state.value = value;
    },
  });
  onBeforeUnmount(() => controller.dispose());
  return {
    state,
    preview: controller.preview,
    prepare: controller.prepare,
    cancel: controller.cancel,
    reset: controller.reset,
    download: controller.download,
  };
}
