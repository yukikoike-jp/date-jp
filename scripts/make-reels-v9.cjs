/* eslint-disable @typescript-eslint/no-require-imports */
// 「30秒でわかる Tsudoro の使い方」リール(2026-11)。
// 参考: 「1分でわかる ○○の仕組み」型の解説リール(暗い背景・太い見出し・ブランド名だけ色・動く図・①②③で順に説明・最後に「保存して」)
// 1コマずつ SVG で描いて、ffmpeg に流しこむ(文字が出る・棒がのびる・数がふえる、などの動きをつける)
// 音声は入れない(無音の音を入れておく)。音源は Instagram に投稿するときにアプリの中で付ける
// 実行: node scripts/make-reels-v9.cjs   出力: marketing/reels/v9_howto.mp4

const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const sharp = require("sharp");

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "marketing", "reels");
const ICON = path.join(ROOT, "public", "icon-512.png");
const W = 1080;
const H = 1920;
const FPS = 30;
const GOLD = "#f5b83d";
const GREEN = "#3ecf8e";
const LINE = "#06c755";
const MUTED = "#9aa3ad";
const JP = "Yu Gothic UI, Yu Gothic, Meiryo";

// ---- 動きの道具
const clamp = (x) => Math.max(0, Math.min(1, x));
const easeOut = (x) => 1 - Math.pow(1 - clamp(x), 3);
const backOut = (x) => {
  const t = clamp(x);
  const c = 1.7;
  return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
};
/** start 秒から dur 秒かけて出てくる(下から少し上がりながら) */
function rise(t, start, body, dur = 0.45, dy = 40) {
  const p = easeOut((t - start) / dur);
  if (p <= 0) return "";
  return `<g opacity="${p.toFixed(3)}" transform="translate(0 ${((1 - p) * dy).toFixed(1)})">${body}</g>`;
}
/** ぽんと出る(cx, cy を中心に大きくなる) */
function pop(t, start, cx, cy, body, dur = 0.35) {
  const p = clamp((t - start) / dur);
  if (p <= 0) return "";
  const s = backOut(p);
  return `<g opacity="${clamp(p * 2).toFixed(3)}" transform="translate(${cx} ${cy}) scale(${s.toFixed(3)}) translate(${-cx} ${-cy})">${body}</g>`;
}
const text = (x, y, s, size, fill = "#fff", weight = 900, anchor = "middle") =>
  `<text x="${x}" y="${y}" font-family="${JP}" font-weight="${weight}" font-size="${size}" fill="${fill}" text-anchor="${anchor}">${s}</text>`;
const yen = (n) => Math.round(n).toLocaleString("ja-JP");
const check = (x, y, s = 1, color = "#111") =>
  `<path d="M${x} ${y} l${10 * s} ${10 * s} l${20 * s} ${-22 * s}" fill="none" stroke="${color}" stroke-width="${7 * s}" stroke-linecap="round" stroke-linejoin="round"/>`;

const ICON_URI = `data:image/png;base64,${fs.readFileSync(ICON).toString("base64")}`;

// ---- 見出し(①②③④の場面に共通)
function head(t, no, title, sub) {
  return (
    pop(t, 0, 540, 330, `<circle cx="540" cy="330" r="62" fill="${GOLD}"/>${text(540, 360, no, 80, "#111")}`) +
    rise(t, 0.12, text(540, 500, title, 92)) +
    rise(t, 0.25, text(540, 580, sub, 44, MUTED, 700))
  );
}
const card = (x, y, w, h, fill = "#1a1d22") => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="40" fill="${fill}" stroke="#ffffff1f" stroke-width="2"/>`;

// ---- 場面
const SCENES = [
  {
    sec: 3.2,
    draw(t) {
      const ring = easeOut(t / 2.6);
      const r = 190;
      const c = 2 * Math.PI * r;
      return (
        rise(t, 0, `<rect x="370" y="440" width="340" height="88" rx="44" fill="#ffffff14"/>${text(540, 499, "30秒でわかる", 44, GOLD, 700)}`) +
        rise(t, 0.15, text(540, 740, `<tspan fill="${GOLD}">Tsudoro</tspan>の`, 170)) +
        rise(t, 0.3, text(540, 930, "使い方", 170)) +
        rise(
          t,
          0.4,
          `<circle cx="540" cy="1330" r="${r}" fill="none" stroke="#ffffff1a" stroke-width="24"/>
           <circle cx="540" cy="1330" r="${r}" fill="none" stroke="${GOLD}" stroke-width="24" stroke-linecap="round"
             stroke-dasharray="${(c * ring).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 540 1330)"/>
           ${text(540, 1372, `${Math.round(ring * 30)}秒`, 120)}
           ${text(540, 1640, "幹事の仕事が、URL1本で", 52, MUTED, 700)}`,
        )
      );
    },
  },
  {
    sec: 6,
    draw(t) {
      const name = "サークルの忘年会";
      const typed = name.slice(0, Math.floor(clamp((t - 0.7) / 1.1) * name.length));
      const dates = ["12/18(木)", "12/19(金)", "12/20(土)", "12/22(月)", "12/23(火)", "12/25(木)"];
      const chips = dates
        .map((d, i) => {
          const x = 170 + (i % 3) * 250;
          const y = 1010 + Math.floor(i / 3) * 120;
          const on = t > 2.1 + i * 0.25;
          return pop(
            t,
            1.9 + i * 0.08,
            x + 110,
            y + 45,
            `<rect x="${x}" y="${y}" width="220" height="90" rx="22" fill="${on ? GOLD : "#ffffff10"}" stroke="${on ? GOLD : "#ffffff30"}" stroke-width="2"/>${text(x + 110, y + 58, d, 38, on ? "#111" : "#fff", 800)}`,
          );
        })
        .join("");
      const pressed = t > 4.0 && t < 4.2 ? 0.96 : 1;
      const done = t > 4.25;
      return (
        head(t, "1", "URLを1本つくる", "名前と、候補の日を選ぶだけ") +
        rise(
          t,
          0.4,
          `${card(120, 680, 840, 860)}
           ${text(170, 760, "飲み会の名前", 38, MUTED, 700, "start")}
           <rect x="170" y="790" width="740" height="110" rx="24" fill="#ffffff0d" stroke="${typed ? GOLD : "#ffffff30"}" stroke-width="3"/>
           ${text(205, 865, typed + (t % 0.8 < 0.4 && typed.length < name.length ? "|" : ""), 50, "#fff", 800, "start")}
           ${text(170, 980, "候補の日", 38, MUTED, 700, "start")}`,
        ) +
        chips +
        rise(
          t,
          3.4,
          `<g transform="translate(540 1390) scale(${pressed}) translate(-540 -1390)">
             <rect x="170" y="1330" width="740" height="120" rx="30" fill="${done ? GREEN : GOLD}"/>
             ${done ? check(420, 1388, 1.3) + text(560, 1410, "できました", 52, "#111") : text(540, 1410, "URLをつくる", 52, "#111")}
           </g>`,
        ) +
        rise(t, 4.6, text(540, 1680, "アカウント登録は、いりません", 50, "#fff", 800))
      );
    },
  },
  {
    sec: 6.4,
    draw(t) {
      const n = Math.round(clamp((t - 1.2) / 3.6) * 12);
      const friend = (start, y, s, w) =>
        rise(t, start, `<circle cx="180" cy="${y + 50}" r="42" fill="#ffffff22"/><rect x="245" y="${y}" width="${w}" height="100" rx="34" fill="#2a2e35"/>${text(285, y + 64, s, 42, "#fff", 700, "start")}`);
      return (
        head(t, "2", "LINEに貼るだけ", "みんなは登録なし・30秒で回答") +
        rise(
          t,
          0.35,
          `${card(100, 660, 880, 900, "#14171b")}
           <rect x="330" y="720" width="590" height="170" rx="40" fill="${LINE}"/>
           ${text(370, 790, "日程これで答えて!", 44, "#fff", 800, "start")}
           ${text(370, 850, "tsudoro.com/p/…", 40, "#eafff1", 700, "start")}`,
        ) +
        friend(1.3, 930, "答えた!", 230) +
        friend(2.0, 1060, "金曜ならいける", 400) +
        friend(2.7, 1190, "予算3000円で入れた", 500) +
        rise(
          t,
          1.0,
          `<rect x="250" y="1360" width="580" height="150" rx="40" fill="#ffffff0d"/>
           ${text(400, 1458, "回答", 52, MUTED, 800)}
           ${text(640, 1468, `${n}人`, 100, GOLD)}`,
        ) +
        rise(t, 4.9, text(540, 1700, "答えは、URLに自動で集まる", 46, "#fff", 800))
      );
    },
  },
  {
    sec: 6.8,
    draw(t) {
      const rows = [
        ["12/18(木)", 6],
        ["12/19(金)", 11],
        ["12/20(土)", 8],
        ["12/22(月)", 4],
      ];
      const best = t > 2.0;
      const bars = rows
        .map(([d, v], i) => {
          const y = 720 + i * 120;
          const grow = easeOut((t - 0.4 - i * 0.12) / 1.2);
          const w = (v / 12) * 470 * grow;
          const isBest = best && v === 11;
          return `${text(150, y + 58, d, 42, isBest ? GOLD : "#fff", 800, "start")}
            <rect x="370" y="${y + 10}" width="470" height="64" rx="18" fill="#ffffff0d"/>
            <rect x="370" y="${y + 10}" width="${w.toFixed(1)}" height="64" rx="18" fill="${isBest ? GOLD : "#5b8def"}"/>
            ${text(870, y + 58, `○${Math.round(v * grow)}`, 42, isBest ? GOLD : "#fff", 900, "start")}`;
        })
        .join("");
      return (
        head(t, "3", "いちばん良い日が出る", "お店も、みんなの予算と駅から") +
        rise(t, 0.3, card(100, 650, 880, 560) + bars) +
        pop(t, 2.0, 540, 1262, `<rect x="300" y="1220" width="480" height="84" rx="42" fill="${GOLD}"/>${text(540, 1277, "いちばん良い日", 46, "#111")}`) +
        rise(
          t,
          3.0,
          `${card(100, 1320, 880, 330)}
           <rect x="140" y="1360" width="250" height="250" rx="28" fill="#3a2a18"/>
           ${text(265, 1505, "お店", 50, GOLD)}
           ${text(430, 1430, "国分町の居酒屋", 52, "#fff", 900, "start")}
           ${text(430, 1495, "広瀬通駅 徒歩3分 ・ 3,000円〜", 36, MUTED, 700, "start")}
           <rect x="430" y="1530" width="150" height="62" rx="31" fill="#ffffff14"/>${text(505, 1573, "個室", 34, "#fff", 800)}
           <rect x="600" y="1530" width="210" height="62" rx="31" fill="#ffffff14"/>${text(705, 1573, "飲み放題", 34, "#fff", 800)}`,
        ) +
        rise(t, 4.2, text(540, 1760, "合いそうなお店を、自動で選ぶ", 46, "#fff", 800))
      );
    },
  },
  {
    sec: 6,
    draw(t) {
      const total = 46000 * easeOut((t - 0.4) / 1.0);
      const row = (start, y, label, sub, amount, color) =>
        rise(
          t,
          start,
          `<rect x="150" y="${y}" width="780" height="150" rx="30" fill="#ffffff0d"/>
           <rect x="150" y="${y}" width="14" height="150" rx="7" fill="${color}"/>
           ${text(200, y + 68, label, 46, "#fff", 900, "start")}
           ${text(200, y + 120, sub, 34, MUTED, 700, "start")}
           ${text(890, y + 95, amount, 64, color, 900, "end")}`,
        );
      return (
        head(t, "4", "会計もワンタップ", "飲まない人は、少なめにできる") +
        rise(
          t,
          0.3,
          `${card(100, 660, 880, 900)}
           ${text(540, 760, "合計", 44, MUTED, 700)}
           ${text(540, 880, `${yen(total)}円`, 120, "#fff")}`,
        ) +
        row(1.6, 960, "飲む人", "10人", "4,000円", GOLD) +
        row(2.1, 1140, "飲まない人", "2人", "3,000円", GREEN) +
        rise(t, 2.9, `<rect x="150" y="1350" width="780" height="120" rx="30" fill="${GOLD}"/>${text(540, 1430, "送る文をコピー", 50, "#111")}`) +
        rise(t, 3.8, text(540, 1700, "割り切れない端数も、自動で調整", 46, "#fff", 800))
      );
    },
  },
  {
    sec: 4.6,
    draw(t) {
      return (
        pop(t, 0, 540, 600, `<image href="${ICON_URI}" x="390" y="450" width="300" height="300"/>`, 0.45) +
        rise(t, 0.2, text(540, 960, "Tsudoro", 170, GOLD)) +
        rise(t, 0.35, text(540, 1080, "基本無料・登録なし", 64, "#fff", 900)) +
        rise(t, 0.6, `<rect x="270" y="1190" width="540" height="110" rx="55" fill="#fff"/>${text(540, 1263, "プロフのリンクから", 50, "#111")}`) +
        rise(t, 0.9, text(540, 1440, "保存して、次の幹事のときに", 48, MUTED, 800))
      );
    },
  },
];

const TOTAL = SCENES.reduce((s, sc) => s + sc.sec, 0);

function background(globalT) {
  // 暗い紺の地に、上から金色の光。いちばん上に、全体の進み具合の細い線
  const prog = (globalT / TOTAL) * (W - 120);
  return `<defs>
      <radialGradient id="bg" cx="50%" cy="30%" r="75%"><stop offset="0" stop-color="#16202c"/><stop offset="1" stop-color="#050608"/></radialGradient>
      <radialGradient id="glow" cx="50%" cy="18%" r="45%"><stop offset="0" stop-color="${GOLD}" stop-opacity="0.16"/><stop offset="1" stop-color="${GOLD}" stop-opacity="0"/></radialGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    <rect width="${W}" height="${H}" fill="url(#glow)"/>
    <rect x="60" y="150" width="${W - 120}" height="8" rx="4" fill="#ffffff1a"/>
    <rect x="60" y="150" width="${prog.toFixed(1)}" height="8" rx="4" fill="${GOLD}"/>`;
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const out = path.join(OUT, "v9_howto.mp4");
  const ff = spawn(
    "ffmpeg",
    [
      "-y", "-loglevel", "error",
      "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", `${W}x${H}`, "-r", String(FPS), "-i", "-",
      "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo",
      "-t", TOTAL.toFixed(2),
      "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-pix_fmt", "yuv420p",
      "-c:a", "aac", "-b:a", "128k", "-shortest", "-movflags", "+faststart", out,
    ],
    { stdio: ["pipe", "inherit", "inherit"] },
  );
  const write = (buf) => new Promise((res) => (ff.stdin.write(buf) ? res() : ff.stdin.once("drain", res)));

  const frames = Math.round(TOTAL * FPS);
  const previews = [];
  let sceneStart = 0;
  let si = 0;
  for (let f = 0; f < frames; f++) {
    const g = f / FPS;
    while (si < SCENES.length - 1 && g >= sceneStart + SCENES[si].sec) {
      sceneStart += SCENES[si].sec;
      si++;
    }
    const t = g - sceneStart;
    const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${background(g)}${SCENES[si].draw(t)}</svg>`;
    const raw = await sharp(Buffer.from(svg)).removeAlpha().raw().toBuffer();
    await write(raw);
    // 確認用: 各場面の終わりごろの1コマ
    if (Math.abs(t - (SCENES[si].sec - 0.4)) < 0.5 / FPS) previews.push(await sharp(Buffer.from(svg)).resize(216, 384).png().toBuffer());
    if (f % 150 === 0) process.stdout.write(`${f}/${frames}\n`);
  }
  ff.stdin.end();
  await new Promise((res, rej) => ff.on("close", (c) => (c === 0 ? res() : rej(new Error("ffmpeg " + c)))));
  await sharp({ create: { width: 216 * previews.length, height: 384, channels: 3, background: "#222" } })
    .composite(previews.map((input, i) => ({ input, left: i * 216, top: 0 })))
    .jpeg({ quality: 85 })
    .toFile(path.join(OUT, "v9_howto_preview.jpg"));
  console.log("ok", out, TOTAL.toFixed(1) + "s");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
