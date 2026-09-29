// Konser sahnesi. Üç katmandan oluşur (arkadan öne):
//   1. #stageBack  (canvas): fon, duman, zemin, amfiler, davul platformu, spotlar
//   2. #band       (SVG):    karikatür müzisyenler (characters.js)
//   3. #stageFront (canvas): kıvılcımlar, kalabalık, isim etiketleri, strobe

// Grubun sahnedeki dizilimi. x: sahne genişliğine oranla konum.
const BAND_LAYOUT = [
  { role: "rhythm", name: "RİTİM GİTAR", x: 0.17, xNarrow: 0.13, inFront: false },
  { role: "voice",  name: "VOKAL",       x: 0.34, xNarrow: 0.37, inFront: true },
  { role: "lead",   name: "LEAD GİTAR",  x: 0.69, xNarrow: 0.63, inFront: true },
  { role: "bass",   name: "BAS",         x: 0.86, xNarrow: 0.87, inFront: false },
];

const LIGHT_COLORS = ["255,30,30", "255,120,30", "255,245,230", "255,30,30", "120,140,255", "255,120,30", "255,245,230", "255,30,30"];

const stage = (() => {
  const backCanvas = $("#stageBack");
  const frontCanvas = $("#stageFront");
  const back = backCanvas.getContext("2d");
  const front = frontCanvas.getContext("2d");
  const cast = createCast($("#band"));

  let W = 0;
  let H = 0;
  let crowd = [];
  let haze = [];
  let sparks = [];
  let idleClock = 0;

  // ---------- Boyut değişince yeniden üretilenler ----------
  function createCrowd() {
    const people = [];
    const count = Math.round(W / 26);
    for (let i = 0; i < count; i++) {
      people.push({
        x: (i + Math.random() * 0.8) * (W / count),
        size: 0.75 + Math.random() * 0.55,
        phase: Math.random() * Math.PI * 2,
        armUp: Math.random() < 0.55,
        hornsUp: Math.random() < 0.6, // 🤘
        armSide: Math.random() < 0.5 ? -1 : 1,
        jumpiness: 0.5 + Math.random(),
      });
    }
    return people.sort((a, b) => a.size - b.size); // küçükler (uzaktakiler) önce çizilsin
  }

  function createHaze() {
    return Array.from({ length: 5 }, (_, i) => ({
      x: Math.random() * W,
      y: H * (0.25 + Math.random() * 0.4),
      radius: W * (0.18 + Math.random() * 0.2),
      speed: (Math.random() - 0.5) * 0.15,
      tint: i,
    }));
  }

  // ---------- Kıvılcımlar ----------
  function addSpark(x, y, power = 1) {
    sparks.push({
      x, y,
      vx: (Math.random() - 0.5) * 2.2 * power,
      vy: -(1.5 + Math.random() * 4) * power,
      life: 1,
      fade: 0.006 + Math.random() * 0.012,
      radius: 0.8 + Math.random() * 1.8,
      hue: 15 + Math.random() * 30,
    });
  }

  // Crash zilinde sahne önünden kıvılcım patlaması
  function burst() {
    if (PREFERS_REDUCED_MOTION) return;
    for (let i = 0; i < 70; i++) addSpark(W * (0.08 + Math.random() * 0.84), H * 0.84, 1.6);
  }

  // ---------- Sahne ölçüleri ----------
  function computeLayout() {
    const floorTop = H * 0.64;
    const floorFront = H * 0.84;
    const narrow = W < 600;
    return {
      floorTop,
      floorFront,
      narrow,
      riserTop: floorTop - H * 0.04,
      backFoot: floorTop + (floorFront - floorTop) * 0.62,
      frontFoot: floorTop + (floorFront - floorTop) * 0.74,
      personHeight: narrow ? W * 0.24 : Math.min(clamp(H * 0.34, 150, 290), W * 0.17),
      kickRadius: clamp(Math.min(H * 0.055, W * 0.032), 16, 48),
    };
  }

  // =====================================================================
  //  Arka katman
  // =====================================================================
  function drawBackdrop(energy) {
    const gradient = back.createLinearGradient(0, 0, 0, H);
    gradient.addColorStop(0, "#0a0304");
    gradient.addColorStop(0.55, "#12050a");
    gradient.addColorStop(1, "#030303");
    back.fillStyle = gradient;
    back.fillRect(0, 0, W, H);

    // perde kıvrımları
    for (let x = 0; x < W; x += 34) {
      back.fillStyle = `rgba(255,255,255,${0.012 + 0.01 * Math.sin(x * 0.05)})`;
      back.fillRect(x, 0, 14, H * 0.64);
    }

    // davulcunun arkasındaki kırmızı hale, ölçü başlarında parlar
    const cx = W / 2, cy = H * 0.52;
    const halo = back.createRadialGradient(cx, cy, 0, cx, cy, W * 0.45);
    halo.addColorStop(0, `rgba(255,20,30,${0.18 + energy * 0.25 + stageFx.downbeat * 0.15})`);
    halo.addColorStop(1, "rgba(255,20,30,0)");
    back.fillStyle = halo;
    back.fillRect(0, 0, W, H);
  }

  function drawHaze(energy) {
    back.globalCompositeOperation = "lighter"; // renkler üst üste binince parlasın
    for (const cloud of haze) {
      cloud.x += cloud.speed;
      if (cloud.x < -cloud.radius) cloud.x = W + cloud.radius;
      if (cloud.x > W + cloud.radius) cloud.x = -cloud.radius;
      const g = back.createRadialGradient(cloud.x, cloud.y, 0, cloud.x, cloud.y, cloud.radius);
      g.addColorStop(0, `rgba(255,${80 + cloud.tint * 20},${70 + cloud.tint * 10},${0.035 + energy * 0.05})`);
      g.addColorStop(1, "rgba(0,0,0,0)");
      back.fillStyle = g;
      back.fillRect(cloud.x - cloud.radius, cloud.y - cloud.radius, cloud.radius * 2, cloud.radius * 2);
    }
    back.globalCompositeOperation = "source-over";
  }

  function drawFloor(layout) {
    const { floorTop, floorFront } = layout;
    const gradient = back.createLinearGradient(0, floorTop, 0, floorFront);
    gradient.addColorStop(0, "#150b0c");
    gradient.addColorStop(1, "#070606");
    back.fillStyle = gradient;
    back.beginPath();
    back.moveTo(W * 0.02, floorFront);
    back.lineTo(W * 0.98, floorFront);
    back.lineTo(W * 0.88, floorTop);
    back.lineTo(W * 0.12, floorTop);
    back.closePath();
    back.fill();

    back.fillStyle = "#050505";
    back.fillRect(0, floorFront, W, H - floorFront);

    // sahne önündeki LED şerit: vuruşla birlikte kayan ışık
    for (let x = W * 0.03; x < W * 0.97; x += 14) {
      const isLit = (Math.floor(x / 14) + stageFx.beatIndex) % 4 === 0;
      back.fillStyle = isLit ? `rgba(255,40,40,${0.5 + stageFx.pulse * 0.5})` : "rgba(255,40,40,.12)";
      back.fillRect(x, floorFront + 2, 6, 2);
    }
  }

  function drawAmpStack(x, baseY, width, glow) {
    const cabinetHeight = width * 0.92;
    const headHeight = width * 0.34;

    for (let i = 0; i < 2; i++) {
      const y = baseY - cabinetHeight * (i + 1) - i * 2;
      back.fillStyle = "#0b0b0c";
      back.fillRect(x, y, width, cabinetHeight);
      back.strokeStyle = "#1d1d20";
      back.lineWidth = 2;
      back.strokeRect(x + 1, y + 1, width - 2, cabinetHeight - 2);
      back.fillStyle = "#121214"; // hoparlör ızgarası
      back.fillRect(x + width * 0.07, y + cabinetHeight * 0.07, width * 0.86, cabinetHeight * 0.86);
      back.fillStyle = `rgba(232,220,200,${0.5 + glow * 0.3})`; // logo plakası
      back.fillRect(x + width * 0.38, y + cabinetHeight * 0.12, width * 0.24, cabinetHeight * 0.05);
    }

    const headY = baseY - cabinetHeight * 2 - 4 - headHeight;
    back.fillStyle = "#0d0d0e";
    back.fillRect(x, headY, width, headHeight);
    back.fillStyle = "#6f6f74";
    back.fillRect(x + width * 0.05, headY + headHeight * 0.45, width * 0.9, headHeight * 0.35);
    back.fillStyle = `rgba(255,40,40,${0.6 + glow * 0.4})`; // power lambası
    back.beginPath();
    back.arc(x + width * 0.9, headY + headHeight * 0.25, 2.2, 0, Math.PI * 2);
    back.fill();
  }

  function drawAmps(layout) {
    const width = clamp(W * 0.075, 44, 104);
    const baseY = layout.floorTop + (layout.floorFront - layout.floorTop) * 0.12;
    const { rhythm, lead } = stageFx.levels;
    drawAmpStack(W * 0.13, baseY, width, rhythm);
    drawAmpStack(W * 0.87 - width, baseY, width, lead);
    if (W > 900) {
      drawAmpStack(W * 0.13 + width + 4, baseY, width, rhythm);
      drawAmpStack(W * 0.87 - width * 2 - 4, baseY, width, lead);
    }
  }

  function drawDrumRiser(layout) {
    const { riserTop, floorTop } = layout;
    back.fillStyle = "#0e0e10";
    back.fillRect(W / 2 - W * 0.1, riserTop, W * 0.2, floorTop - riserTop + H * 0.02);
    back.fillStyle = `rgba(255,40,40,${0.15 + stageFx.pulse * 0.35})`;
    back.fillRect(W / 2 - W * 0.1, riserTop, W * 0.2, 2);
  }

  // Tepeden müzisyene inen, çaldıkça parlayan ışık konisi
  function drawFollowSpot(x, footY, height, color, level) {
    back.save();
    back.globalCompositeOperation = "lighter";
    const top = H * 0.035;
    const halfWidth = height * 0.42;

    const cone = back.createLinearGradient(0, top, 0, footY);
    cone.addColorStop(0, hexToRgba(color, 0.02));
    cone.addColorStop(1, hexToRgba(color, 0.1 + level * 0.22));
    back.fillStyle = cone;
    back.beginPath();
    back.moveTo(x - 6, top);
    back.lineTo(x - halfWidth, footY);
    back.lineTo(x + halfWidth, footY);
    back.lineTo(x + 6, top);
    back.closePath();
    back.fill();

    const pool = back.createRadialGradient(x, footY, 0, x, footY, halfWidth);
    pool.addColorStop(0, hexToRgba(color, 0.25 + level * 0.35));
    pool.addColorStop(1, hexToRgba(color, 0));
    back.fillStyle = pool;
    back.beginPath();
    back.ellipse(x, footY, halfWidth, halfWidth * 0.22, 0, 0, Math.PI * 2);
    back.fill();
    back.restore();
  }

  function drawBeam(fromX, fromY, toX, toY, halfWidth, rgb, alpha) {
    const g = back.createLinearGradient(fromX, fromY, toX, toY);
    g.addColorStop(0, `rgba(${rgb},${alpha})`);
    g.addColorStop(0.7, `rgba(${rgb},${alpha * 0.25})`);
    g.addColorStop(1, `rgba(${rgb},0)`);
    back.fillStyle = g;
    back.beginPath();
    back.moveTo(fromX - 3, fromY);
    back.lineTo(toX - halfWidth, toY);
    back.lineTo(toX + halfWidth, toY);
    back.lineTo(fromX + 3, fromY);
    back.closePath();
    back.fill();
  }

  // Tavandaki truss ve oradan sahneyi tarayan spotlar
  function drawLightRig(time, energy, isPlaying, layout) {
    const trussY = H * 0.035;
    const lightCount = layout.narrow ? 5 : 8;
    const lightX = (i) => W * (0.08 + (0.84 * i) / (lightCount - 1));

    back.globalCompositeOperation = "lighter";
    for (let i = 0; i < lightCount; i++) {
      const sweep = Math.sin(time * (0.35 + (i % 3) * 0.12) + i * 1.7) * W * 0.18;
      const targetX = lightX(i) + (i % 2 ? sweep : -sweep);
      const targetY = layout.floorTop + (layout.floorFront - layout.floorTop) * (0.4 + (i % 3) * 0.2);
      const beatAccent = isPlaying && stageFx.beatIndex % lightCount === i ? stageFx.pulse * 0.25 : 0; // her vuruşta sıradaki spot parlar
      const alpha = clamp(0.1 + energy * 0.35 + beatAccent + stageFx.downbeat * 0.08 + stageFx.crash * 0.25, 0, 0.75);
      drawBeam(lightX(i), trussY, targetX, targetY, W * 0.05, LIGHT_COLORS[i % LIGHT_COLORS.length], alpha);
    }
    back.globalCompositeOperation = "source-over";

    back.strokeStyle = "#2a2a2e";
    back.lineWidth = 2;
    back.beginPath();
    back.moveTo(0, trussY - 8); back.lineTo(W, trussY - 8);
    back.moveTo(0, trussY + 4); back.lineTo(W, trussY + 4);
    back.stroke();
    back.lineWidth = 1;
    for (let x = 0; x < W; x += 16) {
      back.beginPath();
      back.moveTo(x, trussY - 8); back.lineTo(x + 8, trussY + 4); back.lineTo(x + 16, trussY - 8);
      back.stroke();
    }
    for (let i = 0; i < lightCount; i++) {
      back.fillStyle = "#101012";
      back.fillRect(lightX(i) - 7, trussY, 14, 12);
      back.fillStyle = `rgba(${LIGHT_COLORS[i % LIGHT_COLORS.length]},.9)`;
      back.fillRect(lightX(i) - 4, trussY + 10, 8, 3);
    }
  }

  // =====================================================================
  //  Grup (SVG karakterler)
  // =====================================================================
  function memberLevel(role) {
    const levels = stageFx.levels;
    return role === "rhythm" ? Math.max(levels.rhythm, levels.clean) : levels[role];
  }

  function positionBand(layout, time, isPlaying, idleWave) {
    const scale = layout.personHeight / PERSON_HEIGHT;
    const sway = stageFx.beatIndex % 2 ? 1 : -1;
    const headbang = (level) => (isPlaying ? stageFx.pulse * (0.3 + level) : 0.15 * idleWave);

    const members = BAND_LAYOUT.map((member) => {
      const level = memberLevel(member.role);
      const x = W * (layout.narrow ? member.xNarrow : member.x);
      const footY = member.inFront ? layout.frontFoot : layout.backFoot;
      const nod = headbang(level);
      const bounce = isPlaying ? stageFx.pulse * 3 * (0.3 + level) : 0;

      placeCharacter(cast[member.role], x, footY + bounce, scale);
      animateCharacter(cast[member.role], {
        level,
        color: ROLES[member.role].color,
        nod,
        sway: sway * nod,
        strum: stageFx.pulse,
        fist: stageFx.pulse * level,
        mouthOpen: member.role === "voice" ? Math.min(0.5 + level * 2.6 + nod * 0.3, 3.2) : 0.7 + level * 0.7,
        time,
      });
      return { ...member, x, footY, level };
    });

    const drumLevel = stageFx.levels.drums;
    const drumNod = headbang(drumLevel);
    placeCharacter(cast.drums, W / 2, layout.riserTop, (layout.kickRadius / KICK_DRUM_RADIUS) * 0.9);
    animateDrummer(cast.drums, {
      level: drumLevel,
      color: ROLES.drums.color,
      nod: drumNod,
      sway: sway * drumNod,
      mouthOpen: 0.7 + drumLevel * 0.9,
      time,
    });

    return members;
  }

  // =====================================================================
  //  Ön katman
  // =====================================================================
  function drawSparks(isPlaying, layout) {
    if (PREFERS_REDUCED_MOTION) return;
    if (isPlaying && Math.random() < 0.25 + stageFx.masterLevel * 0.8) {
      addSpark(W * (0.05 + Math.random() * 0.9), layout.floorFront, 0.7);
    }
    front.globalCompositeOperation = "lighter";
    sparks = sparks.filter((spark) => {
      spark.x += spark.vx;
      spark.y += spark.vy;
      spark.vy += 0.035; // yerçekimi
      spark.life -= spark.fade;
      if (spark.life <= 0) return false;
      front.fillStyle = `hsla(${spark.hue},100%,${55 + spark.life * 30}%,${spark.life})`;
      front.beginPath();
      front.arc(spark.x, spark.y, spark.radius, 0, Math.PI * 2);
      front.fill();
      return true;
    });
    front.globalCompositeOperation = "source-over";
  }

  function drawFan(fan, time, energy, isPlaying) {
    const size = fan.size * clamp(H / 720, 0.7, 1.3);
    const jump = isPlaying
      ? stageFx.pulse * 7 * fan.jumpiness * (0.4 + stageFx.masterLevel)
      : Math.sin(idleClock * 2 + fan.phase) * 1.2;
    const baseY = H + 6 - (fan.size - 0.75) * 30;
    const headY = baseY - 44 * size - jump;
    const rimLight = `rgba(255,70,50,${0.25 + energy * 0.5 + stageFx.downbeat * 0.2})`;

    front.fillStyle = "#000";
    front.strokeStyle = rimLight;
    front.lineWidth = 1.2;

    // omuzlar ve kafa
    front.beginPath();
    front.ellipse(fan.x, baseY - 14 * size - jump, 21 * size, 18 * size, 0, Math.PI, 0);
    front.fill();
    front.stroke();
    front.beginPath();
    front.ellipse(fan.x, baseY - 8 * size - jump, 21 * size, 14 * size, 0, 0, Math.PI * 2);
    front.fill();
    front.beginPath();
    front.arc(fan.x, headY, 10.5 * size, 0, Math.PI * 2);
    front.fill();
    front.stroke();

    if (!fan.armUp) return;

    const wave = Math.sin(time * 3 + fan.phase) * 4 * size;
    const shoulderX = fan.x + fan.armSide * 14 * size;
    const shoulderY = baseY - 26 * size - jump;
    const handX = fan.x + fan.armSide * 16 * size + wave;
    const handY = headY - 46 * size - jump * 0.6;

    front.lineCap = "round";
    front.lineWidth = 6 * size;
    front.strokeStyle = "#000";
    front.beginPath(); front.moveTo(shoulderX, shoulderY); front.lineTo(handX, handY); front.stroke();
    front.lineWidth = 1.2;
    front.strokeStyle = rimLight;
    front.beginPath(); front.moveTo(shoulderX, shoulderY); front.lineTo(handX, handY); front.stroke();
    front.fillStyle = "#000";
    front.beginPath(); front.arc(handX, handY, 4.5 * size, 0, Math.PI * 2); front.fill();

    if (fan.hornsUp) { // 🤘 işaret ve serçe parmak
      front.lineWidth = 2.4 * size;
      front.strokeStyle = "#000";
      front.beginPath();
      front.moveTo(handX - 2.5 * size, handY - 2 * size); front.lineTo(handX - 4 * size, handY - 11 * size);
      front.moveTo(handX + 2.5 * size, handY - 2 * size); front.lineTo(handX + 4 * size, handY - 11 * size);
      front.stroke();
    }
  }

  function drawNameTag(x, y, text, color, level) {
    front.save();
    front.font = `600 ${W < 600 ? 9 : 12}px Oswald, sans-serif`;
    if ("letterSpacing" in front) front.letterSpacing = W < 600 ? "1px" : "3px";
    const width = front.measureText(text).width + 18;

    front.fillStyle = "rgba(0,0,0,.72)";
    front.fillRect(x - width / 2, y - 11, width, 22);
    front.fillStyle = color;
    front.fillRect(x - width / 2, y - 11, 3, 22);

    front.shadowColor = color;
    front.shadowBlur = 6 + level * 14;
    front.fillStyle = level > 0.15 ? "#fff" : "#d9d4ce";
    front.textAlign = "center";
    front.textBaseline = "middle";
    front.fillText(text, x + 2, y + 1);
    front.restore();
  }

  function drawStrobeAndVignette() {
    if (stageFx.crash > 0.02 && !PREFERS_REDUCED_MOTION) {
      front.globalCompositeOperation = "lighter";
      front.fillStyle = `rgba(255,240,230,${stageFx.crash * 0.22})`;
      front.fillRect(0, 0, W, H);
      front.globalCompositeOperation = "source-over";
    }
    const vignette = front.createRadialGradient(W / 2, H * 0.5, H * 0.3, W / 2, H * 0.5, Math.max(W, H) * 0.75);
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(1, "rgba(0,0,0,.65)");
    front.fillStyle = vignette;
    front.fillRect(0, 0, W, H);
  }

  // =====================================================================
  //  Her karede çağrılır
  // =====================================================================
  function draw(time, isPlaying) {
    const size = fitCanvasToScreen(backCanvas, back);
    fitCanvasToScreen(frontCanvas, front);
    if (size.width !== W || size.height !== H) {
      W = size.width;
      H = size.height;
      crowd = createCrowd();
      haze = createHaze();
    }

    idleClock += 1 / 60;
    const animTime = PREFERS_REDUCED_MOTION ? 0 : time;
    // Çalmıyorken sahne "soundcheck" modunda hafifçe nefes alır
    const idleWave = isPlaying ? 0 : 0.5 + 0.5 * Math.sin(idleClock * 1.2);
    const energy = isPlaying ? stageFx.masterLevel : 0.18 + idleWave * 0.1;
    const layout = computeLayout();

    drawBackdrop(energy);
    drawHaze(energy);
    drawFloor(layout);
    drawAmps(layout);
    drawDrumRiser(layout);
    const members = positionBand(layout, time, isPlaying, idleWave);
    members.forEach((m) => drawFollowSpot(m.x, m.footY, layout.personHeight, ROLES[m.role].color, m.level));
    drawLightRig(animTime, energy, isPlaying, layout);

    front.clearRect(0, 0, W, H);
    drawSparks(isPlaying, layout);
    crowd.forEach((fan) => drawFan(fan, animTime, energy, isPlaying));
    const drumTagY = layout.narrow
      ? layout.riserTop - layout.kickRadius * 6.2           // dar ekranda davulcunun üstünde
      : layout.riserTop + (layout.floorTop - layout.riserTop) / 2 + H * 0.01;
    drawNameTag(W / 2, drumTagY, "DAVUL", ROLES.drums.color, stageFx.levels.drums);
    members.forEach((m) => {
      // dar ekranda etiketler kafaların üstüne çıkar ki play butonuyla çakışmasın
      const tagY = layout.narrow ? m.footY - layout.personHeight * 1.12 : m.footY + 22;
      drawNameTag(m.x, tagY, m.name, ROLES[m.role].color, m.level);
    });
    drawStrobeAndVignette();
  }

  return { draw, burst };
})();
