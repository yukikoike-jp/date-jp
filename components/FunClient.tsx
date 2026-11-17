"use client";

import { Ban, ClipboardList, Crown, Dices, Eye, EyeOff, Flame, Lock, LockOpen, MessageCircleQuestionMark, Mic, PartyPopper, Plus, Send, Shuffle, Timer, Users, VenetianMask } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { DEMO_NAMES, KING_ORDERS, kingGame, parseNames, pickIndex, splitTeams, type KingDraw } from "@/lib/fun";
import { DARES, LEVELS, TRUTHS, drawCard, nextPlayer, ngWords, wordWolf, type CardKind, type Level } from "@/lib/games";
import { PILL, PILL_OFF, PILL_ON } from "./ui";
import { loadAudience } from "@/lib/audience";
import { CHECKLIST, OCCASIONS, SPEECHES, THANKS, THANKS_KINDS, TOPICS, TOPIC_KINDS, drawIndex, type Occasion, type ThanksKind, type TopicKind } from "@/lib/work";
import { openBillingPortal } from "@/app/actions";
import { ProPaywall, useFunAccess } from "./ProGate";

// 有料プレミアムの「Play」(ワードウルフ・NGワード・真実か挑戦・王様ゲーム・ルーレット・チーム分け)。
// 買う前は、遊びの名前(タブ)だけ見られる。遊び方や中身は出さない(2026-11-17。中身を見せると、お金を払う理由がなくなるため)。
// 鍵のかかり方は lib/billing.ts の hasFun(支払いの準備ができていなくても、買うまでは鍵をかけたまま)

const NAMES_KEY = "date:fun-names";
type Tool = "wolf" | "ng" | "truth" | "king" | "wheel" | "team" | "topic" | "speech" | "memo" | "thanks";
const PLAY_TOOLS: { key: Tool; label: string; icon: typeof Crown }[] = [
  { key: "wolf", label: "ワードウルフ", icon: VenetianMask },
  { key: "ng", label: "NGワード", icon: Ban },
  { key: "truth", label: "真実か挑戦", icon: MessageCircleQuestionMark },
  { key: "king", label: "王様ゲーム", icon: Crown },
  { key: "wheel", label: "ルーレット", icon: Dices },
  { key: "team", label: "チーム分け", icon: Users },
];

/** 会社の会: ゲームより、会話のきっかけ・あいさつ・幹事のメモ。ルーレット(担当決め)とチーム分け(席・グループ)は、そのまま使える */
const WORK_TOOLS: { key: Tool; label: string; icon: typeof Crown }[] = [
  { key: "topic", label: "話題ガチャ", icon: MessageCircleQuestionMark },
  { key: "speech", label: "ひとこと", icon: Mic },
  { key: "memo", label: "幹事メモ", icon: ClipboardList },
  { key: "thanks", label: "お礼の連絡", icon: Send },
  { key: "wheel", label: "ルーレット", icon: Dices },
  { key: "team", label: "チーム分け", icon: Users },
];

/** 道具ごとの色(飽きないように、黄色と黒だけにしない)。色の定義は app/globals.css の .tone-* */
type Tone = "gold" | "red" | "blue" | "green" | "purple" | "orange" | "cyan";
const TOOL_TONE: Record<Tool, Tone> = {
  wolf: "purple",
  ng: "red",
  truth: "blue",
  king: "gold",
  wheel: "orange",
  team: "green",
  topic: "cyan",
  speech: "gold",
  memo: "purple",
  thanks: "blue",
};

/** 名前を入れる道具(話題・ひとこと・メモには要らない) */
const NEEDS_NAMES: Tool[] = ["wolf", "ng", "truth", "king", "wheel", "team"];

/** 有料プレミアムの印。鍵のマークだけ(デモ版かどうかは、上の案内に書く) */
function PackBadge({ locked }: { locked: boolean }) {
  const Icon = locked ? Lock : LockOpen;
  return (
    <span
      className="inline-grid size-7 shrink-0 place-items-center rounded-full border border-accent/50 text-accent"
      role="img"
      aria-label={locked ? "有料プレミアム(未契約)" : "有料プレミアム(契約中)"}
    >
      <Icon className="size-3.5" aria-hidden />
    </span>
  );
}

export function FunClient() {
  const access = useFunAccess();
  const locked = !access.unlocked;
  // 会社の会は、会社向けの道具。学生とプライベートは同じ遊び。会の種類は、この端末に残っている選んだ値から読む
  const [company, setCompany] = useState(false);
  const [tool, setTool] = useState<Tool>("wolf");
  useEffect(() => {
    const isWork = loadAudience() === "worker";
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCompany(isWork);
    if (isWork) setTool("topic");
  }, []);
  const TOOLS = company ? WORK_TOOLS : PLAY_TOOLS;
  const [text, setText] = useState(DEMO_NAMES.join("\n"));
  const [showBuy, setShowBuy] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);

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
        <p className="mt-1 text-sm text-muted">{company ? "会話もあいさつも準備もスムーズに" : "幹事がいる会をもっと楽しく"}</p>
      </div>

      {/* 買う前は、遊びの名前だけ見せる(中身は見せない)。何が起きているか、どうすれば使えるかを最初に伝える */}
      {!access.loading && locked && (
        <section className="mx-4 mt-4 rounded-3xl border border-accent/50 bg-surface px-5 py-5" aria-label="デモ版の案内">
          <p className="flex items-center gap-2 text-base font-black">
            <Lock className="size-5 text-accent" aria-hidden />
            いまは見るだけです
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-white/75">
            {company ? "道具の名前だけ見られます。使うには有料プレミアムが必要です。" : "遊びの名前だけ見られます。遊ぶには有料プレミアムが必要です。"}
          </p>
          {!showBuy && (
            <button
              type="button"
              onClick={() => setShowBuy(true)}
              className="mt-3 inline-flex min-h-11 items-center rounded-2xl bg-accent px-4 text-sm font-black text-accent-text active:scale-95"
            >
              有料プレミアムをくわしく
            </button>
          )}
        </section>
      )}
      {locked && showBuy && <ProPaywall feature="Play" work={company} price={access.price} purchasable={access.purchasable} onClose={() => setShowBuy(false)} />}

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
              // 余りが2つのとき(TOOLS.length が3で割って2余る)は、最後の2つが3列ぶんずつ。それ以外は2列ぶん(3つずつ)
              TOOLS.length % 3 === 2 && i >= TOOLS.length - 2 ? "col-span-3" : "col-span-2"
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
      {!locked && NEEDS_NAMES.includes(tool) && (
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
      )}

      <div className="mt-4">
        {locked ? (
          // 買う前は、名前だけ。遊び方や中身は出さない
          <section className={`tone-${TOOL_TONE[tool]} mx-4 rounded-3xl border border-accent/35 panel px-4 py-10 text-center`}>
            <span className="mx-auto grid size-12 place-items-center rounded-full border border-accent/50 text-accent">
              <Lock className="size-5" aria-hidden />
            </span>
            <p className="mt-3 text-lg font-black">{TOOLS.find((t) => t.key === tool)?.label}</p>
            <p className="mt-1 text-sm text-muted">有料プレミアムで使えます。</p>
          </section>
        ) : (
          <>
            {tool === "truth" && <TruthDare names={names} locked={locked} />}
            {tool === "wolf" && <Wolf names={names} locked={locked} />}
            {tool === "king" && <King names={names} locked={locked} />}
            {tool === "ng" && <NgWord names={names} locked={locked} />}
            {tool === "wheel" && <Wheel names={names} locked={locked} />}
            {tool === "team" && <Teams names={names} locked={locked} />}
            {tool === "topic" && <Topic locked={locked} />}
            {tool === "speech" && <Speech locked={locked} />}
            {tool === "memo" && <Memo locked={locked} />}
            {tool === "thanks" && <Thanks locked={locked} />}
          </>
        )}
      </div>

      {/* 契約中のとき: 契約の確認・解約(Stripe のカスタマーポータル)。解約の入口を、いつでも見える場所に置く */}
      {!access.loading && !locked && access.license && (
        <div className="mt-6 px-4">
          <button
            type="button"
            onClick={async () => {
              setPortalError(null);
              const r = await openBillingPortal(access.license, "/fun");
              if (r.ok) location.href = r.url;
              else setPortalError(r.error);
            }}
            className="flex min-h-11 items-center text-xs font-bold text-muted underline underline-offset-2"
          >
            契約の確認・解約
          </button>
          {portalError && (
            <p role="alert" className="text-xs font-bold text-danger">
              {portalError}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/** ルーレットのひと切れずつの色。やわらかい色を順にくり返す。最後と最初が同じ色にならないよう、ずらす */
const WHEEL_COLORS = ["#e07a88", "#7aa6dd", "#62bd96", "#a592dc", "#e09a6b", "#e3c46e", "#60b9c9"];
function sliceColor(i: number, n: number): string {
  const len = WHEEL_COLORS.length;
  return WHEEL_COLORS[i === n - 1 && n > 1 && i % len === 0 ? 1 : i % len];
}

/** 道具の箱。デモ版のときは右上に印を付ける */
function Box({ title, tone, locked, children }: { title: string; tone: Tone; locked: boolean; children: React.ReactNode }) {
  return (
    <section className={`tone-${tone} mx-4 rounded-3xl border border-accent/35 panel px-4 py-5 shadow-[0_0_28px_-18px_var(--accent)]`}>
      <h2 className="mb-3 flex items-center justify-between text-lg font-black">
        <span className="flex items-center gap-2">
          <span className="h-5 w-1.5 rounded-full bg-accent" aria-hidden />
          {title}
        </span>
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
    <Box title="チーム分け" tone={TOOL_TONE.team} locked={locked}>
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
    <Box title="王様ゲーム" tone={TOOL_TONE.king} locked={locked}>
      <p className="text-sm text-white/70">くじを引いたら自分の名前を押してこっそりカードを見ます。見たらもう一度押して隠します。</p>
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
    <Box title="真実か挑戦" tone={TOOL_TONE.truth} locked={locked}>
      <p className="text-sm text-white/70">当たった人が「真実」か「挑戦」を選びます。真実は質問に正直に答え、挑戦はお題をやりきります。できなければパスしても大丈夫です。</p>
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
  const slices = names.map((name, i) => {
    const a0 = ((i / n) * 360 - 90) * (Math.PI / 180);
    const a1 = (((i + 1) / n) * 360 - 90) * (Math.PI / 180);
    const large = 360 / n > 180 ? 1 : 0;
    const d = `M0 0 L${R * Math.cos(a0)} ${R * Math.sin(a0)} A${R} ${R} 0 ${large} 1 ${R * Math.cos(a1)} ${R * Math.sin(a1)} Z`;
    const mid = (((i + 0.5) / n) * 360 - 90) * (Math.PI / 180);
    return { name, d, tx: R * 0.62 * Math.cos(mid), ty: R * 0.62 * Math.sin(mid), rot: ((i + 0.5) / n) * 360 - 90 };
  });

  return (
    <Box title="ルーレット" tone={TOOL_TONE.wheel} locked={locked}>
      <p className="text-sm text-white/70">乾杯の音頭・おごり・罰ゲームの係を運で決めます。</p>
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
                <path d={s.d} fill={sliceColor(i, n)} opacity={winner === null || winner === i ? 1 : 0.4} stroke={winner === i ? "#fff" : "#000"} strokeWidth={winner === i ? 3 : 1.5} />
                <text
                  x={s.tx}
                  y={s.ty}
                  transform={`rotate(${s.rot} ${s.tx} ${s.ty})`}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={n > 12 ? 9 : 13}
                  fontWeight="800"
                  fill="#000"
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
    <Box title="NGワード" tone={TOOL_TONE.ng} locked={locked}>
      <p className="text-sm text-white/70">
        1人に1つNGワードが決まります<b className="text-white">その人以外の</b>みんなだけがその言葉を見ます。会話の中で自分のNGワードを言ってしまったらアウトです。
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
          <p className="mt-2 text-xs text-muted">言葉を見るときはその人に画面を見られないように。言ってしまったら「＋」を押します。</p>
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

// ───── 話題ガチャ(会社の会)─────
function Topic({ locked }: { locked: boolean }) {
  const [kind, setKind] = useState<TopicKind>("chat");
  const [card, setCard] = useState<string | null>(null);
  const [used, setUsed] = useState<Record<TopicKind, Set<number>>>({ chat: new Set(), work: new Set(), future: new Set() });

  function draw() {
    const r = drawIndex(TOPICS[kind].length, used[kind]);
    setUsed({ ...used, [kind]: r.reset ? new Set([r.index]) : new Set([...used[kind], r.index]) });
    setCard(TOPICS[kind][r.index]);
  }

  return (
    <Box title="話題ガチャ" tone={TOOL_TONE.topic} locked={locked}>
      <p className="text-sm text-white/70">会話に困ったら引いてみてください。みんなに順番に聞いても盛り上がります。</p>
      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="話題の種類">
        {TOPIC_KINDS.map((k, i) => {
          // デモ版は最初の種類だけ。ほかは鍵つき
          const closed = locked && i > 0;
          return (
            <button
              key={k.key}
              type="button"
              disabled={closed}
              aria-pressed={kind === k.key}
              onClick={() => {
                setKind(k.key);
                setCard(null);
              }}
              className={`${PILL} disabled:opacity-50 ${kind === k.key ? PILL_ON : PILL_OFF}`}
            >
              {closed ? <Lock className="size-3.5" aria-hidden /> : kind === k.key && "✓ "}
              {k.label}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-muted">{TOPIC_KINDS.find((k) => k.key === kind)!.note}</p>
      {card && (
        <div className="anim-rise mt-4 rounded-2xl border border-accent/40 px-4 py-5 text-center" aria-live="polite">
          <p className="text-xl leading-snug font-black">{card}</p>
        </div>
      )}
      <div className="mt-4">
        <RerollButton onClick={draw}>
          <MessageCircleQuestionMark className="size-4" aria-hidden />
          {card ? "次の話題を引く" : "話題を引く"}
        </RerollButton>
      </div>
    </Box>
  );
}

// ───── ひとこと(会社の会)─────
function Speech({ locked }: { locked: boolean }) {
  const [occasion, setOccasion] = useState<Occasion>("bonenkai");
  const [kind, setKind] = useState<"toast" | "closing">("toast");
  const [n, setN] = useState(0);
  const list = SPEECHES[occasion][kind];
  const text = list[n % list.length];

  return (
    <Box title="ひとこと" tone={TOOL_TONE.speech} locked={locked}>
      <p className="text-sm text-white/70">乾杯と〆のあいさつの例です。そのまま読んでも 少し変えても使えます。</p>
      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="会の種類">
        {OCCASIONS.map((o, i) => {
          const closed = locked && i > 0;
          return (
            <button
              key={o.key}
              type="button"
              disabled={closed}
              aria-pressed={occasion === o.key}
              onClick={() => {
                setOccasion(o.key);
                setN(0);
              }}
              className={`${PILL} disabled:opacity-50 ${occasion === o.key ? PILL_ON : PILL_OFF}`}
            >
              {closed ? <Lock className="size-3.5" aria-hidden /> : occasion === o.key && "✓ "}
              {o.label}
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex gap-2" role="group" aria-label="あいさつの種類">
        {(["toast", "closing"] as const).map((k) => (
          <button
            key={k}
            type="button"
            aria-pressed={kind === k}
            onClick={() => {
              setKind(k);
              setN(0);
            }}
            className={`${PILL} flex-1 ${kind === k ? PILL_ON : PILL_OFF}`}
          >
            {kind === k && "✓ "}
            {k === "toast" ? "乾杯" : "〆"}
          </button>
        ))}
      </div>
      <p className="anim-rise mt-4 rounded-2xl bg-surface-2 px-4 py-4 text-base leading-relaxed font-bold ring-1 ring-white/10" key={`${occasion}${kind}${n}`}>
        {text}
      </p>
      <button
        type="button"
        onClick={() => setN((v) => v + 1)}
        className="mt-3 inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-white/8 px-3 text-sm font-bold ring-1 ring-white/12 active:scale-95"
      >
        <Shuffle className="size-4" aria-hidden />
        別の例を見る
      </button>
    </Box>
  );
}

// ───── お礼の連絡(会社の会)─────
function Thanks({ locked }: { locked: boolean }) {
  const [kind, setKind] = useState<ThanksKind>("all");
  const [n, setN] = useState(0);
  const [copied, setCopied] = useState(false);
  const list = THANKS[kind];
  const text = list[n % list.length];

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  return (
    <Box title="お礼の連絡" tone={TOOL_TONE.thanks} locked={locked}>
      <p className="text-sm text-white/70">会の次の日に送る お礼の文の例です。コピーして そのまま送れます。</p>
      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="送る相手">
        {THANKS_KINDS.map((k) => (
          <button
            key={k.key}
            type="button"
            aria-pressed={kind === k.key}
            onClick={() => {
              setKind(k.key);
              setN(0);
            }}
            className={`${PILL} ${kind === k.key ? PILL_ON : PILL_OFF}`}
          >
            {kind === k.key && "✓ "}
            {k.label}
          </button>
        ))}
      </div>
      <p className="anim-rise mt-4 rounded-2xl bg-surface-2 px-4 py-4 text-base leading-relaxed font-bold ring-1 ring-white/10" key={`${kind}${n}`}>
        {text}
      </p>
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={copy} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-accent px-3 text-sm font-black text-accent-text active:scale-95">
          {copied ? "コピーしました" : "コピーする"}
        </button>
        <button type="button" onClick={() => setN((v) => v + 1)} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-white/8 px-3 text-sm font-bold ring-1 ring-white/12 active:scale-95">
          <Shuffle className="size-4" aria-hidden />
          別の例を見る
        </button>
      </div>
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
    <Box title="幹事メモ" tone={TOOL_TONE.memo} locked={locked}>
      <p className="text-sm text-white/70">当日までにやることと 自由なメモをまとめます{locked ? "(デモ版は保存されません)" : "(この端末に残ります)"}</p>
      <p className="mt-2 text-xs font-bold text-muted tabular-nums">
        {done} / {CHECKLIST.length} 終わった
      </p>
      <ul className="mt-2 space-y-1.5">
        {CHECKLIST.map((t, i) => (
          <li key={t}>
            <button
              type="button"
              role="checkbox"
              aria-checked={checked[i]}
              onClick={() => save(checked.map((c, k) => (k === i ? !c : c)), memo)}
              className="flex min-h-12 w-full items-center gap-3 rounded-xl bg-surface-2 px-3 text-left ring-1 ring-white/10 transition active:scale-[0.98]"
            >
              <span className={`grid size-6 shrink-0 place-items-center rounded-md border-2 ${checked[i] ? "border-accent bg-accent text-accent-text" : "border-white/30"}`}>
                {checked[i] && <span aria-hidden className="text-sm leading-none font-black">✓</span>}
              </span>
              <span className={`text-sm font-bold ${checked[i] ? "text-muted line-through" : ""}`}>{t}</span>
            </button>
          </li>
        ))}
      </ul>
      <label className="mt-4 block">
        <span className="text-sm font-bold text-white/70">メモ</span>
        <textarea
          value={memo}
          onChange={(e) => save(checked, e.target.value.slice(0, 1000))}
          rows={4}
          placeholder="お店の連絡先 乾杯をお願いする人 気をつけることなど"
          className="mt-1.5 w-full resize-none rounded-2xl bg-white/8 px-4 py-3 text-base text-white ring-1 ring-white/12 outline-none placeholder:text-white/25 focus:ring-accent/50"
        />
      </label>
    </Box>
  );
}
