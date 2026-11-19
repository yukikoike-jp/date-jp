/* eslint-disable @typescript-eslint/no-require-imports */
// SNS のアカウント用アイコンを、3案つくる(1080x1080、ノイズなしの PNG)。
// 実行: node scripts/make-account-icons.cjs   出力: marketing/icon/account-A.png など

const sharp = require("sharp");
const fs = require("node:fs");
const path = require("node:path");

const OUT = path.join(__dirname, "..", "marketing", "icon");
const S = 1080;

// グラスの形(サイトのアイコンと同じ)。fill = 中身、stroke = 縁
const glass = (fill, stroke, sw = 3) => `
  <path d="M12.4 30h35.2l-3.3 47.6a4.6 4.6 0 0 1-4.6 4.3H20.3a4.6 4.6 0 0 1-4.6-4.3z" fill="${fill}"/>
  <path d="M10 18h40l-4 60a6 6 0 0 1-6 6H20a6 6 0 0 1-6-6z" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"/>`;

/** 乾杯するグラス(中心 cx,cy、大きさ k) */
function cheers(cx, cy, k, fill, stroke, sw = 3, rays = "#f5b83d") {
  const left = `translate(${cx - 77 * k} ${cy - 56 * k}) scale(${1.3 * k}) rotate(10 30 54)`;
  const right = `translate(${cx + 77 * k} ${cy - 56 * k}) scale(${-1.3 * k} ${1.3 * k}) rotate(10 30 54)`;
  return `
    <g stroke="${rays}" stroke-width="${5 * k}" stroke-linecap="round" fill="none">
      <path d="M${cx} ${cy - 74 * k}v${18 * k}M${cx - 20 * k} ${cy - 68 * k}l${8 * k} ${14 * k}M${cx + 20 * k} ${cy - 68 * k}l${-8 * k} ${14 * k}"/>
    </g>
    <g transform="${left}">${glass(fill, stroke, sw)}</g>
    <g transform="${right}">${glass(fill, stroke, sw)}</g>`;
}

const defs = `<defs>
  <radialGradient id="glow" cx="50%" cy="46%" r="55%"><stop offset="0" stop-color="#f5b83d" stop-opacity="0.38"/><stop offset="0.55" stop-color="#f5b83d" stop-opacity="0.06"/><stop offset="1" stop-color="#f5b83d" stop-opacity="0"/></radialGradient>
  <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd978"/><stop offset="1" stop-color="#f09a1a"/></linearGradient>
  <linearGradient id="beer" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe08a"/><stop offset="1" stop-color="#f2a21f"/></linearGradient>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#15130f"/><stop offset="1" stop-color="#050505"/></linearGradient>
  <filter id="soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="22"/></filter>
</defs>`;

const A = `<svg width="${S}" height="${S}" viewBox="0 0 ${S} ${S}" xmlns="http://www.w3.org/2000/svg">${defs}
  <rect width="${S}" height="${S}" fill="url(#bg)"/>
  <rect width="${S}" height="${S}" fill="url(#glow)"/>
  ${cheers(540, 560, 4.7, "url(#beer)", "#f8f1e4", 3)}
</svg>`;

// 太い金色の「T」(ロゴの文字だけ。乾杯の光の線を添える)
const B = `<svg width="${S}" height="${S}" viewBox="0 0 ${S} ${S}" xmlns="http://www.w3.org/2000/svg">${defs}
  <rect width="${S}" height="${S}" fill="#0a0a0a"/>
  <rect width="${S}" height="${S}" fill="url(#glow)"/>
  <g fill="url(#gold)"><rect x="200" y="300" width="680" height="170" rx="40"/><rect x="455" y="300" width="170" height="520" rx="40"/></g>
  <g stroke="#f5b83d" stroke-width="22" stroke-linecap="round" fill="none"><path d="M540 130v90M440 160l40 70M640 160l-40 70"/></g>
</svg>`;

// 夜の街のネオン(リール v6/v7 と同じ雰囲気)
function skyline() {
  let seed = 11;
  const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  let g = "";
  for (let x = 0; x < S; ) {
    const w = 50 + r() * 80;
    const h = 140 + r() * 300;
    g += `<rect x="${x}" y="${S - h}" width="${w}" height="${h}" fill="#05080d" stroke="#0e2233" stroke-width="2"/>`;
    for (let wy = S - h + 16; wy < S - 14; wy += 26)
      for (let wx = x + 10; wx < x + w - 12; wx += 20) if (r() < 0.3) g += `<rect x="${wx}" y="${wy}" width="8" height="11" fill="${r() < 0.85 ? "#f2c46a" : "#7fe3ff"}" opacity="${0.55 + r() * 0.45}"/>`;
    x += w + 8;
  }
  return g;
}
const C = `<svg width="${S}" height="${S}" viewBox="0 0 ${S} ${S}" xmlns="http://www.w3.org/2000/svg">${defs}
  <defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000"/><stop offset="0.7" stop-color="#0a1a2a"/><stop offset="1" stop-color="#03060b"/></linearGradient></defs>
  <rect width="${S}" height="${S}" fill="url(#sky)"/>
  ${skyline()}
  <rect width="${S}" height="${S}" fill="url(#glow)"/>
  <g filter="url(#soft)" opacity="0.8">${cheers(540, 470, 4.1, "#f5b83d", "#f5b83d", 3)}</g>
  ${cheers(540, 470, 4.1, "url(#beer)", "#f8f1e4", 3)}
</svg>`;

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const circle = Buffer.from(`<svg width="${S}" height="${S}"><circle cx="540" cy="540" r="540" fill="#fff"/></svg>`);
  const tiles = [];
  for (const [name, svg] of [["A", A]]) {
    const file = path.join(OUT, `account-${name}.png`);
    await sharp(Buffer.from(svg), { density: 144 }).resize(S, S).png({ compressionLevel: 9 }).toFile(file);
    tiles.push(await sharp(await sharp(file).composite([{ input: circle, blend: "dest-in" }]).png().toBuffer()).resize(360, 360).png().toBuffer());
  }
  await sharp({ create: { width: 1140, height: 380, channels: 3, background: "#2a2a2a" } })
    .composite(tiles.map((input, i) => ({ input, left: 10 + i * 375, top: 10 })))
    .png()
    .toFile(path.join(OUT, "account-preview.png"));
  console.log("ok");
})();
