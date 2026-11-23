export function playApplause(context: AudioContext) {
  const duration = 1.45;
  const rate = context.sampleRate;
  const sound = context.createBuffer(1, Math.ceil(duration * rate), rate);
  const samples = sound.getChannelData(0);

  for (let clap = 0; clap < 34; clap++) {
    const startTime = 0.045 + clap * 0.034 + Math.random() * 0.038;
    const start = Math.floor(startTime * rate);
    const strength = (0.09 + Math.random() * 0.11) * (1 - startTime / duration);
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

  const source = context.createBufferSource();
  source.buffer = sound;
  source.connect(context.destination);
  source.onended = () => source.disconnect();
  source.start();
}
