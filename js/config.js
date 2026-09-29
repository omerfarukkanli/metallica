// Uygulamanın tüm sabit ayarları. Bir şeyi değiştirmek istersen önce buraya bak.

// ---------- Enstrüman sample'ları ----------
const SAMPLE_URLS = {
  guitar: "https://nbrosowsky.github.io/tonejs-instruments/samples/guitar-electric/",
  bass: "https://nbrosowsky.github.io/tonejs-instruments/samples/bass-electric/",
  drums: "https://tonejs.github.io/audio/drum-samples/acoustic-kit/",
};

// Nota adı -> dosya adı. Tone.Sampler aradaki notaları bu kayıtlardan üretir.
// Not: Tone.js diyez için "#" ister ("Fs2" yazarsan hata verir).
const GUITAR_SAMPLES = {
  "C#2": "Cs2.mp3", E2: "E2.mp3", "F#2": "Fs2.mp3", A2: "A2.mp3", C3: "C3.mp3", "D#3": "Ds3.mp3",
  "F#3": "Fs3.mp3", A3: "A3.mp3", C4: "C4.mp3", "D#4": "Ds4.mp3", "F#4": "Fs4.mp3", A4: "A4.mp3",
  C5: "C5.mp3", "D#5": "Ds5.mp3", "F#5": "Fs5.mp3", A5: "A5.mp3", C6: "C6.mp3",
};

const BASS_SAMPLES = {
  "C#1": "Cs1.mp3", E1: "E1.mp3", G1: "G1.mp3", "A#1": "As1.mp3", "C#2": "Cs2.mp3", E2: "E2.mp3",
  G2: "G2.mp3", "A#2": "As2.mp3", "C#3": "Cs3.mp3", E3: "E3.mp3", G3: "G3.mp3", "A#3": "As3.mp3",
};

const DRUM_SAMPLES = {
  kick: "kick.mp3", snare: "snare.mp3", hihat: "hihat.mp3",
  tom1: "tom1.mp3", tom2: "tom2.mp3", tom3: "tom3.mp3",
};

// General MIDI davul haritası: MIDI nota numarası -> hangi davul
const DRUM_NOTE_MAP = {
  35: "kick", 36: "kick",
  37: "snare", 38: "snare", 39: "snare", 40: "snare",
  42: "hihat", 44: "hihat", 46: "hihat",
  41: "tom3", 43: "tom3", 45: "tom2", 47: "tom2", 48: "tom1", 50: "tom1",
};
const CYMBAL_NOTES = new Set([49, 51, 52, 53, 55, 57, 59]);

// ---------- Kanal rolleri ----------
// Her MIDI kanalı bu rollerden birine atanır (bkz. detectRole).
// reverb/delay: kanalın efektlere ne kadar gönderildiği (0 = hiç).
const ROLES = {
  drums:  { label: "Davul",          color: "#ff3b3b", reverb: 0.12, delay: 0 },
  rhythm: { label: "Ritim Gitar",    color: "#ff8a1f", reverb: 0.04, delay: 0 },
  lead:   { label: "Lead / Solo",    color: "#ffd23f", reverb: 0.18, delay: 0.26 },
  clean:  { label: "Clean Gitar",    color: "#38e1d6", reverb: 0.3,  delay: 0.12 },
  bass:   { label: "Bas",            color: "#9b87ff", reverb: 0,    delay: 0 },
  voice:  { label: "Vokal Melodisi", color: "#ff5fd2", reverb: 0.25, delay: 0.16 },
  other:  { label: "Efekt",          color: "#9aa0a6", reverb: 0.3,  delay: 0 },
};

// ---------- Amfi ----------
const AMP_DEFAULTS = { gain: 8.5, bass: 6.5, mid: 2, treble: 6, presence: 6.5, master: 8 };

const AMP_KNOBS = [
  { key: "gain",     label: "GAIN",     help: "Distorsiyon miktarı: sesin ne kadar sert ve kirli olacağı" },
  { key: "bass",     label: "BASS",     help: "Alt frekanslar: tokluk ve gövde" },
  { key: "mid",      label: "MIDDLE",   help: "Orta frekanslar: düşük = oyuk metal tonu, yüksek = öne çıkan ses" },
  { key: "treble",   label: "TREBLE",   help: "Tiz frekanslar: parlaklık ve kesicilik" },
  { key: "presence", label: "PRESENCE", help: "Üst tizler: pena atağının netliği" },
  { key: "master",   label: "MASTER",   help: "Tüm grubun genel ses seviyesi" },
];

// Presetler master'a dokunmaz, sadece ton ayarlarını değiştirir.
const AMP_PRESETS = {
  "Black Album": { gain: 8.5, bass: 6.5, mid: 2, treble: 6, presence: 6.5 },
  "Thrash '88":  { gain: 9.5, bass: 5, mid: 1, treble: 7.5, presence: 7.5 },
  "Crunch":      { gain: 5.5, bass: 5, mid: 6, treble: 6, presence: 5 },
  "Doom":        { gain: 9, bass: 8.5, mid: 4, treble: 3.5, presence: 4 },
};
