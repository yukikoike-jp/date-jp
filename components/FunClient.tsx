"use client";

import { Ban, Crown, Dices, Eye, EyeOff, Flame, Lock, LockOpen, MessageCircleQuestionMark, PartyPopper, Plus, Shuffle, Timer, Users, VenetianMask } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { DEMO_NAMES, KING_ORDERS, kingGame, parseNames, pickIndex, splitTeams, type KingDraw } from "@/lib/fun";
import { DARES, LEVELS, TRUTHS, drawCard, nextPlayer, ngWords, wordWolf, type CardKind, type Level } from "@/lib/games";
import { PILL, PILL_OFF, PILL_ON } from "./ui";
import { ProPaywall, useFunAccess } from "./ProGate";

// 有料プレミアムの「Play」(真実か挑戦・ワードウルフ・王様ゲーム・NGワード・ルーレット・チーム分け)。
// 買う前は「デモ版」: 見本の名前で全部の道具を試せるが、自分たちの名前は入れられない。
// 鍵のかかり方は lib/billing.ts の hasFun(支払いの準備ができていなくても、買うまでは鍵をかけたまま)

const NAMES_KEY = "date:fun-names";
type Tool = "truth" | "wolf" | "king" | "ng" | "wheel" | "team";
const TOOLS: { key: Tool; label: string; icon: typeof Crown }[] = [
  { key: "truth", label: "真実か挑戦", icon: MessageCircleQuestionMark },
  { key: "wolf", label: "ワードウルフ", icon: VenetianMask },
  { key: "king", label: "王様ゲーム", icon: Crown },
  { key: "ng", label: "NGワード", icon: Ban },
  { key: "wheel", label: "ルーレット", icon: Dices },
  { key: "team", label: "チーム分け", icon: Users },
];

/** 有料プレミアムの印。鍵のマークだけ(デモ版かどうかは、上の案内に書く) */
function PackBadge({ locked }: { locked: boolean }) {
  const Icon = locked ? Lock : LockOpen;
  return (
    <span
      className="inline-grid size-7 shrink-0 place-items-center rounded-full border border-accent/50 text-accent"
      role="img"
      aria-label={locked ? "有料プレミアム(デモ版)" : "有料プレミアム(契約中)"}
    >
      <Icon className="size-3.5" aria-hidden />
    </span>
  );
}

export function FunClient() {
  const access = useFunAccess();
  const locked = !access.unlocked;
  const [tool, setTool] = useState<Tool>("truth");
  const [text, setText] = useState(DEMO_NAMES.join("\n"));
  const [showBuy, setShowBuy] = useState(false);

  // 買ったあと(鍵が開いたあと)は、前に入れた名前を思い出す
  useEffect(() => {
    if (access.loading || locked) return;
    try {
      const saved = localStorage.getItem(NAMES_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved) setText(saved);
    } catch {}
  }, [access.loading, locked]);

  const names = useMemo(() => (locked ? DEMO_NAMES : parseNames(text)), [locked, text]);

  function edit(v: string) {
    setText(v);
    try {
      localStorage.setItem(NAMES_KEY, v);
    } catch {}
  }

  return (
    <div className="mx-auto max-w-xl pt-6 pb-16">
      <div className="px-4">
        <h1 className="flex items-center gap-2 text-[26px] font-black tracking-tight">
          <span className="font-logo">Play</span>
          {!access.loading && <PackBadge locked={locked} />}
        </h1>
        <p className="mt-1 text-sm text-muted">幹事がいる回を、もっと盛り上げる</p>
      </div>

      {/* デモ版のとき: 何が起きているか、どうすれば使えるかを最初に伝える */}
      {!access.loading && locked && (
        <section className="mx-4 mt-4 rounded-3xl border border-accent/50 bg-surface px-5 py-5" aria-label="デモ版の案内">
          <p className="flex items-center gap-2 text-base font-black">
            <Lock className="size-5 text-accent" aria-hidden />
            いまはデモ版です
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-white/75">
            見本の名前({DEMO_NAMES.slice(0, 3).join("・")}…)で、ぜんぶの道具を試せます。自分たちの名前で使うには、有料プレミアムが必要です。
          </p>
          {!showBuy && (
            <button
              type="button"
              onClick={() => setShowBuy(true)}
              className="mt-3 inline-flex min-h-11 items-center rounded-2xl bg-accent px-4 text-sm font-black text-accent-text active:scale-95"
            >
              有料プレミアムのくわしく
            </button>
          )}
        </section>
      )}
      {locked && showBuy && <ProPaywall feature="Play" fun price={access.price} purchasable={access.purchasable} onClose={() => setShowBuy(false)} />}

      {/* 道具の切り替え */}
      <div className="mx-4 mt-4 grid grid-cols-3 gap-1 rounded-2xl bg-surface-2 p-1" role="tablist" aria-label="遊び">
        {TOOLS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tool === key}
            onClick={() => setTool(key)}
            className={`flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-bold transition-colors ${
              tool === key ? "bg-surface text-text shadow" : "text-muted hover:text-text"
            }`}
          >
            <Icon className="size-5" aria-hidden />
            {label}
          </button>
        ))}
      </div>

      {/* 名前。デモ版では見本の名前に固定して、入力に鍵をかける */}
      <section className="mx-4 mt-4 rounded-3xl border panel px-4 py-4">
        <label className="flex flex-wrap items-center justify-between gap-x-2 text-sm font-bold text-white/70" htmlFor="fun-names">
          <span className="flex items-center gap-2">
            <Users className="size-4" aria-hidden />
            参加する人({names.length}人)
          </span>
          {locked && (
            <span className="inline-flex items-center gap-1 text-[11px] font-black text-accent">
              <Lock className="size-3" aria-hidden />
              見本の名前(有料プレミアムで入力できます)
            </span>
          )}
        </label>
        {locked ? (
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
        {!locked && names.length < 2 && <p className="mt-2 text-xs text-muted">2人から使えます(30人まで)</p>}
      </section>

      <div className="mt-4">
        {tool === "truth" && <TruthDare names={names} locked={locked} />}
        {tool === "wolf" && <Wolf names={names} locked={locked} />}
        {tool === "king" && <King names={names} locked={locked} />}
        {tool === "ng" && <NgWord names={names} locked={locked} />}
        {tool === "wheel" && <Wheel names={names} locked={locked} />}
        {tool === "team" && <Teams names={names} locked={locked} />}
      </div>
    </div>
  );
}

/** 道具の箱。デモ版のときは右上に印を付ける */
function Box({ title, locked, children }: { title: string; locked: boolean; children: React.ReactNode }) {
  return (
    <section className="mx-4 rounded-3xl border panel px-4 py-5">
      <h2 className="mb-3 flex items-center justify-between text-lg font-black">
        {title}
        <PackBadge locked={locked} />
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

// ───── チーム分け ─────
function Teams({ names, locked }: { names: string[]; locked: boolean }) {
  const [count, setCount] = useState(2);
  const [teams, setTeams] = useState<string[][] | null>(null);
  const [round, setRound] = useState(0);
  const max = Math.max(2, Math.min(6, names.length));
  const n = Math.min(count, max);
  return (
    <Box title="チーム分け" locked={locked}>
      <div className="flex items-center gap-2" role="group" aria-label="チームの数">
        {[2, 3, 4, 5, 6].map((c) => (
          <button
            key={c}
            type="button"
            disabled={c > max}
            aria-pressed={n === c}
            onClick={() => setCount(c)}
            className={`${PILL} flex-1 px-0 disabled:opacity-30 ${n === c ? PILL_ON : PILL_OFF}`}
          >
            {c}
          </button>
        ))}
        <span className="shrink-0 text-xs font-bold text-muted">チーム</span>
      </div>
      {teams && (
        <div key={round} className="anim-rise mt-4 grid grid-cols-2 gap-2">
          {teams.map((t, i) => (
            <div key={i} className="rounded-2xl bg-surface-2 p-3 ring-1 ring-white/10">
              <p className="text-xs font-black text-accent">
                チーム {i + 1}({t.length}人)
              </p>
              <ul className="mt-1.5 space-y-1">
                {t.map((m) => (
                  <li key={m} className="truncate text-sm font-bold">
                    {m}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
      <div className="mt-4">
        <RerollButton
          disabled={names.length < 2}
          onClick={() => {
            setTeams(splitTeams(names, n));
            setRound((r) => r + 1);
          }}
        >
          <Shuffle className="size-4" aria-hidden />
          {teams ? "分け直す" : "チームに分ける"}
        </RerollButton>
      </div>
    </Box>
  );
}

// ───── 王様ゲーム ─────
function King({ names, locked }: { names: string[]; locked: boolean }) {
  const [draw, setDraw] = useState<KingDraw[] | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [order, setOrder] = useState<string | null>(null);
  return (
    <Box title="王様ゲーム" locked={locked}>
      <p className="text-sm text-white/70">くじを引いたら、自分の名前を押して、こっそりカードを見ます。見たらもう一度押して隠します。</p>
      {draw && (
        <ul className="mt-4 grid grid-cols-2 gap-2">
          {draw.map((d, i) => {
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
                        {d.card === "王様" ? "王様" : `${d.card}番`}
                      </>
                    ) : (
                      <>
                        <EyeOff className="size-3.5" aria-hidden />
                        カードを見る
                      </>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {draw && (
        <div className="mt-4 rounded-2xl border border-border px-4 py-3">
          <p className="text-xs font-bold text-muted">王様の命令のヒント</p>
          <p className="mt-1 min-h-6 text-sm font-bold">{order ?? "「命令をひとつ出す」を押すと、例が出ます"}</p>
          <button
            type="button"
            onClick={() => setOrder(KING_ORDERS[pickIndex(KING_ORDERS.length)])}
            className="mt-2 inline-flex min-h-11 items-center gap-1 rounded-xl bg-white/8 px-3 text-sm font-bold ring-1 ring-white/12 active:scale-95"
          >
            <PartyPopper className="size-4" aria-hidden />
            命令をひとつ出す
          </button>
        </div>
      )}
      <div className="mt-4">
        <RerollButton
          disabled={names.length < 3}
          onClick={() => {
            setDraw(kingGame(names));
            setOpen(null);
            setOrder(null);
          }}
        >
          <Crown className="size-4" aria-hidden />
          {draw ? "くじを引き直す" : "くじを引く"}
        </RerollButton>
        {names.length < 3 && <p className="mt-2 text-center text-xs text-muted">3人から遊べます</p>}
      </div>
    </Box>
  );
}

// ───── 真実か挑戦 ─────
function TruthDare({ names, locked }: { names: string[]; locked: boolean }) {
  const [level, setLevel] = useState<Level>("soft");
  const [player, setPlayer] = useState<number | null>(null);
  const [done, setDone] = useState<Set<number>>(new Set());
  const [card, setCard] = useState<{ kind: CardKind; text: string } | null>(null);
  const [used, setUsed] = useState<{ truth: Set<number>; dare: Set<number> }>({ truth: new Set(), dare: new Set() });
  const ok = names.length >= 2;

  function pick() {
    const r = nextPlayer(names.length, done);
    setPlayer(r.index);
    setDone(r.reset ? new Set([r.index]) : new Set([...done, r.index]));
    setCard(null);
  }

  function draw(kind: CardKind) {
    const c = drawCard(kind, level, used[kind]);
    setUsed({ ...used, [kind]: c.reset ? new Set([c.index]) : new Set([...used[kind], c.index]) });
    setCard({ kind, text: c.text });
  }

  const total = TRUTHS[level].length + DARES[level].length;

  return (
    <Box title="真実か挑戦" locked={locked}>
      <p className="text-sm text-white/70">当たった人が「真実」か「挑戦」を選びます。真実は質問に正直に答え、挑戦はお題をやりきります。できなければ、パスしても大丈夫です。</p>
      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="盛り上がり度">
        {LEVELS.map((l) => (
          <button
            key={l.key}
            type="button"
            aria-pressed={level === l.key}
            onClick={() => {
              setLevel(l.key);
              setCard(null);
            }}
            className={`${PILL} ${level === l.key ? PILL_ON : PILL_OFF}`}
          >
            {level === l.key && "✓ "}
            {l.key === "spicy" && <Flame className="size-4" aria-hidden />}
            {l.label}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted">{LEVELS.find((l) => l.key === level)!.note}(お題は{total}個)</p>

      {player !== null && (
        <div className="anim-rise mt-4 rounded-2xl border border-accent/40 px-4 py-4 text-center" aria-live="polite">
          <p className="text-xs font-bold text-muted">次は</p>
          <p className="mt-1 text-3xl font-black text-accent">{names[player]}</p>
          <p className="mt-1 text-sm font-bold">さんの番です</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {(["truth", "dare"] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => draw(k)}
                className="min-h-12 rounded-xl bg-white/8 text-base font-black ring-1 ring-white/12 transition active:scale-95 hover:bg-white/12"
              >
                {k === "truth" ? "真実" : "挑戦"}
              </button>
            ))}
          </div>
          {card && (
            <div className="anim-rise mt-3 rounded-xl bg-surface-2 px-4 py-4 text-left ring-1 ring-white/10">
              <p className="text-xs font-black text-accent">{card.kind === "truth" ? "真実: 正直に答える" : "挑戦: やりきる"}</p>
              <p className="mt-1.5 text-lg font-black leading-snug">{card.text}</p>
              <button type="button" onClick={() => draw(card.kind)} className="mt-3 inline-flex min-h-10 items-center gap-1 text-xs font-bold text-muted underline underline-offset-2">
                <Shuffle className="size-3.5" aria-hidden />
                別のお題にする(パス)
              </button>
            </div>
          )}
        </div>
      )}
      <div className="mt-4">
        <RerollButton onClick={pick} disabled={!ok}>
          <MessageCircleQuestionMark className="size-4" aria-hidden />
          {player === null ? "最初の人を選ぶ" : "次の人を選ぶ"}
        </RerollButton>
        {!ok && <p className="mt-2 text-center text-xs text-muted">2人から遊べます</p>}
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
    <Box title="ワードウルフ" locked={locked}>
      <p className="text-sm text-white/70">
        全員にお題の言葉が配られますが、1人だけ(ウルフ)は、少し違う言葉です。自分の名前を押して、こっそり言葉を見たら、見せずに話し合い、ウルフを当てます。
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
                  みんなの言葉は「{game.majorityWord}」、ウルフは「{game.wolfWord}」でした
                </span>
              </p>
            ) : (
              <button type="button" onClick={() => setReveal(true)} className="inline-flex min-h-11 items-center gap-1.5 text-sm font-black text-accent underline underline-offset-2">
                <PartyPopper className="size-4" aria-hidden />
                投票が終わったら、答え合わせ
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
  const slices = names.map((name, i) => {
    const a0 = ((i / n) * 360 - 90) * (Math.PI / 180);
    const a1 = (((i + 1) / n) * 360 - 90) * (Math.PI / 180);
    const large = 360 / n > 180 ? 1 : 0;
    const d = `M0 0 L${R * Math.cos(a0)} ${R * Math.sin(a0)} A${R} ${R} 0 ${large} 1 ${R * Math.cos(a1)} ${R * Math.sin(a1)} Z`;
    const mid = (((i + 0.5) / n) * 360 - 90) * (Math.PI / 180);
    return { name, d, tx: R * 0.62 * Math.cos(mid), ty: R * 0.62 * Math.sin(mid), rot: ((i + 0.5) / n) * 360 - 90 };
  });

  return (
    <Box title="ルーレット" locked={locked}>
      <p className="text-sm text-white/70">乾杯の音頭・おごり・罰ゲームの係を、運で決めます。</p>
      <div className="relative mx-auto mt-4 w-full max-w-[300px]">
        {/* 上の矢印 */}
        <div className="absolute top-[-6px] left-1/2 z-10 -translate-x-1/2 text-accent" aria-hidden>
          <svg width="26" height="22" viewBox="0 0 26 22">
            <path d="M13 22 L1 2 H25 Z" fill="currentColor" />
          </svg>
        </div>
        <svg viewBox="-150 -150 300 300" className="block h-auto w-full" role="img" aria-label={`ルーレット(${n}人)`}>
          <g style={{ transform: `rotate(${angle}deg)`, transition: spinning ? "transform 4s cubic-bezier(0.12, 0.7, 0.1, 1)" : "none" }}>
            {slices.map((s, i) => (
              <g key={s.name}>
                <path d={s.d} fill={winner === i ? "var(--accent)" : i % 2 === 0 ? "#2a2a2a" : "#1d1d1d"} stroke="#000" strokeWidth="1.5" />
                <text
                  x={s.tx}
                  y={s.ty}
                  transform={`rotate(${s.rot} ${s.tx} ${s.ty})`}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={n > 12 ? 9 : 13}
                  fontWeight="800"
                  fill={winner === i ? "#000" : "#fff"}
                >
                  {s.name.length > 6 ? `${s.name.slice(0, 5)}…` : s.name}
                </text>
              </g>
            ))}
            <circle r="14" fill="#000" stroke="var(--accent)" strokeWidth="3" />
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

// ───── NGワード ─────
function NgWord({ names, locked }: { names: string[]; locked: boolean }) {
  const [deals, setDeals] = useState<{ name: string; word: string }[] | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [outs, setOuts] = useState<number[]>([]);
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    if (left === null || left <= 0) return;
    const t = window.setTimeout(() => setLeft((v) => (v === null ? v : v - 1)), 1000);
    return () => window.clearTimeout(t);
  }, [left]);

  function start() {
    const d = ngWords(names);
    setDeals(d);
    setOpen(null);
    setOuts(d.map(() => 0));
    setLeft(null);
  }

  return (
    <Box title="NGワード" locked={locked}>
      <p className="text-sm text-white/70">
        1人に1つ、NGワードが決まります。<b className="text-white">その人以外の</b>みんなだけが、その言葉を見ます。会話の中で、自分のNGワードを言ってしまったら、アウトです。
      </p>
      {deals && (
        <>
          <ul className="mt-4 grid grid-cols-2 gap-2">
            {deals.map((d, i) => {
              const shown = open === i;
              return (
                <li key={d.name} className="rounded-2xl bg-surface-2 p-2 ring-1 ring-white/10">
                  <button
                    type="button"
                    onClick={() => setOpen(shown ? null : i)}
                    aria-pressed={shown}
                    className="flex min-h-14 w-full flex-col items-center justify-center rounded-xl px-1 py-1 transition active:scale-95"
                  >
                    <span className="max-w-full truncate text-sm font-bold">{d.name}さん</span>
                    <span className={`mt-0.5 inline-flex items-center gap-1 text-xs font-black ${shown ? "text-accent" : "text-muted"}`}>
                      {shown ? (
                        <>
                          <Eye className="size-3.5" aria-hidden />
                          {d.word}
                        </>
                      ) : (
                        <>
                          <EyeOff className="size-3.5" aria-hidden />
                          NGワードを見る
                        </>
                      )}
                    </span>
                  </button>
                  <div className="mt-1 flex items-center justify-between gap-1 border-t border-border pt-1.5">
                    <span className="text-[11px] font-bold text-muted tabular-nums">アウト {outs[i] ?? 0}回</span>
                    <button
                      type="button"
                      aria-label={`${d.name}さんがNGワードを言った(アウトを1回足す)`}
                      onClick={() => setOuts(outs.map((n, k) => (k === i ? n + 1 : n)))}
                      className="grid size-9 place-items-center rounded-lg bg-white/8 ring-1 ring-white/12 active:scale-90"
                    >
                      <Plus className="size-4" aria-hidden />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-xs text-muted">言葉を見るときは、その人に画面を見られないようにしてください。言ってしまったら「＋」を押します。</p>
          <div className="mt-3 flex items-center gap-2">
            <button type="button" onClick={() => setLeft(300)} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-white/8 px-3 text-sm font-bold ring-1 ring-white/12 active:scale-95">
              <Timer className="size-4" aria-hidden />
              5分でスタート
            </button>
            {left !== null && (
              <span className="text-lg font-black tabular-nums">
                {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}
                {left === 0 && <span className="ml-2 text-sm text-accent">時間です。アウトの数をくらべましょう</span>}
              </span>
            )}
          </div>
        </>
      )}
      <div className="mt-4">
        <RerollButton onClick={start} disabled={names.length < 2}>
          <Ban className="size-4" aria-hidden />
          {deals ? "NGワードを配り直す" : "NGワードを配る"}
        </RerollButton>
        {names.length < 2 && <p className="mt-2 text-center text-xs text-muted">2人から遊べます</p>}
      </div>
    </Box>
  );
}
