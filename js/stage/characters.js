// Sahnedeki karikatür müzisyenler.
//
// Her karakter bir kez SVG olarak çizilir. Animasyon için her karede sadece
// bazı parçaların "transform" değeri değişir: kafa (headbang), saç, ağız,
// gözler (kırpma), tele vuran kol, yumruk, bagetler, ziller.
//
// Koordinatlar: (0, 0) karakterin ayaklarının ortası, yukarısı negatif y.
// Bir karakter yaklaşık 236 birim boyunda.

const INK = "#0b0b0e"; // dış çizgi rengi
const OUTLINE = `stroke="${INK}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"`;
const PERSON_VIEWBOX = [-150, -272, 300, 282];  // [minX, minY, genişlik, yükseklik]
const DRUMMER_VIEWBOX = [-140, -212, 280, 218];
const PERSON_HEIGHT = 236;
const KICK_DRUM_RADIUS = 44;

// Karakterlerin görünüşü. Renkler sahnedeki rol renkleriyle uyumlu.
const CAST_LOOKS = {
  rhythm: {
    skin: "#f0c8a4", hair: "slick", hairColor: "#d9b25a", facial: "goatee",
    shirt: "#1b1b20", print: "bolt", jacket: "vest", jacketColor: "#34343c", sleeve: "#f0c8a4",
    pants: "#1f2635", guitar: "explorer", guitarColor: ROLES.rhythm.color, accent: ROLES.rhythm.color,
  },
  voice: {
    skin: "#d49a74", hair: "long", hairColor: "#17110e", facial: "stubble", shades: true,
    shirt: "#141416", print: "skull", jacket: "leather", jacketColor: "#0e0e10", sleeve: "#0e0e10",
    pants: "#26262c", accent: ROLES.voice.color,
  },
  lead: {
    skin: "#a8704c", hair: "curly", hairColor: "#24160c", bandana: "#c0141c",
    shirt: "#121214", print: "skull", sleeve: "#121214",
    pants: "#2d3a55", guitar: "v", guitarColor: ROLES.lead.color, accent: ROLES.lead.color,
  },
  bass: {
    skin: "#7c5033", hair: "straight", hairColor: "#0d0a08", facial: "beard",
    shirt: "#6b1a1a", print: "flannel", sleeve: "#6b1a1a",
    pants: "#1c1c20", guitar: "bass", guitarColor: ROLES.bass.color, accent: ROLES.bass.color,
  },
  drums: {
    skin: "#f3d3b5", hair: "mohawk", hairColor: "#e0121e", facial: "moustache",
    shirt: "#151518", print: "bolt", sleeve: "#f3d3b5", accent: ROLES.drums.color,
  },
};

// ---------------------------------------------------------------------
//  SVG parçaları (her fonksiyon bir SVG metni döndürür)
// ---------------------------------------------------------------------

// Kalın çizgi şeklinde uzuv: önce siyah dış çizgi, üstüne renk
function svgLimb(points, color, width) {
  const d = "M" + points.map((p) => p.join(",")).join(" L");
  return `
    <path d="${d}" fill="none" stroke="${INK}" stroke-width="${width + 6}" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;
}

function svgHand(x, y, skin, radius = 7.5) {
  return `<circle cx="${x}" cy="${y}" r="${radius}" fill="${skin}" ${OUTLINE}/>`;
}

// Omuz -> dirsek (kol yeniyle) -> el (ten rengi)
function svgArm(shoulder, elbow, hand, look, { withHand = true, handRadius } = {}) {
  return svgLimb([shoulder, elbow], look.sleeve, 12)
    + svgLimb([elbow, hand], look.skin, 10)
    + (withHand ? svgHand(hand[0], hand[1], look.skin, handRadius) : "");
}

function svgHair(look, layer) {
  const color = look.hairColor;
  const curls = (positions, radius) =>
    positions.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="${radius}" fill="${color}" ${OUTLINE}/>`).join("");

  // "back" = kafanın arkasında kalan saç (headbang'de havalanır), "front" = alın üstü
  const styles = {
    long: {
      back: `<path d="M-34,-196 Q-38,-240 0,-234 Q38,-240 34,-196 L44,-126 Q26,-132 18,-160 L-18,-160 Q-26,-132 -44,-126 Z" fill="${color}" ${OUTLINE}/>`,
      front: `<path d="M-32,-196 Q-34,-234 0,-232 Q34,-234 32,-196 Q27,-214 15,-216 L10,-204 L2,-218 L-8,-204 L-14,-216 Q-27,-214 -32,-196Z" fill="${color}" ${OUTLINE}/>`,
    },
    straight: {
      back: `<path d="M-33,-200 Q-36,-240 0,-235 Q36,-240 33,-200 L42,-96 Q30,-100 20,-118 L18,-160 L-18,-160 L-20,-118 Q-30,-100 -42,-96 Z" fill="${color}" ${OUTLINE}/>`,
      front: `<path d="M-32,-192 Q-34,-236 0,-234 Q34,-236 32,-192 Q26,-222 2,-227 Q-26,-222 -32,-192Z" fill="${color}" ${OUTLINE}/>`,
    },
    curly: {
      back: curls([[-40, -150], [40, -150], [-34, -170], [34, -170], [-38, -192], [38, -192], [-32, -214], [32, -214], [-16, -230], [16, -230], [0, -236]], 15),
      front: curls([[-22, -218], [22, -218], [-11, -226], [11, -226], [0, -224]], 12),
    },
    slick: {
      back: "",
      front: `<path d="M-31,-198 Q-33,-234 0,-232 Q33,-234 31,-198 Q27,-216 8,-218 Q-2,-210 -14,-216 Q-26,-214 -31,-198Z" fill="${color}" ${OUTLINE}/>`,
    },
    mohawk: {
      back: "",
      front: `<path d="M-7,-222 L-16,-252 L-3,-238 L0,-266 L4,-238 L16,-254 L8,-222 Z" fill="${color}" ${OUTLINE}/>`,
    },
  };
  return styles[look.hair][layer];
}

function svgFacialHair(look) {
  const color = look.hairColor;
  const styles = {
    goatee: `<path d="M-13,-172 Q0,-179 13,-172 Q0,-175 -13,-172Z" fill="${color}" ${OUTLINE}/>
             <path d="M-9,-161 Q0,-146 9,-161 L7,-157 Q0,-150 -7,-157Z" fill="${color}" ${OUTLINE}/>`,
    beard: `<path d="M-29,-190 Q-30,-150 0,-142 Q30,-150 29,-190 Q22,-166 0,-163 Q-22,-166 -29,-190Z" fill="${color}" ${OUTLINE}/>`,
    moustache: `<path d="M-15,-172 Q-6,-180 0,-175 Q6,-180 15,-172 Q18,-162 12,-160 Q6,-170 0,-170 Q-6,-170 -12,-160 Q-18,-162 -15,-172Z" fill="${color}" ${OUTLINE}/>`,
    stubble: `<ellipse cx="0" cy="-166" rx="22" ry="14" fill="rgba(40,25,20,.22)"/>`,
  };
  return styles[look.facial] || "";
}

function svgEyes(look) {
  if (look.shades) {
    return `
      <rect x="-25" y="-202" width="21" height="12" rx="5" fill="#0d0d10" ${OUTLINE}/>
      <rect x="4" y="-202" width="21" height="12" rx="5" fill="#0d0d10" ${OUTLINE}/>
      <path d="M-4,-197 L4,-197" stroke="${INK}" stroke-width="3"/>
      <path d="M-20,-199 L-12,-199 M9,-199 L17,-199" stroke="rgba(255,255,255,.5)" stroke-width="2"/>`;
  }
  return `
    <g class="eyes">
      <ellipse cx="-11" cy="-194" rx="6.5" ry="7.5" fill="#fff" stroke="${INK}" stroke-width="2"/>
      <ellipse cx="11" cy="-194" rx="6.5" ry="7.5" fill="#fff" stroke="${INK}" stroke-width="2"/>
      <circle cx="-10" cy="-193" r="3.2" fill="${INK}"/>
      <circle cx="10" cy="-193" r="3.2" fill="${INK}"/>
    </g>`;
}

function svgHead(look) {
  const skin = look.skin;
  const angryBrows = `<path d="M-22,-207 L-4,-201 M22,-207 L4,-201" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>`;
  const nose = `<path d="M1,-192 Q-6,-180 2,-178" fill="none" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/>`;
  const mouth = `
    <g class="mouth">
      <path d="M-10,-168 Q0,-172 10,-168 Q8,-160 0,-159 Q-8,-160 -10,-168Z" fill="#4a0a10" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M-7,-168 L7,-168 L6,-165.5 L-6,-165.5Z" fill="#fff"/>
    </g>`;
  const bandana = look.bandana
    ? `<path d="M-32,-205 Q0,-224 32,-205 L32,-196 Q0,-214 -32,-196Z" fill="${look.bandana}" ${OUTLINE}/>
       <path d="M30,-202 L46,-196 L42,-186 L30,-197Z" fill="${look.bandana}" ${OUTLINE}/>`
    : "";

  return `
    <g class="head">
      <g class="hair-back">${svgHair(look, "back")}</g>
      <rect x="-8" y="-166" width="16" height="16" fill="${skin}" ${OUTLINE}/>
      <ellipse cx="-30" cy="-188" rx="6" ry="9" fill="${skin}" ${OUTLINE}/>
      <ellipse cx="30" cy="-188" rx="6" ry="9" fill="${skin}" ${OUTLINE}/>
      <ellipse cx="0" cy="-190" rx="30" ry="34" fill="${skin}" ${OUTLINE}/>
      <ellipse cx="0" cy="-172" rx="22" ry="12" fill="rgba(0,0,0,.07)"/>
      ${svgFacialHair(look)}
      ${svgEyes(look)}
      ${angryBrows}
      ${nose}
      ${mouth}
      ${svgHair(look, "front")}
      ${bandana}
    </g>`;
}

function svgShirtPrint(look, centerY) {
  const prints = {
    skull: `<g transform="translate(0,${centerY})">
              <ellipse rx="11" ry="10" fill="#e9e4da"/>
              <rect x="-6" y="5" width="12" height="7" rx="2" fill="#e9e4da"/>
              <circle cx="-4.5" cy="-1" r="3.2" fill="#111"/><circle cx="4.5" cy="-1" r="3.2" fill="#111"/>
            </g>`,
    bolt: `<path transform="translate(0,${centerY + 120})" d="M3,-138 L-9,-116 L-1,-116 L-5,-98 L9,-122 L1,-122 Z" fill="${look.accent}" stroke="${INK}" stroke-width="2"/>`,
    flannel: [-18, -6, 6, 18].map((x) => `<path d="M${x},-154 L${x * 1.05},-84" stroke="rgba(0,0,0,.35)" stroke-width="4"/>`).join("")
      + [-140, -120, -100].map((y) => `<path d="M-28,${y} L28,${y}" stroke="rgba(0,0,0,.3)" stroke-width="4"/>`).join(""),
  };
  return prints[look.print] || "";
}

function svgJacket(look) {
  if (!look.jacket) return "";
  const color = look.jacketColor;
  const studs = look.jacket === "leather"
    ? [-22, -16, 16, 22].map((x) => `<circle cx="${x}" cy="-146" r="2" fill="#d9d9de"/>`).join("")
    : "";
  return `
    <path d="M-27,-152 Q-32,-118 -25,-82 L-10,-82 L-6,-150 Z" fill="${color}" ${OUTLINE}/>
    <path d="M27,-152 Q32,-118 25,-82 L10,-82 L6,-150 Z" fill="${color}" ${OUTLINE}/>
    <path d="M-6,-150 L-18,-156 L-11,-130 Z M6,-150 L18,-156 L11,-130 Z" fill="${color}" ${OUTLINE}/>
    ${studs}`;
}

// Bacaklar, botlar, gövde, tişört baskısı, ceket, kemer
function svgBody(look) {
  return `
    <path d="M-23,-84 L-5,-84 L-16,-10 L-34,-10 Z" fill="${look.pants}" ${OUTLINE}/>
    <path d="M5,-84 L23,-84 L34,-10 L16,-10 Z" fill="${look.pants}" ${OUTLINE}/>
    <path d="M-12,-80 L-24,-14 M12,-80 L24,-14" stroke="rgba(255,255,255,.08)" stroke-width="3"/>
    <path d="M-40,-12 L-12,-12 L-12,0 L-44,0 Q-44,-8 -40,-12Z" fill="#141416" ${OUTLINE}/>
    <path d="M12,-12 L40,-12 Q44,-8 44,0 L12,0 Z" fill="#141416" ${OUTLINE}/>
    <path d="M-27,-152 Q-32,-118 -25,-82 L25,-82 Q32,-118 27,-152 Q0,-162 -27,-152Z" fill="${look.shirt}" ${OUTLINE}/>
    ${svgShirtPrint(look, -120)}
    ${svgJacket(look)}
    <rect x="-26" y="-89" width="52" height="8" fill="#151517" ${OUTLINE}/>
    <rect x="-6" y="-91" width="12" height="11" rx="2" fill="#cfcfd4" stroke="${INK}" stroke-width="2"/>`;
}

// Gitar kendi koordinatlarında çizilir (gövde merkezi 0,0; sap sola doğru),
// sonra kalçaya taşınıp 22° döndürülür.
function svgGuitar(type, color) {
  const neckLength = type === "bass" ? 138 : 116;
  const bodyShapes = {
    explorer: "M-18,-15 L30,-27 L47,-8 L25,0 L49,23 L-14,18 Z",
    v: "M-16,-9 L56,-30 L54,-17 L6,0 L54,17 L56,30 L-16,9 Z",
    bass: "M-22,-15 C-12,-29 16,-25 22,-13 C32,-21 47,-16 43,-4 C47,10 35,25 16,20 C0,28 -27,20 -22,4 Z",
  };
  const body = bodyShapes[type];
  const frets = Array.from({ length: 9 }, (_, i) => {
    const x = -neckLength + 14 + i * 11;
    return `<path d="M${x},-4.5 L${x},4.5" stroke="#d8c38a" stroke-width="1.3"/>`;
  }).join("");
  const strings = [-2.5, -0.8, 0.8, 2.5]
    .map((y) => `<path d="M${-neckLength},${y} L25,${y}" stroke="rgba(235,235,235,.7)" stroke-width=".6"/>`).join("");

  return `
    <g transform="translate(10,-102) rotate(22)">
      <rect x="${-neckLength}" y="-4.5" width="${neckLength - 6}" height="9" fill="#4a2e17" ${OUTLINE}/>
      ${frets}
      <path d="M${-neckLength},-5 L${-neckLength - 24},-12 L${-neckLength - 24},10 L${-neckLength},5 Z" fill="${color}" ${OUTLINE}/>
      <path d="${body}" fill="${color}" ${OUTLINE}/>
      <path d="${body}" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="2" transform="translate(3,-2) scale(.84)"/>
      <rect x="-3" y="-8" width="7" height="16" rx="1.5" fill="#15151a" stroke="${INK}" stroke-width="1.5"/>
      <rect x="9" y="-8" width="7" height="16" rx="1.5" fill="#15151a" stroke="${INK}" stroke-width="1.5"/>
      <rect x="22" y="-6" width="4" height="12" fill="#c8c8cc" stroke="${INK}" stroke-width="1.2"/>
      ${strings}
    </g>`;
}

// ---------------------------------------------------------------------
//  Karakterler
// ---------------------------------------------------------------------

function guitaristMarkup(look) {
  const fretHand = [-64, -132];
  return `
    ${svgBody(look)}
    <path d="M-22,-150 L26,-90" stroke="#161616" stroke-width="6"/>
    ${svgArm([-24, -146], [-46, -118], fretHand, look, { withHand: false })}
    ${svgGuitar(look.guitar, look.guitarColor)}
    ${svgHand(fretHand[0], fretHand[1], look.skin)}
    <g class="strum-arm">${svgArm([24, -146], [40, -116], [18, -100], look)}</g>
    ${svgHead(look)}`;
}

function singerMarkup(look) {
  const micStand = `
    <path d="M-56,2 L-42,-10 L-28,2" fill="none" stroke="#2a2a30" stroke-width="4" stroke-linecap="round"/>
    <path d="M-42,-8 L-42,-150 L-18,-168" fill="none" stroke="#2a2a30" stroke-width="4" stroke-linecap="round"/>`;
  const microphone = `
    <g transform="translate(-16,-168) rotate(-35)">
      <rect x="-4" y="-2" width="8" height="18" rx="3" fill="#2a2a30" ${OUTLINE}/>
      <ellipse cx="0" cy="-4" rx="7" ry="8" fill="#6d6d74" ${OUTLINE}/>
    </g>`;
  return `
    ${svgBody(look)}
    ${micStand}
    ${svgArm([-24, -146], [-44, -122], [-42, -150], look)}
    <g class="fist-arm">${svgArm([24, -146], [46, -176], [40, -212], look, { handRadius: 9 })}</g>
    ${svgHead(look)}
    ${microphone}`;
}

function drummerMarkup(look) {
  const stickArm = (side) => `
    <g class="stick-${side < 0 ? "left" : "right"}">
      <path d="M${54 * side},-98 L${92 * side},-124" stroke="#e8d3a0" stroke-width="4" stroke-linecap="round"/>
      ${svgArm([24 * side, -104], [46 * side, -80], [54 * side, -98], look)}
    </g>`;
  const cymbal = (className, x, y, radius) => `
    <g class="${className}">
      <path d="M${x},${y} L${x},0" stroke="#3a3a40" stroke-width="3"/>
      <ellipse cx="${x}" cy="${y}" rx="${radius}" ry="7" fill="#d6a846" ${OUTLINE}/>
      <ellipse cx="${x}" cy="${y - 1}" rx="6" ry="2" fill="#8a6a22"/>
    </g>`;
  const drum = (x, y, width, height) => `
    <rect x="${x - width / 2}" y="${y}" width="${width}" height="${height}" rx="4" fill="#8e0f16" ${OUTLINE}/>
    <ellipse cx="${x}" cy="${y}" rx="${width / 2}" ry="5" fill="#eee" ${OUTLINE}/>`;

  return `
    <path d="M-26,-110 Q-31,-80 -25,-50 L25,-50 Q31,-80 26,-110 Q0,-120 -26,-110Z" fill="${look.shirt}" ${OUTLINE}/>
    ${svgShirtPrint(look, -84)}
    ${stickArm(-1)}
    ${stickArm(1)}
    <g transform="translate(0,44)">${svgHead(look)}</g>
    ${cymbal("cymbal-left", -96, -142, 36)}
    ${cymbal("cymbal-right", 100, -128, 32)}
    <path d="M-116,-96 L-116,0" stroke="#3a3a40" stroke-width="3"/>
    <ellipse cx="-116" cy="-98" rx="20" ry="4" fill="#d6a846" ${OUTLINE}/>
    <ellipse cx="-116" cy="-92" rx="20" ry="4" fill="#d6a846" ${OUTLINE}/>
    ${drum(-66, -70, 36, 18)}
    ${drum(-32, -96, 36, 24)}
    ${drum(32, -96, 36, 24)}
    ${drum(88, -58, 44, 50)}
    <circle cx="0" cy="-42" r="${KICK_DRUM_RADIUS}" fill="#8e0f16" ${OUTLINE}/>
    <circle cx="0" cy="-42" r="36" fill="#111" stroke="#ddd" stroke-width="2"/>
    <circle class="kick-glow" cx="0" cy="-42" r="26" fill="${look.accent}" opacity=".3"/>
    <text x="0" y="-32" text-anchor="middle" font-family="Metal Mania, cursive" font-size="28" fill="#eee">RF</text>`;
}

function mountCharacter(container, markup, viewBox) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", viewBox.join(" "));
  svg.setAttribute("aria-hidden", "true");
  svg.classList.add("character");
  svg.innerHTML = markup;
  container.appendChild(svg);

  const part = (selector) => svg.querySelector(selector);
  return {
    svg,
    viewBox,
    scale: 0,
    head: part(".head"),
    hairBack: part(".hair-back"),
    mouth: part(".mouth"),
    eyes: part(".eyes"),
    strumArm: part(".strum-arm"),
    fistArm: part(".fist-arm"),
    stickLeft: part(".stick-left"),
    stickRight: part(".stick-right"),
    cymbalLeft: part(".cymbal-left"),
    cymbalRight: part(".cymbal-right"),
    kickGlow: part(".kick-glow"),
    nextBlink: 0,
    blinkUntil: 0,
  };
}

function createCast(container) {
  return {
    rhythm: mountCharacter(container, guitaristMarkup(CAST_LOOKS.rhythm), PERSON_VIEWBOX),
    voice: mountCharacter(container, singerMarkup(CAST_LOOKS.voice), PERSON_VIEWBOX),
    lead: mountCharacter(container, guitaristMarkup(CAST_LOOKS.lead), PERSON_VIEWBOX),
    bass: mountCharacter(container, guitaristMarkup(CAST_LOOKS.bass), PERSON_VIEWBOX),
    drums: mountCharacter(container, drummerMarkup(CAST_LOOKS.drums), DRUMMER_VIEWBOX),
  };
}

// ---------------------------------------------------------------------
//  Yerleştirme ve animasyon
// ---------------------------------------------------------------------

// (x, y) = karakterin ayak noktası (davulcu için platformun üstü), ekran pikseli
function placeCharacter(character, x, y, scale) {
  const [minX, minY, width, height] = character.viewBox;
  if (character.scale !== scale) {
    character.svg.style.width = `${width * scale}px`;
    character.svg.style.height = `${height * scale}px`;
    character.scale = scale;
  }
  character.svg.style.transform = `translate(${x + minX * scale}px, ${y + minY * scale}px)`;
}

function setTransform(element, value) {
  if (element) element.setAttribute("transform", value);
}

// Bir noktanın etrafında dikey ölçekleme (ağız açma, göz kırpma için)
function scaleYAround(y, amount) {
  return `translate(0,${y}) scale(1,${amount}) translate(0,${-y})`;
}

function updateBlink(character, time) {
  if (time > character.nextBlink) {
    character.nextBlink = time + 2 + Math.random() * 4;
    character.blinkUntil = time + 0.12;
  }
  const isBlinking = time < character.blinkUntil;
  setTransform(character.eyes, scaleYAround(-194, isBlinking ? 0.1 : 1));
}

// pose: { level, color, nod, sway, strum, fist, mouthOpen, time }
//   level: bu müzisyenin ses seviyesi (0..1) -> arka ışık parlaklığı
//   nod: headbang miktarı, sway: sağa/sola (-1 / 1)
function animateCharacter(character, pose) {
  character.svg.style.filter = `drop-shadow(0 0 ${2 + pose.level * 14}px ${pose.color}) drop-shadow(0 0 1.5px ${pose.color})`;

  setTransform(character.head, `translate(${pose.sway * 3},${pose.nod * 9}) rotate(${pose.sway * 6} 0 -160)`);
  setTransform(character.hairBack, `translate(0,${-pose.nod * 14})`); // kafa inerken saç havalanır
  setTransform(character.mouth, scaleYAround(-168, pose.mouthOpen));
  setTransform(character.strumArm, `rotate(${pose.strum * 14 - 4} 24 -146)`);
  setTransform(character.fistArm, `rotate(${-pose.fist * 22} 24 -146)`);
  updateBlink(character, pose.time);
}

function animateDrummer(drummer, pose) {
  animateCharacter(drummer, { ...pose, strum: 0, fist: 0 });

  // Bagetler sırayla vurur
  const leftHit = stageFx.drumHit * (stageFx.beatIndex % 2 ? 1 : 0.4);
  const rightHit = stageFx.drumHit * (stageFx.beatIndex % 2 ? 0.4 : 1);
  setTransform(drummer.stickLeft, `rotate(${-leftHit * 26} -24 -104)`);
  setTransform(drummer.stickRight, `rotate(${rightHit * 26} 24 -104)`);

  // Crash'te ziller sallanır, kick'te bas davulun ortası parlar
  setTransform(drummer.cymbalLeft, `rotate(${-stageFx.crash * 12} -96 -142)`);
  setTransform(drummer.cymbalRight, `rotate(${stageFx.crash * 12} 100 -128)`);
  if (drummer.kickGlow) drummer.kickGlow.setAttribute("opacity", (0.25 + stageFx.kick * 0.7).toFixed(2));
}
