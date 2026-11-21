"use client";

import { Armchair, CalendarClock, ClipboardList, Crown, Dices, Eye, EyeOff, Lock, LockOpen, Megaphone, MessageCircleQuestion, PartyPopper, Plus, Shuffle, Timer, Users, VenetianMask, Wallet } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { DEMO_NAMES, LIE_THEMES, SEAT_LAYOUTS, maxTables, parseNames, pickIndex, seatExitIndex, seatTables, shuffle, type SeatLayout } from "@/lib/fun";
import { SYNC_THEMES, wordWolf } from "@/lib/games";
import { PILL, PILL_OFF, PILL_ON } from "./ui";
import { CHECKLIST, timeline } from "@/lib/work";
import { CollectList } from "./CollectList";
import { ProPaywall, useFunAccess } from "./ProGate";
import { clock, yen } from "@/lib/sendai";

// 有料プレミアムの「Play」(ワードウルフ・NGワード・ウソはどれ?・ルーレット。ワードウルフは無料)。会社の会でも遊べるものだけにする(2026-11-21)
// 買う前は、遊びの名前(タブ)だけ見られる。遊び方や中身は出さない(2026-11-17。中身を見せると、お金を払う理由がなくなるため)。
// 鍵のかかり方は lib/billing.ts の hasFun(支払いの準備ができていなくても、買うまでは鍵をかけたまま)

const NAMES_KEY = "date:fun-names";
type Tool = "wolf" | "sync" | "lie" | "wheel" | "memo" | "seat" | "schedule" | "collect";
const PLAY_TOOLS: { key: Tool; label: string; icon: typeof Crown }[] = [
  // 無料で使えるルーレットを左上に(2026-11-21)
  { key: "wheel", label: "ルーレット", icon: Dices },
  { key: "wolf", label: "ワードウルフ", icon: VenetianMask },
  { key: "sync", label: "せーの!", icon: Megaphone },
  { key: "lie", label: "ウソはどれ?", icon: MessageCircleQuestion },
];

/** Support: 幹事の道具。集金チェックが主役で、席決め・幹事メモ・進行表だけに絞る(2026-11-20。お礼・ご連絡と話題ガチャは外した) */
const WORK_TOOLS: { key: Tool; label: string; icon: typeof Crown }[] = [
  // 無料で使える幹事メモを左上に(2026-11-21)
  { key: "memo", label: "幹事メモ", icon: ClipboardList },
  { key: "collect", label: "集金チェック", icon: Wallet },
  { key: "seat", label: "席決め", icon: Armchair },
  { key: "schedule", label: "進行表", icon: CalendarClock },
];

/** 道具ごとの色(飽きないように、黄色と黒だけにしない)。色の定義は app/globals.css の .tone-* */
type Tone = "gold" | "red" | "blue" | "green" | "purple" | "orange" | "cyan";
const TOOL_TONE: Record<Tool, Tone> = {
  wolf: "purple",
  sync: "red",
  lie: "gold",
  wheel: "cyan",
  memo: "purple",
  seat: "orange",
  schedule: "red",
  collect: "green",
};

/** 買わなくても使える道具(幹事メモと、Play のルーレット。ワードウルフは 11-21 に有料へ戻した。2026-11-21。集金チェックは Tsudoro+ の主役にした) */
const FREE_TOOLS: Tool[] = ["memo", "wheel"];

/** 名前を入れる道具(話題・ひとこと・メモには要らない) */
const NEEDS_NAMES: Tool[] = ["wolf", "lie", "wheel", "seat"];

/** Tsudoro+(有料・買い切り)の印。鍵のマークだけ(買う前かどうかは、上の案内に書く) */
function PackBadge({ locked }: { locked: boolean }) {
  const Icon = locked ? Lock : LockOpen;
  return (
    <span
      className="inline-grid size-7 shrink-0 place-items-center rounded-full border border-accent/50 text-accent"
      role="img"
      aria-label={locked ? "Tsudoro+(未購入)" : "Tsudoro+(購入済み)"}
    >
      <Icon className="size-3.5" aria-hidden />
    </span>
  );
}

export function FunClient() {
  const access = useFunAccess();
  const locked = !access.unlocked;
  // 会社の会は、会社向けの道具。学生とプライベートは同じ遊び。会の種類は、この端末に残っている選んだ値から読む
  // Play か Support か。最初は会の種類(仕事なら Support)。買えばどちらも使えるので、上のボタンか左右のスワイプで切り替える
  const [side, setSide] = useState<"play" | "support">("support");
  const company = side === "support";
  const [tool, setTool] = useState<Tool>("memo");
  // 最初はどの会の種類でも Support の幹事メモ(無料。2026-11-21)。会計から(?tab=collect)来たときだけ集金チェック
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("tab") === "collect") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTool("collect");
    }
  }, []);
  function chooseSide(next: "play" | "support") {
    if (next === side) return;
    setSide(next);
    setTool(next === "support" ? "memo" : "wheel");
    setShowBuy(false);
  }
  // 左右にスワイプ(入力欄・選ぶ欄の上から始めたときは、切り替えない)
  const swipe = useRef<{ x: number; y: number } | null>(null);
  function swipeStart(e: React.TouchEvent) {
    const t = e.touches[0];
    swipe.current = (e.target as HTMLElement).closest("input,textarea,select") ? null : { x: t.clientX, y: t.clientY };
  }
  function swipeEnd(e: React.TouchEvent) {
    const s0 = swipe.current;
    swipe.current = null;
    if (!s0) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - s0.x;
    const dy = t.clientY - s0.y;
    if (Math.abs(dx) > 70 && Math.abs(dy) < 45) chooseSide(dx < 0 ? "play" : "support");
  }
  const TOOLS = company ? WORK_TOOLS : PLAY_TOOLS;
  const [text, setText] = useState(DEMO_NAMES.join("\n"));
  const [showBuy, setShowBuy] = useState(false);
  // 無料で自由に使える道具。買う前でも、もやをかけず、名前も入れられる
  const toolLocked = locked && !FREE_TOOLS.includes(tool);

  // 買ったあと(鍵が開いたあと)は、前に入れた名前を思い出す
  useEffect(() => {
    if (access.loading) return;
    try {
      const saved = localStorage.getItem(NAMES_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved) setText(saved);
    } catch {}
  }, [access.loading]);

  const names = useMemo(() => (toolLocked ? DEMO_NAMES : parseNames(text)), [toolLocked, text]);

  function edit(v: string) {
    setText(v);
    try {
      localStorage.setItem(NAMES_KEY, v);
    } catch {}
  }

  return (
    <div className="mx-auto min-h-[70vh] max-w-xl pt-6 pb-16" onTouchStart={swipeStart} onTouchEnd={swipeEnd}>
      <div className="px-4">
        <h1 className="sr-only">Play と Support</h1>
        {/* Play と Support。どちらも Tsudoro+ で使える。左右にスワイプしても切り替わる */}
        <div role="tablist" aria-label="Play と Support" className="grid grid-cols-2 gap-1 rounded-2xl bg-surface-2 p-1">
          {(["support", "play"] as const).map((k) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={side === k}
              onClick={() => chooseSide(k)}
              className={`font-logo min-h-11 rounded-xl text-xl font-black tracking-tight transition-all active:scale-[0.98] ${side === k ? "bg-accent text-accent-text shadow" : "text-muted hover:text-text"}`}
            >
              {k === "play" ? "Play" : "Support"}
            </button>
          ))}
        </div>
        <p className="mt-2 flex items-center gap-2 text-sm text-muted">
          {/* Tsudoro+ の説明は、プライベートも仕事も同じ(2026-11-21) */}
          幹事の仕事を徹底的にサポート
          {/* 買う前は、もやの上のボタンだけにする(黄色いものを2つ出さない)。買ったあとは開いた鍵の印 */}
          {!access.loading && !locked && <PackBadge locked={locked} />}
        </p>
      </div>

      {/* 道具の切り替え */}
      {/* 3つずつ並べる。余りが2つのとき(5つのとき)は、下の段の2つを広げて、きれいにそろえる */}
      <div className="mx-4 mt-4 grid grid-cols-6 gap-1 rounded-2xl bg-surface-2 p-1" role="tablist" aria-label="遊び">
        {TOOLS.map(({ key, label, icon: Icon }, i) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tool === key}
            onClick={() => setTool(key)}
            className={`${
              // 3つずつ並べる。余りが2つのときは最後の2つを半分ずつ、1つのときは最後の1つを横いっぱいに
              // 4つのとき(Support)は2つずつ2段
              TOOLS.length === 4 ? "col-span-3" : TOOLS.length % 3 === 2 && i >= TOOLS.length - 2 ? "col-span-3" : TOOLS.length % 3 === 1 && i === TOOLS.length - 1 ? "col-span-6" : "col-span-2"
            } tone-${TOOL_TONE[key]} flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-bold transition-colors ${
              tool === key ? "bg-accent/18 text-text shadow ring-1 ring-accent/60" : "text-muted hover:text-text"
            }`}
          >
            <Icon className="size-5 text-accent" aria-hidden />
            {label}
          </button>
        ))}
      </div>

      {/* 名前。デモ版では見本の名前に固定して、入力に鍵をかける(話題・ひとこと・メモでは出さない) */}
      {!toolLocked && NEEDS_NAMES.includes(tool) && (
      <section className="mx-4 mt-4 rounded-3xl border panel px-4 py-4">
        <label className="flex flex-wrap items-center justify-between gap-x-2 text-sm font-bold text-white/70" htmlFor="fun-names">
          <span className="flex items-center gap-2">
            <Users className="size-4" aria-hidden />
            参加する人({names.length}人)
          </span>
          {toolLocked && (
            <span className="inline-flex items-center gap-1 text-[11px] font-black text-accent">
              <Lock className="size-3" aria-hidden />
              見本の名前(Tsudoro+ で入力できます)
            </span>
          )}
        </label>
        {toolLocked ? (
          // デモ版は見本の名前を並べるだけ(入力はできない)。場所をとらないよう、小さな札にする
          <ul id="fun-names" className="mt-2.5 grid grid-cols-3 gap-1.5 opacity-70" aria-label="見本の名前">
            {DEMO_NAMES.map((n) => (
              <li key={n} className="truncate rounded-full bg-white/8 px-3 py-1.5 text-center text-sm font-bold ring-1 ring-white/12">
                {n}
              </li>
            ))}
          </ul>
        ) : (
          <textarea
            id="fun-names"
            rows={Math.min(8, Math.max(3, names.length))}
            value={text}
            onChange={(e) => edit(e.target.value)}
            placeholder="名前を1行に1人ずつ"
            className="mt-2 w-full resize-none rounded-2xl bg-white/8 px-4 py-3 text-base text-white outline-none ring-1 ring-white/12 placeholder:text-white/25 focus:ring-accent/50"
          />
        )}
        {!toolLocked && names.length < 2 && <p className="mt-2 text-xs text-muted">2人から使えます(30人まで)</p>}
      </section>
      )}

      <div className="mt-4">
        {toolLocked && showBuy ? (
          // 購入の案内。黄色い枠は、いつも1つだけ(もやのボタンと、案内を同時に出さない)
          <ProPaywall feature="Tsudoro+" work={company} price={access.price} purchasable={access.purchasable} onClose={() => setShowBuy(false)} />
        ) : toolLocked ? (
          // 買う前は、本物の画面に「もや」をかける。ぎりぎり読めるけれど、さわれない。真ん中のボタンから Plus の案内へ
          <div className="relative min-h-[26rem]">
            <div aria-hidden inert className="pointer-events-none select-none opacity-90 blur-[1.5px] saturate-[.85]">
              {tool === "wolf" && <Wolf names={names} locked={toolLocked} />}
              {tool === "lie" && <Lie names={names} locked={locked} />}
              {tool === "collect" && (
                <Box title="集金チェック" tone={TOOL_TONE.collect} locked={locked}>
                  <CollectList demo />
                </Box>
              )}
              {tool === "sync" && <Sync locked={locked} />}
              {tool === "wheel" && <Wheel names={names} locked={toolLocked} />}
              {tool === "memo" && <Memo locked={toolLocked} />}
              {tool === "seat" && <Seats names={names} locked={locked} />}
              {tool === "schedule" && <Schedule locked={locked} />}
            </div>
            {/* もや(下にいくほど濃い) */}
            <div className="pointer-events-none absolute inset-x-4 inset-y-0 rounded-3xl bg-gradient-to-b from-bg/5 via-bg/25 to-bg/60" aria-hidden />
            <div className="absolute inset-x-0 top-40 flex justify-center px-8">
              <button
                type="button"
                onClick={() => setShowBuy(true)}
                className="flex min-h-14 items-center gap-3 rounded-2xl bg-bg/90 px-5 py-3 text-left ring-1 ring-accent/60 active:scale-95"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent text-accent-text">
                  <Lock className="size-5" aria-hidden />
                </span>
                <span>
                  <span className="block text-base font-black">Tsudoro+ で使える</span>
                  <span className="block text-xs text-muted">{yen(access.price)} ・ 買い切り</span>
                </span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {tool === "wolf" && <Wolf names={names} locked={toolLocked} />}
            {tool === "lie" && <Lie names={names} locked={locked} />}
            {tool === "sync" && <Sync locked={locked} />}
            {tool === "wheel" && <Wheel names={names} locked={toolLocked} />}
            {tool === "memo" && <Memo locked={toolLocked} />}
            {tool === "seat" && <Seats names={names} locked={locked} />}
            {tool === "schedule" && <Schedule locked={locked} />}
            {tool === "collect" && (
              <Box title="集金チェック" tone={TOOL_TONE.collect} locked={locked}>
                <CollectList />
              </Box>
            )}
          </>
        )}
      </div>

    </div>
  );
}

/** ルーレットのひと切れずつの色。やわらかい色を順にくり返す。最後と最初が同じ色にならないよう、ずらす */
const WHEEL_COLORS = ["#d64157", "#3b6fd4", "#1c9a72", "#8456d0", "#de7a2b", "#c09a1c", "#1a95b0"];
function sliceColor(i: number, n: number): string {
  const len = WHEEL_COLORS.length;
  return WHEEL_COLORS[i === n - 1 && n > 1 && i % len === 0 ? 1 : i % len];
}

/** 道具の箱。デモ版のときは右上に印を付ける */
/** free = 買わなくても使える道具。鍵の印の代わりに「無料」と出す */
function Box({ title, tone, locked, free = false, children }: { title: string; tone: Tone; locked: boolean; free?: boolean; children: React.ReactNode }) {
  return (
    <section className={`tone-${tone} mx-4 rounded-3xl border border-accent/35 panel px-4 py-5`}>
      <h2 className="mb-3 flex items-center justify-between text-lg font-black">
        <span className="flex items-center gap-2">
          <span className="h-5 w-1.5 rounded-full bg-accent" aria-hidden />
          {title}
        </span>
        {free ? (
          <span className="rounded-full bg-accent/15 px-2.5 py-1 text-xs font-black text-accent ring-1 ring-accent/40">無料</span>
        ) : (
          !locked && <PackBadge locked={locked} />
        )}
      </h2>
      {children}
    </section>
  );
}

function RerollButton({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-accent px-5 text-base font-black text-accent-text transition active:scale-[0.97] disabled:bg-white/10 disabled:text-white/30"
    >
      {children}
    </button>
  );
}


// ───── ウソはどれ? ─────
// アプリがランダムで1人を選び、お題を3つ出す。そのうち1つを「ウソの話」にするよう、話す人だけにこっそり伝える。
// 30秒で3つ話し、ほかの人はどれがウソか当てる(2026-11-21)
const LIE_SECONDS = 30;
function Lie({ names, locked }: { names: string[]; locked: boolean }) {
  const [round, setRound] = useState<{ who: string; themes: string[]; lie: number } | null>(null);
  const [peek, setPeek] = useState(false);
  const [answer, setAnswer] = useState(false);
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    if (left === null || left <= 0) return;
    const t = window.setTimeout(() => setLeft((v) => (v === null ? v : v - 1)), 1000);
    return () => window.clearTimeout(t);
  }, [left]);

  function start() {
    // 前と同じ人が続かないようにする
    const pool = round && names.length > 1 ? names.filter((n) => n !== round.who) : names;
    setRound({ who: pool[pickIndex(pool.length)], themes: shuffle(LIE_THEMES).slice(0, 3), lie: pickIndex(3) });
    setPeek(false);
    setAnswer(false);
    setLeft(null);
  }

  return (
    <Box title="ウソはどれ?" tone={TOOL_TONE.lie} locked={locked}>
      <p className="text-sm text-white/70">アプリが話す人とお題を3つ決めます。話す人はアプリが選んだ1つだけウソを話し、30秒で3つ話します。ほかの人はどれがウソか当てます。</p>
      {round && (
        <div className="mt-4 rounded-2xl bg-surface-2 px-4 py-4 ring-1 ring-white/10">
          <p className="text-center text-xs font-bold text-muted">話す人</p>
          <p className="mt-0.5 text-center text-2xl font-black">{round.who}さん</p>
          <ol className="mt-3 space-y-2">
            {round.themes.map((t, i) => {
              const isLie = i === round.lie;
              const mark = (peek || answer) && isLie;
              return (
                <li key={t} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ring-1 ${mark ? "bg-accent/15 ring-accent/60" : "bg-white/5 ring-white/10"}`}>
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-accent text-sm font-black text-accent-text">{i + 1}</span>
                  <span className="flex-1 text-base font-bold">{t}</span>
                  {mark && <span className="shrink-0 text-xs font-black text-accent">ウソ</span>}
                </li>
              );
            })}
          </ol>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPeek(!peek)}
              aria-pressed={peek}
              className="inline-flex min-h-12 items-center justify-center gap-1.5 rounded-xl bg-white/8 px-2 text-sm font-bold ring-1 ring-white/12 active:scale-95"
            >
              {peek ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
              {peek ? "隠す" : "話す人だけ見る"}
            </button>
            <button
              type="button"
              onClick={() => {
                setPeek(false);
                setLeft(LIE_SECONDS);
              }}
              className="inline-flex min-h-12 items-center justify-center gap-1.5 rounded-xl bg-white/8 px-2 text-sm font-black tabular-nums ring-1 ring-white/12 active:scale-95"
            >
              <Timer className="size-4" aria-hidden />
              {left === null ? "30秒スタート" : left > 0 ? `のこり ${left}秒` : "時間です"}
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              setPeek(false);
              setAnswer(true);
            }}
            disabled={answer}
            className="mt-2 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-white/8 text-sm font-bold ring-1 ring-white/12 active:scale-95 disabled:opacity-50"
          >
            {answer ? `ウソは ${round.lie + 1}番「${round.themes[round.lie]}」` : "答え合わせ(ウソを見せる)"}
          </button>
        </div>
      )}
      <div className="mt-4">
        <RerollButton disabled={names.length < 2} onClick={start}>
          <MessageCircleQuestion className="size-4" aria-hidden />
          {round ? "次の人を選ぶ" : "話す人を選んではじめる"}
        </RerollButton>
      </div>
    </Box>
  );
}

// ───── ワードウルフ ─────
function Wolf({ names, locked }: { names: string[]; locked: boolean }) {
  const [game, setGame] = useState<ReturnType<typeof wordWolf> | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [reveal, setReveal] = useState(false);
  const [left, setLeft] = useState<number | null>(null);

  // 話し合いのタイマー(3分)
  useEffect(() => {
    if (left === null || left <= 0) return;
    const t = window.setTimeout(() => setLeft((v) => (v === null ? v : v - 1)), 1000);
    return () => window.clearTimeout(t);
  }, [left]);

  function start() {
    setGame(wordWolf(names));
    setOpen(null);
    setReveal(false);
    setLeft(null);
  }

  return (
    <Box title="ワードウルフ" tone={TOOL_TONE.wolf} locked={locked}>
      <p className="text-sm text-white/70">
        全員にお題の言葉が配られますが1人だけ(ウルフ)は少し違う言葉です。自分の名前を押してこっそり言葉を見たら、見せずに話し合ってウルフを当てます。
      </p>
      {game && (
        <>
          <ul className="mt-4 grid grid-cols-2 gap-2">
            {game.deals.map((d, i) => {
              const shown = open === i;
              return (
                <li key={d.name}>
                  <button
                    type="button"
                    onClick={() => setOpen(shown ? null : i)}
                    aria-pressed={shown}
                    className="flex min-h-16 w-full flex-col items-center justify-center rounded-2xl bg-surface-2 px-2 py-2 ring-1 ring-white/10 transition active:scale-95"
                  >
                    <span className="max-w-full truncate text-sm font-bold">{d.name}</span>
                    <span className={`mt-0.5 inline-flex items-center gap-1 text-xs font-black ${shown ? "text-accent" : "text-muted"}`}>
                      {shown ? (
                        <>
                          <Eye className="size-3.5" aria-hidden />
                          {d.word}
                        </>
                      ) : (
                        <>
                          <EyeOff className="size-3.5" aria-hidden />
                          言葉を見る
                        </>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setLeft(180)}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-white/8 px-3 text-sm font-bold ring-1 ring-white/12 active:scale-95"
            >
              <Timer className="size-4" aria-hidden />
              話し合い 3分
            </button>
            {left !== null && (
              <span className="text-lg font-black tabular-nums" aria-live="off">
                {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}
                {left === 0 && <span className="ml-2 text-sm text-accent">時間です。投票しましょう</span>}
              </span>
            )}
          </div>
          <div className="mt-3 rounded-2xl border border-border px-4 py-3">
            {reveal ? (
              <p className="text-sm" aria-live="polite">
                ウルフは <span className="text-lg font-black text-accent">{game.wolf}</span> さん!
                <span className="mt-1 block text-xs text-muted">
                  みんなの言葉は「{game.majorityWord}」でウルフは「{game.wolfWord}」でした
                </span>
              </p>
            ) : (
              <button type="button" onClick={() => setReveal(true)} className="inline-flex min-h-11 items-center gap-1.5 text-sm font-black text-accent underline underline-offset-2">
                <PartyPopper className="size-4" aria-hidden />
                投票が終わったら答え合わせ
              </button>
            )}
          </div>
        </>
      )}
      <div className="mt-4">
        <RerollButton onClick={start} disabled={names.length < 3}>
          <VenetianMask className="size-4" aria-hidden />
          {game ? "新しいお題でもう一度" : "ゲームをはじめる"}
        </RerollButton>
        {names.length < 3 && <p className="mt-2 text-center text-xs text-muted">3人から遊べます</p>}
      </div>
    </Box>
  );
}

// ───── ルーレット ─────
function Wheel({ names, locked }: { names: string[]; locked: boolean }) {
  const [angle, setAngle] = useState(0);
  const [winner, setWinner] = useState<number | null>(null);
  const [spinning, setSpinning] = useState(false);
  const n = names.length;
  const ok = n >= 2;
  const key = names.join("\u0000");
  const last = useRef(key);
  useEffect(() => {
    if (last.current !== key) {
      last.current = key;
      setWinner(null);
    }
  }, [key]);

  function spin() {
    if (!ok || spinning) return;
    const w = pickIndex(n);
    const slice = 360 / n;
    // 上の矢印に、勝った人のまん中が来るように回す。何周か回してから止める
    const target = Math.ceil(angle / 360) * 360 + 360 * 5 - (w + 0.5) * slice;
    setWinner(null);
    setSpinning(true);
    setAngle(target);
    window.setTimeout(() => {
      setWinner(w);
      setSpinning(false);
    }, 4200);
  }

  const R = 140;
  const uid = useId().replace(/:/g, "");
  const slices = names.map((name, i) => {
    const a0 = ((i / n) * 360 - 90) * (Math.PI / 180);
    const a1 = (((i + 1) / n) * 360 - 90) * (Math.PI / 180);
    const large = 360 / n > 180 ? 1 : 0;
    const d = `M0 0 L${R * Math.cos(a0)} ${R * Math.sin(a0)} A${R} ${R} 0 ${large} 1 ${R * Math.cos(a1)} ${R * Math.sin(a1)} Z`;
    const mid = (((i + 0.5) / n) * 360 - 90) * (Math.PI / 180);
    return { name, d, tx: R * 0.62 * Math.cos(mid), ty: R * 0.62 * Math.sin(mid), rot: ((i + 0.5) / n) * 360 - 90 + (Math.cos(mid) < 0 ? 180 : 0) }; // 左半分は名前が逆さまにならないよう、180度まわす
  });

  return (
    <Box title="ルーレット" tone={TOOL_TONE.wheel} locked={locked} free>
      <p className="text-sm text-white/70">乾杯の音頭・おごり・罰ゲームの係を運で決めます。</p>
      <div className="relative mx-auto mt-3 w-full max-w-[230px]">
        <svg viewBox="-160 -168 320 330" className="block h-auto w-full" role="img" aria-label={`ルーレット(${n}人)`}>
          <defs>
            {/* 盤に少しだけ立体感(真ん中が明るい) */}
            <radialGradient id={`shine${uid}`} cx="0" cy="0" r={R} gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#fff" stopOpacity="0.16" />
              <stop offset="0.7" stopColor="#fff" stopOpacity="0" />
              <stop offset="1" stopColor="#000" stopOpacity="0.18" />
            </radialGradient>
          </defs>
          {/* 縁。細く、目立ちすぎない */}
          <circle r={R + 8} fill="#16181c" stroke="rgba(255,255,255,0.14)" strokeWidth="2" />
          <g style={{ transform: `rotate(${angle}deg)`, transition: spinning ? "transform 4s cubic-bezier(0.12, 0.7, 0.1, 1)" : "none" }}>
            {slices.map((s, i) => (
              <g key={s.name} opacity={winner === null || winner === i ? 1 : 0.4}>
                <path d={s.d} fill={sliceColor(i, n)} stroke="#fff" strokeOpacity={winner === i ? 1 : 0.85} strokeWidth={winner === i ? 4 : 2} strokeLinejoin="round" />
                <text
                  x={s.tx}
                  y={s.ty}
                  transform={`rotate(${s.rot} ${s.tx} ${s.ty})`}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={n > 12 ? 11 : 15}
                  fontWeight="900"
                  fill="#fff"
                  stroke="#000"
                  strokeOpacity="0.25"
                  strokeWidth="3"
                  paintOrder="stroke"
                >
                  {s.name.length > 6 ? `${s.name.slice(0, 5)}…` : s.name}
                </text>
              </g>
            ))}
            <circle r={R} fill={`url(#shine${uid})`} pointerEvents="none" />
            <circle r="20" fill="#fff" stroke="#16181c" strokeWidth="4" />
            <circle r="7" fill="var(--accent)" />
          </g>
          {/* 上の針 */}
          <g transform={`translate(0 ${-R - 14})`} style={{ filter: "drop-shadow(0 2px 2px rgba(0,0,0,0.5))" }}>
            <path d="M0 30 L-13 0 Q0 -8 13 0 Z" fill="var(--accent)" stroke="#16181c" strokeWidth="2.5" strokeLinejoin="round" />
          </g>
        </svg>
      </div>
      <p className="mt-3 min-h-7 text-center text-lg font-black" aria-live="polite">
        {winner !== null ? (
          <>
            <span className="text-accent">{names[winner]}</span> さんに決まり!
          </>
        ) : spinning ? (
          "…"
        ) : (
          ""
        )}
      </p>
      <div className="mt-2">
        <RerollButton onClick={spin} disabled={!ok || spinning}>
          <Dices className="size-4" aria-hidden />
          {spinning ? "回っています…" : winner !== null ? "もう一度回す" : "回す"}
        </RerollButton>
      </div>
    </Box>
  );
}

// ───── せーの! ─────
// お題に、全員が「せーの!」で同時に答える。同じ答えの人が多いほど成功。覚えることがないので大人数でも遊べる(2026-11-21。NGワードの代わり)
function Sync({ locked }: { locked: boolean }) {
  const [theme, setTheme] = useState<string | null>(null);
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    if (count === null || count <= 0) return;
    const t = window.setTimeout(() => setCount((v) => (v === null ? v : v - 1)), 900);
    return () => window.clearTimeout(t);
  }, [count]);

  function next() {
    const pool = SYNC_THEMES.filter((t) => t !== theme);
    setTheme(pool[pickIndex(pool.length)]);
    setCount(null);
  }

  return (
    <Box title="せーの!" tone={TOOL_TONE.sync} locked={locked}>
      <p className="text-sm text-white/70">お題に全員が「せーの!」で同時に答えます。みんなの答えがそろうほど成功。覚えることがないので大人数でも遊べます。</p>
      {theme && (
        <div className="mt-4 rounded-2xl bg-surface-2 px-4 py-5 text-center ring-1 ring-white/10">
          <p className="text-xs font-bold text-muted">お題</p>
          <p className="mt-1 text-2xl font-black">{theme}</p>
          <button
            type="button"
            onClick={() => setCount(3)}
            className="mt-4 inline-flex min-h-14 min-w-40 items-center justify-center rounded-2xl bg-white/8 px-5 text-xl font-black tabular-nums ring-1 ring-white/12 active:scale-95"
            aria-live="polite"
          >
            {count === null ? "カウントする" : count > 0 ? count : "せーの!"}
          </button>
        </div>
      )}
      <div className="mt-4">
        <RerollButton onClick={next}>
          <Megaphone className="size-4" aria-hidden />
          {theme ? "次のお題" : "お題を出す"}
        </RerollButton>
      </div>
    </Box>
  );
}

// ───── 席決め ─────
function Seats({ names, locked }: { names: string[]; locked: boolean }) {
  const [layout, setLayout] = useState<SeatLayout>("table");
  // 机(卓)の数。人数に合わせて上限を変える(1卓に2人はいる)
  const [tables, setTables] = useState(1);
  const tableMax = maxTables(names.length);
  const tableCount = Math.min(tables, tableMax);
  const [plan, setPlan] = useState<{ rows: string[][] }[] | null>(null);
  const [round, setRound] = useState(0);
  // 上座に座る人・出口に近い席に座る人(幹事など)。空はおまかせ
  const [top, setTop] = useState("");
  const [exit, setExit] = useState("");
  const ok = names.length >= 2;
  // 名前や並べ方を変えたら、いったん結果を消す
  const key = `${layout}|${tableCount}|${top}|${exit}|${names.join("\u0000")}`;
  const last = useRef(key);
  useEffect(() => {
    if (last.current !== key) {
      last.current = key;
      setPlan(null);
    }
  }, [key]);

  function run() {
    setPlan(seatTables(names, layout, tableCount, Math.random, { top: top || null, exit: exit || null }));
    setRound((r) => r + 1);
  }

  return (
    <Box title="席決め" tone={TOOL_TONE.seat} locked={locked}>
      <p className="mb-3 text-sm text-white/70">机の形と数をお選びください。お名前をシャッフルして席順をご提案します。</p>
      <div className="flex flex-wrap gap-2" role="group" aria-label="席の並べ方">
        {SEAT_LAYOUTS.map((l) => (
          <button key={l.key} type="button" aria-pressed={layout === l.key} onClick={() => setLayout(l.key)} className={`${PILL} ${layout === l.key ? PILL_ON : PILL_OFF}`}>
            {layout === l.key && "✓ "}
            {l.label}
          </button>
        ))}
      </div>
      {/* 机の数(卓) */}
      <div className="mt-3 flex items-center gap-3 rounded-xl bg-surface-2 px-3 py-2 ring-1 ring-white/10">
        <span className="text-sm font-bold text-muted">机の数</span>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTables(Math.max(1, tableCount - 1))}
            disabled={tableCount <= 1}
            aria-label="机を1つ減らす"
            className="grid size-10 place-items-center rounded-full bg-white/8 text-xl font-black ring-1 ring-white/12 active:scale-95 disabled:opacity-30"
          >
            −
          </button>
          <span className="w-12 text-center text-lg font-black tabular-nums" aria-live="polite">
            {tableCount}卓
          </span>
          <button
            type="button"
            onClick={() => setTables(Math.min(tableMax, tableCount + 1))}
            disabled={tableCount >= tableMax}
            aria-label="机を1つ増やす"
            className="grid size-10 place-items-center rounded-full bg-white/8 text-xl font-black ring-1 ring-white/12 active:scale-95 disabled:opacity-30"
          >
            <Plus className="size-5" aria-hidden />
          </button>
        </div>
      </div>
      {/* 上座・下座の指定。席1が上座(奥)、出口に近い席が下座 */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        {(
          [
            ["上座に座る人", top, setTop],
            ["出口に近い席(幹事など)", exit, setExit],
          ] as const
        ).map(([label, value, set]) => (
          <label key={label} className="block rounded-xl bg-surface-2 px-3 py-2 ring-1 ring-white/10">
            <span className="block text-[11px] font-bold text-muted">{label}</span>
            <select value={names.includes(value) ? value : ""} onChange={(e) => set(e.target.value)} aria-label={label} className="mt-0.5 w-full bg-transparent text-sm font-black outline-none">
              <option value="">おまかせ</option>
              {names.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      {plan && (
        <div key={round} className="anim-rise mt-4 space-y-4">
          {plan.map((t, ti) => {
            const size = t.rows.flat().length;
            const first = ti === 0;
            const last = ti === plan.length - 1;
            return (
              <div key={ti}>
                {plan.length > 1 && <p className="mb-2 text-sm font-black text-accent">{ti + 1}卓目({size}人)</p>}
                {layout === "round" ? (
                  <RoundTable names={t.rows[0]} top={first} exit={last} />
                ) : (
                  <div className="space-y-2">
                    {t.rows.map((row, ri) => (
                      <div key={ri}>
                        {layout === "table" && ri === 1 && (
                          <div className="mb-2 rounded-lg bg-white/8 py-1.5 text-center text-[11px] font-bold text-white/50">テーブル</div>
                        )}
                        <ul className="flex flex-wrap justify-center gap-2">
                          {row.map((n, i) => {
                            const no = ri === 0 ? i + 1 : t.rows[0].length + i + 1;
                            const tag = first && no === 1 ? "上座" : last && no - 1 === seatExitIndex(layout, size) ? "出口ちかく" : null;
                            return <SeatChip key={n} n={n} no={no} tag={tag} />;
                          })}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      <div className="mt-4">
        <RerollButton onClick={run} disabled={!ok}>
          <Shuffle className="size-4" aria-hidden />
          {plan ? "席決めをやり直す" : "席を決める"}
        </RerollButton>
        {!ok && <p className="mt-2 text-center text-xs text-muted">2名からご利用いただけます</p>}
      </div>
    </Box>
  );
}

/** 席の札。tag = 上座・出口ちかく の目印 */
function SeatChip({ n, no, tag }: { n: string; no: number; tag: string | null }) {
  return (
    <li className="flex min-h-12 min-w-[5.5rem] flex-col items-center justify-center rounded-xl bg-surface-2 px-3 py-1 ring-1 ring-white/10">
      {tag && <span className="text-[10px] font-black text-accent">{tag}</span>}
      <span className="flex items-center gap-2">
        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent text-[11px] font-black text-accent-text">{no}</span>
        <span className="truncate text-sm font-bold">{n}</span>
      </span>
    </li>
  );
}

function RoundTable({ names, top = true, exit = true }: { names: string[]; top?: boolean; exit?: boolean }) {
  const exitAt = seatExitIndex("round", names.length);
  const n = names.length;
  const size = 300;
  const r = 118;
  return (
    <div className="mx-auto" style={{ width: size, height: size, maxWidth: "100%" }}>
      <div className="relative h-full w-full">
        <div className="absolute inset-[22%] grid place-items-center rounded-full bg-white/8 text-[11px] font-bold text-white/50 ring-1 ring-white/10">
          テーブル
        </div>
        {names.map((name, i) => {
          const a = (i / n) * Math.PI * 2 - Math.PI / 2;
          const x = 50 + (Math.cos(a) * r * 100) / size;
          const y = 50 + (Math.sin(a) * r * 100) / size;
          return (
            <div key={name} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${x}%`, top: `${y}%` }}>
              <span className="flex max-w-[5.5rem] items-center gap-1 rounded-full bg-surface-2 py-1 pr-2.5 pl-1 text-xs font-bold ring-1 ring-white/10">
                <span className="grid size-5 shrink-0 place-items-center rounded-full bg-accent text-[10px] font-black text-accent-text">{i + 1}</span>
                <span className="truncate">{name}</span>
              </span>
              {((top && i === 0) || (exit && i === exitAt)) && <span className="mt-0.5 block text-center text-[10px] font-black text-accent">{top && i === 0 ? "上座" : "出口ちかく"}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ───── 進行表(仕事の会)─────
const SCHEDULE_STARTS = [1080, 1110, 1140, 1170, 1200];
const SCHEDULE_LENGTHS = [90, 120, 150, 180];

function Schedule({ locked }: { locked: boolean }) {
  const [start, setStart] = useState(1140);
  const [minutes, setMinutes] = useState(120);
  const [copied, setCopied] = useState(false);
  const steps = timeline(start, minutes);
  const text = steps.map((s) => `${clock(s.at)} ${s.label}`).join("\n");

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  return (
    <Box title="進行表" tone={TOOL_TONE.schedule} locked={locked}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-white/70">開始と長さを選ぶと進行表ができます。</p>
        <button type="button" onClick={copy} className="shrink-0 text-xs font-black text-accent underline underline-offset-2">
          {copied ? "コピーしました" : "コピー"}
        </button>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <label className="flex min-h-11 items-center justify-between rounded-xl bg-surface-2 px-3 ring-1 ring-white/10">
          <span className="text-xs font-bold text-muted">開始</span>
          <select value={start} onChange={(e) => setStart(Number(e.target.value))} aria-label="開始時刻" className="bg-transparent text-right text-base font-black tabular-nums outline-none">
            {SCHEDULE_STARTS.map((m) => (
              <option key={m} value={m}>
                {clock(m)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-h-11 items-center justify-between rounded-xl bg-surface-2 px-3 ring-1 ring-white/10">
          <span className="text-xs font-bold text-muted">長さ</span>
          <select value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} aria-label="会の長さ" className="bg-transparent text-right text-base font-black tabular-nums outline-none">
            {SCHEDULE_LENGTHS.map((m) => (
              <option key={m} value={m}>
                {m / 60}時間
              </option>
            ))}
          </select>
        </label>
      </div>
      {/* 時刻を左に、縦の線でつないで並べる */}
      <ol className="mt-4">
        {steps.map((st, i) => (
          <li key={st.at + st.label} className="flex items-stretch gap-3">
            <span className="w-11 shrink-0 pt-0.5 text-right text-sm font-black tabular-nums text-accent">{clock(st.at)}</span>
            <span className="flex w-3 shrink-0 flex-col items-center" aria-hidden>
              <span className="mt-1.5 size-2.5 shrink-0 rounded-full bg-accent" />
              {i < steps.length - 1 && <span className="w-px flex-1 bg-white/15" />}
            </span>
            <span className="pb-3 text-sm font-bold">{st.label}</span>
          </li>
        ))}
      </ol>
    </Box>
  );
}


// ───── 幹事メモ(会社の会)─────
const MEMO_KEY = "nomi:work-memo";

function Memo({ locked }: { locked: boolean }) {
  const [checked, setChecked] = useState<boolean[]>(CHECKLIST.map(() => false));
  const [memo, setMemo] = useState("");

  // 買った人だけ、この端末に残す(デモ版は残らない)
  useEffect(() => {
    if (locked) return;
    try {
      const v = JSON.parse(localStorage.getItem(MEMO_KEY) ?? "null") as { checked?: boolean[]; memo?: string } | null;
      if (v) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (Array.isArray(v.checked)) setChecked(CHECKLIST.map((_, i) => v.checked?.[i] === true));
        if (typeof v.memo === "string") setMemo(v.memo);
      }
    } catch {}
  }, [locked]);

  function save(nextChecked: boolean[], nextMemo: string) {
    setChecked(nextChecked);
    setMemo(nextMemo);
    if (locked) return;
    try {
      localStorage.setItem(MEMO_KEY, JSON.stringify({ checked: nextChecked, memo: nextMemo }));
    } catch {}
  }

  const done = checked.filter(Boolean).length;

  return (
    <Box title="幹事メモ" tone={TOOL_TONE.memo} locked={locked} free>
      <div className="flex items-center gap-3">
        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10" aria-hidden>
          <span className="block h-full rounded-full bg-accent transition-[width]" style={{ width: `${(done / CHECKLIST.length) * 100}%` }} />
        </span>
        <span className="shrink-0 text-xs font-bold text-muted tabular-nums">
          {done}/{CHECKLIST.length} 終わった
        </span>
      </div>
      <ul className="mt-3 divide-y divide-white/8 overflow-hidden rounded-xl bg-surface-2 ring-1 ring-white/10">
        {CHECKLIST.map((t, i) => (
          <li key={t}>
            <button
              type="button"
              role="checkbox"
              aria-checked={checked[i]}
              onClick={() => save(checked.map((c, k) => (k === i ? !c : c)), memo)}
              className="flex min-h-10 w-full items-center gap-2.5 px-3 text-left"
            >
              <span className={`grid size-5 shrink-0 place-items-center rounded border-2 ${checked[i] ? "border-accent bg-accent text-accent-text" : "border-white/30"}`}>
                {checked[i] && <span aria-hidden className="text-xs leading-none font-black">✓</span>}
              </span>
              <span className={`text-[13px] font-bold ${checked[i] ? "text-muted line-through" : ""}`}>{t}</span>
            </button>
          </li>
        ))}
      </ul>
      <textarea
        value={memo}
        onChange={(e) => save(checked, e.target.value.slice(0, 1000))}
        rows={2}
        aria-label="メモ"
        placeholder="メモ お店の連絡先 乾杯をお願いする人など"
        className="mt-3 w-full resize-none rounded-xl bg-white/8 px-3 py-2.5 text-sm text-white ring-1 ring-white/12 outline-none placeholder:text-white/25 focus:ring-accent/50"
      />
      <p className="mt-1 text-[11px] text-muted">{locked ? "見本は保存されません" : "この端末に残ります"}</p>
    </Box>
  );
}
