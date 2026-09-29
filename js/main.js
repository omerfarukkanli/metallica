// Uygulamanın giriş noktası: arayüzü kurar, şarkıyı yükler, ana döngüyü başlatır.

// Kanal metrelerini okuyup mikserdeki çubukları ve sahne seviyelerini günceller
function updateLevels() {
  stageFx.masterLevel += (dbToLevel(master.meter.getValue()) - stageFx.masterLevel) * 0.3;

  const loudestByRole = {};
  for (const track of app.tracks) {
    const level = track.channel.volume.mute ? 0 : dbToLevel(track.channel.meter.getValue());
    if (track.meterElement) track.meterElement.style.width = `${level * 100}%`;
    loudestByRole[track.role] = Math.max(loudestByRole[track.role] || 0, level);
  }
  // Yumuşatma: değer bir anda değil, her karede biraz hedefe yaklaşır
  for (const role in stageFx.levels) {
    stageFx.levels[role] += ((loudestByRole[role] || 0) - stageFx.levels[role]) * 0.25;
  }
}

// Vuruşla 1 olan değerler her karede biraz söner
function fadeStageEffects() {
  stageFx.pulse *= 0.9;
  stageFx.downbeat *= 0.9;
  stageFx.kick *= 0.82;
  stageFx.crash *= 0.9;
  stageFx.drumHit *= 0.8;
}

function mainLoop(nowMs) {
  const songTime = getSongTime();

  updateLevels();
  if (app.song) {
    updateTransportBar(songTime);
    stopIfSongEnded(songTime);
  }
  document.documentElement.style.setProperty("--pulse", stageFx.pulse.toFixed(3)); // CSS parıltıları için
  stage.draw(nowMs / 1000, app.isPlaying);
  drawNoteHighway(songTime);
  fadeStageEffects();

  requestAnimationFrame(mainLoop);
}

// ---------- MIDI dosyası yükleme ----------
async function loadMidiFile(file) {
  await Tone.start();
  loadMidi(await file.arrayBuffer(), file.name);
}

function setupFileDrop() {
  const dropZone = $("#drop");
  const fileInput = $("#file");

  dropZone.onclick = () => fileInput.click();
  dropZone.onkeydown = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      fileInput.click();
    }
  };
  fileInput.onchange = () => fileInput.files[0] && loadMidiFile(fileInput.files[0]);

  dropZone.ondragover = (event) => {
    event.preventDefault();
    dropZone.classList.add("over");
  };
  dropZone.ondragleave = () => dropZone.classList.remove("over");
  dropZone.ondrop = (event) => {
    event.preventDefault();
    dropZone.classList.remove("over");
    if (event.dataTransfer.files[0]) loadMidiFile(event.dataTransfer.files[0]);
  };
}

// songs/*.mid.js dosyası MIDI'yi base64 olarak içerir (file:// ile fetch çalışmadığı için)
function loadEmbeddedSong() {
  if (!window.EMBEDDED_MIDI) {
    setStatus("Aşağıdan bir MIDI dosyası yükle");
    return;
  }
  const binary = atob(window.EMBEDDED_MIDI.base64);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  loadMidi(bytes.buffer, window.EMBEDDED_MIDI.name);
}

// ---------- Başlat ----------
setupTransport();
setupTempoControl();
buildAmpPanel();
setupFileDrop();
loadEmbeddedSong();
requestAnimationFrame(mainLoop);
