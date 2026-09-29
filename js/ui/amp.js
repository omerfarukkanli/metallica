// Amfi paneli: knob'lar, presetler ve açıklama ekranı.

const ampSettings = { ...AMP_DEFAULTS };
const knobRenderers = {}; // knob adı -> görüntüyü güncelleyen fonksiyon

// Knob değerlerini (0..10) gitar zincirlerine uygular
function applyAmpSettings() {
  const toDb = (knobValue) => (knobValue - 5) * 2; // 5 = düz, 0 = -10 dB, 10 = +10 dB

  for (const { distortion, eq, presence, offsets = {} } of app.ampTargets) {
    distortion.distortion = clamp(0.35 + (ampSettings.gain / 10) * 0.65 + (offsets.gain || 0), 0, 1);
    eq.low.value = toDb(ampSettings.bass) + (offsets.low || 0);
    eq.mid.value = toDb(ampSettings.mid) + (offsets.mid || 0);
    eq.high.value = toDb(ampSettings.treble) + (offsets.high || 0);
    presence.gain.value = toDb(ampSettings.presence);
  }
  master.volume.volume.value = ampSettings.master <= 0.05 ? -Infinity : (ampSettings.master - 8) * 3;
}

function showKnobHelp(key) {
  const knob = AMP_KNOBS.find((k) => k.key === key);
  $("#ampReadout").innerHTML = `<b>${knob.label} ${ampSettings[key].toFixed(1)}</b><span>${knob.help}</span>`;
}

function matchesPreset(name) {
  const preset = AMP_PRESETS[name];
  return Object.keys(preset).every((key) => Math.abs(ampSettings[key] - preset[key]) < 0.05);
}

// Mevcut ayar bir preset'le birebir aynıysa o preset'in butonu yanar
function highlightActivePreset() {
  document.querySelectorAll(".preset").forEach((button) => {
    button.setAttribute("aria-pressed", matchesPreset(button.dataset.name));
  });
}

// Knob'a dokunulmuyorken ekranda aktif preset'in adı görünür
function showActivePreset() {
  const active = Object.keys(AMP_PRESETS).find(matchesPreset);
  $("#ampReadout").innerHTML = `<b>${active || "Özel ayar"}</b>`;
}

function setKnob(key, value) {
  ampSettings[key] = Math.round(clamp(value, 0, 10) * 10) / 10;
  knobRenderers[key]();
  applyAmpSettings();
  showKnobHelp(key);
  highlightActivePreset();
}

// Kadrandaki bir tıklamanın açısını 0..10 değerine çevirir.
// Kadran -135° (0) ile +135° (10) arasında, alttaki boşluk ölü bölge.
function valueFromClick(event, dial) {
  const rect = dial.getBoundingClientRect();
  const dx = event.clientX - (rect.left + rect.width / 2);
  const dy = event.clientY - (rect.top + rect.height / 2);
  const angle = (Math.atan2(dx, -dy) * 180) / Math.PI; // 0° = yukarı
  if (Math.abs(angle) > 150) return null;
  return ((clamp(angle, -135, 135) + 135) / 270) * 10;
}

function createKnob({ key, label }) {
  const wrapper = document.createElement("div");
  wrapper.className = "kn";
  wrapper.innerHTML = `
    <div class="ticks"><div class="knob" role="slider" tabindex="0" aria-label="${label}" aria-valuemin="0" aria-valuemax="10"></div></div>
    <label>${label}</label>
    <output></output>`;

  const dial = wrapper.querySelector(".ticks");
  const knob = wrapper.querySelector(".knob");
  const output = wrapper.querySelector("output");

  knobRenderers[key] = () => {
    knob.style.setProperty("--rot", `${-135 + (ampSettings[key] / 10) * 270}deg`);
    knob.setAttribute("aria-valuenow", ampSettings[key].toFixed(1));
    output.textContent = ampSettings[key].toFixed(1);
  };
  knobRenderers[key]();

  // Sürükle (sağa/yukarı = artır) ya da sürüklemeden tıkla (o noktaya git)
  dial.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    dial.setPointerCapture(event.pointerId);
    wrapper.classList.add("active");
    const startX = event.clientX;
    const startY = event.clientY;
    const startValue = ampSettings[key];
    let isDragging = false;

    dial.onpointermove = (e) => {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (!isDragging && Math.hypot(dx, dy) < 4) return; // küçük titremeler tıklama sayılır
      isDragging = true;
      setKnob(key, startValue + (dx - dy) / 14);
    };
    dial.onpointerup = (e) => {
      dial.onpointermove = dial.onpointerup = null;
      wrapper.classList.remove("active");
      if (isDragging) return;
      const clickedValue = valueFromClick(e, dial);
      if (clickedValue !== null) setKnob(key, clickedValue);
    };
  });

  dial.addEventListener("wheel", (event) => {
    event.preventDefault();
    setKnob(key, ampSettings[key] - Math.sign(event.deltaY) * 0.5);
  }, { passive: false });
  dial.addEventListener("dblclick", () => setKnob(key, AMP_DEFAULTS[key]));
  dial.addEventListener("pointerenter", () => showKnobHelp(key));
  knob.addEventListener("focus", () => showKnobHelp(key));
  knob.addEventListener("keydown", (event) => {
    const step = { ArrowUp: 0.5, ArrowRight: 0.5, ArrowDown: -0.5, ArrowLeft: -0.5 }[event.key];
    if (!step) return;
    event.preventDefault();
    setKnob(key, ampSettings[key] + step);
  });

  return wrapper;
}

function createPresetButton(name) {
  const button = document.createElement("button");
  button.className = "preset";
  button.dataset.name = name;
  button.textContent = name;
  button.onclick = () => {
    Object.assign(ampSettings, AMP_PRESETS[name]);
    Object.values(knobRenderers).forEach((render) => render());
    applyAmpSettings();
    highlightActivePreset();
    $("#ampReadout").innerHTML = `<b>${name}</b><span>tonu yüklendi</span>`;
  };
  return button;
}

function buildAmpPanel() {
  const plate = $("#knobs");
  AMP_KNOBS.forEach((knob) => plate.appendChild(createKnob(knob)));

  const powerLight = document.createElement("div");
  powerLight.className = "jewel-wrap";
  powerLight.innerHTML = `<div class="jewel"></div><span>POWER</span>`;
  plate.appendChild(powerLight);

  Object.keys(AMP_PRESETS).forEach((name) => $("#presets").appendChild(createPresetButton(name)));

  showActivePreset();
  plate.addEventListener("pointerleave", () => {
    if (!plate.querySelector(".kn.active")) showActivePreset();
  });
  highlightActivePreset();
}
