import * as media from "mediabunny";
import {
  AUDIO_PREPARATION_ERROR,
  MAX_PREPARED_AUDIO_BYTES,
  CreatorAudioPreparationError,
  validateCreatorMediaFile,
  type PreparedCreatorAudio,
} from "./creator-audio.ts";

export async function extractCreatorAudio(
  file: File,
  onProgress: (progress: number) => void = () => {},
): Promise<PreparedCreatorAudio> {
  validateCreatorMediaFile(file);
  const input = new media.Input({
    source: new media.BlobSource(file, { maxCacheSize: 4 * 1024 * 1024 }),
    formats: [
      media.MP4,
      media.QTFF,
      media.WEBM,
      media.MP3,
      media.WAVE,
      media.OGG,
      media.FLAC,
    ],
  });
  let output: InstanceType<typeof media.Output> | undefined;
  try {
    const track = await input.getPrimaryAudioTrack();
    if (!track) {
      throw new CreatorAudioPreparationError(
        "This file has no audio track. Choose a file with sound.",
      );
    }
    const codec = await track.getCodec();
    const decoderConfig = await track.getDecoderConfig();
    const durationSeconds = await track.computeDuration();
    if (
      !codec ||
      !decoderConfig ||
      !Number.isFinite(durationSeconds) ||
      durationSeconds <= 0
    ) {
      throw new CreatorAudioPreparationError(AUDIO_PREPARATION_ERROR);
    }

    const isWebm = codec === "opus" || codec === "vorbis";
    const isPcm = codec.startsWith("pcm-");
    const format = isWebm
      ? new media.WebMOutputFormat()
      : isPcm
        ? new media.WavOutputFormat()
        : new media.Mp4OutputFormat({ fastStart: false });
    if (!format.getSupportedAudioCodecs().includes(codec)) {
      throw new CreatorAudioPreparationError(AUDIO_PREPARATION_ERROR);
    }
    // WAV cannot retain a delayed track's timestamps; do not silently shift subtitles.
    if (isPcm && Math.abs(await track.getFirstTimestamp()) > 0.001) {
      throw new CreatorAudioPreparationError(AUDIO_PREPARATION_ERROR);
    }

    let audioBlob = new Blob();
    const target = new media.StreamTarget(
      new WritableStream({
        write({ position, data }: media.StreamTargetChunk) {
          const end = position + data.byteLength;
          if (end > MAX_PREPARED_AUDIO_BYTES) {
            throw new CreatorAudioPreparationError(
              "The audio is larger than 32 MB. Choose a shorter clip or a compressed MP3 or M4A file.",
            );
          }
          // Muxers rewrite headers. Blob slices keep those bounded writes off the JS heap.
          audioBlob = new Blob([
            audioBlob.slice(0, position),
            ...(position > audioBlob.size
              ? [new Uint8Array(position - audioBlob.size)]
              : []),
            data,
            audioBlob.slice(end),
          ]);
        },
      }),
      { chunked: true, chunkSize: 1024 * 1024 },
    );
    output = new media.Output({ format, target });
    const source = new media.EncodedAudioPacketSource(codec);
    output.addAudioTrack(source);
    // Copy only the selected audio packets, preserving timing and excluding video,
    // cover art, and source metadata. No browser decoder or encoder is required.
    await output.start();
    let packetCount = 0;
    for await (const packet of new media.EncodedPacketSink(track).packets()) {
      if (!isPresentableCreatorAudioPacket(packet)) continue;
      await source.add(
        packet,
        packetCount === 0 ? { decoderConfig } : undefined,
      );
      packetCount += 1;
      onProgress(
        Math.min(
          0.99,
          Math.max(0, (packet.timestamp + packet.duration) / durationSeconds),
        ),
      );
    }
    if (!packetCount)
      throw new CreatorAudioPreparationError(
        "This file has no readable audio.",
      );
    source.close();
    await output.finalize();
    onProgress(1);
    return {
      file: new File(
        [audioBlob],
        `${file.name.replace(/\.[^.]+$/, "")}.${isWebm ? "webm" : isPcm ? "wav" : "m4a"}`,
        {
          type: isWebm ? "audio/webm" : isPcm ? "audio/wav" : "audio/mp4",
        },
      ),
      durationSeconds,
    };
  } catch (error) {
    if (error instanceof CreatorAudioPreparationError) throw error;
    throw new CreatorAudioPreparationError(AUDIO_PREPARATION_ERROR);
  } finally {
    if (output && output.state !== "finalized")
      await output.cancel().catch(() => {});
    input.dispose();
  }
}

export function isPresentableCreatorAudioPacket(packet: media.EncodedPacket) {
  // AAC files can start with encoder preroll before time zero. Those packets
  // are not audible. Keep every later timestamp unchanged for subtitle sync.
  if (packet.timestamp >= 0) return true;
  if (packet.timestamp + packet.duration <= 0.000001) return false;
  // A packet crossing zero needs sample-level trimming; never shift speech silently.
  throw new CreatorAudioPreparationError(AUDIO_PREPARATION_ERROR);
}
