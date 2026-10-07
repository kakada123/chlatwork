/** Short local effects, initialized only by a user's swat; no audio download or autoplay. */
export function createSwatSoundPlayer() {
  let context: AudioContext | undefined;
  let disposed = false;
  let lastPlayedAt = -Infinity;
  const buffers = new Map<boolean, AudioBuffer>();
  const voices = new Map<AudioBufferSourceNode, GainNode>();

  function release(source: AudioBufferSourceNode) {
    const gain = voices.get(source);
    if (!gain) return;
    voices.delete(source);
    source.onended = null;
    try {
      source.stop();
    } catch {
      /* A completed source needs only disconnection. */
    }
    source.disconnect();
    gain.disconnect();
  }

  function bufferFor(audio: AudioContext, hit: boolean) {
    const cached = buffers.get(hit);
    if (cached) return cached;
    const duration = hit ? 0.16 : 0.09;
    const buffer = audio.createBuffer(
      1,
      Math.ceil(audio.sampleRate * duration),
      audio.sampleRate,
    );
    const data = buffer.getChannelData(0);
    for (let index = 0; index < data.length; index++) {
      const time = index / audio.sampleRate;
      const progress = time / duration;
      const envelope =
        Math.min(time / 0.002, 1) * (1 - progress) ** (hit ? 3 : 1.5);
      const noise = Math.random() * 2 - 1;
      // A falling low thump under the noise gives hits weight; a miss stays a soft swish.
      const thump = Math.sin(
        2 * Math.PI * (140 * time - (100 * time * time) / (2 * duration)),
      );
      data[index] = envelope * (hit ? noise * 0.7 + thump * 0.3 : noise);
    }
    buffers.set(hit, buffer);
    return buffer;
  }

  function play(hit: boolean) {
    if (disposed || typeof window === "undefined") return;
    const requestedAt = performance.now();
    if (requestedAt - lastPlayedAt < 35) return;
    lastPlayedAt = requestedAt;
    try {
      const Constructor =
        window.AudioContext ||
        (window as Window & { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!Constructor) return;
      context ??= new Constructor({ latencyHint: "interactive" });
      const audio = context;
      const emit = () => {
        // Ignore late resumes after navigation/muting or a slow browser permission transition.
        if (
          disposed ||
          audio.state !== "running" ||
          performance.now() - requestedAt > 250
        )
          return;
        if (voices.size >= 3) release(voices.keys().next().value!);
        const source = audio.createBufferSource();
        const gain = audio.createGain();
        source.buffer = bufferFor(audio, hit);
        gain.gain.value = hit ? 0.32 : 0.1;
        source.connect(gain).connect(audio.destination);
        voices.set(source, gain);
        source.onended = () => release(source);
        source.start(audio.currentTime + 0.005);
      };
      // Resume is requested within the pointer gesture, including Safari's prefixed context.
      if (audio.state === "running") emit();
      else
        void audio
          .resume()
          .then(emit)
          .catch(() => undefined);
    } catch {
      // Audio support/policy failures must never interrupt the visible hit or kill.
    }
  }

  function dispose() {
    disposed = true;
    for (const source of [...voices.keys()]) release(source);
    buffers.clear();
    if (context && context.state !== "closed")
      void context.close().catch(() => undefined);
    context = undefined;
  }

  return { play, dispose };
}
