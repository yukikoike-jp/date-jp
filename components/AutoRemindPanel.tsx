"use client";

import { Bell, BellOff, Check, Lock, LockOpen } from "lucide-react";
import { useState, useTransition } from "react";
import { openBillingPortal, saveCollectionSettings } from "@/app/actions";
import { notificationText } from "@/lib/pushRemind";
import { cleanPayLink } from "@/lib/reminder";
import { ProPaywall, loadLicense, useFunAccess } from "./ProGate";
import { INPUT } from "./ui";

// 集金のページ(幹事の画面)の「払い方」と「催促は、アプリにまかせる」。
// 催促の気まずさは、幹事が頼む側になることから来る。有料プレミアムで「自動でお知らせ」をオンにすると、
// 払っていない人に、幹事ではなく Tsudoro が通知で知らせる(受け取れるのは、集金のページで「通知をオンにする」を押した人だけ)。
// 有料の印は、右上の鍵のボタンだけ(押すと、くわしい案内)。PayPay のリンクを貼るところは無料

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
  const autoOn = autoAt !== null;
  const sample = notificationText(0, title, sampleAmount);

  function save(next: { payLink: string; autoRemind: boolean }, done: () => void) {
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
      done();
    });
  }

  return (
    <section className="mx-4 mt-4 rounded-3xl border panel px-5 py-5" aria-label="払い方と催促">
      <h2 className="text-lg font-black">払い方</h2>
      <div className="mt-3 flex gap-2">
        <input
          inputMode="url"
          value={linkText}
          onChange={(e) => setLinkText(e.target.value)}
          placeholder="PayPay の送金リンク https://paypay.ne.jp/…"
          aria-label="あなたの PayPay の送金リンク"
          aria-invalid={linkBad}
          className={`${INPUT} min-w-0 flex-1`}
        />
        <button
          type="button"
          disabled={pending || linkBad || !linkChanged}
          onClick={() => save({ payLink: linkText, autoRemind: autoOn }, () => setNote("保存しました"))}
          className="inline-flex min-h-14 shrink-0 items-center rounded-2xl bg-white/8 px-4 text-sm font-bold ring-1 ring-white/12 active:scale-95 disabled:opacity-40"
        >
          {savedLink && !linkChanged ? <Check className="size-4" aria-label="保存済み" /> : "保存"}
        </button>
      </div>
      <p className={`mt-1.5 text-xs ${linkBad ? "font-bold text-danger" : "text-muted"}`}>
        {linkBad ? "PayPay のリンク(https://paypay.ne.jp/…)を入れてください" : "貼ると、みんなの画面に「PayPay で払う」が出ます(空でもOK)"}
      </p>

      <div className="mt-5 border-t border-border pt-5">
        <h2 className="flex items-center justify-between gap-2 text-lg font-black">
          催促は、アプリにまかせる
          {access.loading ? null : locked ? (
            // 有料の印は、鍵のボタンだけ。押すと、くわしい案内が開く
            <button
              type="button"
              onClick={() => setShowBuy((v) => !v)}
              aria-expanded={showBuy}
              aria-label="有料プレミアムの案内"
              className="grid size-10 shrink-0 place-items-center rounded-full border border-accent/50 text-accent active:scale-95"
            >
              <Lock className="size-4" aria-hidden />
            </button>
          ) : (
            <span className="grid size-10 shrink-0 place-items-center rounded-full text-accent" role="img" aria-label="有料プレミアムを契約中">
              <LockOpen className="size-4" aria-hidden />
            </span>
          )}
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-white/75">
          払っていない人に、あなたではなく Tsudoro が通知します。翌日・3日後・7日後に、言い方を変えて届きます
        </p>
        <div className="mt-3 rounded-2xl bg-surface-2 px-4 py-3 ring-1 ring-white/10" aria-label="届く通知の見本">
          <p className="flex items-center gap-1.5 text-sm font-black">
            <Bell className="size-3.5 shrink-0 text-accent" aria-hidden />
            <span className="min-w-0 truncate">Tsudoro ・ {sample.title}</span>
          </p>
          <p className="mt-0.5 text-sm text-white/80">{sample.body}</p>
        </div>

        {error && (
          <p role="alert" className="mt-3 text-sm font-bold text-danger">
            {error}
          </p>
        )}

        {locked ? (
          showBuy && <ProPaywall feature="催促をアプリにまかせる" fun price={access.price} purchasable={access.purchasable} onClose={() => setShowBuy(false)} />
        ) : access.loading ? null : !pushReady ? (
          <p className="mt-3 rounded-2xl bg-surface-2 px-4 py-3 text-sm text-muted">通知の準備がまだできていません。しばらく待ってからお試しください</p>
        ) : autoOn ? (
          <div className="mt-3 rounded-2xl border border-accent/40 px-4 py-3">
            <p className="flex items-center gap-1.5 text-sm font-black text-accent">
              <Bell className="size-4" aria-hidden />
              オン ・ 通知を受け取る人 {subscribed}人 / まだの人 {unpaid}人
            </p>
            {subscribed < unpaid && <p className="mt-1 text-xs text-muted">集金のページを送るとき、「通知をオンにしてね」と一言そえると、受け取る人が増えます</p>}
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
            onClick={() => save({ payLink: linkText, autoRemind: true }, () => setNote("オンにしました。右上の「URLを送る」で、みんなに送りましょう"))}
            className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-accent px-5 text-base font-black text-accent-text active:scale-[0.97] disabled:opacity-50"
          >
            <Bell className="size-4" aria-hidden />
            アプリにまかせる(オンにする)
          </button>
        )}
        {!locked && !access.loading && loadLicense() && (
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await openBillingPortal(loadLicense(), location.pathname);
                if (r.ok) location.href = r.url;
                else setError(r.error);
              })
            }
            className="mt-3 flex min-h-11 items-center text-xs font-bold text-muted underline underline-offset-2"
          >
            契約の確認・解約
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
