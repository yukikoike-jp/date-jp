// Tsudoro のリール動画(縦 1080x1920)を作る。文字だけの動き(参考のリールと同じ、暗い背景に大きな文字を1つずつ出す形)。
// 実行: node scripts/make-reels.cjs   (ffmpeg が要る。出力は marketing/reels/)
// 音は付けない。Instagram で、流行の音源をあとから選ぶ

const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "marketing", "reels");
const ICON = path.join(ROOT, "public", "icon-512.png");
const FONT = "C:/Windows/Fonts/YuGothB.ttc";

const W = 1080;
const H = 1920;
const GOLD = "0xf5b83d";
const WHITE = "0xf5f1e8";
const DIM = "0x9a9488";

// 1つの場面: start〜end 秒。lines は上から順に並べる(色と大きさを行ごとに決める)
const REELS = {
  reel1: {
    title: "幹事の日程調整",
    scenes: [
      { s: 0, e: 2.8, lines: [{ t: "幹事、まだ", z: 112 }, { t: "LINEで", z: 112 }, { t: "日程聞いてる?", z: 112, c: GOLD }] },
      { s: 2.8, e: 5.6, lines: [{ t: "「その日、無理…」", z: 96 }, { t: "「私も…」", z: 96, c: DIM }] },
      { s: 5.6, e: 8.4, lines: [{ t: "全然", z: 120 }, { t: "決まらない", z: 120, c: GOLD }] },
      { s: 8.4, e: 12.4, lines: [{ t: "URL 1本で", z: 104 }, { t: "全員が答える", z: 104 }, { t: "○  △  ×", z: 150, c: GOLD }] },
      { s: 12.4, e: 15.6, lines: [{ t: "日程も", z: 112 }, { t: "お店も", z: 112 }, { t: "決まった", z: 128, c: GOLD }] },
    ],
    end: { s: 15.6, e: 18.6, note: "登録なし・無料" },
  },
  reel2: {
    title: "割り勘",
    scenes: [
      { s: 0, e: 2.8, lines: [{ t: "先輩だけ", z: 112 }, { t: "多めに出す", z: 112 }, { t: "割り勘、悩んでない?", z: 84, c: GOLD }] },
      { s: 2.8, e: 5.8, lines: [{ t: "「1.3倍で…", z: 100 }, { t: "端数は…」", z: 100, c: DIM }] },
      { s: 5.8, e: 10.5, lines: [{ t: "合計を入れるだけ", z: 96 }, { t: "一人ずつの", z: 104 }, { t: "金額が出る", z: 120, c: GOLD }] },
    ],
    end: { s: 10.5, e: 14.5, note: "傾斜で割る" },
  },
  reel3: {
    title: "2次会",
    scenes: [
      { s: 0, e: 2.8, lines: [{ t: "2次会が", z: 120 }, { t: "静かなときの", z: 120 }, { t: "最終手段", z: 132, c: GOLD }] },
      { s: 2.8, e: 5.6, lines: [{ t: "ワードウルフ", z: 128, c: GOLD }] },
      { s: 5.6, e: 10.2, lines: [{ t: "配るだけで", z: 112 }, { t: "一気に", z: 112 }, { t: "盛り上がる", z: 128, c: GOLD }] },
    ],
    end: { s: 10.2, e: 14.2, note: "Play" },
  },
};

function esc(text) {
  // drawtext は textfile で渡すので、ここでの特別な文字の処理は要らない
  return text;
}

function build(name, reel, work) {
  const total = reel.end.e;
  const filters = [];
  let input = "[0:v]";
  let n = 0;
  const next = () => `[v${++n}]`;

  // 上の進み具合の線と、下の金色の線
  let out = next();
  filters.push(`${input}drawbox=x=0:y=0:w='${W}*t/${total}':h=10:color=${GOLD}:t=fill${out}`);
  input = out;
  out = next();
  filters.push(`${input}drawbox=x=${W / 2 - 60}:y=${H - 140}:w=120:h=8:color=${GOLD}@0.8:t=fill${out}`);
  input = out;

  const fade = (s, e) => `if(lt(t,${s}),0,if(lt(t,${s + 0.3}),(t-${s})/0.3,if(lt(t,${e - 0.25}),1,max(0,(${e}-t)/0.25))))`;

  reel.scenes.forEach((sc, si) => {
    const heights = sc.lines.map((l) => Math.round(l.z * 1.4));
    const sum = heights.reduce((a, b) => a + b, 0);
    let y = Math.round((H - sum) / 2) - 60;
    sc.lines.forEach((l, li) => {
      const file = `t_${name}_${si}_${li}.txt`;
      fs.writeFileSync(path.join(work, file), esc(l.t), "utf8");
      const slide = `40*max(0,1-(t-${sc.s + li * 0.12})/0.35)`;
      out = next();
      filters.push(
        `${input}drawtext=fontfile=font.ttc:textfile=${file}:fontsize=${l.z}:fontcolor=${l.c ?? WHITE}:x=(w-text_w)/2:y='${y}+${slide}':alpha='${fade(sc.s + li * 0.12, sc.e)}'${out}`,
      );
      input = out;
      y += heights[li];
    });
  });

  // 最後の場面: アイコン・名前・案内
  const { s, e, note } = reel.end;
  out = next();
  filters.push(`[1:v]scale=300:300,format=rgba,fade=t=in:st=${s}:d=0.4:alpha=1[ic]`);
  filters.push(`${input}[ic]overlay=x=(W-w)/2:y=470:enable='between(t,${s},${e})'${out}`);
  input = out;
  const endLines = [
    { t: "Tsudoro", z: 150, c: GOLD, y: 840 },
    { t: note, z: 84, c: WHITE, y: 1080 },
    { t: work ? "プロフのリンクから" : "プロフのリンクから", z: 76, c: GOLD, y: 1240 },
  ];
  endLines.forEach((l, i) => {
    const file = `t_${name}_end_${i}.txt`;
    fs.writeFileSync(path.join(work, file), l.t, "utf8");
    out = next();
    filters.push(
      `${input}drawtext=fontfile=font.ttc:textfile=${file}:fontsize=${l.z}:fontcolor=${l.c}:x=(w-text_w)/2:y=${l.y}:alpha='${fade(s + 0.2 + i * 0.15, e + 0.25)}'${out}`,
    );
    input = out;
  });

  return { filter: filters.join(";"), last: input };
}

function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const work = fs.mkdtempSync(path.join(os.tmpdir(), "tsudoro-reel-"));
  fs.copyFileSync(FONT, path.join(work, "font.ttc"));
  fs.copyFileSync(ICON, path.join(work, "icon.png"));

  for (const [name, reel] of Object.entries(REELS)) {
    const { filter, last } = build(name, reel, work);
    const total = reel.end.e;
    const args = [
      "-y",
      "-f", "lavfi", "-i", `color=c=0x0b0a08:s=${W}x${H}:r=30:d=${total}`,
      "-loop", "1", "-t", String(total), "-i", "icon.png",
      "-filter_complex", filter,
      "-map", last,
      "-t", String(total),
      "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", "30", "-crf", "18", "-movflags", "+faststart",
      path.join(OUT, `${name}.mp4`),
    ];
    try {
      execFileSync("ffmpeg", args, { cwd: work, stdio: ["ignore", "ignore", "pipe"] });
    } catch (e) {
      console.error(String(e.stderr ?? e.message).slice(-600));
      process.exit(1);
    }
    console.log("ok", name, reel.title, `${total}s`);
  }
}

main();
