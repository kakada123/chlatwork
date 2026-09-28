let sharedAudioContext: AudioContext | null = null;

type WindowWithWebkitAudio = Window & {
  webkitAudioContext?: typeof AudioContext;
};

export function playKlaKlokRollSound(durationMs: number) {
  const AudioContextConstructor =
    window.AudioContext ||
    (window as WindowWithWebkitAudio).webkitAudioContext;
  if (!AudioContextConstructor) return () => undefined;

  sharedAudioContext ??= new AudioContextConstructor();
  const context = sharedAudioContext;
  void context.resume();

  const startAt = context.currentTime + 0.02;
  const durationSeconds = Math.max(0.25, durationMs / 1_000);
  const endAt = startAt + durationSeconds;
  const master = context.createGain();
  const sources: AudioScheduledSourceNode[] = [];

  master.gain.setValueAtTime(0.0001, startAt);
  master.gain.exponentialRampToValueAtTime(0.18, startAt + 0.025);
  master.gain.setValueAtTime(0.18, Math.max(startAt + 0.03, endAt - 0.08));
  master.gain.exponentialRampToValueAtTime(0.0001, endAt);
  master.connect(context.destination);

  // Generate a short local rattle so the game never depends on a remote audio asset.
  const noiseBuffer = context.createBuffer(
    1,
    Math.ceil(context.sampleRate * durationSeconds),
    context.sampleRate,
  );
  const noise = noiseBuffer.getChannelData(0);
  for (let index = 0; index < noise.length; index += 1) {
    const pulse = Math.sin((index / context.sampleRate) * Math.PI * 22) > 0.72;
    noise[index] = pulse ? (Math.random() * 2 - 1) * 0.48 : 0;
  }

  const noiseSource = context.createBufferSource();
  const noiseFilter = context.createBiquadFilter();
  noiseSource.buffer = noiseBuffer;
  noiseFilter.type = "bandpass";
  noiseFilter.frequency.value = 1_350;
  noiseFilter.Q.value = 0.8;
  noiseSource.connect(noiseFilter).connect(master);
  noiseSource.start(startAt);
  noiseSource.stop(endAt);
  sources.push(noiseSource);

  const clickCount = Math.max(5, Math.floor(durationMs / 95));
  for (let index = 0; index < clickCount; index += 1) {
    const clickAt = startAt + (index / clickCount) * durationSeconds;
    const oscillator = context.createOscillator();
    const clickGain = context.createGain();
    oscillator.type = index % 2 ? "triangle" : "square";
    oscillator.frequency.setValueAtTime(170 + Math.random() * 210, clickAt);
    clickGain.gain.setValueAtTime(0.0001, clickAt);
    clickGain.gain.exponentialRampToValueAtTime(0.16, clickAt + 0.004);
    clickGain.gain.exponentialRampToValueAtTime(0.0001, clickAt + 0.045);
    oscillator.connect(clickGain).connect(master);
    oscillator.start(clickAt);
    oscillator.stop(clickAt + 0.05);
    sources.push(oscillator);
  }

  let stopped = false;
  return () => {
    if (stopped) return;
    stopped = true;
    for (const source of sources) {
      try {
        source.stop();
      } catch {
        // A source that already ended is safe to ignore during cleanup.
      }
    }
    master.disconnect();
  };
}
