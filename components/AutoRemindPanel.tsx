"use client";

import { Bell, BellOff, Check, Lock } from "lucide-react";
import { useState, useTransition } from "react";
import { saveCollectionSettings } from "@/app/actions";
import { cleanPayLink } from "@/lib/reminder";
import { notificationText } from "@/lib/pushRemind";
import { ProPaywall, loadLicense, useFunAccess } from "./ProGate";
import { INPUT } from "./ui";

// 集金のページ(幹事の画面)の「集金のお知らせを、アプリにまかせる」(有料パック)。
// 催促の気まずさは、幹事が頼む側になることから来る。「自動でお知らせ」をオンにすると、払っていない人に、幹事ではなく Tsudoro が通知で知らせる。
// 受け取れるのは、集金のページで自分の名前を選んで「通知をオン」にした人だけ。PayPay のリンクを貼るところは無料

export function AutoRemindPanel({
  collectionId,
  hostToken,
  title,
  initialPayLink,
  initialAutoRemindAt,
  pushReady,
  subscribed,
  unpaid,
  sampleAmount,
}: {
  collectionId: string;
  hostToken: string;
  title: string;
  initialPayLink: string | null;
  initialAutoRemindAt: number | null;
  pushReady: boolean;
  /** 通知をオンにした人の数(払っていない人のうち) */
  subscribed: number;
  unpaid: number;
  /** 見本の通知に出す金額 */
  sampleAmount: number;
}) {
  const access = useFunAccess();
  const locked = !access.unlocked;
  const [linkText, setLinkText] = useState(initialPayLink ?? "");
  const [savedLink, setSavedLink] = useState<string | null>(initialPayLink);
  const [autoAt, setAutoAt] = useState<number | null>(initialAutoRemindAt);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [showBuy, setShowBuy] = useState(false);
  const [pending, start] = useTransition();

  const link = cleanPayLink(linkText);
  const linkBad = linkText.trim() !== "" && link === null;
  const linkChanged = (link ?? "") !== (savedLink ?? "");

  function save(next: { payLink: string; autoRemind: boolean }, done: (r: { payLink: string | null; autoRemindAt: number | null }) => void) {
    setError(null);
    setNote(null);
    start(async () => {
      const r = await saveCollectionSettings(collectionId, hostToken, next, loadLicense());
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setSavedLink(r.payLink);
      setAutoAt(r.autoRemindAt);
      done(r);
    });
  }

  const autoOn = autoAt !== null;

  return (
    <section className="mx-4 mt-4 rounded-3xl border panel px-5 py-5" aria-label="集金のお知らせ">
      <h2 className="text-lg font-black">払い方をのせる</h2>
      <p className="mt-1 text-sm text-muted">あなたの PayPay の送金リンクを貼ると、みんなの画面に「PayPay で払う」ボタンが出ます。</p>
      <input
        inputMode="url"
        value={linkText}
        onChange={(e) => setLinkText(e.target.value)}
        placeholder="https://paypay.ne.jp/…"
        aria-label="あなたの PayPay の送金リンク"
        aria-invalid={linkBad}
        className={`${INPUT} mt-3`}
      />
      <p className={`mt-1.5 text-xs ${linkBad ? "font-bold text-danger" : "text-muted"}`}>
        {linkBad ? "PayPay のリンク(https://paypay.ne.jp/…)を入れてください" : "PayPay アプリの「送る・受け取る」で作ったリンクを貼ります(空でも使えます)"}
      </p>
      <button
        type="button"
        disabled={pending || linkBad || !linkChanged}
        onClick={() => save({ payLink: linkText, autoRemind: autoOn }, () => setNote("保存しました"))}
        className="mt-2 inline-flex min-h-11 items-center rounded-xl bg-white/8 px-4 text-sm font-bold ring-1 ring-white/12 active:scale-95 disabled:opacity-40"
      >
        {savedLink && !linkChanged ? (
          <>
            <Check className="mr-1 size-4" aria-hidden />
            保存済み
          </>
        ) : (
          "リンクを保存"
        )}
      </button>

      <div className="mt-6 border-t border-border pt-5">
        <h2 className="flex items-center justify-between gap-2 text-lg font-black">
          催促は、アプリにまかせる
          <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-accent/50 px-1.5 py-0.5 text-[10px] font-black leading-none text-accent">
            <Lock className="size-3" aria-hidden />
            {access.loading ? "有料パック" : locked ? "デモ版" : "有料パック"}
          </span>
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-white/75">
          「払って」と言うのは、幹事のあなたではなく Tsudoro です。払っていない人にだけ、翌日・3日後・7日後に、アプリから通知が届きます。
        </p>

        {/* 届く通知の見本。何が起きるかを、買う前に見せる */}
        <ol className="mt-3 space-y-2" aria-label="届く通知の見本">
          {[0, 1, 2].map((n) => {
            const t = notificationText(n, title, sampleAmount);
            return (
              <li key={n} className="rounded-2xl bg-surface-2 px-4 py-3 ring-1 ring-white/10">
                <p className="text-[11px] font-bold text-muted">{["翌日", "3日後", "7日後"][n]}に届く通知</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-sm font-black">
                  <Bell className="size-3.5 shrink-0 text-accent" aria-hidden />
                  <span className="min-w-0 truncate">Tsudoro ・ {t.title}</span>
                </p>
                <p className="mt-0.5 text-sm text-white/80">{t.body}</p>
              </li>
            );
          })}
        </ol>
        <p className="mt-2 text-xs text-muted">通知を受け取るには、参加する人が集金のページで「通知をオンにする」を押します(払い終わると止まります)。</p>

        {error && (
          <p role="alert" className="mt-3 text-sm font-bold text-danger">
            {error}
          </p>
        )}

        {access.loading ? null : locked ? (
          <>
            {!showBuy && (
              <button type="button" onClick={() => setShowBuy(true)} className="mt-3 inline-flex min-h-11 items-center rounded-2xl bg-accent px-4 text-sm font-black text-accent-text active:scale-95">
                有料パックのくわしく
              </button>
            )}
            {showBuy && <ProPaywall feature="自動でお知らせ" fun price={access.price} purchasable={access.purchasable} onClose={() => setShowBuy(false)} />}
          </>
        ) : !pushReady ? (
          <p className="mt-3 rounded-2xl bg-surface-2 px-4 py-3 text-sm text-muted">通知の準備がまだできていません。しばらく待ってからお試しください。</p>
        ) : autoOn ? (
          <div className="mt-3 rounded-2xl border border-accent/40 px-4 py-3">
            <p className="flex items-center gap-1.5 text-sm font-black text-accent">
              <Bell className="size-4" aria-hidden />
              自動でお知らせ: オン
            </p>
            <p className="mt-1 text-sm text-white/80">
              通知をオンにした人 {subscribed}人 ・ まだ払っていない人 {unpaid}人
            </p>
            {subscribed < unpaid && <p className="mt-1 text-xs text-muted">集金のページを送るとき、「通知をオンにしてね」と一言そえると、受け取る人が増えます。</p>}
            <button
              type="button"
              disabled={pending}
              onClick={() => save({ payLink: linkText, autoRemind: false }, () => setNote("オフにしました"))}
              className="mt-2 inline-flex min-h-11 items-center gap-1 rounded-xl bg-white/8 px-3 text-sm font-bold ring-1 ring-white/12 active:scale-95"
            >
              <BellOff className="size-4" aria-hidden />
              オフにする
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled={pending}
            onClick={() => save({ payLink: linkText, autoRemind: true }, () => setNote("オンにしました。集金のページを、みんなに送りましょう"))}
            className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-accent px-5 text-base font-black text-accent-text active:scale-[0.97] disabled:opacity-50"
          >
            <Bell className="size-4" aria-hidden />
            自動でお知らせをオンにする
          </button>
        )}
        {note && (
          <p className="mt-2 text-sm font-bold text-accent" role="status">
            {note}
          </p>
        )}
      </div>
    </section>
  );
}
