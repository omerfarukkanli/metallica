// Enstrümanlar.
// Her create...() fonksiyonu aynı şekle sahip bir nesne döndürür:
//   play(note, time)   -> notayı verilen zamanda çal
//   stop()             -> çalan sesleri sustur
//   bend(value, time)  -> (isteğe bağlı) pitch bend uygula, value: -1..1

// Kısa ve alçak notalar palm mute (teli avuçla boğarak çalma) kabul edilir.
function isPalmMuted(note) {
  return note.duration <= 0.14 && note.midi <= 47;
}

// ---------- Ritim gitar ----------
// Zincir: sample -> ön gain -> alt kesme -> distorsiyon -> EQ -> presence -> kabin -> pan
function createRhythmGuitar(output, pan) {
  const panner = registerNode(new Tone.Panner(pan)).connect(output);
  const cabinet = registerNode(new Tone.Filter({ frequency: 5500, type: "lowpass", rolloff: -24 })).connect(panner);
  const presence = registerNode(new Tone.Filter({ frequency: 2800, type: "peaking", Q: 0.9, gain: 3 })).connect(cabinet);
  const eq = registerNode(new Tone.EQ3({ lowFrequency: 250, highFrequency: 2200 })).connect(presence);
  const cleanup = registerNode(new Tone.Filter(90, "highpass")).connect(eq);
  const distortion = registerNode(new Tone.Distortion({ distortion: 0.9, oversample: "4x" })).connect(cleanup);
  const tighten = registerNode(new Tone.Filter(160, "highpass")).connect(distortion); // distorsiyon öncesi bası kesmek sesi netleştirir
  const preGain = registerNode(new Tone.Gain(4)).connect(tighten);

  const sampler = registerNode(new Tone.Sampler({ urls: GUITAR_SAMPLES, baseUrl: SAMPLE_URLS.guitar, release: 0.12 })).connect(preGain);
  sampler.volume.value = -13;

  app.ampTargets.push({ distortion, eq, presence });

  return {
    play(note, time, velocity = note.velocity) {
      if (isPalmMuted(note)) {
        sampler.triggerAttackRelease(note.name, 0.085, time, velocity * 0.72);
      } else {
        sampler.triggerAttackRelease(note.name, note.duration, time, velocity);
      }
    },
    stop: () => sampler.releaseAll(),
  };
}

// Tek ritim kanalı varsa onu iki kez (sol + sağ) birkaç ms farkla çalarız.
// Metal kayıtlarındaki geniş gitar sesi bu "double tracking" ile elde edilir.
function createDoubleTrackedRhythm(output) {
  const left = createRhythmGuitar(output, -0.85);
  const right = createRhythmGuitar(output, 0.85);
  return {
    play(note, time) {
      left.play(note, time + Math.random() * 0.006);
      right.play(note, time + 0.007 + Math.random() * 0.006, note.velocity * 0.96);
    },
    stop() {
      left.stop();
      right.stop();
    },
  };
}

// ---------- Pitch bend yapabilen sampler ----------
// Tone.Sampler bend desteklemiyor. Burada her notayı kendimiz çalıyoruz ve
// bend gelince çalan notaların hızını (playbackRate) değiştiriyoruz.
class BendSampler {
  constructor(samples, baseUrl, output, gain) {
    this.output = output;
    this.gain = gain;
    this.bendRange = 2;           // ±2 yarım ses (MIDI standardı)
    this.currentBend = 0;
    this.playing = new Set();

    const samplesByMidi = {};
    for (const [noteName, file] of Object.entries(samples)) {
      samplesByMidi[Tone.Frequency(noteName).toMidi()] = file;
    }
    this.sampleNotes = Object.keys(samplesByMidi).map(Number);
    this.buffers = new Tone.ToneAudioBuffers({ urls: samplesByMidi, baseUrl });
  }

  closestSampleNote(midi) {
    return this.sampleNotes.reduce((best, n) => (Math.abs(n - midi) < Math.abs(best - midi) ? n : best));
  }

  // Sample'ın hangi hızda çalınırsa istenen notayı vereceği
  rateFor(midi, sampleNote, bend) {
    const semitones = midi + bend * this.bendRange - sampleNote;
    return Math.pow(2, semitones / 12);
  }

  play(midi, duration, time, velocity) {
    const sampleNote = this.closestSampleNote(midi);
    const gain = new Tone.Gain(velocity * this.gain).connect(this.output);
    const source = new Tone.ToneBufferSource({ url: this.buffers.get(sampleNote), fadeOut: 0.06, curve: "exponential" }).connect(gain);

    source.midi = midi;
    source.sampleNote = sampleNote;
    source.playbackRate.setValueAtTime(this.rateFor(midi, sampleNote, this.currentBend), time);
    source.onended = () => {
      this.playing.delete(source);
      source.dispose();
      gain.dispose();
    };
    source.start(time);
    source.stop(time + duration + 0.06);
    this.playing.add(source);
  }

  bend(value, time) {
    this.currentBend = value;
    for (const source of this.playing) {
      source.playbackRate.linearRampToValueAtTime(this.rateFor(source.midi, source.sampleNote, value), time);
    }
  }

  stopAll() {
    for (const source of this.playing) {
      try { source.stop(); } catch (e) { /* zaten durmuş */ }
    }
    this.currentBend = 0;
  }

  dispose() {
    this.stopAll();
    this.buffers.dispose();
  }
}

// ---------- Lead gitar ----------
// Ritimden farkı: daha fazla gain, orta frekanslar öne çıkık, bend destekli.
function createLeadGuitar(output) {
  const cabinet = registerNode(new Tone.Filter({ frequency: 6500, type: "lowpass", rolloff: -24 })).connect(output);
  const presence = registerNode(new Tone.Filter({ frequency: 2800, type: "peaking", Q: 0.9, gain: 3 })).connect(cabinet);
  const eq = registerNode(new Tone.EQ3({ low: -2, mid: 3, high: 1, lowFrequency: 300, highFrequency: 2500 })).connect(presence);
  const cleanup = registerNode(new Tone.Filter(100, "highpass")).connect(eq);
  const distortion = registerNode(new Tone.Distortion({ distortion: 0.95, oversample: "4x" })).connect(cleanup);
  const tighten = registerNode(new Tone.Filter(220, "highpass")).connect(distortion);
  const preGain = registerNode(new Tone.Gain(5)).connect(tighten);

  const sampler = registerNode(new BendSampler(GUITAR_SAMPLES, SAMPLE_URLS.guitar, preGain, 0.28));

  // Lead aynı amfiyi kullanır ama kendi farklarıyla (ör. orta frekans +9 dB)
  app.ampTargets.push({ distortion, eq, presence, offsets: { gain: 0.05, low: -5, mid: 9, high: -1 } });

  return {
    play: (note, time) => sampler.play(note.midi, note.duration, time, note.velocity),
    bend: (value, time) => sampler.bend(value, time),
    stop: () => sampler.stopAll(),
  };
}

// ---------- Clean gitar ----------
function createCleanGuitar(output) {
  const chorus = registerNode(new Tone.Chorus({ frequency: 1.5, delayTime: 3.5, depth: 0.5, wet: 0.5 })).connect(output).start();
  const compressor = registerNode(new Tone.Compressor(-22, 3)).connect(chorus);
  const sampler = registerNode(new Tone.Sampler({ urls: GUITAR_SAMPLES, baseUrl: SAMPLE_URLS.guitar, release: 0.8 })).connect(compressor);
  sampler.volume.value = -8;

  return {
    play: (note, time) => sampler.triggerAttackRelease(note.name, note.duration, time, note.velocity),
    stop: () => sampler.releaseAll(),
  };
}

// ---------- Bas gitar ----------
function createBass(output) {
  const compressor = registerNode(new Tone.Compressor({ threshold: -20, ratio: 4 })).connect(output);
  const lowpass = registerNode(new Tone.Filter(1800, "lowpass")).connect(compressor);
  const drive = registerNode(new Tone.Distortion({ distortion: 0.3, wet: 0.4 })).connect(lowpass);
  const sampler = registerNode(new Tone.Sampler({ urls: BASS_SAMPLES, baseUrl: SAMPLE_URLS.bass, release: 0.1 })).connect(drive);
  sampler.volume.value = -3;

  return {
    play(note, time) {
      const duration = note.duration <= 0.14 ? 0.1 : note.duration; // kısa notalar kısa kalsın
      sampler.triggerAttackRelease(note.name, duration, time, note.velocity);
    },
    stop: () => sampler.releaseAll(),
  };
}

// ---------- Vokal melodisi ----------
// Gerçek vokal yok; melodiyi vibratolu bir synth söylüyor.
function createVocalSynth(output) {
  const vibrato = registerNode(new Tone.Vibrato(5.5, 0.06)).connect(output);
  const synth = registerNode(new Tone.MonoSynth({
    oscillator: { type: "fatsawtooth", count: 2, spread: 14 },
    filter: { Q: 2, type: "lowpass", rolloff: -24 },
    envelope: { attack: 0.03, decay: 0.2, sustain: 0.7, release: 0.25 },
    filterEnvelope: { attack: 0.05, decay: 0.3, sustain: 0.6, baseFrequency: 500, octaves: 2.5 },
    portamento: 0.02,
  })).connect(vibrato);
  synth.volume.value = -15;

  return {
    play: (note, time) => synth.triggerAttackRelease(note.name, note.duration, time, note.velocity * 0.8),
    bend: (value, time) => synth.detune.linearRampToValueAtTime(value * 200, time), // 200 cent = 2 yarım ses
    stop() {
      synth.triggerRelease();
      synth.detune.cancelScheduledValues(0);
      synth.detune.value = 0;
    },
  };
}

// ---------- Tanınmayan kanallar ----------
function createFallbackSynth(output) {
  const synth = registerNode(new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: "triangle" },
    envelope: { attack: 0.02, release: 0.4 },
  })).connect(output);
  synth.volume.value = -16;

  return {
    play: (note, time) => synth.triggerAttackRelease(note.name, note.duration, time, note.velocity),
    stop: () => synth.releaseAll(),
  };
}

// ---------- Davul ----------
// beatGrid: { ppq, offsetTicks } -> hangi hi-hat vuruşunun zamana denk geldiğini bulmak için
function createDrumKit(output, beatGrid) {
  const bus = registerNode(new Tone.Compressor({ threshold: -16, ratio: 4, attack: 0.005, release: 0.12 })).connect(output);

  const urls = {};
  for (const [name, file] of Object.entries(DRUM_SAMPLES)) urls[name] = SAMPLE_URLS.drums + file;
  const kit = registerNode(new Tone.Players(urls)).connect(bus);
  const baseVolume = { kick: 2, snare: 0, hihat: -9, tom1: -1, tom2: -1, tom3: 0 };

  // Kitte zil kaydı yok: beyaz gürültü + metalik synth ile crash üretiyoruz
  const crashFilter = registerNode(new Tone.Filter(5500, "highpass")).connect(bus);
  const crashNoise = registerNode(new Tone.NoiseSynth({
    noise: { type: "white" },
    envelope: { attack: 0.001, decay: 1.8, sustain: 0, release: 0.5 },
  })).connect(crashFilter);
  crashNoise.volume.value = -15;
  const crashBell = registerNode(new Tone.MetalSynth({
    envelope: { attack: 0.001, decay: 1.4, release: 0.4 },
    harmonicity: 5.1, modulationIndex: 40, resonance: 6000, octaves: 1.5,
  })).connect(bus);
  crashBell.volume.value = -30;

  const isOnBeat = (note) => (note.ticks - beatGrid.offsetTicks) % beatGrid.ppq === 0;

  function playDrum(name, note, time) {
    // Humanize: her vuruş biraz farklı güçte, hi-hat vuruş aralarında daha yumuşak
    let velocity = 0.9 + Math.random() * 0.1;
    if (name === "hihat" && !isOnBeat(note)) velocity *= 0.62;

    const player = kit.player(name);
    player.volume.setValueAtTime(baseVolume[name] + Tone.gainToDb(velocity), time);
    player.start(time + Math.random() * 0.003);

    // Sahne animasyonları, sesle aynı anda tetiklensin diye Tone.Draw ile
    if (name === "kick") Tone.Draw.schedule(() => (stageFx.kick = 1), time);
    if (name === "snare" || name.startsWith("tom")) Tone.Draw.schedule(() => (stageFx.drumHit = 1), time);
  }

  function playCymbal(note, time) {
    const isRide = note.midi === 51 || note.midi === 59;
    crashNoise.triggerAttackRelease(1.6, time, 0.95);
    crashBell.triggerAttackRelease(isRide ? "C6" : "A5", 0.9, time, 0.75);
    Tone.Draw.schedule(() => {
      stageFx.crash = 1;
      stageFx.drumHit = 1;
      stage.burst();
    }, time);
  }

  return {
    play(note, time) {
      const name = DRUM_NOTE_MAP[note.midi];
      if (name) playDrum(name, note, time);
      else if (CYMBAL_NOTES.has(note.midi)) playCymbal(note, time);
    },
    stop() {},
  };
}
