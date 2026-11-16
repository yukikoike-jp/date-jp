"use client";

import { Armchair, Crown, Dices, Eye, EyeOff, Lock, LockOpen, PartyPopper, Shuffle, Users } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  DEMO_NAMES,
  KING_ORDERS,
  SEAT_LAYOUTS,
  kingGame,
  parseNames,
  pickIndex,
  seatPlan,
  splitTeams,
  type KingDraw,
  type SeatLayout,
} from "@/lib/fun";
import { PILL, PILL_OFF, PILL_ON } from "./ui";
import { ProPaywall, useFunAccess } from "./ProGate";

// 有料プレミアムの「もりあげ道具」(席替え・チーム分け・王様ゲーム・ルーレット)。
// 買う前は「デモ版」: 見本の名前で全部の道具を試せるが、自分たちの名前は入れられない。
// 鍵のかかり方は lib/billing.ts の hasFun(支払いの準備ができていなくても、買うまでは鍵をかけたまま)

const NAMES_KEY = "date:fun-names";
type Tool = "seat" | "team" | "king" | "wheel";
const TOOLS: { key: Tool; label: string; icon: typeof Armchair }[] = [
  { key: "seat", label: "席替え", icon: Armchair },
  { key: "team", label: "チーム分け", icon: Users },
  { key: "king", label: "王様ゲーム", icon: Crown },
  { key: "wheel", label: "ルーレット", icon: Dices },
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
  const [tool, setTool] = useState<Tool>("seat");
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
        <h1 className="flex items-center gap-2 text-[22px] font-black tracking-tight">
          もりあげ道具
          {!access.loading && <PackBadge locked={locked} />}
        </h1>
        <p className="mt-1 text-sm text-muted">席替え・チーム分け・王様ゲーム・ルーレット</p>
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
      {locked && showBuy && <ProPaywall feature="もりあげ道具" fun price={access.price} purchasable={access.purchasable} onClose={() => setShowBuy(false)} />}

      {/* 道具の切り替え */}
      <div className="mx-4 mt-4 grid grid-cols-4 gap-1 rounded-2xl bg-surface-2 p-1" role="tablist" aria-label="道具">
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
          <ul id="fun-names" className="mt-2.5 flex flex-wrap gap-1.5 opacity-70" aria-label="見本の名前">
            {DEMO_NAMES.map((n) => (
              <li key={n} className="rounded-full bg-white/8 px-3 py-1 text-sm font-bold ring-1 ring-white/12">
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
        {tool === "seat" && <Seats names={names} locked={locked} />}
        {tool === "team" && <Teams names={names} locked={locked} />}
        {tool === "king" && <King names={names} locked={locked} />}
        {tool === "wheel" && <Wheel names={names} locked={locked} />}
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

// ───── 席替え ─────
function Seats({ names, locked }: { names: string[]; locked: boolean }) {
  const [layout, setLayout] = useState<SeatLayout>("table");
  const [plan, setPlan] = useState<{ rows: string[][] } | null>(null);
  const [round, setRound] = useState(0);
  const ok = names.length >= 2;
  // 名前や並べ方を変えたら、いったん結果を消す
  const key = `${layout}|${names.join("\u0000")}`;
  const last = useRef(key);
  useEffect(() => {
    if (last.current !== key) {
      last.current = key;
      setPlan(null);
    }
  }, [key]);

  function run() {
    setPlan(seatPlan(names, layout));
    setRound((r) => r + 1);
  }

  return (
    <Box title="席替え" locked={locked}>
      <div className="flex flex-wrap gap-2" role="group" aria-label="席の並べ方">
        {SEAT_LAYOUTS.map((l) => (
          <button key={l.key} type="button" aria-pressed={layout === l.key} onClick={() => setLayout(l.key)} className={`${PILL} ${layout === l.key ? PILL_ON : PILL_OFF}`}>
            {layout === l.key && "✓ "}
            {l.label}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted">{SEAT_LAYOUTS.find((l) => l.key === layout)!.note}</p>

      {plan && (
        <div key={round} className="anim-rise mt-4">
          {layout === "round" ? (
            <RoundTable names={plan.rows[0]} />
          ) : (
            <div className="space-y-2">
              {plan.rows.map((row, ri) => (
                <div key={ri}>
                  {layout === "table" && ri === 1 && (
                    <div className="mb-2 rounded-lg bg-white/8 py-1.5 text-center text-[11px] font-bold tracking-widest text-white/50">テーブル</div>
                  )}
                  <ul className="flex flex-wrap justify-center gap-2">
                    {row.map((n, i) => (
                      <SeatChip key={n} n={n} no={ri === 0 ? i + 1 : plan.rows[0].length + i + 1} />
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      <div className="mt-4">
        <RerollButton onClick={run} disabled={!ok}>
          <Shuffle className="size-4" aria-hidden />
          {plan ? "席替えをやり直す" : "席替えする"}
        </RerollButton>
      </div>
    </Box>
  );
}

function SeatChip({ n, no }: { n: string; no: number }) {
  return (
    <li className="flex min-h-12 min-w-[5.5rem] items-center gap-2 rounded-xl bg-surface-2 px-3 ring-1 ring-white/10">
      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent text-[11px] font-black text-accent-text">{no}</span>
      <span className="truncate text-sm font-bold">{n}</span>
    </li>
  );
}

function RoundTable({ names }: { names: string[] }) {
  const n = names.length;
  const size = 300;
  const r = 118;
  return (
    <div className="mx-auto" style={{ width: size, height: size, maxWidth: "100%" }}>
      <div className="relative h-full w-full">
        <div className="absolute inset-[22%] grid place-items-center rounded-full bg-white/8 text-[11px] font-bold tracking-widest text-white/50 ring-1 ring-white/10">
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
            </div>
          );
        })}
      </div>
    </div>
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
