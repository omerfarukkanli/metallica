// Bir .mid dosyasını sayfanın okuyabileceği .mid.js dosyasına çevirir.
// Neden? Sayfa file:// ile açıldığında tarayıcı fetch() ile dosya okumaya izin vermiyor,
// ama <script> etiketiyle JS dosyası yüklemeye izin veriyor.
//
// Kullanım:  node tools/embed-midi.js songs/SarkiAdi.mid
// Sonra index.html'deki "songs/....mid.js" satırını yeni dosyayla değiştir.

const fs = require("fs");
const path = require("path");

const midiPath = process.argv[2];
if (!midiPath) {
  console.error("Kullanım: node tools/embed-midi.js songs/SarkiAdi.mid");
  process.exit(1);
}

const base64 = fs.readFileSync(midiPath).toString("base64");
const name = path.basename(midiPath);
const output = `${midiPath}.js`;

fs.writeFileSync(output, `// ${name} dosyasının gömülü hali (tools/embed-midi.js ile üretildi)\nwindow.EMBEDDED_MIDI = { name: "${name}", base64: "${base64}" };\n`);
console.log(`Yazıldı: ${output}`);
