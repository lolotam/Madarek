export function playApplause(context: AudioContext) {
  const duration = 1.45;
  const rate = context.sampleRate;
  const sound = context.createBuffer(1, Math.ceil(duration * rate), rate);
  const samples = sound.getChannelData(0);

  for (let clap = 0; clap < 34; clap++) {
    const startTime = 0.045 + clap * 0.034 + Math.random() * 0.038;
    const start = Math.floor(startTime * rate);
    const strength = (0.14 + Math.random() * 0.16) * (1 - startTime / duration);
    const length = Math.min(samples.length - start, Math.floor(rate * 0.1));
    let bass = 0;
    let softened = 0;

    for (let sample = 0; sample < length; sample++) {
      const noise = Math.random() * 2 - 1;
      softened += (noise - softened) * 0.65;
      bass += (softened - bass) * 0.12;
      const time = sample / rate;
      const attack = Math.min(1, time * 1000);
      const envelope =
        attack * Math.exp(-time * (sample < rate * 0.013 ? 85 : 39));
      samples[start + sample] += (softened - bass) * strength * envelope;
    }
  }

  const notes = [523.25, 659.25, 783.99, 1046.5];
  for (const [index, frequency] of notes.entries()) {
    const start = Math.floor(index * 0.105 * rate);
    const length = Math.floor(
      (index === notes.length - 1 ? 0.38 : 0.22) * rate,
    );
    for (let sample = 0; sample < length; sample++) {
      const time = sample / rate;
      const phase = 2 * Math.PI * frequency * time;
      const envelope =
        Math.min(1, time / 0.008, (length - sample) / (rate * 0.03)) *
        Math.exp(-time * 9);
      const tone = Math.sin(phase) * 0.83 + Math.sin(phase * 2) * 0.17;
      samples[start + sample] += tone * envelope * 0.23;
    }
  }

  const peak = samples.reduce(
    (max, sample) => Math.max(max, Math.abs(sample)),
    0,
  );
  const gain = 0.72 / peak;
  for (let i = 0; i < samples.length; i++) samples[i] *= gain;

  const source = context.createBufferSource();
  source.buffer = sound;
  source.connect(context.destination);
  source.onended = () => source.disconnect();
  source.start();
}

export function prepareApplauseFallback() {
  const clip = new Audio("/english/celebration.wav");
  clip.muted = true;
  // Use the submit gesture to prepare playback without playing an ungraded answer's sound.
  return clip.play().then(
    () => {
      clip.pause();
      clip.currentTime = 0;
      return () => {
        clip.muted = false;
        void clip.play().catch(() => {});
      };
    },
    () => null,
  );
}
