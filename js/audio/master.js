// Tüm kanalların birleştiği ana çıkış.
//
//   kanal -> master.volume -> compressor -> limiter -> hoparlör
//   kanal -> (gönderim) -> reverb / delay -> master.volume

const master = (() => {
  const limiter = new Tone.Limiter(-0.8).toDestination();
  const meter = new Tone.Meter({ smoothing: 0.8 });
  limiter.connect(meter);

  const compressor = new Tone.Compressor({ threshold: -16, ratio: 3, attack: 0.012, release: 0.25 }).connect(limiter);
  const volume = new Tone.Volume(0).connect(compressor);

  // Efektler "send" olarak kullanılır: wet = 1, miktarı kanal belirler.
  const reverb = new Tone.Reverb({ decay: 2.2, preDelay: 0.015, wet: 1 }).connect(volume);
  const delay = new Tone.FeedbackDelay({ delayTime: 0.36, feedback: 0.3, wet: 1 }).connect(volume);

  return { volume, meter, reverb, delay };
})();

// Bir MIDI kanalı için mikser kanalı: ses seviyesi + metre + efekt gönderimleri.
function createChannel(role) {
  const { reverb, delay } = ROLES[role];
  const volume = registerNode(new Tone.Volume(0));
  const meter = registerNode(new Tone.Meter({ smoothing: 0.7 }));

  volume.connect(master.volume);
  volume.connect(meter);
  if (reverb) volume.connect(registerNode(new Tone.Gain(reverb)).connect(master.reverb));
  if (delay) volume.connect(registerNode(new Tone.Gain(delay)).connect(master.delay));

  return { volume, meter };
}
