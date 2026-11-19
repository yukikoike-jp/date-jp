/* eslint-disable @typescript-eslint/no-require-imports */
// 「あるある」型のリール(2026-11)。
// 参考: 「ドパガキあるある」型(箱のような人形の3Dふうの世界・番号つきの小さな場面・大きな字幕・最後に「友達に送ってみて」)
// 話: 幹事あるある 01 日程 → 02 お店 → 03 会計 → 04 乾杯中もスマホ → Tsudoro がぜんぶ引き受ける
// 語り: VOICEVOX:青山龍星(ノーマル)。エンジン(127.0.0.1:50021)を先に起動しておく。BGM はこのスクリプトの中で作る
// 実行: node scripts/make-reels-v11.cjs   出力: marketing/reels/v11_aruaru.mp4

const { spawn } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const sharp = require("sharp");

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "marketing", "reels");
const ICON = path.join(ROOT, "public", "icon-512.png");
const W = 1080;
const H = 1920;
const FPS = 30;
const GOLD = "#f5b83d";
const JP = "Yu Gothic UI, Yu Gothic, Meiryo";
const SERIF = "Yu Mincho, YuMincho, MS Mincho, serif";
const VOICE = { url: "http://127.0.0.1:50021", speaker: 13, speed: 1.12 };

// ---- 動き
const clamp = (x) => Math.max(0, Math.min(1, x));
const easeOut = (x) => 1 - Math.pow(1 - clamp(x), 3);
const backOut = (x) => {
  const t = clamp(x);
  return 1 + 2.7 * Math.pow(t - 1, 3) + 1.7 * Math.pow(t - 1, 2);
};
function fade(t, start, body, dur = 0.35, dy = 30) {
  const p = easeOut((t - start) / dur);
  if (p <= 0) return "";
  return `<g opacity="${p.toFixed(3)}" transform="translate(0 ${((1 - p) * dy).toFixed(1)})">${body}</g>`;
}
function pop(t, start, cx, cy, body, dur = 0.35) {
  const p = clamp((t - start) / dur);
  if (p <= 0) return "";
  const s = backOut(p);
  return `<g opacity="${clamp(p * 2).toFixed(3)}" transform="translate(${cx} ${cy}) scale(${s.toFixed(3)}) translate(${-cx} ${-cy})">${body}</g>`;
}
const T = (x, y, s, size, fill = "#fff", o = {}) =>
  `<text x="${x}" y="${y}" font-family="${o.font ?? JP}" font-weight="${o.weight ?? 900}" font-size="${size}" fill="${fill}" text-anchor="${o.anchor ?? "middle"}"${
    o.stroke ? ` stroke="${o.stroke}" stroke-width="${o.sw ?? 10}" paint-order="stroke" stroke-linejoin="round"` : ""
  }>${s}</text>`;

// ---- 箱(斜めから見た直方体)と、箱の人形
function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.min(255, Math.round(v * k)));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}
function box(x, y, w, h, d, c) {
  const dx = d * 0.55;
  const dy = -d * 0.4;
  return `<polygon points="${x},${y} ${x + dx},${y + dy} ${x + w + dx},${y + dy} ${x + w},${y}" fill="${shade(c, 1.18)}"/>
    <polygon points="${x + w},${y} ${x + w + dx},${y + dy} ${x + w + dx},${y + h + dy} ${x + w},${y + h}" fill="${shade(c, 0.72)}"/>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`;
}
const SKIN = "#f1c9a5";
/**
 * 人形。x = 真ん中、foot = 足の下の y、s = 大きさ。
 * o.shirt / o.hair / o.pants、o.arm: "down" | "up"(乾杯) | "phone"(スマホを見る) | "ear"(電話)、o.mug: 乾杯のジョッキ、o.bob: 上下のゆれ
 */
function person(x, foot, s, o = {}) {
  const u = 10 * s;
  const shirt = o.shirt ?? "#26324a";
  const pants = o.pants ?? "#1b1f2a";
  const hair = o.hair ?? "#2b211c";
  const y0 = foot - (o.bob ?? 0);
  const bodyTop = y0 - 11 * u;
  const headTop = bodyTop - 5.4 * u;
  let g = "";
  g += box(x - 2.6 * u, y0 - 5 * u, 2.3 * u, 5 * u, 1.6 * u, pants);
  g += box(x + 0.3 * u, y0 - 5 * u, 2.3 * u, 5 * u, 1.6 * u, pants);
  g += box(x - 3.2 * u, bodyTop, 6.4 * u, 6.2 * u, 2.4 * u, shirt);
  // 腕
  const armL = box(x - 4.8 * u, bodyTop + 0.3 * u, 1.6 * u, 5.2 * u, 1.6 * u, shirt);
  if (o.arm === "up") {
    g += armL;
    g += box(x + 3.2 * u, bodyTop - 4.6 * u, 1.6 * u, 5.2 * u, 1.6 * u, shirt);
    if (o.mug) g += box(x + 2.9 * u, bodyTop - 7.2 * u, 2.6 * u, 3 * u, 1.4 * u, "#e9a92a") + box(x + 2.9 * u, bodyTop - 7.8 * u, 2.6 * u, 0.8 * u, 1.4 * u, "#fbf6ea");
  } else if (o.arm === "phone") {
    g += box(x - 3.6 * u, bodyTop + 2.2 * u, 7.2 * u, 1.5 * u, 1.4 * u, shirt);
    g += box(x - 1.3 * u, bodyTop + 0.6 * u, 2.6 * u, 3.2 * u, 0.5 * u, "#111418");
    g += `<rect x="${x - 1.0 * u}" y="${bodyTop + 0.9 * u}" width="${2 * u}" height="${2.4 * u}" fill="#7fc3ff" opacity="0.85"/>`;
  } else if (o.arm === "ear") {
    g += armL;
    g += box(x + 3.2 * u, bodyTop - 2.8 * u, 1.6 * u, 4.6 * u, 1.6 * u, shirt);
    g += box(x + 2.4 * u, bodyTop - 4.2 * u, 1.2 * u, 2.4 * u, 0.4 * u, "#111418");
  } else {
    g += armL + box(x + 3.2 * u, bodyTop + 0.3 * u, 1.6 * u, 5.2 * u, 1.6 * u, shirt);
  }
  // 頭
  g += box(x - 2.6 * u, headTop, 5.2 * u, 5.2 * u, 2.6 * u, SKIN);
  g += box(x - 2.8 * u, headTop - 1.2 * u, 5.6 * u, 1.9 * u, 2.8 * u, hair);
  g += `<rect x="${x - 2.8 * u}" y="${headTop}" width="${0.8 * u}" height="${2.6 * u}" fill="${hair}"/>`;
  const look = o.arm === "phone" ? 0.9 * u : 0;
  g += `<rect x="${x - 1.5 * u}" y="${headTop + 2.3 * u + look}" width="${0.7 * u}" height="${0.9 * u}" fill="#1a1a1a"/>
    <rect x="${x + 0.8 * u}" y="${headTop + 2.3 * u + look}" width="${0.7 * u}" height="${0.9 * u}" fill="#1a1a1a"/>`;
  if (o.smile) g += `<rect x="${x - 0.9 * u}" y="${headTop + 3.9 * u}" width="${1.8 * u}" height="${0.45 * u}" fill="#a2463b"/>`;
  else g += `<rect x="${x - 0.5 * u}" y="${headTop + 4 * u}" width="${1 * u}" height="${0.35 * u}" fill="#a2463b"/>`;
  return g;
}
const ME = { shirt: "#d9962a", hair: "#3a2a20" };
const FRIENDS = [
  { shirt: "#2f4a7a", hair: "#2b211c" },
  { shirt: "#7a2f3d", hair: "#5a3a22" },
  { shirt: "#2f6b55", hair: "#1e1a18" },
  { shirt: "#5b4b8a", hair: "#3b2a1f" },
  { shirt: "#41536b", hair: "#2b211c" },
];

// ---- 背景
function campus() {
  let w = `<rect width="${W}" height="1300" fill="#dfe2e6"/>`;
  for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) w += `<rect x="${60 + i * 270}" y="${120 + j * 330}" width="200" height="250" fill="#36579a"/><rect x="${60 + i * 270}" y="${120 + j * 330}" width="200" height="22" fill="#4f6fb0"/>`;
  return w + `<rect y="1300" width="${W}" height="${H - 1300}" fill="#cfcac2"/><rect y="1300" width="${W}" height="14" fill="#b9b3a9"/>`;
}
function izakaya() {
  let w = `<rect width="${W}" height="1300" fill="#4a3226"/>`;
  for (let i = 0; i < 5; i++) w += `<rect x="${40 + i * 210}" y="0" width="12" height="1300" fill="#3a271d"/>`;
  for (let i = 0; i < 4; i++) {
    const x = 120 + i * 260;
    w += `<line x1="${x + 45}" y1="0" x2="${x + 45}" y2="230" stroke="#2a1b14" stroke-width="5"/>` + box(x, 230, 90, 130, 40, "#d23a2c") + `<rect x="${x}" y="280" width="90" height="12" fill="#2a1b14"/>`;
  }
  return w + `<rect y="1300" width="${W}" height="${H - 1300}" fill="#6b4a33"/><rect y="1300" width="${W}" height="14" fill="#573b28"/>`;
}
function table(y = 1380) {
  let g = box(140, y, 800, 70, 260, "#8a5a36");
  for (let i = 0; i < 5; i++) g += box(210 + i * 150, y - 70, 50, 62, 26, "#e9a92a") + box(210 + i * 150, y - 80, 50, 14, 26, "#fbf6ea");
  return g;
}
function bubble(x, y, s, size = 46, dark = false) {
  const w = s.length * size + 60;
  return `<rect x="${x - w / 2}" y="${y - size - 30}" width="${w}" height="${size + 50}" rx="${(size + 50) / 2}" fill="${dark ? "#1b1d22" : "#fff"}" stroke="#00000022" stroke-width="3"/>
    <polygon points="${x - 16},${y + 18} ${x + 16},${y + 18} ${x},${y + 44}" fill="${dark ? "#1b1d22" : "#fff"}"/>
    ${T(x, y, s, size, dark ? "#fff" : "#1b1d22")}`;
}

// ---- 場面(say = 語り、sub = 字幕。days = 左上の日数、over = 「幹事の残業」[はじめ, おわり] 時間、top = 上の問いかけ)
const SCENES = [
  {
    say: "幹事あるある。",
    sub: "幹事あるある",
    num: "", bg: campus,
    draw(t) {
      let g = person(540, 1560, 2.2, { ...ME, smile: true, bob: Math.abs(Math.sin(t * 6)) * 14 });
      [150, 330, 750, 930].forEach((x, i) => (g += person(x, 1330, 1.35, { ...FRIENDS[i], arm: "up", mug: true, smile: true, bob: Math.abs(Math.sin(t * 6 + i)) * 14 })));
      g += pop(t, 0.2, 540, 640, T(540, 640, "幹事あるある", 120, "#fff", { stroke: "#1b1d22", sw: 16 }), 0.4);
      g += pop(t, 0.7, 540, 780, T(540, 780, "心当たり、いくつある?", 52, GOLD, { stroke: "#1b1d22", sw: 10 }));
      return g;
    },
  },
  {
    say: "日程を聞いたら、既読12、返信は3。",
    sub: "日程を聞いたら、\n既読12、返信は3。",
    num: "01", bg: campus,
    draw(t) {
      let g = person(330, 1580, 2.0, { ...ME, arm: "phone" });
      g += fade(t, 0.3, `<rect x="560" y="560" width="440" height="640" rx="50" fill="#111418"/><rect x="580" y="600" width="400" height="570" rx="34" fill="#8fb3d9"/>
         <rect x="640" y="640" width="320" height="110" rx="30" fill="#06c755"/>${T(800, 708, "日程どう?", 44, "#fff")}
         ${T(620, 790, "既読12", 34, "#2b3a4d", { anchor: "start", weight: 700 })}`);
      ["いける", "金曜なら", "たぶん"].forEach((s, i) => (g += fade(t, 1.0 + i * 0.35, `<rect x="600" y="${830 + i * 110}" width="${s.length * 44 + 50}" height="86" rx="30" fill="#fff"/>${T(625, 888 + i * 110, s, 40, "#1b1d22", { anchor: "start", weight: 800 })}`)));
      g += pop(t, 2.3, 330, 640, bubble(330, 640, "…あと9人", 46, true));
      return g;
    },
  },
  {
    say: "13人入るお店は、どこも満席。",
    sub: "13人入るお店は、\nどこも満席。",
    num: "02", bg: campus,
    draw(t) {
      let g = person(330, 1580, 2.0, { ...ME, arm: "ear" });
      ["満席です", "13名様は…", "その日は満席で"].forEach((s, i) => (g += pop(t, 0.4 + i * 0.55, 760, 640 + i * 200, bubble(760, 640 + i * 200, s, 42))));
      g += fade(t, 2.2, T(330, 700, "5軒目…", 56, "#fff", { stroke: "#1b1d22" }));
      return g;
    },
  },
  {
    say: "会計は、1人3846円。小銭が、ぜんぜん足りない。",
    sub: "会計は、1人3,846円。\n小銭が、ぜんぜん足りない。",
    num: "03", bg: izakaya,
    draw(t) {
      let g = person(540, 1330, 1.9, { ...ME, arm: "phone" });
      g += table(1360);
      g += fade(t, 0.3, `<g transform="rotate(-6 760 1250)"><rect x="680" y="1080" width="190" height="300" fill="#fffdf6"/>${[0, 1, 2, 3, 4].map((i) => `<rect x="705" y="${1120 + i * 40}" width="${120 - (i % 2) * 40}" height="10" fill="#c9c2b4"/>`).join("")}${T(775, 1350, "¥50,000", 30, "#1b1d22")}</g>`);
      [0, 1, 2].forEach((i) => (g += pop(t, 1.2 + i * 0.2, 280 + i * 70, 1290, `<circle cx="${280 + i * 70}" cy="1290" r="30" fill="#c9a24a" stroke="#8e6f2b" stroke-width="5"/>`)));
      g += pop(t, 0.9, 540, 650, bubble(540, 650, "1人3,846円…?", 50, true));
      return g;
    },
  },
  {
    say: "みんなが乾杯してるあいだ、幹事だけ、ずっとスマホ。",
    sub: "みんなが乾杯してるあいだ、\n幹事だけ、ずっとスマホ。",
    num: "04", bg: izakaya,
    draw(t) {
      let g = "";
      [150, 300, 450].forEach((x, i) => (g += person(x, 1320, 1.45, { ...FRIENDS[i], arm: "up", mug: true, smile: true, bob: Math.abs(Math.sin(t * 5 + i)) * 12 })));
      g += box(60, 1340, 520, 60, 200, "#8a5a36");
      g += person(840, 1520, 1.9, { ...ME, arm: "phone" });
      g += `<rect x="640" y="0" width="440" height="1920" fill="#16263f" opacity="${(0.35 * easeOut(t / 1.5)).toFixed(3)}"/>`;
      g += fade(t, 0.5, T(300, 640, "かんぱーい!", 60, "#fff", { stroke: "#2a1b14" }));
      return g;
    },
  },
  {
    say: "それ、Tsudoro が、ぜんぶ引き受けます。幹事の友達に、送ってみて。",
    sub: "Tsudoro が、ぜんぶ引き受けます。\n幹事の友達に送ってみて!",
    end: true,
    draw(t) {
      const icon = `data:image/png;base64,${fs.readFileSync(ICON).toString("base64")}`;
      return (
        `<rect width="${W}" height="${H}" fill="#0b0a09"/>` +
        pop(t, 0, 540, 640, `<image href="${icon}" x="400" y="500" width="280" height="280"/>`, 0.45) +
        fade(t, 0.2, T(540, 970, "Tsudoro", 160, GOLD)) +
        fade(t, 0.35, T(540, 1080, "日程・お店・会計を、URL1本で", 52, "#fff", { weight: 800 })) +
        fade(t, 0.5, T(540, 1160, "基本無料・登録なし", 48, "#9aa3ad", { weight: 800 })) +
        fade(t, 0.7, `<rect x="270" y="1250" width="540" height="110" rx="55" fill="#fff"/>${T(540, 1323, "プロフのリンクから", 50, "#111")}`) +
        fade(t, 0.9, T(540, 1470, "※架空の人物による誇張コメディです", 34, "#7d858f", { weight: 700 }))
      );
    },
  },
];

// ---- 画面の上にのせるもの(問いかけ・日数・残業・札・字幕)
function hud(sc, t) {
  if (sc.end) return subtitle(sc.sub, 1600, t);
  const label = T(70, 150, "幹事あるある", 46, "#fff", { anchor: "start", stroke: "#00000088", sw: 8 });
  const num = sc.num
    ? fade(t, 0, T(70, 300, sc.num, 150, GOLD, { anchor: "start", font: SERIF, stroke: "#000000aa", sw: 12 }), 0.25, 20) +
      `<rect x="70" y="330" width="170" height="9" rx="4" fill="${GOLD}"/>`
    : "";
  return `<rect width="${W}" height="380" fill="url(#topfade)"/>` + (sc.num ? label : "") + num + subtitle(sc.sub, 1680, t);
}
function subtitle(sub, y, t) {
  const lines = sub.split("\n");
  const longest = Math.max(...lines.map((l) => l.length));
  const w = Math.min(1000, longest * 54 + 80);
  const h = lines.length * 72 + 44;
  return fade(
    t,
    0.05,
    `<rect x="${540 - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" rx="18" fill="#000000aa"/>` +
      lines.map((l, i) => T(540, y - h / 2 + 22 + 56 + i * 72, l, 52, "#fff", { weight: 800 })).join(""),
    0.2,
    10,
  );
}

// ---- 語り(VOICEVOX)
async function speak(text) {
  const q = await fetch(`${VOICE.url}/audio_query?speaker=${VOICE.speaker}&text=${encodeURIComponent(text)}`, { method: "POST" });
  if (!q.ok) throw new Error("audio_query " + q.status);
  const query = await q.json();
  query.speedScale = VOICE.speed;
  query.outputSamplingRate = 44100;
  query.outputStereo = false;
  const r = await fetch(`${VOICE.url}/synthesis?speaker=${VOICE.speaker}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(query) });
  if (!r.ok) throw new Error("synthesis " + r.status);
  const wav = Buffer.from(await r.arrayBuffer());
  const dataAt = wav.indexOf("data") + 8;
  return new Int16Array(wav.buffer.slice(wav.byteOffset + dataAt, wav.byteOffset + wav.length - ((wav.length - dataAt) % 2)));
}
function wavFile(samples, rate) {
  const b = Buffer.alloc(44 + samples.length * 2);
  b.write("RIFF", 0);
  b.writeUInt32LE(36 + samples.length * 2, 4);
  b.write("WAVEfmt ", 8);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20);
  b.writeUInt16LE(1, 22);
  b.writeUInt32LE(rate, 24);
  b.writeUInt32LE(rate * 2, 28);
  b.writeUInt16LE(2, 32);
  b.writeUInt16LE(16, 34);
  b.write("data", 36);
  b.writeUInt32LE(samples.length * 2, 40);
  for (let i = 0; i < samples.length; i++) b.writeInt16LE(samples[i], 44 + i * 2);
  return b;
}

// ---- BGM(場面ごとに曲調を変える)。segs = [{ start, end, mood }]、mood = "sad" | "twist" | "happy" | "end"
function bgm(seconds, segs) {
  const n = Math.ceil(seconds * 44100);
  const L = new Float32Array(n);
  const R = new Float32Array(n);
  const RATE = 44100;
  const beat = 60 / 80;
  const eighth = beat / 2;
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const SAD = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]; // Am F C G
  const HAPPY = [[48, 52, 55], [55, 59, 62], [57, 60, 64], [53, 57, 60]]; // C G Am F
  const pluck = (f, t) => (t < 0 ? 0 : (Math.sin(2 * Math.PI * f * t) + 0.45 * Math.sin(4 * Math.PI * f * t) + 0.18 * Math.sin(6 * Math.PI * f * t)) * Math.exp(-t * 3.2));
  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    const seg = segs.find((x) => t >= x.start && t < x.end) ?? segs[segs.length - 1];
    const lt = t - seg.start;
    const segLen = seg.end - seg.start;
    // 曲調の切り替わりで音がぶつからないよう、場面の頭と終わりを少しだけなめらかに
    const edge = Math.min(1, lt / 0.08, (seg.end - t) / 0.08);
    let l = 0;
    let r = 0;
    if (seg.mood === "sad" || seg.mood === "happy") {
      const prog = seg.mood === "sad" ? SAD : HAPPY;
      const bar = beat * 4;
      const ci = Math.floor(t / bar) % 4;
      const chord = prog[ci];
      // アルペジオ(8分): 1-3-5-8-5-3…
      const step = Math.floor((t % bar) / eighth);
      const order = [0, 1, 2, 3, 2, 1, 2, 1];
      const k = order[step % 8];
      const note = k === 3 ? chord[0] + 12 : chord[k];
      const nt = (t % bar) - step * eighth;
      const arp = pluck(hz(note + 12), nt) * (seg.mood === "sad" ? 0.11 : 0.1);
      // やわらかい和音(パッド)
      let pad = 0;
      chord.forEach((m) => (pad += Math.sin(2 * Math.PI * hz(m) * t) * 0.03 + Math.sin(2 * Math.PI * hz(m) * 1.003 * t) * 0.012));
      const bt = t % (beat * 2);
      const bass = Math.sin(2 * Math.PI * hz(chord[0] - 12) * t) * Math.exp(-bt * 2.2) * (seg.mood === "sad" ? 0.1 : 0.17);
      l += arp * 0.8 + pad + bass;
      r += arp + pad * 0.9 + bass;
      if (seg.mood === "happy") {
        const kt = t % beat;
        const kick = kt < 0.25 ? Math.sin(2 * Math.PI * (50 + 80 * Math.exp(-kt * 30)) * kt) * Math.exp(-kt * 13) * 0.36 : 0;
        const ct = (t + beat) % (beat * 2);
        const clap = ct < 0.18 ? rnd() * Math.exp(-ct * 24) * 0.12 : 0;
        const ht = (t + eighth / 2) % eighth;
        const hat = ht < 0.04 ? rnd() * Math.exp(-ht * 110) * 0.05 : 0;
        l += kick + clap + hat * 0.6;
        r += kick + clap + hat;
      }
    } else if (seg.mood === "twist") {
      // いったん静かになり、上がっていく音(期待させる)
      const x = lt / segLen;
      const f = 180 * Math.pow(5, x);
      const phase = 2 * Math.PI * (180 * (Math.pow(5, x) - 1) / Math.log(5)) * segLen;
      const riser = (Math.sin(phase) * 0.5 + rnd() * 0.25 * x) * x * x * 0.22;
      void f;
      const bell = pluck(hz(76), lt - 0.45) * 0.12 + pluck(hz(83), lt - 0.45) * 0.08;
      l += riser + bell;
      r += riser + bell;
    } else {
      // 最後: C の和音を、ゆっくり消していく
      let pad = 0;
      [48, 55, 64, 67].forEach((m) => (pad += Math.sin(2 * Math.PI * hz(m) * t) * 0.035));
      const bell = pluck(hz(72), lt - 0.1) * 0.12 + pluck(hz(79), lt - 0.6) * 0.09 + pluck(hz(84), lt - 1.1) * 0.07;
      const fadeOut = Math.min(1, (seg.end - t) / 2.2);
      l += (pad + bell) * fadeOut;
      r += (pad * 0.9 + bell) * fadeOut;
    }
    L[i] = l * edge;
    R[i] = r * edge;
  }
  return [L, R];
}

function wavStereo(L, R) {
  const n = L.length;
  const b = Buffer.alloc(44 + n * 4);
  b.write("RIFF", 0);
  b.writeUInt32LE(36 + n * 4, 4);
  b.write("WAVEfmt ", 8);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20);
  b.writeUInt16LE(2, 22);
  b.writeUInt32LE(44100, 24);
  b.writeUInt32LE(44100 * 4, 28);
  b.writeUInt16LE(4, 32);
  b.writeUInt16LE(16, 34);
  b.write("data", 36);
  b.writeUInt32LE(n * 4, 40);
  const c = (x) => Math.max(-32768, Math.min(32767, Math.round(x * 32767)));
  for (let i = 0; i < n; i++) {
    b.writeInt16LE(c(L[i]), 44 + i * 4);
    b.writeInt16LE(c(R[i]), 46 + i * 4);
  }
  return b;
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const RATE = 44100;
  const LEAD = 0.25;
  const voices = [];
  for (const sc of SCENES) {
    const v = await speak(sc.say);
    voices.push(v);
    sc.sec = Math.max(2.2, LEAD + v.length / RATE + (sc.end ? 2.4 : 0.45));
  }
  const TOTAL = SCENES.reduce((s, sc) => s + sc.sec, 0);
  const mix = new Int16Array(Math.ceil(TOTAL * RATE));
  let at = 0;
  SCENES.forEach((sc, i) => {
    mix.set(voices[i], Math.round((at + LEAD) * RATE));
    at += sc.sec;
  });
  // 語りに BGM を重ねる(語りの間は BGM を下げる)
  const MOODS = ["happy", "happy", "happy", "happy", "happy", "end"];
  const segs = [];
  let st = 0;
  SCENES.forEach((sc, i) => {
    segs.push({ start: st, end: st + sc.sec, mood: MOODS[i] });
    st += sc.sec;
  });
  const [bl, br] = bgm(TOTAL, segs);
  const L = new Float32Array(mix.length);
  const R = new Float32Array(mix.length);
  let env = 0;
  let duck = 1;
  for (let i = 0; i < mix.length; i++) {
    const v = mix[i] / 32768;
    env = Math.max(Math.abs(v), env * 0.9997);
    duck += ((env > 0.02 ? 0.5 : 1) - duck) * 0.0004;
    const t = i / RATE;
    const g = 0.5 * duck * Math.min(1, t / 0.8);
    L[i] = v * 0.95 + (bl[i] ?? 0) * g;
    R[i] = v * 0.95 + (br[i] ?? 0) * g;
  }
  let peak = 0;
  for (let i = 0; i < L.length; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  if (peak > 0.97) for (let i = 0; i < L.length; i++) (L[i] *= 0.97 / peak), (R[i] *= 0.97 / peak);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "reel11-"));
  const wavPath = path.join(tmp, "mix.wav");
  fs.writeFileSync(wavPath, wavStereo(L, R));

  const out = path.join(OUT, "v11_aruaru.mp4");
  const ff = spawn(
    "ffmpeg",
    [
      "-y", "-loglevel", "error",
      "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", `${W}x${H}`, "-r", String(FPS), "-i", "-",
      "-i", wavPath,
      "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-pix_fmt", "yuv420p",
      "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-c:a", "aac", "-b:a", "192k", "-ar", "44100", "-ac", "2", "-shortest", "-movflags", "+faststart", out,
    ],
    { stdio: ["pipe", "inherit", "inherit"] },
  );
  const write = (buf) => new Promise((res) => (ff.stdin.write(buf) ? res() : ff.stdin.once("drain", res)));
  const defs = `<defs><linearGradient id="topfade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0.55"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient></defs>`;

  const frames = Math.round(TOTAL * FPS);
  const previews = [];
  let start = 0;
  let si = 0;
  for (let f = 0; f < frames; f++) {
    const g = f / FPS;
    while (si < SCENES.length - 1 && g >= start + SCENES[si].sec) {
      start += SCENES[si].sec;
      si++;
    }
    const sc = SCENES[si];
    const t = g - start;
    // 少しずつ寄る(止まった絵に見せない)
    const z = 1 + 0.04 * (t / sc.sec);
    const world = sc.end ? sc.draw(t, sc.sec) : `<g transform="translate(540 1100) scale(${z.toFixed(4)}) translate(-540 -1100)">${sc.bg()}${sc.draw(t, sc.sec)}</g>`;
    const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${defs}${world}${hud(sc, t, sc.sec)}</svg>`;
    const img = sharp(Buffer.from(svg));
    await write(await img.clone().removeAlpha().raw().toBuffer());
    if (Math.abs(t - (sc.sec - 0.3)) < 0.5 / FPS) previews.push(await img.clone().resize(216, 384).png().toBuffer());
    if (f % 300 === 0) process.stdout.write(`${f}/${frames}\n`);
  }
  ff.stdin.end();
  await new Promise((res, rej) => ff.on("close", (c) => (c === 0 ? res() : rej(new Error("ffmpeg " + c)))));
  const cols = 5;
  await sharp({ create: { width: 216 * cols, height: 384 * Math.ceil(previews.length / cols), channels: 3, background: "#222" } })
    .composite(previews.map((input, i) => ({ input, left: (i % cols) * 216, top: Math.floor(i / cols) * 384 })))
    .jpeg({ quality: 85 })
    .toFile(path.join(OUT, "v11_aruaru_preview.jpg"));
  console.log("ok", out, TOTAL.toFixed(1) + "s");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
