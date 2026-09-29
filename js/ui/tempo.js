// Tempo (BPM) kontrolü: −/+ butonları, slider ve orijinale dönüş.
// Notalar tick cinsinden zamanlandığı için (bkz. song.js) Transport'un BPM'ini
// değiştirmek bütün şarkıyı hızlandırır ya da yavaşlatır.

const TEMPO_RANGE = { min: 0.5, max: 1.5 }; // orijinal tempoya oranla

function tempoLimits() {
  const original = app.song.bpm;
  return { min: Math.round(original * TEMPO_RANGE.min), max: Math.round(original * TEMPO_RANGE.max) };
}

function setTempo(bpm) {
  if (!app.song) return;
  const { min, max } = tempoLimits();
  const newBpm = clamp(Math.round(bpm), min, max);
  Tone.Transport.bpm.value = newBpm;
  master.delay.delayTime.value = (60 / newBpm) * 0.75; // solo delay'i tempoya uysun
  renderTempo();
  if (app.isPlaying) setStatus(`Çalıyor · ${newBpm} BPM`);
}

function renderTempo() {
  if (!app.song) return;
  const bpm = Math.round(Tone.Transport.bpm.value);
  const original = Math.round(app.song.bpm);
  const { min, max } = tempoLimits();
  const slider = $("#tempoSlider");
  const valueButton = $("#tempoValue");

  slider.min = min;
  slider.max = max;
  slider.value = bpm;
  slider.style.setProperty("--p", `${((bpm - min) / (max - min)) * 100}%`);

  const percent = Math.round((bpm / original) * 100);
  valueButton.textContent = bpm === original ? `${bpm} BPM` : `${bpm} BPM · %${percent}`;
  valueButton.classList.toggle("changed", bpm !== original);
  $("#pillBpm").textContent = `${bpm} BPM`;

  ["#tempoDown", "#tempoUp", "#tempoSlider", "#tempoValue"].forEach((id) => ($(id).disabled = false));
}

function setupTempoControl() {
  // Shift basılıyken 5'er BPM
  const step = (event) => (event.shiftKey ? 5 : 1);
  $("#tempoDown").onclick = (event) => setTempo(Tone.Transport.bpm.value - step(event));
  $("#tempoUp").onclick = (event) => setTempo(Tone.Transport.bpm.value + step(event));
  $("#tempoSlider").oninput = (event) => setTempo(Number(event.target.value));
  $("#tempoValue").onclick = () => setTempo(app.song.bpm);
}
