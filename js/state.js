// Dosyalar arasında paylaşılan durum.
// Ses motoru buraya yazar, arayüz ve sahne buradan okur.

const app = {
  song: null,        // { title, artist, credit, bpm, duration }
  tracks: [],        // her dolu MIDI kanalı için bir kayıt (bkz. buildSong)
  parts: [],         // notaları zamanında tetikleyen Tone.Part'lar
  audioNodes: [],    // şarkıya özel ses düğümleri; yeni şarkı gelince silinir
  ampTargets: [],    // amfi knob'larının kontrol ettiği gitar zincirleri
  isReady: false,    // sample'lar indi mi?
  isPlaying: false,
  beatStart: 0,      // ilk vuruşun saniyesi (şarkı kısa bir girişle başlayabilir)
  beatLength: 0.5,   // bir vuruşun süresi (saniye, orijinal tempoda)
  beatGrid: { ppq: 480, offsetTicks: 0 }, // aynı ızgara tick cinsinden
};

// Sahne animasyonları için anlık değerler (0..1).
// Ses motoru bir vuruşta 1 yapar, ana döngü her karede yavaşça sıfıra indirir.
const stageFx = {
  pulse: 0,        // her vuruş
  downbeat: 0,     // her ölçünün ilk vuruşu
  kick: 0,
  crash: 0,
  drumHit: 0,      // snare veya tom
  beatIndex: 0,
  masterLevel: 0,  // genel ses seviyesi
  levels: { drums: 0, rhythm: 0, lead: 0, clean: 0, bass: 0, voice: 0, other: 0 },
};

// Şarkıya özel bir ses düğümünü kaydeder ki yeni şarkı yüklenince temizleyebilelim.
function registerNode(node) {
  app.audioNodes.push(node);
  return node;
}
