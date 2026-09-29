// MIDI dosyası -> çalınabilir şarkı.
//
// Adımlar (buildSong):
//   1. Her dolu MIDI kanalının rolünü bul (davul, bas, ritim gitar...)
//   2. Rolüne göre bir mikser kanalı ve enstrüman oluştur
//   3. Notaları ve pitch bend'leri Tone.Part ile zamanlamaya koy
//   4. Sahne için vuruş nabzını zamanla
//
// Zamanlama saniye değil MIDI "tick" cinsinden yapılır ("480i" = 480. tick).
// Böylece Transport'un BPM'i değişince bütün şarkı birlikte hızlanır/yavaşlar.
// Not: Birden fazla tempo içeren MIDI'lerde sadece ilk tempo kullanılır.

// Tempo değiştiyse nota süresini de aynı oranda ölçekle
function withCurrentTempo(note) {
  const scale = app.song.bpm / Tone.Transport.bpm.value;
  return scale === 1 ? note : { ...note, duration: note.duration * scale };
}

// General MIDI program numaralarına ve kanal adına bakarak rol tahmini
function detectRole(midiTrack) {
  const program = midiTrack.instrument.number;
  if (midiTrack.instrument.percussion || midiTrack.channel === 9) return "drums";
  if (/voice|vocal|vox|sing/i.test(midiTrack.name)) return "voice";
  if ((program >= 52 && program <= 54) || (program >= 64 && program <= 79)) return "voice"; // koro, nefesli
  if (program >= 32 && program <= 39) return "bass";
  if (program >= 29 && program <= 31) {
    // Distorsiyonlu gitar: çok bend'i veya tiz notası varsa solo gitardır
    const highestNote = Math.max(...midiTrack.notes.map((n) => n.midi));
    return midiTrack.pitchBends.length > 20 || highestNote >= 64 ? "lead" : "rhythm";
  }
  if (program >= 24 && program <= 28) return "clean";
  return "other";
}

// Başlık, sanatçı ve transkripsiyon bilgisini bul.
// Bazı MIDI'ler bunları boş kanalların adına yazar ("by Metallica" gibi).
function readSongInfo(midi, fileName) {
  const trackNames = midi.tracks.map((t) => (t.name || "").trim());
  const titleFromFile = fileName
    .replace(/\.midi?$/i, "")
    .replace(/([a-z])([A-Z])/g, "$1 $2") // EnterSandman -> Enter Sandman
    .replace(/[_-]+/g, " ");

  let artist = "MIDI";
  let credit = "";
  trackNames.forEach((name, index) => {
    if (/transcribed by/i.test(name)) {
      const who = name.replace(/.*transcribed by/i, "").trim() || trackNames.slice(index + 1).find(Boolean);
      if (who) credit = `MIDI transkripsiyonu: ${who}`;
    } else {
      const match = name.match(/^by\s+(.+)/i);
      if (match) artist = match[1];
    }
  });

  return { title: (midi.name || "").trim() || titleFromFile, artist, credit };
}

// Önceki şarkının tüm seslerini ve zamanlamalarını temizler
function clearSong() {
  Tone.Transport.stop();
  Tone.Transport.cancel();
  app.parts.forEach((part) => part.dispose());
  app.audioNodes.forEach((node) => node.dispose());
  app.parts = [];
  app.audioNodes = [];
  app.ampTargets = [];
  app.tracks = [];
  app.isPlaying = false;
}

function createInstrumentFor(role, output, options) {
  switch (role) {
    case "drums": return createDrumKit(output, options.beatGrid);
    case "lead": return createLeadGuitar(output);
    case "clean": return createCleanGuitar(output);
    case "bass": return createBass(output);
    case "voice": return createVocalSynth(output);
    case "rhythm":
      return options.rhythmPan === null ? createDoubleTrackedRhythm(output) : createRhythmGuitar(output, options.rhythmPan);
    default: return createFallbackSynth(output);
  }
}

// Birden fazla ritim gitar kanalı varsa sırayla sola ve sağa yerleştirilir
const RHYTHM_PANS = [-0.85, 0.85, -0.5, 0.5];

function buildSong(midi, fileName) {
  clearSong();

  const bpm = midi.header.tempos.length ? midi.header.tempos[0].bpm : 120;
  const ppq = midi.header.ppq;
  Tone.Transport.PPQ = ppq; // Transport tick'i = MIDI tick'i, dönüşüm gerekmesin
  Tone.Transport.bpm.value = bpm;
  master.delay.delayTime.value = (60 / bpm) * 0.75; // noktalı sekizlik: klasik solo delay'i

  // Şarkı kısa bir giriş ölçüsüyle başlıyorsa (ör. 1/8) vuruş ızgarası o kadar kayar
  const timeSignatures = midi.header.timeSignatures;
  const offsetTicks = timeSignatures[1] && timeSignatures[1].ticks < ppq * 4 ? timeSignatures[1].ticks : 0;
  app.beatStart = midi.header.ticksToSeconds(offsetTicks);
  app.beatLength = 60 / bpm;
  app.beatGrid = { ppq, offsetTicks };

  const midiTracks = midi.tracks.filter((t) => t.notes.length > 0);
  const roles = midiTracks.map(detectRole);
  const rhythmCount = roles.filter((r) => r === "rhythm").length;
  let rhythmIndex = 0;

  app.tracks = midiTracks.map((midiTrack, i) => {
    const role = roles[i];
    let label = ROLES[role].label;

    let rhythmPan = null; // null = tek kanal, çift kayıt yap
    if (role === "rhythm" && rhythmCount > 1) {
      rhythmPan = RHYTHM_PANS[rhythmIndex++ % RHYTHM_PANS.length];
      label += rhythmPan < 0 ? " · Sol" : " · Sağ";
    }

    const channel = createChannel(role);
    const instrument = createInstrumentFor(role, channel.volume, { beatGrid: { ppq, offsetTicks }, rhythmPan });
    const notes = midiTrack.notes.map((n) => ({
      time: n.time, midi: n.midi, name: n.name, duration: n.duration, velocity: n.velocity, ticks: n.ticks,
    }));

    const noteEvents = notes.map((note) => ({ ...note, time: `${note.ticks}i` }));
    app.parts.push(new Tone.Part((time, note) => instrument.play(withCurrentTempo(note), time), noteEvents).start(0));

    if (instrument.bend && midiTrack.pitchBends.length) {
      const bends = midiTrack.pitchBends.map((b) => ({ time: `${b.ticks}i`, value: b.value }));
      app.parts.push(new Tone.Part((time, bend) => instrument.bend(bend.value, time), bends).start(0));
    }

    const pitches = notes.map((n) => n.midi); // notes: saniye cinsinden, nota akışı için
    return {
      role,
      label,
      color: ROLES[role].color,
      description: `${midiTrack.name || "—"} · ${midiTrack.instrument.name} · ${notes.length} nota`,
      notes,
      lowestNote: Math.min(...pitches),
      highestNote: Math.max(...pitches),
      instrument,
      channel,
      muted: false,
      soloed: false,
    };
  });

  scheduleBeatPulse();
  app.song = {
    bpm, // orijinal tempo
    duration: midi.duration, // orijinal tempoda saniye
    ticksToSeconds: (ticks) => midi.header.ticksToSeconds(ticks),
    secondsToTicks: (seconds) => midi.header.secondsToTicks(seconds),
    ...readSongInfo(midi, fileName),
  };
}

// Her vuruşta sahne ışıklarını ve animasyonları tetikler
function scheduleBeatPulse() {
  const { ppq, offsetTicks } = app.beatGrid;
  Tone.Transport.scheduleRepeat((time) => {
    const beatIndex = Math.round((Tone.Transport.getTicksAtTime(time) - offsetTicks) / ppq);
    Tone.Draw.schedule(() => {
      stageFx.pulse = 1;
      stageFx.beatIndex = beatIndex;
      if (beatIndex % 4 === 0) stageFx.downbeat = 1;
    }, time);
  }, "4n", `${offsetTicks}i`);
}

// MIDI dosyasını çözer, şarkıyı kurar ve sample'ların inmesini bekler
async function loadMidi(arrayBuffer, fileName) {
  setReady(false);
  setStatus("MIDI çözümleniyor…");

  let midi;
  try {
    midi = new Midi(arrayBuffer);
  } catch (error) {
    setStatus("Geçersiz MIDI dosyası");
    return;
  }

  buildSong(midi, fileName);
  renderSongInfo();
  renderTempo();
  renderMixer();
  applyAmpSettings();

  setStatus("Sample'lar yükleniyor…");
  try {
    await Tone.loaded();
    setReady(true);
    setStatus("Hazır · Çal'a bas ya da boşluk tuşu");
  } catch (error) {
    setStatus("Sample'lar yüklenemedi: " + error.message);
  }
}
