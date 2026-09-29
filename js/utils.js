// Her dosyada kullanılan küçük yardımcı fonksiyonlar.

const $ = (selector) => document.querySelector(selector);

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const PREFERS_REDUCED_MOTION = matchMedia("(prefers-reduced-motion: reduce)").matches;

// 125.4 -> "2:05"
function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const rest = String(Math.floor(seconds % 60)).padStart(2, "0");
  return `${minutes}:${rest}`;
}

// Tone.Meter desibel döndürür (-Infinity ... 0). Animasyonlar için 0..1 arasına çeviriyoruz.
function dbToLevel(db) {
  return clamp((db + 48) / 42, 0, 1);
}

// "#ff3b3b", 0.5 -> "rgba(255,59,59,0.5)"
function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// Canvas'ı ekrandaki boyutuna ve piksel yoğunluğuna uydurur.
// Çizim yaparken CSS pikseli kullanabilelim diye ölçeği ayarlar.
function fitCanvasToScreen(canvas, ctx) {
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const targetWidth = Math.round(width * pixelRatio);
  const targetHeight = Math.round(height * pixelRatio);
  if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
    canvas.width = targetWidth;
    canvas.height = targetHeight;
  }
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  return { width, height };
}
