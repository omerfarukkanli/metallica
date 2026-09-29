// Çal / duraklat / başa sar, ilerleme çubuğu, süre ve master LED metresi.

const playButtons = [$("#bigPlay"), $("#miniPlay")];
const rewindButton = $("#rewind");
const seekBar = $("#seek");
const LED_COUNT = 22;

function setStatus(text) {
  $("#status").textContent = text;
}

function setReady(isReady) {
  app.isReady = isReady;
  [...playButtons, rewindButton].forEach((button) => (button.disabled = !isReady));
}

function stopAllVoices() {
  app.tracks.forEach((track) => track.instrument.stop());
}

function updatePlayButtons() {
  document.body.classList.toggle("playing", app.isPlaying); // CSS play/pause ikonunu değiştirir
  playButtons.forEach((button) => button.setAttribute("aria-label", app.isPlaying ? "Duraklat" : "Çal"));
  if (app.isReady) setStatus(app.isPlaying ? `Çalıyor · ${Math.round(Tone.Transport.bpm.value)} BPM` : "Duraklatıldı");
}

async function togglePlay() {
  if (!app.isReady) return;
  await Tone.start(); // tarayıcılar sesi ancak kullanıcı etkileşiminden sonra açar

  if (app.isPlaying) {
    Tone.Transport.pause();
    stopAllVoices();
  } else {
    Tone.Transport.start("+0.05");
  }
  // Transport.state hemen güncellenmediği için durumu kendimiz tutuyoruz
  app.isPlaying = !app.isPlaying;
  updatePlayButtons();
}

// Şarkı konumu her yerde "orijinal tempodaki saniye" olarak tutulur.
// Tempo değişse de nota akışı, ilerleme çubuğu ve süre birbiriyle uyumlu kalır.
function seekTo(seconds) {
  if (!app.song) return;
  stopAllVoices();
  Tone.Transport.ticks = Math.round(app.song.secondsToTicks(clamp(seconds, 0, app.song.duration)));
}

// Şu an duyulan konum. Tone sesi biraz önceden planlar (Tone.now() = şimdi + lookAhead),
// o yüzden çalarken gerçek saatteki (currentTime) tick'e bakıyoruz.
function getSongTime() {
  if (!app.song) return 0;
  const heardAt = app.isPlaying ? Tone.context.currentTime : Tone.now();
  const ticks = Math.max(0, Tone.Transport.getTicksAtTime(heardAt));
  return app.song.ticksToSeconds(ticks);
}

function stopIfSongEnded(songTime) {
  if (!app.isPlaying || songTime < app.song.duration + 1) return;
  Tone.Transport.stop();
  stopAllVoices();
  app.isPlaying = false;
  updatePlayButtons();
  setStatus("Bitti · tekrar çal?");
}

function updateTransportBar(songTime) {
  if (!app.song) return;
  const progress = clamp(songTime / app.song.duration, 0, 1);
  $("#seekFill").style.width = `${progress * 100}%`;
  $("#seekDot").style.left = `${progress * 100}%`;
  seekBar.setAttribute("aria-valuenow", Math.round(progress * 100));
  $("#tCur").textContent = formatTime(songTime);

  const litLeds = Math.round(stageFx.masterLevel * LED_COUNT);
  [...$("#leds").children].forEach((led, i) => led.classList.toggle("on", i < litLeds));
}

function renderSongInfo() {
  const song = app.song;
  $("#songTitle").textContent = song.title;
  $("#songArtist").textContent = song.artist;
  $("#songCredit").textContent = song.credit;
  $("#pillBpm").textContent = `${Math.round(song.bpm)} BPM`;
  $("#pillLen").textContent = formatTime(song.duration);
  $("#tDur").textContent = formatTime(song.duration);
  document.title = `${song.title} · Riff Forge`;
}

// ---------- Olay dinleyicileri ----------
function setupTransport() {
  playButtons.forEach((button) => (button.onclick = togglePlay));
  rewindButton.onclick = () => seekTo(0);

  // Boşluk tuşu = çal/duraklat (bir butona ya da slider'a odaklanılmadıysa)
  addEventListener("keydown", (event) => {
    if (event.code !== "Space") return;
    if (event.target.closest("button, input, [role=slider], [role=button]")) return;
    event.preventDefault();
    togglePlay();
  });

  // İlerleme çubuğu: tıkla ya da sürükle
  seekBar.addEventListener("pointerdown", (event) => {
    seekBar.setPointerCapture(event.pointerId);
    const seekToPointer = (e) => {
      const rect = seekBar.getBoundingClientRect();
      if (app.song) seekTo(clamp((e.clientX - rect.left) / rect.width, 0, 1) * app.song.duration);
    };
    seekToPointer(event);
    seekBar.onpointermove = seekToPointer;
    seekBar.onpointerup = () => (seekBar.onpointermove = null);
  });
  seekBar.addEventListener("keydown", (event) => {
    if (event.key === "ArrowRight") seekTo(getSongTime() + 5);
    if (event.key === "ArrowLeft") seekTo(getSongTime() - 5);
  });

  // LED metresi: yeşil yerine metal renkleri, kırmızı -> turuncu -> sarı
  for (let i = 0; i < LED_COUNT; i++) {
    const led = document.createElement("i");
    led.style.setProperty("--c", i < 14 ? "#d4141c" : i < 19 ? "#ff7a1a" : "#ffe14d");
    $("#leds").appendChild(led);
  }
}
