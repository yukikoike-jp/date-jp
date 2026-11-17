/* eslint-disable @typescript-eslint/no-require-imports */
// Tsudoro のリール v6「ゲームの予告編」型(縦 1080x1920・声つき)。
// 参考: 夜の街の格子とネオンの光、赤く光るローポリの狼、英字の表示(HUD)、赤い強調の入った大きな見出し。
// 絵はすべて、ここで作る(SVG)。写真や外の素材は使わない。
// 実行: VOICEVOX のエンジン(http://127.0.0.1:50021)を起動してから  node scripts/make-reels-v6.cjs
// 出力: marketing/reels/v6_wordwolf.mp4

const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const sharp = require("sharp");

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "marketing", "reels");
const ICON = path.join(ROOT, "public", "icon-512.png");
const ENGINE = "http://127.0.0.1:50021";
const W = 1080;
const H = 1920;
const FPS = 30;
const XF = 0.12;
const RED = "#ff2d3d";
const CYAN = "#37e0ff";
const GOLD = "#f5b83d";
const JP = "Yu Gothic UI, Yu Gothic, Meiryo";
const EN = "Bahnschrift, Arial";
const VOICE_NAME = process.argv[2] || "青山龍星";
const VOICE_STYLE = process.argv[3] || "ノーマル";

// 決まった並びの乱数(何度作っても同じ街になるように)
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

// ---------- 絵 ----------
function city() {
  const CW = 1400;
  const CH = 2400;
  let g = "";
  // 空の光
  g += `<rect width="${CW}" height="${CH}" fill="url(#sky)"/>`;
  // 地面の格子(遠近)
  const hz = 1250;
  for (let i = -14; i <= 14; i++) g += `<line x1="${CW / 2 + i * 22}" y1="${hz}" x2="${CW / 2 + i * 260}" y2="${CH}" stroke="#123a55" stroke-width="2"/>`;
  for (let k = 0; k < 18; k++) {
    const y = hz + Math.pow(k / 18, 2) * (CH - hz);
    g += `<line x1="0" y1="${y}" x2="${CW}" y2="${y}" stroke="#123a55" stroke-width="2"/>`;
  }
  // ビル(奥ほど小さく)
  for (let row = 0; row < 3; row++) {
    const base = hz + 60 + row * 260;
    const scale = 0.55 + row * 0.35;
    for (let x = -40; x < CW; ) {
      const w = (50 + rnd() * 90) * scale;
      const h = (180 + rnd() * 520) * scale;
      g += `<rect x="${x}" y="${base - h}" width="${w}" height="${h}" fill="#05080d" stroke="#0e2233" stroke-width="2"/>`;
      for (let wy = base - h + 14 * scale; wy < base - 10; wy += 22 * scale) {
        for (let wx = x + 8 * scale; wx < x + w - 10; wx += 18 * scale) {
          if (rnd() < 0.33) g += `<rect x="${wx}" y="${wy}" width="${7 * scale}" height="${9 * scale}" fill="${rnd() < 0.85 ? "#f2c46a" : "#7fe3ff"}" opacity="${0.5 + rnd() * 0.5}"/>`;
        }
      }
      x += w + 6 + rnd() * 20;
    }
  }
  // 光の筋(道路を走る光)
  const trails = [
    [0, 1700, CW, 1450, GOLD],
    [0, 1900, CW, 2050, CYAN],
    [200, CH, 900, 1300, "#ffe08a"],
    [CW, 1650, 300, 2400, "#4aa8ff"],
  ];
  trails.forEach(([x1, y1, x2, y2, c]) => {
    g += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="9" opacity="0.85" filter="url(#glow)"/>`;
  });
  return `<svg width="${CW}" height="${CH}" xmlns="http://www.w3.org/2000/svg"><defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000"/><stop offset="0.45" stop-color="#03070c"/><stop offset="0.62" stop-color="#0a1a2a"/><stop offset="1" stop-color="#02050a"/></linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>${g}</svg>`;
}

/** ローポリの狼の頭(三角形を色の濃さを変えて並べる) */
function wolf(color = RED) {
  const P = {
    a: [300, 470], b: [220, 360], c: [380, 360], d: [150, 250], e: [450, 250], f: [300, 290],
    g: [110, 60], h: [210, 190], i: [490, 60], j: [390, 190], k: [300, 170], l: [80, 210], m: [520, 210],
  };
  const tri = [
    ["g", "h", "d", 0.7], ["g", "l", "d", 0.45], ["i", "j", "e", 0.7], ["i", "m", "e", 0.45],
    ["h", "k", "f", 0.85], ["j", "k", "f", 0.75], ["h", "d", "f", 0.6], ["j", "e", "f", 0.55],
    ["d", "b", "f", 0.8], ["e", "c", "f", 0.7], ["b", "a", "f", 0.95], ["c", "a", "f", 0.85],
    ["l", "d", "b", 0.4], ["m", "e", "c", 0.35],
  ];
  const shade = (k) => {
    const r = parseInt(color.slice(1, 3), 16);
    const gg = parseInt(color.slice(3, 5), 16);
    const bb = parseInt(color.slice(5, 7), 16);
    return `rgb(${Math.round(r * k)},${Math.round(gg * k)},${Math.round(bb * k)})`;
  };
  const polys = tri.map(([p, q, r, k]) => `<polygon points="${P[p]} ${P[q]} ${P[r]}" fill="${shade(k)}" stroke="${shade(Math.min(1, k + 0.2))}" stroke-width="2"/>`).join("");
  const eyes = `<polygon points="185,262 255,276 200,292" fill="#fff"/><polygon points="415,262 345,276 400,292" fill="#fff"/>`;
  return `<svg width="600" height="560" xmlns="http://www.w3.org/2000/svg"><defs>
    <filter id="g" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="18" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <filter id="e"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs><g filter="url(#g)">${polys}</g><g filter="url(#e)">${eyes}</g></svg>`;
}

/** 上の英字の表示と、大きな見出し(accent の部分だけ赤) */
function headline(hud1, hud2, parts, size = 96) {
  // 線で縁どって、太い字に見せる(参考の見出しのように)
  const spans = parts.map(([t, accent]) => `<tspan fill="${accent ? RED : "#fff"}" stroke="${accent ? RED : "#fff"}" stroke-width="4" stroke-linejoin="round">${t}</tspan>`).join("");
  return `<svg width="${W}" height="420" xmlns="http://www.w3.org/2000/svg"><defs>
    <filter id="s"><feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000" flood-opacity="0.9"/></filter></defs>
    <text x="70" y="70" font-family="${EN}" font-weight="700" font-size="30" letter-spacing="6" fill="${CYAN}">${hud1}</text>
    <rect x="70" y="112" width="8" height="38" fill="${RED}"/>
    <text x="96" y="143" font-family="${EN}" font-weight="700" font-size="34" letter-spacing="5" fill="${RED}">${hud2}</text>
    <text x="70" y="${190 + size}" font-family="${JP}" font-weight="900" font-size="${size}" filter="url(#s)">${spans}</text>
  </svg>`;
}

function card(word, purple = false) {
  return `<svg width="230" height="320" xmlns="http://www.w3.org/2000/svg"><defs><filter id="g"><feGaussianBlur stdDeviation="8" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <rect x="10" y="10" width="210" height="300" rx="24" fill="${purple ? "#3a1060" : "#06202e"}" stroke="${purple ? "#c084ff" : CYAN}" stroke-width="6" filter="url(#g)"/>
    <text x="115" y="185" text-anchor="middle" font-family="${JP}" font-weight="900" font-size="54" fill="#fff">${word}</text></svg>`;
}

function cards(words, purpleIndex = -1) {
  const n = words.length;
  const cw = 230;
  const gap = 20;
  const total = n * cw + (n - 1) * gap;
  const inner = words
    .map((w, i) => `<g transform="translate(${i * (cw + gap)},0)">${card(w, i === purpleIndex).replace(/^<svg[^>]*>|<\/svg>$/g, "")}</g>`)
    .join("");
  return `<svg width="${total}" height="320" xmlns="http://www.w3.org/2000/svg"><defs><filter id="g"><feGaussianBlur stdDeviation="8" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>${inner}</svg>`;
}

function bubbles() {
  const b = (x, y, t, c) => `<rect x="${x}" y="${y}" width="330" height="110" rx="54" fill="${c}" fill-opacity="0.92" stroke="${CYAN}" stroke-width="3"/><text x="${x + 165}" y="${y + 73}" text-anchor="middle" font-family="${JP}" font-weight="900" font-size="50" fill="#fff">${t}</text>`;
  return `<svg width="900" height="520" xmlns="http://www.w3.org/2000/svg">${b(20, 20, "赤いよね", "#0a2233")}${b(540, 120, "甘い!", "#0a2233")}${b(60, 260, "…丸い?", "#3a1060")}${b(500, 380, "怪しい", "#3a0a12")}</svg>`;
}

function crosshair() {
  return `<svg width="320" height="320" xmlns="http://www.w3.org/2000/svg"><g stroke="${RED}" stroke-width="7" fill="none">
    <circle cx="160" cy="160" r="110"/><circle cx="160" cy="160" r="12" fill="${RED}"/>
    <path d="M160 10V80M160 240V310M10 160H80M240 160H310"/></g>
    <text x="160" y="-10" text-anchor="middle" font-family="${EN}" font-size="28" fill="${RED}">LOCK</text></svg>`;
}

function hudLabel(t, color = RED) {
  return `<svg width="${W}" height="80" xmlns="http://www.w3.org/2000/svg"><text x="${W / 2}" y="55" text-anchor="middle" font-family="${EN}" font-weight="700" font-size="40" letter-spacing="10" fill="${color}">${t}</text></svg>`;
}

// ---------- 台本 ----------
// layers: 場面の絵(順に重ねる)。kind で動きを決める
const SCENES = [
  { say: "嘘をつくのは、一人。", head: ["TSUDORO // PLAY", "WORD WOLF", [["嘘をつくのは、"], ["1人", true], ["。"]]], wolf: "big" },
  { say: "みんなに、同じお題。", head: ["TSUDORO // PLAY", "ROUND 01", [["みんなに、"], ["同じ", false], ["お題。"]]], cards: [["りんご", "りんご", "りんご"], -1] },
  { say: "一人だけ、違うお題。", head: ["TSUDORO // PLAY", "ROUND 01", [["1人だけ、"], ["違う", true], ["お題。"]]], cards: [["りんご", "りんご", "りんご", "みかん"], 3], glitch: true },
  { say: "話して、見抜け。", head: ["TSUDORO // PLAY", "TALK PHASE", [["話して、"], ["見抜け", true], ["。"]]], bubbles: true },
  { say: "ウルフは、誰だ。", head: ["TSUDORO // PLAY", "TARGET TRACKING", [["ウルフは、"], ["誰だ", true], ["。"]]], cards: [["りんご", "りんご", "りんご", "みかん"], 3], lock: true },
  { say: "頭のいい人ほど、ハマる。", head: ["TSUDORO // PLAY", "WARNING", [["頭のいい人ほど、"], ["ハマる", true], ["。"]], 88], wolf: "eyes", glitch: true },
  { say: "ワードウルフは、ツドロのプレイで。", end: true },
];

// ---------- 声 ----------
async function speaker() {
  const list = await (await fetch(`${ENGINE}/speakers`)).json();
  const s = list.find((x) => x.name === VOICE_NAME);
  if (!s) throw new Error(`声が見つかりません: ${VOICE_NAME}`);
  const st = s.styles.find((x) => x.name === VOICE_STYLE) ?? s.styles[0];
  return { id: st.id, name: s.name };
}
async function synth(text, id, file) {
  const q = await (await fetch(`${ENGINE}/audio_query?text=${encodeURIComponent(text)}&speaker=${id}`, { method: "POST" })).json();
  q.speedScale = 1.05;
  q.pitchScale = -0.03; // 少し低く(予告編の声)
  q.intonationScale = 1.25;
  q.postPhonemeLength = 0.12;
  const r = await fetch(`${ENGINE}/synthesis?speaker=${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(q) });
  fs.writeFileSync(file, Buffer.from(await r.arrayBuffer()));
}
const duration = (f) => Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).toString().trim());

// ---------- 場面 ----------
function scene(sc, i, work) {
  const out = `s_${i}.mp4`;
  const d = sc.d;
  const inputs = ["-loop", "1", "-t", String(d), "-i", "city.png"];
  const f = [];
  // 街: ゆっくり寄りながら、少し下へ
  f.push(`[0:v]scale=w='1400*(1.0+0.06*t/${d})':h=-2:eval=frame,crop=${W}:${H}:x='(iw-${W})/2':y='(ih-${H})/2+40*t/${d}',setsar=1[bg]`);
  let last = "[bg]";
  let n = 1;
  const add = (file) => {
    inputs.push("-loop", "1", "-t", String(d), "-i", file);
    return n++;
  };
  if (sc.end) {
    const ic = add("icon.png");
    const t1 = add("end_title.png");
    f.push(`[${ic}:v]scale=300:300,format=rgba,fade=t=in:st=0:d=0.3:alpha=1[ic]`);
    f.push(`${last}eq=brightness=-0.25[dim]`, `[dim][ic]overlay=x=(W-w)/2:y=420[a]`);
    f.push(`[${t1}:v]format=rgba,fade=t=in:st=0.2:d=0.3:alpha=1[tt]`, `[a][tt]overlay=0:760[b]`);
    last = "[b]";
  } else {
    if (sc.wolf) {
      const wi = add("wolf.png");
      const big = sc.wolf === "big";
      const s = big ? 760 : 900;
      f.push(`[${wi}:v]scale=${s}:-1,format=rgba,fade=t=in:st=0:d=0.35:alpha=1[w]`);
      f.push(`${last}[w]overlay=x=(W-w)/2:y='${big ? 760 : 620}-12*sin(t*3)+80*max(0\\,1-t/0.4)'[wl]`);
      last = "[wl]";
    }
    if (sc.cards) {
      const ci = add(`cards_${i}.png`);
      f.push(`[${ci}:v]format=rgba,fade=t=in:st=0:d=0.2:alpha=1[cd]`);
      f.push(`${last}[cd]overlay=x=(W-w)/2:y='800+60*max(0\\,1-t/0.25)'[cl]`);
      last = "[cl]";
    }
    if (sc.bubbles) {
      const bi = add("bubbles.png");
      f.push(`[${bi}:v]format=rgba,fade=t=in:st=0:d=0.25:alpha=1[bb]`);
      f.push(`${last}[bb]overlay=x=(W-w)/2:y='760+60*max(0\\,1-t/0.3)'[bl]`);
      // 走査線(上から下へ流れる)
      f.push(`[bl]drawbox=x=0:y='mod(t*900\\,${H})':w=${W}:h=6:color=0x37e0ff@0.55:t=fill[sl]`);
      last = "[sl]";
    }
    if (sc.lock) {
      const li = add("crosshair.png");
      const tl = add("locked.png");
      // 4枚目のカード(みかん)の上に、照準が寄っていく
      f.push(`[${li}:v]format=rgba[ch]`);
      f.push(`${last}[ch]overlay=x='915-160+(1-min(1\\,t/0.6))*(-480)':y=800[lk]`);
      f.push(`[${tl}:v]format=rgba,fade=t=in:st=0.6:d=0.1:alpha=1[tl2]`, `[lk][tl2]overlay=0:1180[lk2]`);
      last = "[lk2]";
    }
    const hi = add(`head_${i}.png`);
    f.push(`[${hi}:v]format=rgba,fade=t=in:st=0.05:d=0.15:alpha=1[hd]`);
    f.push(`${last}[hd]overlay=x='-30*max(0\\,1-(t-0.05)/0.2)':y=210[h]`);
    last = "[h]";
  }
  // 頭の0.15秒は、色ずれのノイズ(グリッチ)。glitch の場面は真ん中でももう一度
  const g2 = sc.glitch ? `+between(t\\,${(d * 0.5).toFixed(2)}\\,${(d * 0.5 + 0.12).toFixed(2)})` : "";
  f.push(`${last}rgbashift=rh=14:bh=-14:enable='lt(t\\,0.15)${g2}'[gl]`);
  f.push(`[gl]vignette=PI/4.5,format=yuv420p[v]`);
  execFileSync("ffmpeg", ["-y", ...inputs, "-filter_complex", f.join(";"), "-map", "[v]", "-t", String(d), "-r", String(FPS), "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p", out], {
    cwd: work,
    stdio: ["ignore", "ignore", "pipe"],
  });
  return out;
}

function audioFx(work, total) {
  const run = (args) => execFileSync("ffmpeg", ["-y", ...args], { cwd: work, stdio: "ignore" });
  // 低いうなり(ドローン)と、鼓動のような低音のパルス
  run(["-f", "lavfi", "-i", `aevalsrc='0.22*sin(2*PI*55*t)*(0.55+0.45*sin(2*PI*0.25*t))+0.18*sin(2*PI*82.4*t)':s=44100:d=${total.toFixed(2)}`, "-af", "lowpass=f=400,volume=0.9", "drone.wav"]);
  run(["-f", "lavfi", "-i", `aevalsrc='0.9*sin(2*PI*48*t)*exp(-6*t)':s=44100:d=0.7`, "-af", "volume=1.2", "boom.wav"]);
  run(["-f", "lavfi", "-i", "anoisesrc=d=0.25:c=white:a=0.5", "-af", "highpass=f=2000,afade=t=out:st=0.05:d=0.2,volume=0.35", "glitch.wav"]);
}

function join(scenes, files, work, total) {
  const args = ["-y"];
  files.forEach((x) => args.push("-i", x));
  const a0 = files.length;
  scenes.forEach((_, k) => args.push("-i", `v_${k}.wav`));
  args.push("-i", "drone.wav", "-i", "boom.wav", "-i", "glitch.wav");
  const di = a0 + scenes.length;
  const f = [];
  let last = "[0:v]";
  let off = 0;
  const starts = [0];
  for (let k = 1; k < files.length; k++) {
    off += scenes[k - 1].d - XF;
    starts.push(off);
    f.push(`${last}[${k}:v]xfade=transition=fade:duration=${XF}:offset=${off.toFixed(3)}[x${k}]`);
    last = `[x${k}]`;
  }
  f.push(`${last}format=yuv420p[v]`);
  const mix = ["[dr]"];
  f.push(`[${di}:a]volume=0.55[dr]`);
  scenes.forEach((_, k) => {
    const ms = Math.round((starts[k] + 0.18) * 1000);
    f.push(`[${a0 + k}:a]adelay=${ms}|${ms},volume=1.8[n${k}]`);
    mix.push(`[n${k}]`);
  });
  f.push(`[${di + 1}:a]asplit=${starts.length}${starts.map((_, k) => `[b${k}]`).join("")}`);
  starts.forEach((s, k) => {
    const ms = Math.round(s * 1000);
    f.push(`[b${k}]adelay=${ms}|${ms}[bd${k}]`);
    mix.push(`[bd${k}]`);
  });
  f.push(`[${di + 2}:a]asplit=${starts.length}${starts.map((_, k) => `[g${k}]`).join("")}`);
  starts.forEach((s, k) => {
    const ms = Math.round(s * 1000);
    f.push(`[g${k}]adelay=${ms}|${ms}[gd${k}]`);
    mix.push(`[gd${k}]`);
  });
  f.push(`${mix.join("")}amix=inputs=${mix.length}:normalize=0,apad,atrim=0:${total.toFixed(3)},loudnorm=I=-14:TP=-1.5:LRA=11,aformat=sample_rates=44100:channel_layouts=stereo[a]`);
  args.push("-filter_complex", f.join(";"), "-map", "[v]", "-map", "[a]", "-c:v", "libx264", "-crf", "19", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", path.join(OUT, "v6_wordwolf.mp4"));
  execFileSync("ffmpeg", args, { cwd: work, stdio: ["ignore", "ignore", "pipe"] });
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const work = fs.mkdtempSync(path.join(os.tmpdir(), "tsudoro-reel6-"));
  const png = (svg, name) => sharp(Buffer.from(svg)).png().toFile(path.join(work, name));
  fs.copyFileSync(ICON, path.join(work, "icon.png"));
  await png(city(), "city.png");
  await png(wolf(), "wolf.png");
  await png(bubbles(), "bubbles.png");
  await png(crosshair(), "crosshair.png");
  await png(hudLabel("TARGET LOCKED"), "locked.png");
  const v = await speaker();
  const credit = `VOICEVOX:${v.name}`;
  await png(
    `<svg width="${W}" height="760" xmlns="http://www.w3.org/2000/svg">
      <text x="${W / 2}" y="140" text-anchor="middle" font-family="${EN}" font-weight="700" font-size="150" fill="${GOLD}">Tsudoro</text>
      <text x="${W / 2}" y="260" text-anchor="middle" font-family="${EN}" font-weight="700" font-size="60" letter-spacing="14" fill="${CYAN}">PLAY // WORD WOLF</text>
      <rect x="${W / 2 - 330}" y="330" width="660" height="120" rx="20" fill="${GOLD}"/>
      <text x="${W / 2}" y="412" text-anchor="middle" font-family="${JP}" font-weight="900" font-size="66" fill="#000">プロフのリンクから</text>
      <text x="${W / 2}" y="560" text-anchor="middle" font-family="${JP}" font-weight="700" font-size="52" fill="#fff">次の2次会で、試してみて</text>
      <text x="${W / 2}" y="680" text-anchor="middle" font-family="${JP}" font-size="32" fill="#8a8478">${credit}</text>
    </svg>`,
    "end_title.png",
  );
  for (let i = 0; i < SCENES.length; i++) {
    const sc = SCENES[i];
    if (sc.head) await png(headline(sc.head[0], sc.head[1], sc.head[2], sc.head[3]), `head_${i}.png`);
    if (sc.cards) await png(cards(sc.cards[0], sc.cards[1]), `cards_${i}.png`);
    const file = path.join(work, `v_${i}.wav`);
    await synth(sc.say, v.id, file);
    sc.d = Math.max(1.3, duration(file) + 0.45) + (sc.end ? 1.0 : 0);
  }
  const total = SCENES.reduce((a, s) => a + s.d, 0) - XF * (SCENES.length - 1);
  audioFx(work, total);
  try {
    const files = SCENES.map((sc, i) => scene(sc, i, work));
    join(SCENES, files, work, total);
    console.log("ok v6_wordwolf", `${total.toFixed(1)}s`, credit);
  } catch (e) {
    console.error(String(e.stderr ?? e.message).slice(-900));
    process.exit(1);
  }
}

main();
