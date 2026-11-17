/* eslint-disable @typescript-eslint/no-require-imports */
// Tsudoro のサービス全体の予告編リール(v6 と同じ「ゲームの予告編」の形)。
// 前半: 幹事の悩み(日程・お店・お金)を赤い警告で。後半: 「URL1本で全部」を金色で。
// 実行: VOICEVOX のエンジン(http://127.0.0.1:50021)を起動してから  node scripts/make-reels-v7.cjs
// 出力: marketing/reels/v7_tsudoro.mp4

const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const sharp = require("sharp");
const v6 = require("./make-reels-v6.cjs");

const { W, H, FPS, RED, CYAN, GOLD, JP, EN } = v6;
const ROOT = path.join(__dirname, "..");
const ICON = path.join(ROOT, "public", "icon-512.png");

const glow = (id, sd = 10) => `<filter id="${id}" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="${sd}" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
const t = (x, y, s, size, color = "#fff", anchor = "middle", weight = 900) =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="${JP}" font-weight="${weight}" font-size="${size}" fill="${color}">${s}</text>`;

/** 見出し。parts = [文字, 色]。色がなければ白。縁どりで太く見せる */
function headline(hud1, hud2, hudColor, parts, size = 96) {
  const spans = parts.map(([s, c]) => `<tspan fill="${c ?? "#fff"}" stroke="${c ?? "#fff"}" stroke-width="4" stroke-linejoin="round">${s}</tspan>`).join("");
  return `<svg width="${W}" height="420" xmlns="http://www.w3.org/2000/svg"><defs><filter id="s"><feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000" flood-opacity="0.9"/></filter></defs>
    <text x="70" y="70" font-family="${EN}" font-weight="700" font-size="30" letter-spacing="6" fill="${CYAN}">${hud1}</text>
    <rect x="70" y="112" width="8" height="38" fill="${hudColor}"/>
    <text x="96" y="143" font-family="${EN}" font-weight="700" font-size="34" letter-spacing="5" fill="${hudColor}">${hud2}</text>
    <text x="70" y="${190 + size}" font-family="${JP}" font-weight="900" font-size="${size}" filter="url(#s)">${spans}</text></svg>`;
}

// ---------- 場面の絵 ----------
const ART = {
  alert: () => `<svg width="700" height="640" xmlns="http://www.w3.org/2000/svg"><defs>${glow("g", 16)}</defs>
    <g filter="url(#g)"><polygon points="350,40 660,580 40,580" fill="#2a0508" stroke="${RED}" stroke-width="16" stroke-linejoin="round"/></g>
    <rect x="325" y="210" width="50" height="210" rx="20" fill="${RED}"/><circle cx="350" cy="490" r="32" fill="${RED}"/></svg>`,
  calendar: () => {
    let g = "";
    for (let r = 0; r < 4; r++)
      for (let c = 0; c < 7; c++) {
        const x = 30 + c * 120;
        const y = 120 + r * 120;
        const bad = (r * 7 + c) % 3 === 1;
        g += `<rect x="${x}" y="${y}" width="104" height="104" rx="14" fill="#0a1a28" stroke="#1d4a66" stroke-width="3"/>`;
        if (bad) g += `<path d="M${x + 24} ${y + 24}L${x + 80} ${y + 80}M${x + 80} ${y + 24}L${x + 24} ${y + 80}" stroke="${RED}" stroke-width="10" stroke-linecap="round"/>`;
        else if ((r + c) % 5 === 0) g += t(x + 52, y + 74, "?", 60, "#f2c46a");
      }
    return `<svg width="900" height="620" xmlns="http://www.w3.org/2000/svg"><defs>${glow("g", 6)}</defs>
      <rect x="10" y="10" width="880" height="90" rx="16" fill="#0a1a28" stroke="${CYAN}" stroke-width="4" filter="url(#g)"/>${t(450, 74, "候補日", 52, CYAN)}${g}</svg>`;
  },
  shops: () => {
    const pin = (x, y, c) =>
      `<g filter="url(#g)"><path d="M${x} ${y + 150}C${x - 70} ${y + 60} ${x - 80} ${y + 30} ${x - 80} ${y}A80 80 0 1 1 ${x + 80} ${y}C${x + 80} ${y + 30} ${x + 70} ${y + 60} ${x} ${y + 150}Z" fill="#0a1a28" stroke="${c}" stroke-width="9"/></g>${t(x, y + 28, "?", 84, c)}`;
    return `<svg width="900" height="560" xmlns="http://www.w3.org/2000/svg"><defs>${glow("g", 10)}</defs>
      ${pin(170, 140, "#f2c46a")}${pin(450, 230, RED)}${pin(730, 140, "#f2c46a")}
      <path d="M60 520H840" stroke="#1d4a66" stroke-width="4" stroke-dasharray="20 14"/></svg>`;
  },
  money: () => {
    const row = (y, name, paid) =>
      `<rect x="60" y="${y}" width="780" height="96" rx="18" fill="#0a1a28" stroke="${paid ? "#1d4a66" : RED}" stroke-width="4"/>${t(110, y + 64, name, 48, "#cfd8e3", "start", 700)}${t(800, y + 64, paid ? "済" : "未払い", 48, paid ? "#62bd96" : RED, "end")}`;
    return `<svg width="900" height="650" xmlns="http://www.w3.org/2000/svg"><defs>${glow("g", 12)}</defs>
      <g filter="url(#g)"><circle cx="450" cy="90" r="80" fill="#2a1e05" stroke="${GOLD}" stroke-width="10"/></g>${t(450, 122, "¥", 96, GOLD)}
      ${row(200, "あおい", true)}${row(310, "いずみ", false)}${row(420, "うた", false)}${row(530, "えま", false)}</svg>`;
  },
  ring: () => `<svg width="760" height="760" xmlns="http://www.w3.org/2000/svg"><defs>${glow("g", 14)}</defs><g filter="url(#g)" fill="none">
    <circle cx="380" cy="380" r="330" stroke="${GOLD}" stroke-width="8" stroke-dasharray="40 26"/>
    <circle cx="380" cy="380" r="290" stroke="${CYAN}" stroke-width="3" opacity="0.7"/></g></svg>`,
  featSchedule: () => {
    const mk = (cx, y, m) =>
      m === "o" ? `<circle cx="${cx}" cy="${y}" r="30" fill="none" stroke="${GOLD}" stroke-width="10"/>` : m === "t" ? `<polygon points="${cx},${y - 28} ${cx + 30},${y + 26} ${cx - 30},${y + 26}" fill="none" stroke="#e3c46e" stroke-width="10" stroke-linejoin="round"/>` : `<path d="M${cx - 24} ${y - 24}L${cx + 24} ${y + 24}M${cx + 24} ${y - 24}L${cx - 24} ${y + 24}" stroke="#8a8478" stroke-width="10" stroke-linecap="round"/>`;
    const rows = [["o", "o", "t", "o"], ["o", "x", "o", "t"], ["o", "o", "o", "o"]];
    let g = "";
    rows.forEach((r, i) => {
      const y = 170 + i * 140;
      const best = i === 2;
      g += `<rect x="60" y="${y - 60}" width="780" height="120" rx="22" fill="${best ? "#2a1e05" : "#0a1a28"}" stroke="${best ? GOLD : "#1d4a66"}" stroke-width="5"/>`;
      g += t(150, y + 18, `${12 + i}/${5 + i}`, 46, best ? GOLD : "#cfd8e3", "middle", 700);
      r.forEach((m, j) => (g += mk(360 + j * 120, y, m)));
    });
    return `<svg width="900" height="560" xmlns="http://www.w3.org/2000/svg">${g}${t(450, 540, "★ いちばん行ける日", 50, GOLD)}</svg>`;
  },
  featShop: () => {
    const card = (y, name, tag, best) =>
      `<rect x="60" y="${y}" width="780" height="130" rx="22" fill="${best ? "#2a1e05" : "#0a1a28"}" stroke="${best ? GOLD : "#1d4a66"}" stroke-width="5"/>${t(110, y + 60, name, 50, "#fff", "start")}${t(110, y + 108, tag, 34, best ? GOLD : "#8fb3c9", "start", 700)}`;
    return `<svg width="900" height="560" xmlns="http://www.w3.org/2000/svg">${card(40, "居酒屋 A", "飲み放題 ・ 個室 ・ 予算ぴったり", true)}${card(200, "焼き鳥 B", "駅から3分 ・ 飲み放題", false)}${card(360, "バル C", "個室 ・ 20人まで", false)}</svg>`;
  },
  featSplit: () => {
    const rows = [["先輩", "¥4,000", 0.95, "#e07a88"], ["同期", "¥3,100", 0.72, GOLD], ["同期", "¥3,100", 0.72, GOLD], ["後輩", "¥2,200", 0.5, "#7aa6dd"]];
    let g = t(450, 70, "合計 ¥12,400", 64, "#fff");
    rows.forEach(([n, a, r, c], i) => {
      const y = 130 + i * 100;
      g += t(80, y + 50, n, 44, "#cfd8e3", "start", 700) + `<rect x="200" y="${y + 10}" width="${Math.round(420 * r)}" height="56" rx="16" fill="${c}"/>` + t(840, y + 52, a, 48, "#fff", "end");
    });
    return `<svg width="900" height="560" xmlns="http://www.w3.org/2000/svg">${g}</svg>`;
  },
  burst: () => {
    let g = "";
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      g += `<line x1="${380 + Math.cos(a) * 250}" y1="${380 + Math.sin(a) * 250}" x2="${380 + Math.cos(a) * 360}" y2="${380 + Math.sin(a) * 360}" stroke="${GOLD}" stroke-width="10" stroke-linecap="round"/>`;
    }
    return `<svg width="760" height="760" xmlns="http://www.w3.org/2000/svg"><defs>${glow("g", 12)}</defs><g filter="url(#g)">${g}</g></svg>`;
  },
};

// ---------- 台本 ----------
// art = 真ん中の絵、icon = アプリのアイコンを出す、ok = 前向きな場面(金色の表示)
const SCENES = [
  { say: "飲み会の幹事は、地獄だ。", head: ["TSUDORO // SYSTEM", "ALERT", RED, [["飲み会の幹事は、"], ["地獄", RED], ["。"]], 90], art: "alert" },
  { say: "日程が、決まらない。", head: ["TSUDORO // SYSTEM", "PHASE 01  SCHEDULE", RED, [["日程が、"], ["決まらない", RED], ["。"]]], art: "calendar", glitch: true },
  { say: "お店が、決まらない。", head: ["TSUDORO // SYSTEM", "PHASE 02  SHOP", RED, [["お店が、"], ["決まらない", RED], ["。"]]], art: "shops", glitch: true },
  { say: "お金が、集まらない。", head: ["TSUDORO // SYSTEM", "PHASE 03  PAYMENT", RED, [["お金が、"], ["集まらない", RED], ["。"]]], art: "money", glitch: true },
  { say: "その全部、URL一本で終わらせる。", head: ["TSUDORO // ONLINE", "SYSTEM READY", GOLD, [["全部、"], ["URL1本", GOLD], ["で。"]]], art: "ring", icon: true, ok: true },
  { say: "日程は、自動で集計。", head: ["TSUDORO // ONLINE", "SCHEDULE", GOLD, [["日程は、"], ["自動で集計", GOLD], ["。"]]], art: "featSchedule", ok: true },
  { say: "お店は、自動で提案。", head: ["TSUDORO // ONLINE", "SHOP", GOLD, [["お店は、"], ["自動で提案", GOLD], ["。"]]], art: "featShop", ok: true },
  { say: "会計は、一瞬で計算。", head: ["TSUDORO // ONLINE", "PAYMENT", GOLD, [["会計は、"], ["一瞬で計算", GOLD], ["。"]]], art: "featSplit", ok: true },
  { say: "幹事を、楽しめ。", head: ["TSUDORO // ONLINE", "MISSION COMPLETE", GOLD, [["幹事を、"], ["楽しめ", GOLD], ["。"]]], art: "burst", icon: true, ok: true },
  { say: "ツドロ。登録なし、無料。", end: true },
];

function scene(sc, i, work) {
  const out = `s7_${i}.mp4`;
  const d = sc.d;
  const inputs = ["-loop", "1", "-t", String(d), "-i", "city.png"];
  const f = [];
  // 悩みの場面は街を赤く暗く、前向きな場面は明るく
  const tint = sc.end ? "eq=brightness=-0.28" : sc.ok ? "eq=brightness=0.03:saturation=1.15" : "colorbalance=rs=0.25:gs=-0.1:bs=-0.15,eq=brightness=-0.08";
  f.push(`[0:v]scale=w='1400*(1.0+0.06*t/${d})':h=-2:eval=frame,crop=${W}:${H}:x='(iw-${W})/2':y='(ih-${H})/2+40*t/${d}',${tint},setsar=1[bg]`);
  let last = "[bg]";
  let n = 1;
  const add = (file) => {
    inputs.push("-loop", "1", "-t", String(d), "-i", file);
    return n++;
  };
  if (sc.end) {
    const ic = add("icon.png");
    const tt = add("end7.png");
    f.push(`[${ic}:v]scale=300:300,format=rgba,fade=t=in:st=0:d=0.3:alpha=1[ic]`, `${last}[ic]overlay=x=(W-w)/2:y=420[a]`);
    f.push(`[${tt}:v]format=rgba,fade=t=in:st=0.2:d=0.3:alpha=1[t2]`, `[a][t2]overlay=0:760[b]`);
    last = "[b]";
  } else {
    if (sc.art) {
      const ai = add(`art_${sc.art}.png`);
      const spin = sc.art === "ring" ? `,rotate='t*0.6':c=none:ow=iw:oh=ih` : "";
      f.push(`[${ai}:v]format=rgba${spin},fade=t=in:st=0:d=0.22:alpha=1[ar]`);
      f.push(`${last}[ar]overlay=x=(W-w)/2:y='(H-h)/2+110+70*max(0\\,1-t/0.25)'[al]`);
      last = "[al]";
    }
    if (sc.icon) {
      const ii = add("icon.png");
      f.push(`[${ii}:v]scale=360:360,format=rgba,fade=t=in:st=0.1:d=0.25:alpha=1[ic]`);
      f.push(`${last}[ic]overlay=x=(W-w)/2:y='(H-h)/2+110-10*sin(t*3)'[il]`);
      last = "[il]";
    }
    const hi = add(`head7_${i}.png`);
    f.push(`[${hi}:v]format=rgba,fade=t=in:st=0.05:d=0.15:alpha=1[hd]`, `${last}[hd]overlay=x='-30*max(0\\,1-(t-0.05)/0.2)':y=210[h]`);
    last = "[h]";
  }
  const g2 = sc.glitch ? `+between(t\\,${(d * 0.55).toFixed(2)}\\,${(d * 0.55 + 0.1).toFixed(2)})` : "";
  f.push(`${last}rgbashift=rh=14:bh=-14:enable='lt(t\\,0.15)${g2}'[gl]`, `[gl]vignette=PI/4.5,format=yuv420p[v]`);
  execFileSync("ffmpeg", ["-y", ...inputs, "-filter_complex", f.join(";"), "-map", "[v]", "-t", String(d), "-r", String(FPS), "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p", out], {
    cwd: work,
    stdio: ["ignore", "ignore", "pipe"],
  });
  return out;
}

async function main() {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), "tsudoro-reel7-"));
  const png = (svg, name) => sharp(Buffer.from(svg)).png().toFile(path.join(work, name));
  fs.copyFileSync(ICON, path.join(work, "icon.png"));
  await png(v6.city(), "city.png");
  for (const [k, fn] of Object.entries(ART)) await png(fn(), `art_${k}.png`);
  const v = await v6.speaker();
  const credit = `VOICEVOX:${v.name}`;
  await png(
    `<svg width="${W}" height="760" xmlns="http://www.w3.org/2000/svg">
      <text x="${W / 2}" y="140" text-anchor="middle" font-family="${EN}" font-weight="700" font-size="150" fill="${GOLD}">Tsudoro</text>
      <text x="${W / 2}" y="250" text-anchor="middle" font-family="${JP}" font-weight="900" font-size="60" fill="#fff">日程・お店・会計を、URL1本で</text>
      <rect x="${W / 2 - 330}" y="320" width="660" height="120" rx="20" fill="${GOLD}"/>
      <text x="${W / 2}" y="402" text-anchor="middle" font-family="${JP}" font-weight="900" font-size="66" fill="#000">プロフのリンクから</text>
      <text x="${W / 2}" y="540" text-anchor="middle" font-family="${JP}" font-weight="700" font-size="50" fill="#cfd8e3">登録なし・無料</text>
      <text x="${W / 2}" y="660" text-anchor="middle" font-family="${JP}" font-size="32" fill="#8a8478">${credit}</text>
    </svg>`,
    "end7.png",
  );
  for (let i = 0; i < SCENES.length; i++) {
    const sc = SCENES[i];
    if (sc.head) await png(headline(...sc.head), `head7_${i}.png`);
    const file = path.join(work, `v_${i}.wav`);
    await v6.synth(sc.say, v.id, file);
    sc.d = Math.max(1.15, v6.duration(file) + 0.35) + (sc.end ? 1.0 : 0);
  }
  const total = SCENES.reduce((a, s) => a + s.d, 0) - 0.12 * (SCENES.length - 1);
  v6.audioFx(work, total);
  try {
    const files = SCENES.map((sc, i) => scene(sc, i, work));
    v6.join(SCENES, files, work, total, "v7_tsudoro.mp4");
    console.log("ok v7_tsudoro", `${total.toFixed(1)}s`, credit);
  } catch (e) {
    console.error(String(e.stderr ?? e.message).slice(-900));
    process.exit(1);
  }
}

main();
