"use client";

import { ArrowRight, Beer, Briefcase, Calculator, CalendarDays, ChevronDown, ChevronRight, GraduationCap, Lock, Sparkles, Store } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PartiesMenu } from "./PartiesMenu";
import { AUDIENCES, AUDIENCE_ORDER, loadAudience, saveAudience, type Audience } from "@/lib/audience";
import { WEIGHTS } from "@/lib/split";
import { Wordmark } from "./Logo";
import { InstallHint } from "./InstallHint";
import { SplashIntro } from "./SplashIntro";


type Phase = "loading" | "splash" | "choose" | "home";

/** ツールの四角。もとにした KANJI の「お店を探す」「会計を試算する」と同じ、2つ並べる大きめの四角。wide = 2つぶんの幅で横長に(有料プレミアムの入口) */
function ToolTile({ href, icon, title, sub, lockOnly = false, wide = false }: { href: string; icon: React.ReactNode; title: string; sub: string; lockOnly?: boolean; wide?: boolean }) {
  return (
    <Link
      href={href}
      className={`relative flex items-center rounded-2xl bg-surface text-center ring-1 ring-white/8 transition hover:bg-stone-800 active:scale-95 ${
        wide ? "col-span-2 gap-4 px-4 py-4 text-left" : "flex-col gap-3 px-3 py-5"
      }`}
    >
      {/* 有料の印は、鍵のマークだけ */}
      {lockOnly && (
        <span className="absolute top-2.5 right-2.5 grid size-7 place-items-center rounded-full bg-accent text-accent-text" role="img" aria-label="Tsudoro+(有料)">
          <Lock className="size-3.5" aria-hidden />
        </span>
      )}
      <span className="grid size-12 shrink-0 place-items-center rounded-xl border border-accent/40 text-accent">{icon}</span>
      <span className={wide ? "pr-8" : ""}>
        <span className="block text-[15px] font-black tracking-tight text-white/90">{title}</span>
        <span className="mt-1 block text-xs font-medium text-white/60">{sub}</span>
      </span>
    </Link>
  );
}

/**
 * 学生・プライベート・会社で変えるところ。見出しの一言と、2つの道具(お店・会計)の説明
 */
const HOME_BY_AUDIENCE: Record<
  Audience,
  { lead: string; shops: string; split: string; play: string }
> = {
  student: {
    lead: "サークル・ゼミの飲み会をURLひとつで",
    shops: "飲み放題・個室で探す",
    split: "割り勘と先輩多めの計算",
    play: "集金の催促をアプリにまかせる",
  },
  private: {
    lead: "サークル・友達の飲み会をURLひとつで",
    shops: "飲み放題・個室で探す",
    split: "割り勘と先輩多めの計算",
    play: "幹事がいる会をもっと楽しく",
  },
  worker: {
    lead: "歓送迎会・忘年会をURLひとつで",
    shops: "個室・喫煙可で探す",
    split: "補助や上司多めの計算",
    // 会社の会では、ゲームではなく、会話・あいさつ・準備(話題ガチャ・ひとこと・幹事メモ)
    play: "幹事の仕事を徹底的にサポート",
  },
};

/**
 * 乾杯の演出を、アプリを開いたこの回にもう出したか。ページを読み込み直すと false に戻るので、
 * 起動したときだけ出て、アプリの中でトップに戻ってきたときは出ない
 */
let introPlayed = false;

/** 起動画面 → 学生・プライベート・会社のどれか → ホーム。起動画面はアプリを開いたときだけ出す(タップで飛ばせる) */
export function HomeClient({ about }: { about?: React.ReactNode }) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [audience, setAudience] = useState<Audience | null>(null);
  useEffect(() => {
    // localStorage はブラウザでしか読めないので、描画のあとで読む
    const saved = loadAudience();
    /* eslint-disable react-hooks/set-state-in-effect */
    setAudience(saved);
    // 起動の演出は、アプリを開いたときだけ出す(戻ってきたときはすぐにホーム)
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const next: Phase = saved ? "home" : "choose";
    if (reduce || introPlayed) {
      setPhase(next);
      return;
    }
    setPhase("splash");
    /* eslint-enable react-hooks/set-state-in-effect */
    // 出し終えてから「出した」にする(開発中に効果が2回走っても、演出は1回きちんと出る)
    const t = setTimeout(() => {
      introPlayed = true;
      setPhase(next);
    }, 3200);
    return () => clearTimeout(t);
  }, []);

  function choose(a: Audience) {
    saveAudience(a);
    setAudience(a);
    setPhase("home");
  }

  // 読み込み中(サーバーが最初に返す HTML)は、画面は真っ黒のまま。説明は見えない形で入れておき、検索エンジンには読めるようにする
  if (phase === "loading") {
    return (
      <div className="min-h-dvh bg-bg">
        <div className="sr-only">{about}</div>
      </div>
    );
  }

  if (phase === "splash") {
    return (
      <SplashIntro
        onSkip={() => {
          introPlayed = true;
          setPhase(audience ? "home" : "choose");
        }}
      />
    );
  }

  if (phase === "choose" || audience === null) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-4 py-10">
        <div className="anim-rise">
          <Wordmark size={40} />
          <h1 className="mt-6 text-3xl font-black tracking-tight">あなたは?</h1>
          {/* 375px 幅でもきれいに2行で収まるよう、行の切れ目を決めておく */}
          <p className="mt-2 text-muted">
            <span className="block">選んだものに合う予算・時間・お店を表示</span>
            <span className="block">あとから切り替えOK</span>
          </p>
          <div className="mt-8 grid gap-3">
            {AUDIENCE_ORDER.map((a) => {
              const Icon = { student: GraduationCap, private: Beer, worker: Briefcase }[a];
              return (
                <button
                  key={a}
                  type="button"
                  onClick={() => choose(a)}
                  className="flex min-h-24 items-center gap-4 rounded-3xl border panel px-5 text-left transition-colors hover:border-accent"
                >
                  <span className="grid size-14 shrink-0 place-items-center rounded-2xl border border-accent/60 text-accent">
                    <Icon className="size-7" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xl font-black tracking-tight">{AUDIENCES[a].label}</span>
                    <span className="block text-[11px] text-white/40">{AUDIENCES[a].note}</span>
                  </span>
                  <ChevronRight className="size-5 text-muted" aria-hidden />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  const tiers = WEIGHTS[audience];
  // 学生・プライベート・会社で、会の一覧を分ける(いま選んでいるものの会だけを出す)
  const home = HOME_BY_AUDIENCE[audience];
  const tierIcon = (
    // 傾斜の区分の色を、高さの違う棒で並べる(多めの人ほど高い)
    <span aria-hidden className="flex h-6 items-end gap-[3px]">
      {tiers.map((w) => (
        <span
          key={w.key}
          className={`tier-${w.tone} w-[5px] rounded-full bg-[var(--tb)]`}
          style={{ height: `${Math.round((w.tenths / 15) * 100)}%` }}
        />
      ))}
    </span>
  );

  return (
    <div className="anim-rise mx-auto flex min-h-dvh max-w-xl flex-col gap-5 px-4 pt-6 pb-8">
      {/* いちばん上: 名前と、学生・プライベート・会社。隅に小さく置き、押すと選び直す画面を開く */}
      <div className="flex items-center justify-between pt-2">
        <Wordmark size={26} />
        <div className="-mr-1 flex items-center gap-1">
        <PartiesMenu />
        <button
          type="button"
          onClick={() => setPhase("choose")}
          aria-label={`プライベート・仕事を選び直す(いまは${AUDIENCES[audience].label})`}
          className="flex h-11 items-center gap-1 rounded-full px-4 text-[13px] font-bold text-white/80 ring-1 ring-white/20 transition hover:text-white hover:ring-white/40 active:scale-95"
        >
          {AUDIENCES[audience].label}
          <ChevronDown className="size-3.5" aria-hidden />
        </button>
        </div>
      </div>

      {/* 会をつくる。ここだけ金の光をまとわせる */}
      <Link href="/new" className="hero block overflow-hidden rounded-3xl transition active:scale-[0.99]">
        <div className="flex flex-col px-6 pt-7 pb-6">
          <p className="text-[22px] font-black tracking-tight text-white">飲み会をつくる</p>
          <p className="mt-1 text-[13px] font-medium text-white/60">{home.lead}</p>
          <ol className="mt-6 flex items-start" aria-label="URLひとつで進むこと">
            {[
              { Icon: CalendarDays, label: "日程調整" },
              { Icon: Store, label: "お店探し" },
              { Icon: Calculator, label: "会計精算" },
            ].map(({ Icon, label }, i) => (
              <li key={label} className="flex flex-1 items-start">
                <span className="anim-stagger flex flex-1 flex-col items-center gap-1.5" style={{ "--i": i + 2 } as React.CSSProperties}>
                  <span className="grid size-11 place-items-center rounded-2xl bg-accent/12 text-accent ring-1 ring-accent/30">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <span className="text-[11px] font-black tracking-[0.08em] text-white/70">{label}</span>
                </span>
                {i < 2 && <span aria-hidden className="mt-[22px] h-px w-4 shrink-0 bg-gradient-to-r from-accent/50 to-accent/10" />}
              </li>
            ))}
          </ol>
          <span className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-accent py-3.5 text-[14px] font-black tracking-tight text-black">
            URLをつくる
            <ArrowRight className="size-4" aria-hidden />
          </span>
        </div>
      </Link>

      <section>
        {/* ツールは「お店」と「会計」の2つだけ。集金は会計の中から開く */}
        <div className="grid grid-cols-2 gap-2.5">
          <ToolTile href="/shops" icon={<Store className="size-6" aria-hidden />} title="お店探し" sub={home.shops} />
          <ToolTile href="/split" icon={tierIcon} title="会計" sub={home.split} />
          {/* 有料プレミアムの入口。何が有料かが、ホームですぐ分かるようにする(鍵のマークだけ) */}
          <ToolTile
            href="/fun"
            icon={<Sparkles className="size-6" aria-hidden />}
            title="Tsudoro+"
            sub={home.play}
            lockOnly
            wide
          />
        </div>
      </section>

      <InstallHint />

      {/* いちばん下。方針へのリンクと説明は小さくまとめ、ホームの上にだけ出す(起動の演出や選ぶ画面には出さない) */}
      <div className="mt-auto space-y-1.5 pt-4">
        {/* 有料の機能を売っているときだけ、特定商取引法の表記を置く(プライバシーポリシーは、下の説明の行の中) */}
        {process.env.BILLING_ON === "1" && (
          <p className="flex justify-center text-[11px]">
            <Link href="/legal" className="inline-flex min-h-9 items-center text-white/55 underline underline-offset-2 hover:text-white/80">
              特定商取引法に基づく表記
            </Link>
          </p>
        )}
        {about}
      </div>
    </div>
  );
}
