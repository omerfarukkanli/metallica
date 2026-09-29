# Riff Forge

Tarayıcıda çalışan metal sahnesi: bir MIDI dosyasını gerçek enstrüman sample'larıyla çalar,
karikatür bir grubu sahnede canlandırır.

## Çalıştırma

`index.html` dosyasını tarayıcıda aç (çift tıkla ya da `open index.html`). Sunucu gerekmez,
internet bağlantısı gerekir (kütüphaneler ve sample'lar CDN'den iner).

## Klasör yapısı

```
index.html                 sayfa iskeleti + script'lerin yüklenme sırası
css/
  base.css                 renkler, yazı tipleri, üst ve alt çubuk
  stage.css                sahne katmanları, başlık, play butonu
  panels.css               nota akışı, amfi, mikser, dosya yükleme
js/
  utils.js                 küçük yardımcılar ($, clamp, formatTime...)
  config.js                TÜM ayarlar: sample adresleri, roller, renkler, amfi presetleri
  state.js                 paylaşılan durum: app (şarkı) ve stageFx (animasyon değerleri)
  audio/
    master.js              ana çıkış (compressor, limiter, reverb, delay) ve kanal oluşturma
    instruments.js         gitarlar, bas, vokal synth, davul
    song.js                MIDI -> şarkı: kanal rollerini bulur, notaları zamanlar
  ui/
    transport.js           çal/duraklat, ilerleme çubuğu, süre
    tempo.js               BPM ayarı (−/+, slider, orijinale dönüş)
    amp.js                 amfi knob'ları ve presetler
    mixer-panel.js         mikser (ses, sustur, solo)
    note-highway.js        kayan nota görünümü
  stage/
    characters.js          karikatür müzisyenler (SVG) ve animasyonları
    stage.js               sahne: ışıklar, zemin, kalabalık, kıvılcımlar
  main.js                  her şeyi başlatır ve her karede çalışan ana döngü
songs/                     MIDI dosyaları
tools/embed-midi.js        .mid dosyasını sayfanın okuyabileceği .mid.js'e çevirir
```

## Veri akışı

1. `main.js` gömülü MIDI'yi `loadMidi()`'ye verir.
2. `song.js` her kanalın rolünü bulur (`detectRole`), `instruments.js`'ten bir enstrüman
   oluşturur ve notaları `Tone.Part` ile zamanlar. Zamanlama saniye değil MIDI tick'i
   cinsindendir; bu sayede BPM değişince bütün şarkı birlikte hızlanır.
3. Çalarken enstrümanlar ses çıkarır; davul ve vuruş nabzı `stageFx` değerlerini 1 yapar.
4. `main.js`'teki `mainLoop` her karede seviyeleri ölçer, sahneyi ve nota akışını çizer,
   `stageFx` değerlerini yavaşça söndürür.

## Neden `import` yok?

Sayfa `file://` ile açıldığında tarayıcılar ES module'leri engeller. Bu yüzden dosyalar
`index.html`'de sırayla yüklenen normal `<script>` etiketleri. Yeni dosya eklersen,
kullandığı dosyalardan **sonra** gelecek şekilde `index.html`'e ekle.

## Yeni şarkı eklemek

```bash
node tools/embed-midi.js songs/SarkiAdi.mid
```

Sonra `index.html`'deki `songs/EnterSandman.mid.js` satırını yeni dosyayla değiştir.
Ya da sayfanın altındaki alana herhangi bir `.mid` dosyasını sürükle.
