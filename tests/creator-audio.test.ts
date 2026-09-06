import assert from "node:assert/strict";
import test from "node:test";
import {
  BlobSource,
  BufferTarget,
  EncodedAudioPacketSource,
  EncodedPacket,
  EncodedPacketSink,
  EncodedVideoPacketSource,
  Input,
  ALL_FORMATS,
  Mp4OutputFormat,
  Output,
  WebMOutputFormat,
} from "mediabunny";
import {
  validateCreatorMediaFile,
  MAX_LOCAL_MEDIA_BYTES,
} from "../app/lib/creator-audio.ts";
import {
  extractCreatorAudio,
  isPresentableCreatorAudioPacket,
} from "../app/lib/creator-audio-extract.ts";

function wavFile(seconds = 1) {
  const bytes = new Uint8Array(44 + seconds * 16000 * 2);
  const view = new DataView(bytes.buffer);
  const text = (offset: number, value: string) =>
    bytes.set(new TextEncoder().encode(value), offset);
  text(0, "RIFF");
  view.setUint32(4, bytes.length - 8, true);
  text(8, "WAVEfmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, 16000, true);
  view.setUint32(28, 32000, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  text(36, "data");
  view.setUint32(40, bytes.length - 44, true);
  return new File([bytes], "speech.wav", { type: "audio/wav" });
}

async function fixture(
  options: {
    webm?: boolean;
    video?: boolean;
    audio?: boolean;
    start?: number;
  } = {},
) {
  const target = new BufferTarget();
  const output = new Output({
    format: options.webm ? new WebMOutputFormat() : new Mp4OutputFormat(),
    target,
  });
  const audio = new EncodedAudioPacketSource(options.webm ? "opus" : "aac");
  const video = new EncodedVideoPacketSource("vp8");
  if (options.audio !== false) output.addAudioTrack(audio);
  if (options.video) output.addVideoTrack(video);
  output.setMetadataTags({
    title: "Private source title",
    artist: "Private source owner",
  });
  await output.start();
  if (options.audio !== false) {
    const duration = options.webm ? 0.02 : 1024 / 48000;
    for (let i = 0; i < 50; i++) {
      await audio.add(
        new EncodedPacket(
          new Uint8Array(
            options.webm
              ? [0xf8, 0xff, 0xfe]
              : [0x21, 0x10, 0x04, 0x60, 0x8c, 0x1c],
          ),
          "key",
          (options.start ?? 0) + i * duration,
          duration,
        ),
        i === 0
          ? {
              decoderConfig: {
                codec: options.webm ? "opus" : "mp4a.40.2",
                sampleRate: 48000,
                numberOfChannels: 2,
                ...(options.webm
                  ? {}
                  : { description: new Uint8Array([0x11, 0x90]) }),
              },
            }
          : undefined,
      );
    }
    audio.close();
  }
  if (options.video) {
    // Muxing fixture: video bytes need not be decoded to prove they never reach the output.
    await video.add(
      new EncodedPacket(new Uint8Array(512 * 1024), "key", 0, 1),
      {
        decoderConfig: { codec: "vp8", codedWidth: 16, codedHeight: 16 },
      },
    );
    video.close();
  }
  await output.finalize();
  return new File([target.buffer!], options.webm ? "clip.webm" : "clip.mp4", {
    type: options.webm ? "video/webm" : "video/mp4",
  });
}

test("audio extraction strips video and source metadata without any browser codec APIs", async () => {
  const original = await fixture({ webm: true, video: true });
  const progress: number[] = [];
  const result = await extractCreatorAudio(original, (value) =>
    progress.push(value),
  );
  assert.equal(result.file.type, "audio/webm");
  assert.ok(result.file.size < original.size / 10);
  assert.equal(progress.at(-1), 1);
  assert.ok(
    progress.every(
      (value, index) =>
        value >= 0 &&
        value <= 1 &&
        (index === 0 || value >= progress[index - 1]!),
    ),
  );
  const input = new Input({
    source: new BlobSource(result.file),
    formats: ALL_FORMATS,
  });
  try {
    assert.equal((await input.getVideoTracks()).length, 0);
    assert.equal((await input.getAudioTracks()).length, 1);
    assert.equal((await input.getMetadataTags()).title, undefined);
    assert.equal((await input.getMetadataTags()).artist, undefined);
    const packet = await new EncodedPacketSink(
      (await input.getPrimaryAudioTrack())!,
    ).getFirstPacket();
    assert.deepEqual([...packet!.data], [0xf8, 0xff, 0xfe]);
  } finally {
    input.dispose();
  }
});

test("M4A keeps delayed timestamps for subtitle alignment", async () => {
  for (const start of [0, 2]) {
    const original = await fixture({ start });
    const result = await extractCreatorAudio(original);
    assert.equal(result.file.type, "audio/mp4");
    assert.equal(result.file.name, "clip.m4a");
    const input = new Input({
      source: new BlobSource(result.file),
      formats: ALL_FORMATS,
    });
    try {
      const track = (await input.getPrimaryAudioTrack())!;
      assert.ok(Math.abs((await track.getFirstTimestamp()) - start) < 0.001);
      assert.equal((await input.getVideoTracks()).length, 0);
    } finally {
      input.dispose();
    }
  }
});

test("encoder preroll is skipped while audible packet timestamps stay unchanged", () => {
  const data = new Uint8Array([0x21, 0x10]);
  assert.equal(
    isPresentableCreatorAudioPacket(
      new EncodedPacket(data, "key", -1024 / 48000, 1024 / 48000),
    ),
    false,
  );
  const delayed = new EncodedPacket(data, "key", 2, 1024 / 48000);
  assert.equal(isPresentableCreatorAudioPacket(delayed), true);
  assert.equal(delayed.timestamp, 2);
  assert.throws(
    () =>
      isPresentableCreatorAudioPacket(
        new EncodedPacket(data, "key", -0.01, 1024 / 48000),
      ),
    /Choose an MP3/,
  );
});

test("direct WAV input produces audio with the original duration", async () => {
  const result = await extractCreatorAudio(wavFile());
  assert.equal(result.file.type, "audio/wav");
  assert.equal(result.durationSeconds, 1);
  const input = new Input({
    source: new BlobSource(result.file),
    formats: ALL_FORMATS,
  });
  try {
    assert.equal(await input.computeDuration(), 1);
  } finally {
    input.dispose();
  }
});

test("large uncompressed audio is stopped at the device output memory limit", async () => {
  await assert.rejects(extractCreatorAudio(wavFile(1050)), /larger than 32 MB/);
});

test("silent video, corrupt files, empty files, and oversized sources fail locally", async () => {
  await assert.rejects(
    extractCreatorAudio(
      await fixture({ webm: true, video: true, audio: false }),
    ),
    /no audio track/,
  );
  await assert.rejects(
    extractCreatorAudio(new File(["not media"], "fake.mp4")),
    /Choose an MP3/,
  );
  assert.throws(
    () => validateCreatorMediaFile(new File([], "empty.mp3")),
    /empty/,
  );
  assert.throws(
    () =>
      validateCreatorMediaFile({
        name: "large.mov",
        size: MAX_LOCAL_MEDIA_BYTES + 1,
      } as File),
    /under 2 GB/,
  );
  assert.throws(
    () => validateCreatorMediaFile(new File(["text"], "script.html")),
    /supported/,
  );
});
