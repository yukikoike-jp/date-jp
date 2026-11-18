/* eslint-disable @typescript-eslint/no-require-imports */
// 忘年会シーズンのリール(2026-11)。流行の形に合わせる:
// - 最初の1.5秒で「あるある」(POV: 忘年会の幹事になった)
// - スマホのメモ帳のような白いカードに、短い文字(作り込みすぎない、生っぽい見た目)
// - 1秒前後の速い切り替え。途中で「URL1本でぜんぶおわった」と気づく流れ
// 音声は入れない(無音の音を入れておく)。音源は、Instagram に投稿するときにアプリの中で付ける
// 実行: node scripts/make-reels-v8.cjs   出力: marketing/reels/v8_bonenkai.mp4

const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const sharp = require("sharp");

const ROOT = path.join(__dirname, "..");
const ASSETS = path.join(ROOT, "marketing", "assets");
const OUT = path.join(ROOT, "marketing", "reels");
const ICON = path.join(ROOT, "public", "icon-512.png");
const W = 1080;
const H = 1920;
const FPS = 30;
const GOLD = "#f5b83d";
const RED = "#ff4d5e";
const GREEN = "#3ecf8e";
const JP = "Yu Gothic UI, Yu Gothic, Meiryo";

/**
 * 場面。photo = 背景の写真(なければ黒)、lines = メモのカードの行([文字, 色])、
 * tag = カードの上の小さな見出し、sec = 長さ(秒)、icon = アプリのアイコンを出すか
 */
const SCENES = [
  { photo: "p_6173661.jpg", tag: "POV", lines: [["忘年会の"], ["幹事に なった"]], sec: 1.6, big: true },
  { photo: "p_6669784.jpg", tag: "日程", lines: [["既読 12"], ["返信 3", RED]], sec: 1.1 },
  { photo: "p_9961851.jpg", tag: "お店", lines: [["13人 入れる店"], ["見つからない", RED]], sec: 1.1 },
  { photo: "p_7680736.jpg", tag: "会計", lines: [["1人 3,846円…?", RED], ["飲まない人もいる"]], sec: 1.2 },
  { photo: null, tag: "でも", lines: [["URL 1本で"], ["ぜんぶ おわった", GOLD]], sec: 1.6, icon: true, big: true },
  { photo: "p_9898393.jpg", tag: "日程", lines: [["みんな 30秒で回答", GREEN], ["いちばん良い日が出る"]], sec: 1.2 },
  { photo: "p_9961849.jpg", tag: "お店", lines: [["みんなの予算から", GREEN], ["お店の候補が出る"]], sec: 1.2 },
  { photo: "p_5900233.jpg", tag: "会計", lines: [["飲まない人は 少なめ", GREEN], ["1タップで割り勘"]], sec: 1.2 },
  { photo: "p_5858194.jpg", tag: "二次会", lines: [["ワードウルフ"], ["王様ゲームも", GOLD]], sec: 1.4 },
  { photo: null, tag: "幹事は", lines: [["Tsudoro", GOLD], ["基本無料・登録なし"]], sec: 2.4, icon: true, big: true, cta: true },
];

/** メモ帳のカード(白い角丸)。文字は黒、強調の行だけ色を付ける */
function noteCard(sc) {
  const size = sc.big ? 104 : 88;
  const lineH = size * 1.32;
  const padX = 64;
  const top = 120;
  const cardH = top + sc.lines.length * lineH + 70 + (sc.cta ? 90 : 0);
  const rows = sc.lines
    .map(([s, c], i) => {
      const fill = c === GOLD ? "#c98a12" : c === GREEN ? "#159a62" : c ?? "#111";
      return `<text x="${padX}" y="${top + (i + 1) * lineH - size * 0.28}" font-family="${JP}" font-weight="900" font-size="${size}" fill="${fill}">${s}</text>`;
    })
    .join("");
  const cta = sc.cta
    ? `<text x="${padX}" y="${cardH - 60}" font-family="${JP}" font-weight="700" font-size="44" fill="#666">プロフのリンクから →</text>`
    : "";
  const cardW = W - 120;
  return {
    h: cardH,
    svg: `<svg width="${cardW}" height="${cardH}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="${cardW}" height="${cardH}" rx="44" fill="#fffdf7"/>
      <rect x="${padX}" y="44" width="${sc.tag.length * 40 + 44}" height="58" rx="29" fill="#111"/>
      <text x="${padX + 22}" y="86" font-family="${JP}" font-weight="900" font-size="38" fill="#fff">${sc.tag}</text>
      ${rows}${cta}</svg>`,
  };
}

async function frame(sc, file) {
  let base;
  if (sc.photo) {
    base = sharp(path.join(ASSETS, sc.photo)).resize(W, H, { fit: "cover" }).modulate({ brightness: 0.62, saturation: 1.1 });
  } else {
    // 黒地に、金色の光
    const glow = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="g" cx="50%" cy="38%" r="60%"><stop offset="0" stop-color="${GOLD}" stop-opacity="0.35"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient></defs><rect width="${W}" height="${H}" fill="#0b0a09"/><rect width="${W}" height="${H}" fill="url(#g)"/></svg>`;
    base = sharp(Buffer.from(glow));
  }
  const card = noteCard(sc);
  const layers = [];
  let cardTop = 980;
  if (sc.icon) {
    const icon = await sharp(ICON).resize(300, 300).png().toBuffer();
    layers.push({ input: icon, left: (W - 300) / 2, top: 470 });
    cardTop = 860;
  }
  layers.push({ input: Buffer.from(card.svg), left: 60, top: cardTop });
  await base.composite(layers).png().toFile(file);
}

function run(args) {
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...args], { stdio: "inherit" });
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "reel8-"));
  const clips = [];
  for (const [i, sc] of SCENES.entries()) {
    const png = path.join(tmp, `f${i}.png`);
    const mp4 = path.join(tmp, `c${i}.mp4`);
    await frame(sc, png);
    const n = Math.round(sc.sec * FPS);
    // 少しずつ寄る(止まった絵に見せない)
    run([
      "-loop", "1", "-i", png, "-t", String(sc.sec),
      "-vf", `scale=${W * 2}:${H * 2},zoompan=z='1+0.05*on/${n}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${n}:s=${W}x${H}:fps=${FPS},format=yuv420p`,
      "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-r", String(FPS), mp4,
    ]);
    clips.push(mp4);
  }
  const list = path.join(tmp, "list.txt");
  fs.writeFileSync(list, clips.map((c) => `file '${c.replace(/\\/g, "/")}'`).join("\n"));
  const total = SCENES.reduce((s, sc) => s + sc.sec, 0);
  const out = path.join(OUT, "v8_bonenkai.mp4");
  run([
    "-f", "concat", "-safe", "0", "-i", list,
    "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo",
    "-t", total.toFixed(2), "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "128k", "-shortest", "-movflags", "+faststart", out,
  ]);
  // 確認用に、場面ごとの絵を1枚にまとめる
  const thumbs = await Promise.all(clips.map((_, i) => sharp(path.join(tmp, `f${i}.png`)).resize(216, 384).png().toBuffer()));
  await sharp({ create: { width: 216 * 5, height: 384 * 2, channels: 3, background: "#222" } })
    .composite(thumbs.map((input, i) => ({ input, left: (i % 5) * 216, top: Math.floor(i / 5) * 384 })))
    .jpeg({ quality: 80 })
    .toFile(path.join(OUT, "v8_bonenkai_preview.jpg"));
  console.log("ok", out, total.toFixed(1) + "s");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
