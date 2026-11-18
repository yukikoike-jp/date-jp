"use client";

import { Lock } from "lucide-react";
import { DEMO_NAMES, KING_ORDERS } from "@/lib/fun";
import { DARES, TRUTHS } from "@/lib/games";
import { clock, yen } from "@/lib/sendai";
import { CHECKLIST, SPEECHES, THANKS, TOPICS, timeline } from "@/lib/work";

// 買う前に見せる「見本」。どんな機能かが分からないと、買う気にならないため、1つずつ例を見せる。
// 動かすことはできない(押しても何も起きない)。気に入ったら、下のボタンから買い切りの案内へ。
// 仕事の会の見本は、文もすべて敬語

type Sample = { lead: string; body: React.ReactNode; more: string };

function Bubble({ children }: { children: React.ReactNode }) {
  return <p className="rounded-2xl bg-surface-2 px-4 py-4 text-base leading-relaxed font-bold ring-1 ring-white/10">{children}</p>;
}

function samples(): Record<string, Sample> {
  return {
    wolf: {
      lead: "みんなに同じお題。1人だけ、ちがうお題が配られます。",
      body: (
        <div className="space-y-2">
          <Bubble>みんなのお題:りんご</Bubble>
          <Bubble>ウルフのお題:みかん</Bubble>
          <p className="text-sm text-white/70">話しながら、だれがウルフかを当てるゲームです。お題は、スマホ1台で回して配れます。</p>
        </div>
      ),
      more: "お題は24組入っています。何度でも配り直せます",
    },
    ng: {
      lead: "1人ずつ、言ってはいけない言葉が配られます。",
      body: (
        <div className="space-y-2">
          <Bubble>あなたのNGワード:「やばい」</Bubble>
          <p className="text-sm text-white/70">普通に話しているだけで、うっかり言ってしまう言葉です。言ったらアウト。</p>
        </div>
      ),
      more: "NGワードは、人ごとにちがいます",
    },
    truth: {
      lead: "カードを引いて、答えるか、やってみるか。",
      body: (
        <div className="space-y-2">
          <Bubble>真実:{TRUTHS.soft[0]}</Bubble>
          <Bubble>挑戦:{DARES.soft[0]}</Bubble>
        </div>
      ),
      more: "「ゆるめ」と「ちょい攻め」の2段階。人を傷つけるお題は入れていません",
    },
    king: {
      lead: "番号を配って、王様が命令を出します。",
      body: (
        <div className="space-y-2">
          <Bubble>王様の命令:{KING_ORDERS[0]}</Bubble>
          <p className="text-sm text-white/70">番号は、スマホが配ります。王様だけが、だれがどの番号かを知っています。</p>
        </div>
      ),
      more: "命令は、だれでも楽しめる軽いものだけ",
    },
    wheel: {
      lead: "名前を入れて回すだけ。順番や係が、その場で決まります。",
      body: (
        <div className="space-y-2">
          <Bubble>今夜の乾杯係:{DEMO_NAMES[2]}さん</Bubble>
          <p className="text-sm text-white/70">支払いの順番、買い出し係、二次会の行き先決めにも使えます。</p>
        </div>
      ),
      more: "名前は30人まで。前に入れた名前は、そのまま残ります",
    },
    team: {
      lead: "人数がかたよらないように、チームを分けます。",
      body: (
        <div className="grid grid-cols-2 gap-2">
          <Bubble>Aチーム:{DEMO_NAMES[0]}・{DEMO_NAMES[2]}・{DEMO_NAMES[4]}</Bubble>
          <Bubble>Bチーム:{DEMO_NAMES[1]}・{DEMO_NAMES[3]}・{DEMO_NAMES[5]}</Bubble>
        </div>
      ),
      more: "2〜6チーム。何度でも分け直せます",
    },
    topic: {
      lead: "話が止まったときに、1回引くだけです。",
      body: <Bubble>{TOPICS.chat[0]}</Bubble>,
      more: "雑談・仕事まわり・これから、の3種類。年齢や年収など、職場で聞きにくい話題は入れていません",
    },
    speech: {
      lead: "乾杯と締めのごあいさつの例です。そのままお読みいただけます。",
      body: <Bubble>{SPEECHES.bonenkai.toast[0]}</Bubble>,
      more: "忘年会・新年会・歓送迎会・懇親会の4種類",
    },
    memo: {
      lead: "当日までにやることを、チェックしていけます。",
      body: (
        <ul className="space-y-1.5">
          {CHECKLIST.slice(0, 4).map((t) => (
            <li key={t} className="flex min-h-12 items-center gap-3 rounded-xl bg-surface-2 px-3 text-sm font-bold ring-1 ring-white/10">
              <span className="size-6 shrink-0 rounded-md border-2 border-white/30" aria-hidden />
              {t}
            </li>
          ))}
        </ul>
      ),
      more: "自由なメモも書けます。この端末に残ります",
    },
    thanks: {
      lead: "会のあとのお礼や、言いにくいご連絡を、やわらかい文でお伝えできます。",
      body: (
        <div className="space-y-2">
          <Bubble>{THANKS.all[0]}</Bubble>
          <p className="text-sm font-bold text-white/70">キャンセル料のお願いも、こんな言い方で。</p>
          <Bubble>{THANKS.cancel[0]}</Bubble>
        </div>
      ),
      more: "「上司・先輩へ」「来られなかった方へ」も。キャンセル料の金額は、入れると文に反映されます",
    },
    seat: {
      lead: "お名前をシャッフルして、席順をご提案します。",
      body: (
        <ul className="flex flex-wrap justify-center gap-2">
          {DEMO_NAMES.map((n, i) => (
            <li key={n} className="flex min-h-12 min-w-[5.5rem] items-center gap-2 rounded-xl bg-surface-2 px-3 ring-1 ring-white/10">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent text-[11px] font-black text-accent-text">{i + 1}</span>
              <span className="truncate text-sm font-bold">{n}</span>
            </li>
          ))}
        </ul>
      ),
      more: "向かい合わせ・円卓・カウンターから選べます",
    },
    schedule: {
      lead: "開始時刻を選ぶだけで、当日の進行表ができます。",
      body: (
        <ul className="space-y-1.5">
          {timeline(1140, 120).map((s) => (
            <li key={s.at} className="flex min-h-12 items-center gap-3 rounded-xl bg-surface-2 px-3 ring-1 ring-white/10">
              <span className="w-14 shrink-0 text-sm font-black tabular-nums text-accent">{clock(s.at)}</span>
              <span className="text-sm font-bold">{s.label}</span>
            </li>
          ))}
        </ul>
      ),
      more: "会の長さに合わせて、締めの時刻も自動で決まります",
    },
  };
}

export function SampleCard({
  tool,
  label,
  tone,
  price,
  onBuy,
  work,
}: {
  tool: string;
  label: string;
  tone: string;
  price: number;
  onBuy: () => void;
  work: boolean;
}) {
  const s = samples()[tool];
  if (!s) return null;
  return (
    <section className={`tone-${tone} mx-4 rounded-3xl border border-accent/35 panel px-4 py-5 shadow-[0_0_28px_-18px_var(--accent)]`}>
      <h2 className="mb-1 flex items-center justify-between text-lg font-black">
        <span className="flex items-center gap-2">
          <span className="h-5 w-1.5 rounded-full bg-accent" aria-hidden />
          {label}
        </span>
        <span className="rounded-full border border-accent/50 px-2.5 py-0.5 text-[11px] font-black text-accent">見本</span>
      </h2>
      <p className="mb-3 text-sm text-white/70">{s.lead}</p>
      {s.body}
      <p className="mt-3 text-xs text-muted">{s.more}</p>
      <button
        type="button"
        onClick={onBuy}
        className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-accent px-4 text-sm font-black text-accent-text active:scale-95"
      >
        <Lock className="size-4" aria-hidden />
        {work ? `${yen(price)}で、すべてご利用いただけます` : `${yen(price)}で、ぜんぶ遊べる`}
      </button>
    </section>
  );
}
