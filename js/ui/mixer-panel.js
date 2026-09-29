// Mikser paneli: her kanal için seviye metresi, ses ayarı, M (sustur) ve S (solo).

function applyMuteAndSolo() {
  const anySoloed = app.tracks.some((track) => track.soloed);
  for (const track of app.tracks) {
    track.channel.volume.mute = track.muted || (anySoloed && !track.soloed);
  }
}

function createMixerStrip(track) {
  const strip = document.createElement("div");
  strip.className = "strip";
  strip.style.setProperty("--c", track.color);
  strip.innerHTML = `
    <span class="bar"></span>
    <div class="info"><b>${track.label}</b><small>${track.description}</small></div>
    <div class="meter"><i></i></div>
    <input class="fader" type="range" min="-30" max="6" step="0.5" value="0" aria-label="${track.label} ses seviyesi">
    <button class="ms m" aria-pressed="false" aria-label="${track.label} sustur">M</button>
    <button class="ms s" aria-pressed="false" aria-label="${track.label} solo">S</button>`;

  const fader = strip.querySelector(".fader");
  const paintFader = () => {
    const percent = ((fader.value - fader.min) / (fader.max - fader.min)) * 100;
    fader.style.setProperty("--p", `${percent}%`); // CSS dolu kısmı bu değişkenle çizer
  };
  fader.oninput = () => {
    const db = Number(fader.value);
    track.channel.volume.volume.value = db <= -30 ? -Infinity : db;
    paintFader();
  };
  paintFader();

  const muteButton = strip.querySelector(".m");
  const soloButton = strip.querySelector(".s");
  muteButton.onclick = () => {
    track.muted = !track.muted;
    muteButton.setAttribute("aria-pressed", track.muted);
    applyMuteAndSolo();
  };
  soloButton.onclick = () => {
    track.soloed = !track.soloed;
    soloButton.setAttribute("aria-pressed", track.soloed);
    applyMuteAndSolo();
  };

  track.meterElement = strip.querySelector(".meter i");
  return strip;
}

function renderMixer() {
  const container = $("#strips");
  container.innerHTML = "";
  app.tracks.forEach((track) => container.appendChild(createMixerStrip(track)));
}
