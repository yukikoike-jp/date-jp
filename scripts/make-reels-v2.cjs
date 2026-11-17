/* eslint-disable @typescript-eslint/no-require-imports */
// Tsudoro のリール動画 v2(縦 1080x1920)。写真素材(Pexels、無料・商用利用可)を1.5〜2.5秒ごとに切り替え、
// ゆっくり動かし(パン)、黄色い帯の大きな文字を下から出す。解決の場面は、アプリの画面を模した絵と ○△× を重ねる。
// 実行: node scripts/make-reels-v2.cjs   (ffmpeg が要る。素材は marketing/assets/p_*.jpg、出力は marketing/reels/)
// 音は付けない。Instagram で、流行の音源をあとから選ぶ

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
const W = 1080;
const H = 1920;
const FPS = 30;
const XF = 0.25; // 場面の切り替えの長さ(秒)

const GOLD = "0xf5b83d";

// 場面: img = 写真の id(p_ID.jpg)、d = 長さ、tags = 黄色い帯の文字(上から)、sub = 白い文字(帯の上)、
// card = 重ねる絵(app / split / cards)、blur = 写真をぼかす、marks = ○△× を出す
const REELS = {
  reel1: [
    { img: "6669813", d: 2.4, sub: "幹事のみんな", tags: ["日程調整", "まだLINEでやってる?"] },
    { img: "9898393", d: 2.0, sub: "「その日バイト…」「微妙…」", tags: ["既読スルー地獄"] },
    { img: "6892902", d: 2.0, tags: ["候補日、", "何回出し直すの…"] },
    { img: "8197506", d: 1.8, tags: ["もう無理…"] },
    { img: "6669784", d: 3.0, blur: true, card: "app", marks: true, tags: ["URL 1本 送るだけ", "みんなは ○△× で答える"] },
    { img: "6605275", d: 2.2, tags: ["日程もお店も", "一瞬で決まる"] },
    { end: "登録なし・無料", d: 3.0 },
  ],
  reel2: [
    { img: "7680736", d: 2.4, sub: "飲み会のあとの", tags: ["割り勘、", "地獄じゃない?"] },
    { img: "5900233", d: 2.0, sub: "「先輩は1.3倍で…」", tags: ["端数どうする…"] },
    { img: "6173661", d: 1.8, tags: ["計算だけで10分"] },
    { img: "9961852", d: 3.0, blur: true, card: "split", tags: ["合計を入れるだけ", "一人ずつの金額が出る"] },
    { img: "9961849", d: 2.2, tags: ["幹事も笑顔で", "お会計おわり"] },
    { end: "傾斜で割る", d: 3.0 },
  ],
  reel3: [
    { img: "6173675", d: 2.4, sub: "2次会で", tags: ["急に静かになる", "あの空気"] },
    { img: "9898393", d: 1.8, tags: ["そんなときは"] },
    { img: "9961851", d: 3.0, blur: true, card: "cards", tags: ["ワードウルフ", "1人だけ違うお題"] },
    { img: "8153998", d: 2.0, tags: ["ウルフは", "誰だ!?"] },
    { img: "3851302", d: 2.2, tags: ["配るだけで", "一気に盛り上がる"] },
    { end: "Play", d: 3.0 },
  ],
};

/** 文字を読みやすくする、上と下の黒いグラデーション */
async function gradient(file) {
  const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#000" stop-opacity="0.55"/>
        <stop offset="0.22" stop-color="#000" stop-opacity="0"/>
        <stop offset="0.5" stop-color="#000" stop-opacity="0.05"/>
        <stop offset="1" stop-color="#000" stop-opacity="0.85"/>
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
  </svg>`;
  await sharp(Buffer.from(svg)).png().toFile(file);
}

/** アプリの画面を模した絵(文字は使わず、形で見せる) */
async function card(kind, file) {
  const gold = "#f5b83d";
  let body = "";
  if (kind === "app") {
    // 候補日の行と、○△× の答え
    const rows = [
      ["o", "o", "o", "t"],
      ["o", "x", "t", "o"],
      ["o", "o", "o", "o"],
      ["t", "o", "x", "o"],
    ];
    rows.forEach((r, i) => {
      const y = 250 + i * 150;
      const best = i === 2;
      body += `<rect x="50" y="${y - 55}" width="560" height="120" rx="24" fill="${best ? "#3a2d10" : "#1f1d19"}" stroke="${best ? gold : "#2f2c26"}" stroke-width="4"/>`;
      body += `<rect x="85" y="${y - 18}" width="130" height="36" rx="10" fill="${best ? gold : "#4a463e"}"/>`;
      r.forEach((m, j) => {
        const cx = 290 + j * 82;
        const c = m === "o" ? gold : m === "t" ? "#e3c46e" : "#8a8478";
        if (m === "o") body += `<circle cx="${cx}" cy="${y + 5}" r="24" fill="none" stroke="${c}" stroke-width="8"/>`;
        else if (m === "t") body += `<polygon points="${cx},${y - 22} ${cx + 25},${y + 24} ${cx - 25},${y + 24}" fill="none" stroke="${c}" stroke-width="8" stroke-linejoin="round"/>`;
        else body += `<path d="M${cx - 20},${y - 15} L${cx + 20},${y + 25} M${cx + 20},${y - 15} L${cx - 20},${y + 25}" stroke="${c}" stroke-width="8" stroke-linecap="round"/>`;
      });
    });
  } else if (kind === "split") {
    // 一人ずつの金額(多めの人ほど長い棒)
    const people = [
      ["¥4,000", 1.0, "#e07a88"],
      ["¥3,100", 0.78, gold],
      ["¥3,100", 0.78, gold],
      ["¥2,200", 0.55, "#7aa6dd"],
      ["¥1,900", 0.48, "#62bd96"],
    ];
    body += `<text x="330" y="235" text-anchor="middle" font-family="Arial" font-weight="700" font-size="76" fill="#fff">¥14,300</text>`;
    people.forEach(([yen, w, c], i) => {
      const y = 330 + i * 118;
      body += `<circle cx="100" cy="${y + 30}" r="30" fill="${c}"/>`;
      body += `<rect x="150" y="${y + 8}" width="${Math.round(270 * w)}" height="44" rx="14" fill="${c}"/>`;
      body += `<text x="610" y="${y + 47}" text-anchor="end" font-family="Arial" font-weight="700" font-size="46" fill="#fff">${yen}</text>`;
    });
  } else {
    // ワードウルフのカード: 1枚だけ色が違う
    const cards = [
      [110, 230, "#2a2721"],
      [370, 230, "#2a2721"],
      [110, 560, "#2a2721"],
      [370, 560, "#b078ff"],
    ];
    cards.forEach(([x, y, c], i) => {
      body += `<rect x="${x}" y="${y}" width="200" height="280" rx="28" fill="${c}" stroke="${i === 3 ? "#d8c4ff" : gold}" stroke-width="6"/>`;
      body += `<text x="${x + 100}" y="${y + 185}" text-anchor="middle" font-family="Arial" font-weight="700" font-size="140" fill="${i === 3 ? "#fff" : gold}">?</text>`;
    });
  }
  const svg = `<svg width="660" height="980" xmlns="http://www.w3.org/2000/svg">
    <rect x="6" y="6" width="648" height="968" rx="70" fill="#0d0c0a" stroke="#3a372f" stroke-width="10"/>
    <rect x="250" y="40" width="160" height="20" rx="10" fill="#2a2721"/>
    <rect x="50" y="100" width="560" height="10" rx="5" fill="${gold}"/>
    ${body}
  </svg>`;
  await sharp(Buffer.from(svg)).png().toFile(file);
}

function fade(s, e) {
  return `if(lt(t,${s}),0,if(lt(t,${s + 0.22}),(t-${s})/0.22,if(lt(t,${e - 0.15}),1,max(0,(${e}-t)/0.15))))`;
}

/** 1つの場面の動画を作る */
function scene(sc, i, name, work) {
  const out = `s_${name}_${i}.mp4`;
  const d = sc.d;
  const filters = [];
  const inputs = [];
  let txt = 0;
  const textFile = (t) => {
    const f = `t_${name}_${i}_${txt++}.txt`;
    fs.writeFileSync(path.join(work, f), t, "utf8");
    return f;
  };

  if (sc.end) {
    inputs.push("-f", "lavfi", "-i", `color=c=0x0b0a08:s=${W}x${H}:r=${FPS}:d=${d}`);
    inputs.push("-loop", "1", "-t", String(d), "-i", "icon.png");
    filters.push(`[1:v]scale=340:340,format=rgba,fade=t=in:st=0:d=0.35:alpha=1[ic]`);
    filters.push(`[0:v][ic]overlay=x=(W-w)/2:y=430-60*max(0\\,1-t/0.4)[a]`);
    const lines = [
      { t: "Tsudoro", z: 160, c: GOLD, y: 830, s: 0.15 },
      { t: sc.end, z: 92, c: "0xf5f1e8", y: 1060, s: 0.3 },
      { t: "プロフのリンクから", z: 80, c: "0x000000", y: 1250, s: 0.45, box: true },
    ];
    let last = "[a]";
    lines.forEach((l, k) => {
      const next = `[e${k}]`;
      const box = l.box ? `:box=1:boxcolor=${GOLD}:boxborderw=26` : "";
      filters.push(
        `${last}drawtext=fontfile=font.ttc:textfile=${textFile(l.t)}:fontsize=${l.z}:fontcolor=${l.c}${box}:x=(w-text_w)/2:y='${l.y}+50*max(0\\,1-(t-${l.s})/0.3)':alpha='${fade(l.s, d + 1)}'${next}`,
      );
      last = next;
    });
    filters.push(`${last}format=yuv420p[v]`);
  } else {
    inputs.push("-loop", "1", "-t", String(d), "-i", `p_${sc.img}.jpg`);
    inputs.push("-loop", "1", "-t", String(d), "-i", "grad.png");
    // 写真を縦いっぱいに広げ、横にゆっくり動かす(パン)。少しずつ寄る
    const dir = i % 2 === 0 ? 1 : -1;
    let base = `[0:v]scale=-2:${Math.round(H * 1.12)},crop=${W}:${H}:x='(iw-${W})/2+${dir}*min((iw-${W})/2\\,70)*(t/${d}-0.5)*2':y='(ih-${H})/2'`;
    if (sc.blur) base += `,boxblur=18:2,eq=brightness=-0.18`;
    filters.push(`${base},setsar=1[bg]`);
    filters.push(`[bg][1:v]overlay=0:0[g]`);
    let last = "[g]";
    if (sc.card) {
      inputs.push("-loop", "1", "-t", String(d), "-i", `card_${sc.card}.png`);
      const ci = inputs.filter((x) => x === "-i").length - 1;
      filters.push(`[${ci}:v]format=rgba,fade=t=in:st=0.1:d=0.3:alpha=1[cd]`);
      filters.push(`${last}[cd]overlay=x=(W-w)/2:y='190+120*max(0\\,1-(t-0.1)/0.35)'[c]`);
      last = "[c]";
    }
    // 白い文字(上)と、黄色い帯の文字(下)
    const tagSize = sc.tags.some((t) => t.length > 9) ? 84 : 104;
    const tagH = Math.round(tagSize * 1.75);
    let y = sc.card ? 1260 : 1230;
    if (sc.sub) {
      const next = "[sub]";
      filters.push(
        `${last}drawtext=fontfile=font.ttc:textfile=${textFile(sc.sub)}:fontsize=64:fontcolor=white:borderw=6:bordercolor=black:x=(w-text_w)/2:y='${y - 120}+30*max(0\\,1-(t-0.05)/0.3)':alpha='${fade(0.05, d + 1)}'${next}`,
      );
      last = next;
    }
    sc.tags.forEach((t, k) => {
      const s = 0.15 + k * 0.28;
      const next = `[t${k}]`;
      filters.push(
        `${last}drawtext=fontfile=font.ttc:textfile=${textFile(t)}:fontsize=${tagSize}:fontcolor=black:box=1:boxcolor=${GOLD}:boxborderw=24:x='(w-text_w)/2+${k % 2 === 0 ? -1 : 1}*240*max(0\\,1-(t-${s})/0.25)':y=${y}:alpha='${fade(s, d + 1)}'${next}`,
      );
      last = next;
      y += tagH;
    });
    filters.push(`${last}format=yuv420p[v]`);
  }

  execFileSync(
    "ffmpeg",
    ["-y", ...inputs, "-filter_complex", filters.join(";"), "-map", "[v]", "-t", String(d), "-r", String(FPS), "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p", out],
    { cwd: work, stdio: ["ignore", "ignore", "pipe"] },
  );
  return out;
}

/** 場面をつなぐ(切り替えは横に滑らせる)。上に進み具合の線を引く */
function join(files, durs, name, work) {
  const total = durs.reduce((a, b) => a + b, 0) - XF * (files.length - 1);
  const args = ["-y"];
  files.forEach((f) => args.push("-i", f));
  const filters = [];
  let last = "[0:v]";
  let offset = 0;
  const kinds = ["slideleft", "slideup", "slideleft", "fade", "slideleft", "slideup"];
  for (let k = 1; k < files.length; k++) {
    offset += durs[k - 1] - XF;
    const next = `[x${k}]`;
    filters.push(`${last}[${k}:v]xfade=transition=${kinds[(k - 1) % kinds.length]}:duration=${XF}:offset=${offset.toFixed(3)}${next}`);
    last = next;
  }
  filters.push(`${last}drawbox=x=0:y=0:w='${W}*t/${total.toFixed(3)}':h=12:color=${GOLD}:t=fill,format=yuv420p[v]`);
  args.push("-filter_complex", filters.join(";"), "-map", "[v]", "-c:v", "libx264", "-crf", "19", "-pix_fmt", "yuv420p", "-movflags", "+faststart", path.join(OUT, `${name}.mp4`));
  execFileSync("ffmpeg", args, { cwd: work, stdio: ["ignore", "ignore", "pipe"] });
  return total;
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const work = fs.mkdtempSync(path.join(os.tmpdir(), "tsudoro-reel2-"));
  fs.copyFileSync(FONT, path.join(work, "font.ttc"));
  fs.copyFileSync(ICON, path.join(work, "icon.png"));
  for (const f of fs.readdirSync(ASSETS).filter((x) => /^p_\d+\.jpg$/.test(x))) fs.copyFileSync(path.join(ASSETS, f), path.join(work, f));
  await gradient(path.join(work, "grad.png"));
  for (const k of ["app", "split", "cards"]) await card(k, path.join(work, `card_${k}.png`));

  for (const [name, scenes] of Object.entries(REELS)) {
    try {
      const files = scenes.map((sc, i) => scene(sc, i, name, work));
      const total = join(files, scenes.map((s) => s.d), name, work);
      console.log("ok", name, `${total.toFixed(1)}s`);
    } catch (e) {
      console.error(name, String(e.stderr ?? e.message).slice(-700));
      process.exit(1);
    }
  }
}

module.exports = { card };

if (require.main === module) main();
