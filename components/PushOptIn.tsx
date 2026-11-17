"use client";

import { Bell, Check, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import { subscribePush } from "@/app/actions";
import { pushSupport, urlBase64ToUint8Array } from "@/lib/pushClient";
import { yen } from "@/lib/sendai";

// 集金のページ(参加する人の画面)。幹事が「自動でお知らせ」をオンにしているときだけ、払うまでのお知らせを受け取る登録を出す。
// 自分の名前を選び、「通知をオンにする」を押すと、この端末に、翌日・3日後・7日後(払っていなければ)通知が届く。
// 払い方(幹事の PayPay のリンク)があれば、「PayPay で払う」ボタンを出す

const meKey = (id: string) => `nomi:me-pay:${id}`;

export function PushOptIn({
  collectionId,
  payers,
  pushKey,
  payLink,
}: {
  collectionId: string;
  /** まだ払っていない人 */
  payers: { id: number; name: string; amount: number }[];
  /** 通知の公開鍵。なければ(幹事が自動でお知らせを使っていなければ)、払い方だけを出す */
  pushKey: string | null;
  payLink: string | null;
}) {
  const [me, setMe] = useState<number | null>(null);
  const [state, setState] = useState<"idle" | "busy" | "done" | "denied" | "error">("idle");
  const [support, setSupport] = useState<"ok" | "needs-install" | "unsupported">("ok");

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setSupport(pushSupport());
    try {
      const saved = Number(localStorage.getItem(meKey(collectionId)));
      if (Number.isInteger(saved) && saved > 0) setMe(saved);
      if (localStorage.getItem(`nomi:pushed:${collectionId}`)) setState("done");
    } catch {}
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [collectionId]);

  function choose(id: number) {
    setMe(id);
    try {
      localStorage.setItem(meKey(collectionId), String(id));
    } catch {}
  }

  async function turnOn() {
    if (me === null) return;
    setState("busy");
    try {
      if ((await Notification.requestPermission()) !== "granted") {
        setState("denied");
        return;
      }
      await navigator.serviceWorker.register("/sw.js");
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(pushKey ?? "") });
      const json = sub.toJSON();
      const r = await subscribePush(collectionId, me, { endpoint: json.endpoint, p256dh: json.keys?.p256dh, auth: json.keys?.auth });
      if (!r.ok) {
        setState("error");
        return;
      }
      try {
        localStorage.setItem(`nomi:pushed:${collectionId}`, String(me));
      } catch {}
      setState("done");
    } catch {
      setState("error");
    }
  }

  const mine = payers.find((p) => p.id === me);

  return (
    <section className="mx-4 mt-3 rounded-3xl border panel px-5 py-5" aria-label="払い方とお知らせ">
      <h2 className="text-lg font-black">あなたの分</h2>
      <p className="mt-1 text-sm text-muted">自分の名前を選んでください。</p>
      <ul className="mt-3 flex flex-wrap gap-2">
        {payers.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              aria-pressed={me === p.id}
              onClick={() => choose(p.id)}
              className={`inline-flex min-h-11 items-center gap-1 rounded-full border px-4 text-sm font-bold transition active:scale-95 ${
                me === p.id ? "border-accent bg-accent text-accent-text" : "border-white/12 bg-white/8 text-text"
              }`}
            >
              {me === p.id && <Check className="size-4" aria-hidden />}
              {p.name}
            </button>
          </li>
        ))}
      </ul>

      {mine && (
        <div className="mt-4 rounded-2xl bg-surface-2 px-4 py-3">
          <p className="text-sm text-muted">
            {mine.name}さんの金額 <span className="text-lg font-black text-text tabular-nums">{yen(mine.amount)}</span>
          </p>
          {payLink && (
            <a
              href={payLink}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-accent px-4 text-base font-black text-accent-text active:scale-[0.97]"
            >
              PayPay で払う
              <ExternalLink className="size-4" aria-hidden />
            </a>
          )}
          {payLink && <p className="mt-1.5 text-xs text-muted">払ったら、幹事さんが受け取りを記録すると ✓ が付きます。</p>}
        </div>
      )}

      {mine && pushKey && state !== "done" && (
        <div className="mt-4">
          {support === "ok" ? (
            <button
              type="button"
              onClick={turnOn}
              disabled={state === "busy"}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border-2 border-accent bg-transparent px-4 text-base font-black text-accent active:scale-[0.97] disabled:opacity-50"
            >
              <Bell className="size-4" aria-hidden />
              {state === "busy" ? "登録しています…" : "払うまで、通知でお知らせしてもらう"}
            </button>
          ) : support === "needs-install" ? (
            <p className="rounded-2xl bg-surface-2 px-4 py-3 text-xs leading-relaxed text-muted">
              iPhone で通知を受け取るには、画面の下の共有ボタンから「ホーム画面に追加」をして、追加したアイコンからこのページを開いてください
            </p>
          ) : (
            <p className="rounded-2xl bg-surface-2 px-4 py-3 text-xs text-muted">このブラウザでは、通知を受け取れません。</p>
          )}
          {state === "denied" && <p className="mt-2 text-xs font-bold text-danger">通知が許可されませんでした。ブラウザの設定から許可すると、受け取れます。</p>}
          {state === "error" && <p className="mt-2 text-xs font-bold text-danger">登録できませんでした。少し待ってからもう一度お試しください。</p>}
          <p className="mt-2 text-xs text-muted">通知は、払っていないあいだだけ届きます。幹事に名前や連絡先は伝わりません。</p>
        </div>
      )}
      {pushKey && state === "done" && (
        <p className="mt-4 flex items-center gap-1.5 text-sm font-bold text-accent" role="status">
          <Check className="size-4" aria-hidden />
          通知をオンにしました。払い終わると、お知らせは止まります
        </p>
      )}
    </section>
  );
}
