// public/tsudoro-icon.svg から、スマホアプリ(mobile/)のアイコンを書き出す。node scripts/make-app-icons.mjs
// Web のアイコン(scripts/make-icons.mjs)と同じ絵。地の色は svg の rect と同じ
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";

const svg = readFileSync("public/tsudoro-icon.svg", "utf8");
const BG = "#0b0a09";
const res = "mobile/android/app/src/main/res";
const density = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };

// 前景だけの絵(地の rect を外す)。アダプティブアイコンは 108dp のうち、まん中の 66dp ほどしか必ずは見えないので、
// 絵を 60% に縮めて中央に置く(端末ごとに丸や角丸に切り抜かれても、グラスと火花が欠けない)
const art = svg.replace(/<rect[^>]*\/>/, "");
const foreground = art.replace(/<svg([^>]*)>/, '<svg$1><g transform="translate(40 40) scale(0.6)">').replace("</svg>", "</g></svg>");

async function png(source, size, file) {
  mkdirSync(file.slice(0, file.lastIndexOf("/")), { recursive: true });
  await sharp(Buffer.from(source), { density: 72 * (size / 200) * 2 }).resize(size, size).png().toFile(file);
  console.log(file, size);
}

for (const [name, x] of Object.entries(density)) {
  // Android 7 以前と、ストアの一覧で使う四角いアイコン
  await png(svg, 48 * x, `${res}/mipmap-${name}/ic_launcher.png`);
  // Android 8 からのアダプティブアイコンの前景(108dp)
  await png(foreground, 108 * x, `${res}/mipmap-${name}/ic_launcher_foreground.png`);
}

mkdirSync(`${res}/mipmap-anydpi-v26`, { recursive: true });
writeFileSync(
  `${res}/mipmap-anydpi-v26/ic_launcher.xml`,
  `<?xml version="1.0" encoding="utf-8"?>
<!-- scripts/make-app-icons.mjs で書き出す。地は単色、前景はグラスと火花 -->
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
    <monochrome android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
`,
);
writeFileSync(
  `${res}/values/colors.xml`,
  `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">${BG}</color>
</resources>
`,
);

// Play ストアの掲載用(512px)
await png(svg, 512, "mobile/store/icon-512.png");

// Play ストアの「フィーチャー グラフィック」(1024×500)。黒い地に、アイコンの絵と名前(Poppins の太字)。
// 日本語の一言は Windows の游ゴシックで描く(ほかの OS で書き出すときは、そこにある日本語の字に変える)
const art512 = await sharp(Buffer.from(art), { density: 400 }).resize(360, 360).png().toBuffer();
const name = await sharp({
  text: { text: '<span foreground="#ffffff">Tsudoro</span>', font: "Poppins Bold 120", fontfile: "mobile/assets/fonts/Poppins-Bold.ttf", rgba: true, dpi: 72 },
}).png().toBuffer();
const lead = await sharp({
  text: { text: '<span foreground="#f5b83d">飲み会の日程とお店がすぐ決まる</span>', font: "Yu Gothic Bold 34", rgba: true, dpi: 72 },
}).png().toBuffer();
await sharp({ create: { width: 1024, height: 500, channels: 4, background: BG } })
  .composite([
    { input: art512, left: 60, top: 70 },
    { input: name, left: 450, top: 150 },
    { input: lead, left: 456, top: 310 },
  ])
  .png()
  .toFile("mobile/store/feature-1024x500.png");
console.log("mobile/store/feature-1024x500.png");
