// "Canlı nota akışı": her kanal bir şerit, notalar sağdan sola akar.
// Kırmızı çizgi şu anı gösterir; soldaki soluk notalar çalınmış olanlardır.

const highwayCanvas = $("#highway");
const highwayCtx = highwayCanvas.getContext("2d");

// Notalar zamana göre sıralı. Ekranın solundaki ilk notayı ikili arama ile buluyoruz
// ki her karede binlerce notayı baştan taramayalım.
function firstNoteAfter(notes, time) {
  let low = 0;
  let high = notes.length;
  while (low < high) {
    const middle = (low + high) >> 1;
    if (notes[middle].time < time) low = middle + 1;
    else high = middle;
  }
  return low;
}

function drawBeatLines(ctx, songTime, playheadX, pixelsPerSecond, width, height) {
  const secondsVisibleBehind = playheadX / pixelsPerSecond;
  const firstBeat = Math.ceil((songTime - secondsVisibleBehind - app.beatStart) / app.beatLength);
  for (let beat = firstBeat; ; beat++) {
    const x = playheadX + (app.beatStart + beat * app.beatLength - songTime) * pixelsPerSecond;
    if (x > width) break;
    ctx.fillStyle = beat % 4 === 0 ? "rgba(255,255,255,.09)" : "rgba(255,255,255,.035)"; // ölçü başları daha belirgin
    ctx.fillRect(x, 0, 1, height);
  }
}

function drawTrackLane(ctx, track, laneIndex, laneHeight, songTime, playheadX, pixelsPerSecond, secondsAhead) {
  const laneTop = laneIndex * laneHeight;
  if (laneIndex % 2 === 1) {
    ctx.fillStyle = "rgba(255,255,255,.018)";
    ctx.fillRect(0, laneTop, ctx.canvas.clientWidth, laneHeight);
  }

  const pitchRange = Math.max(track.highestNote - track.lowestNote, 1);
  const noteHeight = clamp((laneHeight * 0.7) / pitchRange * 1.6, 2.5, 8);
  const firstVisibleTime = songTime - playheadX / pixelsPerSecond - 6; // 6 sn: uzun notalar kesilmesin
  let isLaneActive = false;

  for (let i = firstNoteAfter(track.notes, firstVisibleTime); i < track.notes.length; i++) {
    const note = track.notes[i];
    if (note.time > songTime + secondsAhead) break;

    const x = playheadX + (note.time - songTime) * pixelsPerSecond;
    const noteWidth = Math.max(note.duration * pixelsPerSecond - 1, 2);
    if (x + noteWidth < 0) continue;

    // Yüksek nota = şeridin üstü
    const pitchPosition = 1 - (note.midi - track.lowestNote) / pitchRange;
    const y = laneTop + laneHeight * 0.15 + pitchPosition * laneHeight * 0.7 - noteHeight / 2;

    const isSounding = note.time <= songTime && songTime < note.time + Math.max(note.duration, 0.08);
    const isFinished = note.time + note.duration < songTime;

    ctx.globalAlpha = isFinished ? 0.22 : isSounding ? 1 : 0.78;
    ctx.fillStyle = isSounding ? "#fff" : track.color;
    if (isSounding) {
      ctx.shadowColor = track.color;
      ctx.shadowBlur = 14;
      isLaneActive = true;
    }
    ctx.fillRect(x, y, noteWidth, noteHeight);
    ctx.shadowBlur = 0;
  }

  ctx.globalAlpha = 1;
  ctx.font = "600 11px Oswald, sans-serif";
  ctx.fillStyle = isLaneActive ? track.color : "rgba(255,255,255,.45)";
  ctx.fillText(track.label.toUpperCase(), 10, laneTop + 16);
}

function drawPlayhead(ctx, playheadX, height) {
  const glow = ctx.createLinearGradient(playheadX - 30, 0, playheadX, 0);
  glow.addColorStop(0, "rgba(255,30,30,0)");
  glow.addColorStop(1, `rgba(255,30,30,${0.12 + stageFx.pulse * 0.2})`);
  ctx.fillStyle = glow;
  ctx.fillRect(playheadX - 30, 0, 30, height);

  ctx.fillStyle = "#ff2d2d";
  ctx.shadowColor = "#ff2d2d";
  ctx.shadowBlur = 12;
  ctx.fillRect(playheadX - 1, 0, 2, height);
  ctx.shadowBlur = 0;
}

function drawNoteHighway(songTime) {
  const ctx = highwayCtx;
  const { width, height } = fitCanvasToScreen(highwayCanvas, ctx);
  ctx.clearRect(0, 0, width, height);
  if (app.tracks.length === 0) return;

  const secondsAhead = width < 600 ? 4 : 6;
  const playheadX = width * 0.16;
  const pixelsPerSecond = (width - playheadX) / secondsAhead;
  const laneHeight = height / app.tracks.length;

  drawBeatLines(ctx, songTime, playheadX, pixelsPerSecond, width, height);
  app.tracks.forEach((track, i) => drawTrackLane(ctx, track, i, laneHeight, songTime, playheadX, pixelsPerSecond, secondsAhead));
  drawPlayhead(ctx, playheadX, height);
}
