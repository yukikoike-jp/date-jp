/* eslint-disable @typescript-eslint/no-require-imports */
// Tsudoro のリール動画 v3(縦 1080x1920・声つき)。
// - 声: VOICEVOX(ローカルのエンジン http://127.0.0.1:50021)で台本を読み上げる。声の長さに合わせて場面の長さを決める
// - 画: 写真素材(Pexels)をパンし、場面の頭でズームの「パンチ」、最初の場面だけ揺らす
// - 字: 要点を黄色い帯で大きく、話している文を下に字幕で出す
// - 音: 場面の切り替えに「シュッ」、帯が出るときに「ポン」(ffmpeg で作る効果音)
// 実行: VOICEVOX のエンジンを起動してから  node scripts/make-reels-v3.cjs [声の名前]
// 出力: marketing/reels/v3_reel1.mp4 など

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
const XF = 0.2;
const GOLD = "0xf5b83d";
const VOICE_NAME = process.argv[2] || "No.7";
const VOICE_STYLE = process.argv[3] || "アナウンス";

// 場面: img = 写真、tags = 黄色い帯、say = 読み上げ(読み方はカタカナで書く)、card = 重ねる絵、blur = ぼかす
const REELS = {
  reel1: [
    { img: "6669813", hook: true, tags: ["POV:", "飲み会の幹事になった"], say: "飲み会の幹事、日程調整で地獄見てない?" },
    { img: "9898393", tags: ["既読スルー"], say: "ラインで聞いても、既読スルー。" },
    { img: "6892902", tags: ["候補日 出し直し"], say: "候補日を出し直して、また出し直して。" },
    { img: "8197506", tags: ["もう無理…"], say: "もう無理。" },
    { img: "6669784", blur: true, card: "app", tags: ["URL 1本", "○△×で答えるだけ"], say: "そんなときはツドロ。URLを1本送るだけで、みんなが丸、三角、バツで答えてくれる。" },
    { img: "6605275", tags: ["日程もお店も", "一瞬で決定"], say: "日程もお店も、一瞬で決まる。" },
    { end: "登録なし・無料", ask: "あなたの幹事あるあるは?", say: "登録なし、無料。プロフのリンクから。" },
  ],
  reel2: [
    { img: "7680736", hook: true, tags: ["POV:", "飲み会のお会計"], say: "飲み会のあとの割り勘、地獄じゃない?" },
    { img: "5900233", tags: ["先輩は1.3倍…"], say: "先輩は一点三倍で、後輩は少なめで。" },
    { img: "6173661", tags: ["端数どうする…"], say: "端数、どうする?" },
    { img: "9961852", blur: true, card: "split", tags: ["合計を入れるだけ", "一人ずつの金額が出る"], say: "ツドロなら、合計を入れるだけ。先輩多めの傾斜も、一瞬で計算。" },
    { img: "9961849", tags: ["幹事も笑顔で", "お会計おわり"], say: "幹事も笑顔で、お会計おわり。" },
    { end: "傾斜で割る", ask: "割り勘の悩み、コメントで教えて", say: "登録なし、無料。プロフのリンクから。" },
  ],
  reel3: [
    { img: "6173675", hook: true, tags: ["2次会で", "急に静かになる"], say: "二次会で、急に静かになる、あの空気。" },
    { img: "9898393", tags: ["そんなときは"], say: "そんなときは。" },
    { img: "9961851", blur: true, card: "cards", tags: ["ワードウルフ", "1人だけ違うお題"], say: "ワードウルフ。みんなに同じお題、一人だけ違うお題。" },
    { img: "8153998", tags: ["ウルフは", "誰だ!?"], say: "ウルフは、誰だ?" },
    { img: "3851302", tags: ["配るだけで", "一気に盛り上がる"], say: "スマホで配るだけで、一気に盛り上がる。" },
    { end: "Play", ask: "次の2次会で使ってみて", say: "ツドロのプレイで。プロフのリンクから。" },
  ],
};

async function speakerId(name) {
  const res = await fetch(`${ENGINE}/speakers`);
  const list = await res.json();
  for (const s of list) {
    if (s.name !== name) continue;
    const st = s.styles.find((x) => x.name === VOICE_STYLE) ?? s.styles[0];
    return { id: st.id, name: s.name, style: st.name };
  }
  throw new Error(`声が見つかりません: ${name}(候補: ${list.map((s) => s.name).join(", ")})`);
}

async function synth(text, speaker, file) {
  const q = await fetch(`${ENGINE}/audio_query?text=${encodeURIComponent(text)}&speaker=${speaker}`, { method: "POST" });
  const query = await q.json();
  query.speedScale = 1.12; // 少し早口(ショート動画向け)
  query.intonationScale = 1.15;
  query.prePhonemeLength = 0.05;
  query.postPhonemeLength = 0.08;
  const s = await fetch(`${ENGINE}/synthesis?speaker=${speaker}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(query) });
  fs.writeFileSync(file, Buffer.from(await s.arrayBuffer()));
}

function duration(file) {
  return Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]).toString().trim());
}

async function gradient(file) {
  const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#000" stop-opacity="0.55"/><stop offset="0.22" stop-color="#000" stop-opacity="0"/>
    <stop offset="0.5" stop-color="#000" stop-opacity="0.05"/><stop offset="1" stop-color="#000" stop-opacity="0.9"/></linearGradient></defs>
    <rect width="100%" height="100%" fill="url(#g)"/></svg>`;
  await sharp(Buffer.from(svg)).png().toFile(file);
}

/** 字幕を、1行 max 文字で折り返す(句読点のあとで切れるようにする) */
function wrap(text, max = 15) {
  const out = [];
  let line = "";
  const chars = [...text];
  chars.forEach((ch, i) => {
    line += ch;
    // 句読点で行が始まらないようにする
    const nextIsMark = "、。?!".includes(chars[i + 1] ?? "");
    if (!nextIsMark && (line.length >= max || (line.length >= max - 5 && "、。?!".includes(ch)))) {
      out.push(line);
      line = "";
    }
  });
  if (line) out.push(line);
  return out.slice(0, 3);
}

function fade(s, e) {
  return `if(lt(t,${s}),0,if(lt(t,${s + 0.18}),(t-${s})/0.18,if(lt(t,${e - 0.12}),1,max(0,(${e}-t)/0.12))))`;
}

function scene(sc, i, name, work, credit) {
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
  let last;
  if (sc.end) {
    inputs.push("-f", "lavfi", "-i", `color=c=0x0b0a08:s=${W}x${H}:r=${FPS}:d=${d}`);
    inputs.push("-loop", "1", "-t", String(d), "-i", "icon.png");
    filters.push(`[1:v]scale=320:320,format=rgba,fade=t=in:st=0:d=0.3:alpha=1[ic]`);
    filters.push(`[0:v][ic]overlay=x=(W-w)/2:y=380-60*max(0\\,1-t/0.35)[a]`);
    last = "[a]";
    const lines = [
      { t: "Tsudoro", z: 160, c: GOLD, y: 760, s: 0.1 },
      { t: sc.end, z: 88, c: "0xf5f1e8", y: 990, s: 0.25 },
      { t: "プロフのリンクから", z: 80, c: "0x000000", y: 1170, s: 0.4, box: true },
      { t: sc.ask, z: 58, c: "0xf5f1e8", y: 1340, s: 0.7 },
      { t: credit, z: 34, c: "0x8a8478", y: 1440, s: 0 },
    ];
    lines.forEach((l, k) => {
      const next = `[e${k}]`;
      const box = l.box ? `:box=1:boxcolor=${GOLD}:boxborderw=26` : "";
      filters.push(
        `${last}drawtext=fontfile=font.ttc:textfile=${textFile(l.t)}:fontsize=${l.z}:fontcolor=${l.c}${box}:x=(w-text_w)/2:y='${l.y}+40*max(0\\,1-(t-${l.s})/0.28)':alpha='${fade(l.s, d + 1)}'${next}`,
      );
      last = next;
    });
  } else {
    inputs.push("-loop", "1", "-t", String(d), "-i", `p_${sc.img}.jpg`);
    inputs.push("-loop", "1", "-t", String(d), "-i", "grad.png");
    const dir = i % 2 === 0 ? 1 : -1;
    // 縦いっぱいに広げ(少し大きめ)、頭の0.25秒でズームの「パンチ」、そのあと横にゆっくり動かす
    let base = `[0:v]scale=-2:${Math.round(H * 1.15)},scale=w='iw*(1+0.14*max(0\\,1-t/0.25))':h=-2:eval=frame`;
    const shake = sc.hook ? `+14*sin(t*55)*max(0\\,1-t/0.5)` : "";
    base += `,crop=${W}:${H}:x='(iw-${W})/2+${dir}*min((iw-${W})/2\\,60)*(t/${d}-0.5)*2${shake}':y='(ih-${H})/2${shake}'`;
    if (sc.blur) base += `,boxblur=18:2,eq=brightness=-0.18`;
    filters.push(`${base},setsar=1[bg]`);
    filters.push(`[bg][1:v]overlay=0:0[g]`);
    last = "[g]";
    if (sc.card) {
      inputs.push("-loop", "1", "-t", String(d), "-i", `card_${sc.card}.png`);
      filters.push(`[2:v]scale=500:-1,format=rgba,fade=t=in:st=0.05:d=0.25:alpha=1[cd]`);
      filters.push(`${last}[cd]overlay=x=(W-w)/2:y='240+120*max(0\\,1-(t-0.05)/0.3)'[c]`);
      last = "[c]";
    }
    const big = sc.tags.some((t) => t.length > 9) ? 84 : 104;
    const tagH = Math.round(big * 1.75);
    // インスタの画面の上(約250px)と下(約450px)は、ボタンや説明文に隠れるので使わない
    let y = sc.card ? 1010 - (sc.tags.length - 1) * 50 : 820 - (sc.tags.length - 1) * 70;
    sc.tags.forEach((t, k) => {
      const s = 0.08 + k * 0.22;
      const next = `[t${k}]`;
      filters.push(
        `${last}drawtext=fontfile=font.ttc:textfile=${textFile(t)}:fontsize=${big}:fontcolor=black:box=1:boxcolor=${GOLD}:boxborderw=24:x='(w-text_w)/2+${k % 2 === 0 ? -1 : 1}*260*max(0\\,1-(t-${s})/0.2)':y=${y}:alpha='${fade(s, d + 1)}'${next}`,
      );
      last = next;
      y += tagH;
    });
    // 話している文の字幕(下)
    const lines = wrap(sc.say);
    let sy = 1260;
    lines.forEach((l, k) => {
      const next = `[u${k}]`;
      filters.push(`${last}drawtext=fontfile=font.ttc:textfile=${textFile(l)}:fontsize=58:fontcolor=white:borderw=7:bordercolor=black:x=(w-text_w)/2:y=${sy}${next}`);
      last = next;
      sy += 80;
    });
  }
  filters.push(`${last}format=yuv420p[v]`);
  execFileSync(
    "ffmpeg",
    ["-y", ...inputs, "-filter_complex", filters.join(";"), "-map", "[v]", "-t", String(d), "-r", String(FPS), "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p", out],
    { cwd: work, stdio: ["ignore", "ignore", "pipe"] },
  );
  return out;
}

function sfx(work) {
  // シュッ(ピンクノイズを帯域で絞って、短く出し入れ)と、ポン(短い高い音)
  execFileSync("ffmpeg", ["-y", "-f", "lavfi", "-i", "anoisesrc=d=0.32:c=pink:a=0.6", "-af", "highpass=f=600,lowpass=f=6000,afade=t=in:d=0.12,afade=t=out:st=0.14:d=0.18,volume=0.5", "whoosh.wav"], { cwd: work, stdio: "ignore" });
  execFileSync("ffmpeg", ["-y", "-f", "lavfi", "-i", "sine=f=1046:d=0.09", "-af", "afade=t=out:st=0.02:d=0.07,volume=0.35", "pop.wav"], { cwd: work, stdio: "ignore" });
}

function join(name, scenes, files, work) {
  const total = scenes.reduce((a, s) => a + s.d, 0) - XF * (files.length - 1);
  const args = ["-y"];
  files.forEach((f) => args.push("-i", f));
  const audioStart = files.length;
  scenes.forEach((s, k) => args.push("-i", `v_${name}_${k}.wav`));
  args.push("-i", "whoosh.wav", "-i", "pop.wav");
  const wIdx = audioStart + scenes.length;
  const pIdx = wIdx + 1;
  const filters = [];
  let last = "[0:v]";
  let offset = 0;
  const starts = [0];
  const kinds = ["slideleft", "slideup", "slideleft", "zoomin", "slideleft", "slideup"];
  for (let k = 1; k < files.length; k++) {
    offset += scenes[k - 1].d - XF;
    starts.push(offset);
    const next = `[x${k}]`;
    filters.push(`${last}[${k}:v]xfade=transition=${kinds[(k - 1) % kinds.length]}:duration=${XF}:offset=${offset.toFixed(3)}${next}`);
    last = next;
  }
  filters.push(`${last}drawbox=x=0:y=0:w='${W}*t/${total.toFixed(3)}':h=12:color=${GOLD}:t=fill,format=yuv420p[v]`);
  // 声は各場面の頭から(少し遅らせる)。シュッは切り替えの位置、ポンは帯が出る位置
  const mix = [];
  scenes.forEach((s, k) => {
    const ms = Math.round((starts[k] + 0.12) * 1000);
    filters.push(`[${audioStart + k}:a]adelay=${ms}|${ms},volume=1.6[n${k}]`);
    mix.push(`[n${k}]`);
  });
  const cuts = starts.slice(1);
  filters.push(`[${wIdx}:a]asplit=${cuts.length}${cuts.map((_, k) => `[w${k}]`).join("")}`);
  cuts.forEach((c, k) => {
    const ms = Math.max(0, Math.round((c - 0.08) * 1000));
    filters.push(`[w${k}]adelay=${ms}|${ms}[wd${k}]`);
    mix.push(`[wd${k}]`);
  });
  const pops = starts.slice(0, -1).map((s) => s + 0.1);
  filters.push(`[${pIdx}:a]asplit=${pops.length}${pops.map((_, k) => `[p${k}]`).join("")}`);
  pops.forEach((p, k) => {
    const ms = Math.round(p * 1000);
    filters.push(`[p${k}]adelay=${ms}|${ms}[pd${k}]`);
    mix.push(`[pd${k}]`);
  });
  filters.push(`${mix.join("")}amix=inputs=${mix.length}:normalize=0,apad,atrim=0:${total.toFixed(3)},loudnorm=I=-14:TP=-1.5:LRA=11,aformat=sample_rates=44100:channel_layouts=stereo[a]`);
  args.push("-filter_complex", filters.join(";"), "-map", "[v]", "-map", "[a]", "-c:v", "libx264", "-crf", "19", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", path.join(OUT, `v3_${name}.mp4`));
  execFileSync("ffmpeg", args, { cwd: work, stdio: ["ignore", "ignore", "pipe"] });
  return total;
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const work = fs.mkdtempSync(path.join(os.tmpdir(), "tsudoro-reel3-"));
  fs.copyFileSync(FONT, path.join(work, "font.ttc"));
  fs.copyFileSync(ICON, path.join(work, "icon.png"));
  for (const f of fs.readdirSync(ASSETS).filter((x) => /^p_\d+\.jpg$/.test(x))) fs.copyFileSync(path.join(ASSETS, f), path.join(work, f));
  // アプリの画面を模した絵は、v2 と同じものを使う
  const { card } = require("./make-reels-v2.cjs");
  for (const k of ["app", "split", "cards"]) await card(k, path.join(work, `card_${k}.png`));
  await gradient(path.join(work, "grad.png"));
  sfx(work);
  const voice = await speakerId(VOICE_NAME);
  const credit = `VOICEVOX:${voice.name}`;
  for (const [name, scenes] of Object.entries(REELS)) {
    try {
      for (let k = 0; k < scenes.length; k++) {
        const f = path.join(work, `v_${name}_${k}.wav`);
        await synth(scenes[k].say, voice.id, f);
        // 声の長さ + 少しの余白。短すぎる場面は 1.2 秒にそろえる。最後の場面は長めに見せる
        scenes[k].d = Math.max(1.2, duration(f) + 0.35) + (scenes[k].end ? 1.2 : 0);
      }
      const files = scenes.map((sc, i) => scene(sc, i, name, work, credit));
      const total = join(name, scenes, files, work);
      console.log("ok", name, `${total.toFixed(1)}s`, credit);
    } catch (e) {
      console.error(name, String(e.stderr ?? e.message).slice(-800));
      process.exit(1);
    }
  }
}

main();
