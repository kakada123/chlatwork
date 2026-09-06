export const CREATOR_MEDIA_ACCEPT =
  ".mp4,.m4v,.mov,.webm,.mp3,.m4a,.wav,.ogg,.flac,video/mp4,video/quicktime,video/webm,audio/mpeg,audio/mp4,audio/wav,audio/ogg,audio/webm,audio/flac";

// These are device memory safeguards; the server still enforces the user's plan.
export const MAX_LOCAL_MEDIA_BYTES = 2 * 1024 * 1024 * 1024;
export const MAX_PREPARED_AUDIO_BYTES = 32 * 1024 * 1024;
export const AUDIO_PREPARATION_ERROR =
  "Could not prepare audio on this device. Choose an MP3, M4A, WAV, OGG, FLAC, or audio WebM file instead.";

export type PreparedCreatorAudio = {
  file: File;
  durationSeconds: number;
};

export type CreatorAudioWorkerMessage =
  | { type: "progress"; progress: number }
  | { type: "complete"; result: PreparedCreatorAudio }
  | { type: "error"; message: string };

export class CreatorAudioPreparationError extends Error {}

export function validateCreatorMediaFile(file: File) {
  if (!/\.(mp4|m4v|mov|webm|mp3|m4a|wav|ogg|flac)$/i.test(file.name)) {
    throw new CreatorAudioPreparationError(
      "Choose a supported video or audio file.",
    );
  }
  if (!file.size) {
    throw new CreatorAudioPreparationError(
      "This file is empty. Choose another file.",
    );
  }
  if (file.size > MAX_LOCAL_MEDIA_BYTES) {
    throw new CreatorAudioPreparationError(
      "This file is too large to prepare on your device. Choose a video under 2 GB or an audio file.",
    );
  }
}
