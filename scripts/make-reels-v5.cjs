/* eslint-disable @typescript-eslint/no-require-imports */
// Tsudoro のリール v5「小学生でも分かる〇〇」型(縦 1080x1920・声つき)。
// 参考: 人の話す映像の前に、光るネオン枠の解説パネルを置き、下に字幕を出す形。
// ここでは背景を写真(ぼかし・暗く)にし、真ん中のパネルを場面ごとに切り替える。パネルは2段階で出す(土台 → 追加の要素)。
// 実行: VOICEVOX のエンジン(http://127.0.0.1:50021)を起動してから  node scripts/make-reels-v5.cjs [声の名前] [スタイル]
// 出力: marketing/reels/v5_*.mp4

const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const sharp = require("sharp");

const ROOT = path.join(__dirname, "..");
const ASSETS = path.join(ROOT, "marketing", "assets");
const OUT = path.join(ROOT, "marketing", "reels");
const ICON = path.join(ROOT, "public", "icon-512.png");
const FONT = "C:/Windows/Fonts/YuGothB.ttc";
const ENGINE = "http://127.0.0.1:50021";
const W = 1080;
const H = 1920;
const FPS = 30;
const XF = 0.15;
const GOLD = "#f5b83d";
const CYAN = "#38d3ff";
const VOICE_NAME = process.argv[2] || "玄野武宏";
const VOICE_STYLE = process.argv[3] || "ノーマル";
const JP = "Yu Gothic UI, Yu Gothic, Meiryo";

// ---------- パネルの絵(SVG) ----------
const PW = 940;
const PH = 760;

function glowDefs() {
  return `<defs>
    <filter id="glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="9" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="#1d3a55" stroke-width="1"/></pattern>
  </defs>`;
}

function frame(inner) {
  const c = 46;
  const corner = (x, y, dx, dy) => `<path d="M${x} ${y + dy * c}V${y}H${x + dx * c}" fill="none" stroke="${CYAN}" stroke-width="6" stroke-linecap="round"/>`;
  return `<svg width="${PW}" height="${PH}" xmlns="http://www.w3.org/2000/svg">${glowDefs()}
    <rect x="8" y="8" width="${PW - 16}" height="${PH - 16}" rx="26" fill="#0a1626" fill-opacity="0.92"/>
    <rect x="8" y="8" width="${PW - 16}" height="${PH - 16}" rx="26" fill="url(#grid)" opacity="0.6"/>
    ${corner(14, 14, 1, 1)}${corner(PW - 14, 14, -1, 1)}${corner(14, PH - 14, 1, -1)}${corner(PW - 14, PH - 14, -1, -1)}
    ${inner}</svg>`;
}

function neonBox(x, y, w, h, label, color, size = 92) {
  return `<g filter="url(#glow)"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="22" fill="#0b1a2c" stroke="${color}" stroke-width="7"/></g>
    <text x="${x + w / 2}" y="${y + h / 2 + size * 0.36}" text-anchor="middle" font-family="${JP}" font-weight="700" font-size="${size}" fill="#fff">${label}</text>`;
}

function text(x, y, t, size = 50, color = "#fff", anchor = "middle") {
  return `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="${JP}" font-weight="700" font-size="${size}" fill="${color}">${t}</text>`;
}

/** 文の中の「」の部分だけ色を変える(参考の「注文」のように) */
function rich(x, y, parts, size = 52) {
  const spans = parts.map(([t, c]) => `<tspan fill="${c ?? "#fff"}">${t}</tspan>`).join("");
  return `<text x="${x}" y="${y}" text-anchor="middle" font-family="${JP}" font-weight="700" font-size="${size}">${spans}</text>`;
}

function arrow(x1, y, x2, color = "#cfd8e3") {
  return `<path d="M${x1} ${y}H${x2 - 24}" stroke="${color}" stroke-width="7" stroke-dasharray="18 14" stroke-linecap="round"/>
    <path d="M${x2 - 30} ${y - 20}L${x2} ${y}L${x2 - 30} ${y + 20}" fill="none" stroke="${color}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`;
}

function bubble(x, y, t, color = "#2d3b4e") {
  return `<rect x="${x}" y="${y}" width="270" height="100" rx="46" fill="${color}"/>${text(x + 135, y + 66, t, 46)}`;
}

function marks(x, y, list) {
  return list
    .map((m, j) => {
      const cx = x + j * 84;
      if (m === "o") return `<circle cx="${cx}" cy="${y}" r="27" fill="none" stroke="${GOLD}" stroke-width="9"/>`;
      if (m === "t") return `<polygon points="${cx},${y - 26} ${cx + 28},${y + 24} ${cx - 28},${y + 24}" fill="none" stroke="#e3c46e" stroke-width="9" stroke-linejoin="round"/>`;
      return `<path d="M${cx - 22},${y - 22} L${cx + 22},${y + 22} M${cx + 22},${y - 22} L${cx - 22},${y + 22}" stroke="#8a8478" stroke-width="9" stroke-linecap="round"/>`;
    })
    .join("");
}

function bars(x, y, list, maxW = 380) {
  return list
    .map(([label, amount, ratio, color], i) => {
      const yy = y + i * 92;
      return `${text(x, yy + 44, label, 40, "#cfd8e3", "start")}<rect x="${x + 150}" y="${yy + 6}" width="${Math.round(maxW * ratio)}" height="52" rx="14" fill="${color}"/>${text(x + 150 + maxW + 150, yy + 46, amount, 44, "#fff", "end")}`;
    })
    .join("");
}

function card(x, y, word, purple = false) {
  return `<rect x="${x}" y="${y}" width="190" height="250" rx="24" fill="${purple ? "#5b3aa8" : "#152a42"}" stroke="${purple ? "#d8c4ff" : CYAN}" stroke-width="6"/>${text(x + 95, y + 145, word, 52)}`;
}

// 場面ごとのパネル: base = 最初に出す絵、more = 途中から足す絵
const PANELS = {
  // ---- LINE と Tsudoro ----
  a1: {
    base: neonBox(60, 150, 330, 190, "LINE", "#36d36a") + text(470, 270, "VS", 64, "#cfd8e3") + neonBox(550, 150, 330, 190, "Tsudoro", GOLD, 80),
    more: rich(470, 470, [["飲み会の"], ["「日程調整」", GOLD], ["で"]]) + text(470, 550, "たとえると…", 52),
  },
  a2: {
    base: neonBox(330, 50, 280, 120, "LINE", "#36d36a", 64) + bubble(60, 220, "空いてる日は?") + bubble(380, 290, "既読 8") + bubble(620, 220, "…"),
    more: bubble(90, 420, "その日バイト", "#3a2a2a") + bubble(470, 480, "まだ?", "#3a2a2a") + text(470, 680, "1人ずつ聞いて、待って、数える", 50, "#ff8a8a"),
  },
  a3: {
    base: neonBox(310, 60, 320, 120, "Tsudoro", GOLD, 64) + `<rect x="70" y="280" width="220" height="90" rx="20" fill="#152a42" stroke="${CYAN}" stroke-width="5"/>` + text(180, 340, "URL", 52) + arrow(310, 325, 480),
    more: marks(530, 260, ["o", "o", "o", "t"]) + marks(530, 360, ["o", "x", "t", "o"]) + marks(530, 460, ["o", "o", "o", "o"]) + text(470, 650, "答えたら自動で集計", 56, GOLD),
  },
  a4: {
    base: text(300, 130, "LINE", 56, "#36d36a") + text(700, 130, "Tsudoro", 56, GOLD) + text(300, 260, "返事を待つ", 46) + text(700, 260, "答えるだけ", 46) + text(300, 370, "手で数える", 46) + text(700, 370, "自動で集計", 46),
    more: text(300, 480, "お店は別に探す", 46) + text(700, 480, "お店も一緒", 46) + `<rect x="520" y="560" width="360" height="110" rx="24" fill="${GOLD}"/>` + text(700, 635, "即決", 64, "#000"),
  },
  // ---- 割り勘と傾斜 ----
  b1: {
    base: neonBox(60, 150, 330, 190, "割り勘", CYAN, 84) + text(470, 270, "VS", 64, "#cfd8e3") + neonBox(550, 150, 330, 190, "傾斜", GOLD, 84),
    more: rich(470, 470, [["飲み会の"], ["「お会計」", GOLD], ["で"]]) + text(470, 550, "たとえると…", 52),
  },
  b2: {
    base: neonBox(330, 50, 280, 110, "割り勘", CYAN, 60),
    more: bars(110, 210, [["先輩", "¥2,860", 0.6, CYAN], ["同期", "¥2,860", 0.6, CYAN], ["同期", "¥2,860", 0.6, CYAN], ["後輩", "¥2,860", 0.6, CYAN], ["後輩", "¥2,860", 0.6, CYAN]]) + text(470, 710, "全員同じ額", 52, CYAN),
  },
  b3: {
    base: neonBox(330, 50, 280, 110, "傾斜", GOLD, 60),
    more: bars(110, 210, [["先輩", "¥4,000", 0.95, "#e07a88"], ["同期", "¥3,100", 0.72, GOLD], ["同期", "¥3,100", 0.72, GOLD], ["後輩", "¥2,200", 0.5, "#7aa6dd"], ["後輩", "¥1,900", 0.42, "#62bd96"]]) + text(470, 710, "多めの人・少なめの人", 52, GOLD),
  },
  b4: {
    base: neonBox(310, 60, 320, 120, "Tsudoro", GOLD, 64) + `<rect x="200" y="250" width="540" height="130" rx="24" fill="#152a42" stroke="${CYAN}" stroke-width="5"/>` + text(470, 340, "合計 ¥14,300", 64),
    more: arrow(470 - 1, 420, 470 + 1) + text(470, 560, "どっちも一瞬で計算", 58, GOLD) + text(470, 650, "端数もきれいに", 46, "#cfd8e3"),
  },
  // ---- ワードウルフ ----
  c1: {
    base: neonBox(180, 120, 580, 190, "ワードウルフ", "#b078ff", 92),
    more: rich(470, 440, [["ルールを"], ["「30秒」", GOLD], ["で"]]) + text(470, 520, "説明すると…", 52),
  },
  c2: {
    base: card(60, 120, "りんご") + card(270, 120, "りんご") + card(480, 120, "りんご"),
    more: card(690, 120, "みかん", true) + text(470, 500, "1人だけ違うお題", 60, "#d8c4ff") + text(470, 590, "自分のお題しか見えない", 44, "#cfd8e3"),
  },
  c3: {
    base: bubble(60, 110, "赤いよね") + bubble(335, 210, "甘い!") + bubble(610, 110, "…丸い?", "#3b2d5a"),
    more: text(470, 520, "話して、ウルフを探す", 56, GOLD) + text(470, 610, "最後に投票、当てたら勝ち", 44, "#cfd8e3"),
  },
  c4: {
    base: neonBox(310, 60, 320, 120, "Tsudoro", GOLD, 64) + text(470, 300, "Play", 90, "#fff"),
    more: text(470, 450, "名前を入れて", 56) + text(470, 540, "スマホで配るだけ", 60, GOLD),
  },
};

// 場面: panel = PANELS のキー、bg = 背景の写真、say = 読み上げ(読みはカタカナ)、cap = 字幕(なければ say)
const REELS = {
  explain_line: {
    title: ["小学生でも分かる", "LINEとTsudoroの違い"],
    scenes: [
      { panel: "a1", bg: "6669813", say: "小学生でも分かる、ラインとツドロの違い。飲み会の日程調整でたとえると、", cap: "飲み会の日程調整でたとえると…" },
      { panel: "a2", bg: "9898393", say: "ラインは、一人ずつ聞いて、返事を待って、自分で数える。" },
      { panel: "a3", bg: "6669784", say: "ツドロは、URLを一本送るだけ。みんなが丸三角バツで答えて、自動で集計。", cap: "URLを1本送るだけ。答えたら自動で集計" },
      { panel: "a4", bg: "6605275", say: "しかも、お店まで一緒に決まる。", cap: "しかも、お店まで一緒に決まる" },
      { end: "登録なし・無料", ask: "あなたの幹事あるあるは?", say: "プロフのリンクから。" },
    ],
  },
  explain_split: {
    title: ["小学生でも分かる", "割り勘と傾斜の違い"],
    scenes: [
      { panel: "b1", bg: "7680736", say: "小学生でも分かる、割り勘と傾斜の違い。飲み会のお会計でたとえると、", cap: "飲み会のお会計でたとえると…" },
      { panel: "b2", bg: "9961849", say: "割り勘は、全員同じ額。" },
      { panel: "b3", bg: "9961852", say: "傾斜は、先輩は多め、後輩は少なめ。" },
      { panel: "b4", bg: "5900233", say: "ツドロなら、合計を入れるだけで、どっちも一瞬。", cap: "Tsudoroなら、合計を入れるだけ" },
      { end: "傾斜で割る", ask: "あなたのサークルは割り勘派?傾斜派?", say: "プロフのリンクから。" },
    ],
  },
  explain_wolf: {
    title: ["小学生でも分かる", "ワードウルフのルール"],
    scenes: [
      { panel: "c1", bg: "6173675", say: "小学生でも分かる、ワードウルフのルール。三十秒で説明すると、", cap: "ルールを30秒で説明すると…" },
      { panel: "c2", bg: "9961851", say: "みんなに同じお題、一人だけ違うお題。自分のお題しか見えない。" },
      { panel: "c3", bg: "8153998", say: "お題について話して、ウルフを探す。最後に投票、当てたら勝ち。" },
      { panel: "c4", bg: "3851302", say: "ツドロのプレイなら、名前を入れて、スマホで配るだけ。", cap: "Tsudoro の Play なら、スマホで配るだけ" },
      { end: "Play", ask: "次の2次会でやってみて", say: "プロフのリンクから。" },
    ],
  },
};

// ---------- 声 ----------
async function speaker() {
  const list = await (await fetch(`${ENGINE}/speakers`)).json();
  const s = list.find((x) => x.name === VOICE_NAME);
  if (!s) throw new Error(`声が見つかりません: ${VOICE_NAME}`);
  const st = s.styles.find((x) => x.name === VOICE_STYLE) ?? s.styles[0];
  return { id: st.id, name: s.name };
}

async function synth(text, id, file) {
  const query = await (await fetch(`${ENGINE}/audio_query?text=${encodeURIComponent(text)}&speaker=${id}`, { method: "POST" })).json();
  query.speedScale = 1.25;
  query.intonationScale = 1.2;
  query.prePhonemeLength = 0.04;
  query.postPhonemeLength = 0.06;
  const res = await fetch(`${ENGINE}/synthesis?speaker=${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(query) });
  fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
}

const duration = (f) => Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).toString().trim());

// ---------- 絵 ----------
async function png(svg, file) {
  await sharp(Buffer.from(svg)).png().toFile(file);
}

async function titlePng(lines, file) {
  const svg = `<svg width="${W}" height="330" xmlns="http://www.w3.org/2000/svg">
    ${text(W / 2, 120, lines[0], 64, "#fff")}
    <rect x="70" y="160" width="${W - 140}" height="130" rx="20" fill="#000" fill-opacity="0.55"/>
    ${text(W / 2, 252, lines[1], 78, GOLD)}
  </svg>`;
  await png(svg, file);
}

function wrap(t, max = 16) {
  const out = [];
  let line = "";
  const chars = [...t];
  chars.forEach((ch, i) => {
    line += ch;
    const nextIsMark = "、。?!…".includes(chars[i + 1] ?? "");
    if (!nextIsMark && (line.length >= max || (line.length >= max - 6 && "、。?!".includes(ch)))) {
      out.push(line);
      line = "";
    }
  });
  if (line) out.push(line);
  return out.slice(0, 2);
}

const fade = (s, e) => `if(lt(t,${s}),0,if(lt(t,${s + 0.2}),(t-${s})/0.2,if(lt(t,${e - 0.1}),1,max(0,(${e}-t)/0.1))))`;

function scene(sc, i, name, work, credit) {
  const out = `s_${name}_${i}.mp4`;
  const d = sc.d;
  const f = [];
  const inputs = [];
  let n = 0;
  const tf = (t) => {
    const p = `t_${name}_${i}_${n++}.txt`;
    fs.writeFileSync(path.join(work, p), t, "utf8");
    return p;
  };
  let last;
  if (sc.end) {
    inputs.push("-f", "lavfi", "-i", `color=c=0x0b0a08:s=${W}x${H}:r=${FPS}:d=${d}`, "-loop", "1", "-t", String(d), "-i", "icon.png");
    f.push(`[1:v]scale=320:320,format=rgba,fade=t=in:st=0:d=0.3:alpha=1[ic]`, `[0:v][ic]overlay=x=(W-w)/2:y=380-60*max(0\\,1-t/0.35)[a]`);
    last = "[a]";
    [
      { t: "Tsudoro", z: 160, c: "0xf5b83d", y: 760, s: 0.1 },
      { t: sc.end, z: 88, c: "0xf5f1e8", y: 990, s: 0.2 },
      { t: "プロフのリンクから", z: 80, c: "0x000000", y: 1170, s: 0.3, box: true },
      { t: sc.ask, z: 54, c: "0xf5f1e8", y: 1340, s: 0.5 },
      { t: credit, z: 34, c: "0x8a8478", y: 1440, s: 0 },
    ].forEach((l, k) => {
      const box = l.box ? `:box=1:boxcolor=0xf5b83d:boxborderw=26` : "";
      f.push(`${last}drawtext=fontfile=font.ttc:textfile=${tf(l.t)}:fontsize=${l.z}:fontcolor=${l.c}${box}:x=(w-text_w)/2:y='${l.y}+40*max(0\\,1-(t-${l.s})/0.25)':alpha='${fade(l.s, d + 1)}'[e${k}]`);
      last = `[e${k}]`;
    });
  } else {
    inputs.push("-loop", "1", "-t", String(d), "-i", `p_${sc.bg}.jpg`);
    inputs.push("-loop", "1", "-t", String(d), "-i", `title_${name}.png`);
    inputs.push("-loop", "1", "-t", String(d), "-i", `panel_${sc.panel}_base.png`);
    inputs.push("-loop", "1", "-t", String(d), "-i", `panel_${sc.panel}_more.png`);
    // 背景: 縦いっぱい、少しずつ寄る。ぼかして暗く(パネルを読みやすく)
    f.push(`[0:v]scale=-2:${Math.round(H * 1.12)},crop=${W}:${H}:x='(iw-${W})/2+40*(t/${d}-0.5)':y='(ih-${H})/2',boxblur=6:1,eq=brightness=-0.22:saturation=0.85,setsar=1[bg]`);
    f.push(`[bg][1:v]overlay=0:150[t1]`);
    // パネル: 頭で下から跳ねて出る。途中で要素が足される
    const showMore = Math.min(d * 0.45, 1.3);
    f.push(`[2:v]format=rgba,fade=t=in:st=0:d=0.18:alpha=1[pb]`);
    f.push(`[t1][pb]overlay=x=(W-w)/2:y='560+90*max(0\\,1-t/0.22)'[p1]`);
    f.push(`[3:v]format=rgba,fade=t=in:st=${showMore.toFixed(2)}:d=0.22:alpha=1[pm]`);
    f.push(`[p1][pm]overlay=x=(W-w)/2:y='560+30*max(0\\,1-(t-${showMore.toFixed(2)})/0.22)'[p2]`);
    last = "[p2]";
    // 字幕(パネルの下。インスタの下のボタンに隠れない高さ)
    wrap(sc.cap ?? sc.say).forEach((l, k) => {
      f.push(`${last}drawtext=fontfile=font.ttc:textfile=${tf(l)}:fontsize=58:fontcolor=white:borderw=8:bordercolor=black:x=(w-text_w)/2:y=${1345 + k * 82}[u${k}]`);
      last = `[u${k}]`;
    });
  }
  f.push(`${last}format=yuv420p[v]`);
  execFileSync("ffmpeg", ["-y", ...inputs, "-filter_complex", f.join(";"), "-map", "[v]", "-t", String(d), "-r", String(FPS), "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p", out], {
    cwd: work,
    stdio: ["ignore", "ignore", "pipe"],
  });
  return out;
}

function sfx(work) {
  execFileSync("ffmpeg", ["-y", "-f", "lavfi", "-i", "anoisesrc=d=0.3:c=pink:a=0.6", "-af", "highpass=f=600,lowpass=f=6000,afade=t=in:d=0.1,afade=t=out:st=0.12:d=0.18,volume=0.45", "whoosh.wav"], { cwd: work, stdio: "ignore" });
  execFileSync("ffmpeg", ["-y", "-f", "lavfi", "-i", "sine=f=1046:d=0.09", "-af", "afade=t=out:st=0.02:d=0.07,volume=0.3", "pop.wav"], { cwd: work, stdio: "ignore" });
}

function join(name, scenes, files, work) {
  const total = scenes.reduce((a, s) => a + s.d, 0) - XF * (files.length - 1);
  const args = ["-y"];
  files.forEach((x) => args.push("-i", x));
  const a0 = files.length;
  scenes.forEach((_, k) => args.push("-i", `v_${name}_${k}.wav`));
  args.push("-i", "whoosh.wav", "-i", "pop.wav");
  const wi = a0 + scenes.length;
  const f = [];
  let last = "[0:v]";
  let off = 0;
  const starts = [0];
  for (let k = 1; k < files.length; k++) {
    off += scenes[k - 1].d - XF;
    starts.push(off);
    f.push(`${last}[${k}:v]xfade=transition=${k % 2 ? "slideleft" : "slideup"}:duration=${XF}:offset=${off.toFixed(3)}[x${k}]`);
    last = `[x${k}]`;
  }
  f.push(`${last}drawbox=x=0:y=0:w='${W}*t/${total.toFixed(3)}':h=12:color=0xf5b83d:t=fill,format=yuv420p[v]`);
  const mix = [];
  scenes.forEach((_, k) => {
    const ms = Math.round((starts[k] + 0.1) * 1000);
    f.push(`[${a0 + k}:a]adelay=${ms}|${ms},volume=1.6[n${k}]`);
    mix.push(`[n${k}]`);
  });
  const cuts = starts.slice(1);
  f.push(`[${wi}:a]asplit=${cuts.length}${cuts.map((_, k) => `[w${k}]`).join("")}`);
  cuts.forEach((c, k) => {
    const ms = Math.max(0, Math.round((c - 0.06) * 1000));
    f.push(`[w${k}]adelay=${ms}|${ms}[wd${k}]`);
    mix.push(`[wd${k}]`);
  });
  // ポン: パネルの要素が足される位置
  const pops = scenes.map((s, k) => (s.end ? null : starts[k] + Math.min(s.d * 0.45, 1.3))).filter((x) => x !== null);
  f.push(`[${wi + 1}:a]asplit=${pops.length}${pops.map((_, k) => `[p${k}]`).join("")}`);
  pops.forEach((p, k) => {
    const ms = Math.round(p * 1000);
    f.push(`[p${k}]adelay=${ms}|${ms}[pd${k}]`);
    mix.push(`[pd${k}]`);
  });
  f.push(`${mix.join("")}amix=inputs=${mix.length}:normalize=0,apad,atrim=0:${total.toFixed(3)},loudnorm=I=-14:TP=-1.5:LRA=11,aformat=sample_rates=44100:channel_layouts=stereo[a]`);
  args.push("-filter_complex", f.join(";"), "-map", "[v]", "-map", "[a]", "-c:v", "libx264", "-crf", "19", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", path.join(OUT, `v5_${name}.mp4`));
  execFileSync("ffmpeg", args, { cwd: work, stdio: ["ignore", "ignore", "pipe"] });
  return total;
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const work = fs.mkdtempSync(path.join(os.tmpdir(), "tsudoro-reel5-"));
  fs.copyFileSync(FONT, path.join(work, "font.ttc"));
  fs.copyFileSync(ICON, path.join(work, "icon.png"));
  for (const x of fs.readdirSync(ASSETS).filter((y) => /^p_\d+\.jpg$/.test(y))) fs.copyFileSync(path.join(ASSETS, x), path.join(work, x));
  for (const [k, p] of Object.entries(PANELS)) {
    await png(frame(p.base), path.join(work, `panel_${k}_base.png`));
    await png(`<svg width="${PW}" height="${PH}" xmlns="http://www.w3.org/2000/svg">${glowDefs()}${p.more}</svg>`, path.join(work, `panel_${k}_more.png`));
  }
  sfx(work);
  const v = await speaker();
  const credit = `VOICEVOX:${v.name}`;
  for (const [name, reel] of Object.entries(REELS)) {
    try {
      await titlePng(reel.title, path.join(work, `title_${name}.png`));
      for (let k = 0; k < reel.scenes.length; k++) {
        const file = path.join(work, `v_${name}_${k}.wav`);
        await synth(reel.scenes[k].say, v.id, file);
        reel.scenes[k].d = Math.max(1.2, duration(file) + 0.25) + (reel.scenes[k].end ? 0.9 : 0);
      }
      const files = reel.scenes.map((sc, i) => scene(sc, i, name, work, credit));
      console.log("ok", name, `${join(name, reel.scenes, files, work).toFixed(1)}s`, credit);
    } catch (e) {
      console.error(name, String(e.stderr ?? e.message).slice(-900));
      process.exit(1);
    }
  }
  // 確認用に、パネルの絵も出しておく
  fs.mkdirSync(path.join(OUT, "panels"), { recursive: true });
  for (const k of Object.keys(PANELS)) {
    const base = path.join(work, `panel_${k}_base.png`);
    const more = path.join(work, `panel_${k}_more.png`);
    await sharp(base).composite([{ input: more }]).png().toFile(path.join(OUT, "panels", `${k}.png`));
  }
}

main();
