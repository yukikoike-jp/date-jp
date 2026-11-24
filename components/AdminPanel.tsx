"use client";

import type { Scene } from "@/lib/otherSites";
import { BottomSheet } from "./BottomSheet";
import { toast } from "./Toast";
import { CalendarClock, Check, ChevronRight, KeyRound, PartyPopper, Users, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { decide } from "@/app/actions";
import { dateLabel } from "@/lib/sendai";
import { decidedText, inviteText } from "@/lib/share";
import type { Shop } from "@/lib/shops";
import type { Decision } from "@/lib/store/types";
import type { DateRank } from "@/lib/summary";
import { saveAdminToken } from "./CreateForm";
import { Fold } from "./Fold";
import { MustPicker } from "./MustPicker";
import { SendButtons, useCanShare } from "./SendButtons";
import { ShopList } from "./ShopList";
import { SPLIT_NAMES_KEY, SPLIT_TITLE_KEY } from "./SplitClient";
import { BUTTON_PRIMARY } from "./ui";

type Props = {
  partyId: string;
  title: string;
  token: string;
  created: boolean;
  ranking: DateRank[];
  /** 答えた人の数。0 人のうちは「みんなに送る」だけを大きく出す */
  answered: number;
  bestDate: string | null;
  /** ○の数が同じでいちばん多い日(同率なら全部) */
  bestDates: string[];
  shops: Shop[];
  decision: Decision | null;
  /** その日に行く人の名前と、お酒を飲まないか。会計に持っていく */
  attendees: { name: string; soft: boolean }[];
  /** 幹事が決めた開始時刻(分)。招待の文に添える */
  start: number | null;
  /** 答えた人の名前と、そのうち幹事が「必ず来てほしい」にした人 */
  names: string[];
  must: string[];
  /** 決めた日に「たぶん」の人の数(予約の人数の目安に使う) */
  maybes: number;
  /** お店の一覧に添えるもの(lib/view.ts の結果をそのまま渡す) */
  otherArea: boolean;
  notice: string | null;
  basis: string[];
  relaxed: string | null;
  /** どんな会か。ほかの予約サイトの出し方を決める */
  scene: Scene;
};

/** 「幹事が決める」の中の小見出し。番号の丸で、上から順に決めることを見せる(色は金だけ) */
function StepHead({ step, children }: { step: number; children: React.ReactNode }) {
  return (
    <p className="mt-6 mb-2 flex items-center gap-2 text-sm font-black text-white/90">
      <span className="grid size-6 place-items-center rounded-full bg-accent/15 text-xs font-black text-accent ring-1 ring-accent/40">{step}</span>
      {children}
    </p>
  );
}

/** 枠の見出し。アイコンの丸と、何をする枠かの一言 */
function BoxHead({ icon, title, note, tone }: { icon: React.ReactNode; title: string; note: string; tone: "plain" | "key" }) {
  return (
    <div className="flex items-start gap-3">
      <span
        aria-hidden
        className={`grid size-10 shrink-0 place-items-center rounded-full ${
          tone === "key" ? "bg-accent text-accent-text" : "bg-line/15 text-line-strong"
        }`}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <h2 className={`font-black ${tone === "key" ? "text-match-text" : "text-lg"}`}>{title}</h2>
        <p className={`mt-0.5 text-xs ${tone === "key" ? "text-match-text/85" : "text-muted"}`}>{note}</p>
      </div>
    </div>
  );
}

export function AdminPanel({ partyId, title, token, created, ranking, answered, bestDate, bestDates, shops, decision, attendees, start: partyStart, names, must, maybes, otherArea, notice, basis, relaxed, scene }: Props) {
  const router = useRouter();
  const [origin, setOrigin] = useState("");
  const canShare = useCanShare();
  const [date, setDate] = useState<string | null>(decision?.date ?? bestDate);
  const [shopId, setShopId] = useState<string | null>(decision?.shopId ?? shops[0]?.id ?? null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  // 決定の取り消しは、下から出るシートで確かめる(ブラウザの確認の窓は、ホーム画面のアプリで見づらい)
  const [confirmUndo, setConfirmUndo] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOrigin(location.origin);
    saveAdminToken(partyId, token);
  }, [partyId, token]);

  const guestUrl = `${origin}/p/${partyId}`;
  const adminUrl = `${origin}/p/${partyId}/admin?token=${token}`;
  const adminNote = `「${title}」の幹事用URL(自分用)`;
  const decidedMessage = decision ? decidedText(title, decision.date, decision.start, decision.shopName, guestUrl, scene.audience ?? undefined) : "";

  // 幹事用の URL を自分に送る(共有できない端末では、コピー)
  async function saveAdmin() {
    if (canShare) {
      await navigator.share({ title: adminNote, text: adminNote, url: adminUrl }).catch(() => {});
      return;
    }
    try {
      await navigator.clipboard.writeText(adminUrl);
      toast("幹事用のURLをコピーしました。自分あてに送っておきましょう");
    } catch {}
  }

  function submit(choice: { date: string; shopId: string | null } | null) {
    setError(null);
    start(async () => {
      const result = await decide(partyId, token, choice);
      if (!result.ok) setError(result.error);
      else {
        toast(choice ? "決まりました。みんなに知らせましょう" : "決定を取り消しました");
        router.refresh();
        // 決まったら、「決まりました!」のカードがある一番上へ戻す
        if (choice) window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  }

  const invite = (
      <section className={`mx-4 rounded-3xl border panel px-4 py-6 ${decision ? "mt-4" : ""}`}>
        {created && <p className="anim-rise mb-3 text-sm font-bold text-ok">✓ できました!</p>}
        <BoxHead
          tone="plain"
          icon={<Users className="size-5" />}
          title="みんなに送る"
          note="グループやチャットに送るだけでみんなが回答"
        />
        <SendButtons
          mainLabel="共有してみんなに送る"
          share={{ text: inviteText(title, guestUrl, partyStart, scene.audience ?? undefined) }}
          copy={guestUrl}
          canShare={canShare}
          subtleCopy
        />
        {/* 幹事用の URL。この端末には保存済みなので、自分に送るのは1行のボタンだけにする(なくすと会を開けなくなるので、いつも出しておく) */}
        <button
          type="button"
          onClick={saveAdmin}
          className="mt-4 flex min-h-12 w-full items-center gap-3 rounded-2xl border border-accent/40 bg-match-soft px-4 py-3 text-left transition active:scale-[0.99]"
        >
          <KeyRound className="size-5 shrink-0 text-match-text" aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-black text-match-text">幹事用のURLを自分にも送っておく</span>
            <span className="block text-[11px] text-match-text/80">この端末には保存済み。ほかの端末で開くときに</span>
          </span>
          <ChevronRight className="size-4 shrink-0 text-match-text" aria-hidden />
        </button>
      </section>
  );

  // 決まったあとは「決まったよ」を先に出す
  return (
    <>
      {!decision && answered === 0 && invite}

      {decision ? (
        <section className="anim-rise mx-4 rounded-3xl border panel px-4 py-6">
          <p className="flex items-center gap-2 text-lg font-black">
            <PartyPopper className="size-5" aria-hidden />
            決まったことを知らせる
          </p>
          <p className="mt-1 text-sm text-muted">日にち・時間・お店入りの案内文。</p>
          {/* お店に予約するときの人数の目安。「たぶん」の人は別に数える */}
          <p className="mt-3 rounded-xl bg-surface-2 px-4 py-3 text-sm">
            予約の人数: <span className="font-black">{attendees.length}人</span>
            {maybes > 0 && <span className="text-muted">(たぶんの人を入れると{attendees.length + maybes}人)</span>}
          </p>
          <SendButtons
            mainLabel="共有して「決まったよ」を送る"
            share={{ text: decidedMessage }}
            copy={decidedMessage}
            copyLabel="送る文をコピー"
            canShare={canShare}
          />
          <div className="mt-5 border-t border-border pt-4" />
          <button
            type="button"
            onClick={() => {
              // 名前は URL に載せず、このタブの中だけで渡す
              try {
                sessionStorage.setItem(SPLIT_NAMES_KEY, JSON.stringify(attendees));
                // 集金の「何の集金?」にも、会の名前と日付を最初から入れておく
                if (decision) sessionStorage.setItem(SPLIT_TITLE_KEY, `${title} ${dateLabel(decision.date).split("(")[0]}`.slice(0, 30));
              } catch {}
              router.push(`/collect/new?from=${partyId}`);
            }}
            // 会が決まったあとの次の一歩なので、ほかのボタンより目立つ金色の枠のカードにする
            className="flex w-full items-center gap-3 rounded-2xl border border-accent/60 bg-accent/10 px-4 py-3.5 text-left transition-colors hover:bg-accent/15 active:scale-[0.99]"
          >
            <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-accent text-accent-text">
              <Wallet className="size-6" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-base font-black">この会の集金をする</span>
              <span className="mt-0.5 block text-xs text-muted">行く{attendees.length}人の名前が入った状態で開きます。誰が払ったかを確かめられます。</span>
            </span>
            <ChevronRight className="size-5 shrink-0 text-accent" aria-hidden />
          </button>
          {/* 取り消しはめったに使わないので、小さな文字のボタンにする */}
          <button
            type="button"
            onClick={() => setConfirmUndo(true)}
            disabled={pending}
            className="mx-auto mt-3 flex min-h-11 items-center px-3 text-xs font-bold text-muted underline underline-offset-2 hover:text-text"
          >
            決定を取り消す
          </button>
          <BottomSheet open={confirmUndo} onClose={() => setConfirmUndo(false)} title="決定を取り消しますか?">
            <p className="text-sm leading-relaxed text-muted">日にちとお店の決定を取り消して選び直せる状態に戻します。みんなの回答は消えません。</p>
            <div className="mt-5 grid gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  setConfirmUndo(false);
                  submit(null);
                }}
                className="min-h-12 rounded-2xl bg-red-500 px-4 text-base font-black text-white transition active:scale-[0.98] disabled:opacity-50"
              >
                取り消して選び直す
              </button>
              <button type="button" onClick={() => setConfirmUndo(false)} className="min-h-12 rounded-2xl bg-white/8 px-4 text-base font-bold ring-1 ring-white/12">
                やめる
              </button>
            </div>
          </BottomSheet>
        </section>
      ) : (
        ranking.some((r) => r.ok > 0) && (
          <section className="mt-4 mx-4 rounded-3xl border panel px-4 py-6">
            <h2 className="text-lg font-black">幹事が決める</h2>
            <p className="mt-1 text-sm text-muted">{answered}人が答えました。いちばん良さそうな日とお店を先に選んであります。</p>
            <MustPicker partyId={partyId} token={token} names={names} must={must} />
            <StepHead step={2}>日にち</StepHead>
            {bestDates.length > 1 && (
              <p className="mb-2 text-xs text-muted">★の日は○と△の数が同じで、どれもいちばん良い日です。どれを選んでもOK。</p>
            )}
            <div className="grid grid-cols-2 gap-1.5">
              {ranking
                .filter((r) => r.ok > 0)
                .map((r) => (
                  <button
                    key={r.date}
                    type="button"
                    aria-pressed={date === r.date}
                    onClick={() => setDate(r.date)}
                    className={`flex min-h-14 flex-col items-center justify-center rounded-xl border px-2 py-1.5 text-sm font-bold transition-all active:scale-95 ${
                      date === r.date ? "border-accent bg-accent text-accent-text" : "border-white/10 bg-surface-2 text-text hover:border-white/25"
                    }`}
                  >
                    {/* 日付を大きく、人数を下に小さく。1行に詰めて途中で折り返さないようにする */}
                    <span className="whitespace-nowrap font-black">
                      {date === r.date && "✓ "}
                      {bestDates.includes(r.date) && "★ "}
                      {dateLabel(r.date)}
                    </span>
                    <span className={`text-[11px] whitespace-nowrap ${date === r.date ? "text-black/70" : "opacity-80"}`}>
                      ○{r.ok}人{r.maybe > 0 ? ` △${r.maybe}人` : ""}
                    </span>
                    {/* 必ず来てほしい人を選んだときだけ、その人たちが来られるかを添える(色だけでなく記号と文字で) */}
                    {must.length > 0 && (
                      <span
                        className={`mt-0.5 inline-block rounded-md px-1.5 text-[11px] ${
                          r.mustOk ? "tier-green bg-[var(--ts)] text-[var(--tc)]" : "tier-red bg-[var(--ts)] text-[var(--tc)]"
                        }`}
                      >
                        {r.mustOk ? "★ 必ず来てほしい人OK" : "× 来られない人あり"}
                      </span>
                    )}
                  </button>
                ))}
            </div>
            <StepHead step={3}>お店</StepHead>
            {/* お店は下の「合いそうなお店」から選ぶ(予約のリンクと同じ一覧で、選ぶのも予約も1か所で済む) */}
            <div className="space-y-1.5">
              <button
                type="button"
                aria-pressed={shopId === null}
                onClick={() => setShopId(null)}
                className={`flex min-h-14 w-full items-center gap-3 rounded-xl border-2 border-dashed px-4 text-left transition-colors ${
                  shopId === null ? "border-accent bg-accent/10 text-accent" : "border-white/15 text-white/80 hover:border-white/35"
                }`}
              >
                <CalendarClock className="size-5 shrink-0" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-black">
                    {shopId === null && "✓ "}お店はあとで決める
                  </span>
                  <span className="mt-0.5 block text-xs font-normal text-muted">日にちだけ先に決定、お店はあとから</span>
                </span>
              </button>
              {shopId !== null && (
                <p className="flex items-center gap-2 rounded-xl border border-accent bg-accent/10 px-4 py-3 text-sm font-black text-text">
                  <Check className="size-4 shrink-0 text-accent" strokeWidth={3} aria-hidden />
                  <span className="min-w-0 flex-1 truncate">{shops.find((x) => x.id === shopId)?.name ?? "選んだお店"}</span>
                </p>
              )}
              {shops.length > 0 && (
                <a href="#shops" className="block py-1 text-center text-xs font-bold text-muted underline underline-offset-2">
                  下の一覧からほかのお店も選べます({shops.length}軒)
                </a>
              )}
            </div>
            {error && (
              <p role="alert" className="mt-3 text-sm font-bold text-danger">
                {error}
              </p>
            )}
          </section>
        )
      )}

      {/* お店の一覧はここだけに出す。選ぶのも、予約のページを開くのも同じ一覧で */}
      {!decision?.shopId && (
        <ShopList
          partyId={partyId}
          shops={shops}
          otherArea={otherArea}
          notice={notice}
          basis={basis}
          relaxed={relaxed}
          scene={scene}
          initial={decision ? 8 : 3}
          pick={
            decision
              ? // 日にちだけ決めたあとは、押したお店でそのまま決める
                { selectedId: null, label: "このお店に決定する", disabled: pending, onPick: (id) => submit({ date: decision.date, shopId: id }) }
              : { selectedId: shopId, label: "このお店を選ぶ", onPick: (id) => setShopId(id) }
          }
        />
      )}

      {/* 決定のボタンは、長い一覧の下まで行かなくても押せるよう、画面の下に置いておく */}
      {!decision && ranking.some((r) => r.ok > 0) && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-bg/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
          <div className="mx-auto max-w-xl">
            <p className="mb-2 truncate text-xs font-bold text-muted">
              {date ? dateLabel(date) : "日にちを選んでください"}
              {" ・ "}
              {shopId ? shops.find((x) => x.id === shopId)?.name ?? "選んだお店" : "お店はあとで"}
            </p>
            <button type="button" disabled={pending || date === null} onClick={() => date && submit({ date, shopId })} className={`${BUTTON_PRIMARY} w-full`}>
              {pending ? "決めています…" : "これで決定する"}
            </button>
          </div>
        </div>
      )}
      {/* 答えが来はじめたら、招待はたたむ(まだの人に送り直すときに開く) */}
      {!decision && answered > 0 && (
        <Fold title="まだの人に送る" note="招待のURL・幹事用のURL">
          {invite}
        </Fold>
      )}
      {/* 決まったあとは、招待と幹事用の URL はたたんでおく(あとから入る人に送るとき・自分用に残すときに開く) */}
      {decision && (
        <Fold title="みんなに送る・幹事用のURL" note="あとから入る人に送るとき、自分用に残すとき">
          {invite}
        </Fold>
      )}
    </>
  );
}
