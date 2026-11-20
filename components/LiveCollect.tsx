"use client";

import { Check, X } from "lucide-react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { PAY_METHODS, payMethodLabel } from "@/lib/collection";
import { yen } from "@/lib/sendai";
import type { PayMethod } from "@/lib/store/types";

// その場で集める画面(幹事だけ)。お店を出る前に、この画面を見せて全員に集金のページを開いてもらう。
// 大きなQRと、まだ払っていない人の名前を出し、数秒ごとに読み直す。払わずに帰る人を出さないための画面

export type LivePerson = { id: number; name: string; amount: number; claimed: boolean; method?: PayMethod };

export function LiveCollect({
  url,
  unpaid,
  payers,
  pending,
  onReceive,
  onClose,
}: {
  url: string;
  /** まだ受け取っていない人(払ったと申告した人も含む) */
  unpaid: LivePerson[];
  /** 払う人の数(幹事を除く) */
  payers: number;
  pending: boolean;
  /** method = 払い方(本人が選んでいればそれ。分からなければ、ここで選ぶ) */
  onReceive: (personId: number, method: PayMethod | null) => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const [qr, setQr] = useState<string | null>(null);
  const [choosing, setChoosing] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(url, { margin: 1, width: 480, color: { dark: "#000000", light: "#ffffff" } })
      .then((d) => alive && setQr(d))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [url]);

  // ほかの人が押した「払った」を、数秒ごとに読み直す
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 4000);
    return () => clearInterval(t);
  }, [router]);

  // 画面の裏がスクロールしないようにする
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const left = unpaid.reduce((s, p) => s + p.amount, 0);
  // 払ったと申告した人を先に(幹事が受け取りを確かめる)
  const sorted = [...unpaid].sort((a, b) => Number(b.claimed) - Number(a.claimed));

  return (
    <div role="dialog" aria-modal="true" aria-label="その場で集める" className="fixed inset-0 z-50 overflow-y-auto bg-bg">
      <div className="mx-auto max-w-xl px-4 pt-4 pb-10">
        <div className="flex items-center justify-between">
          <p className="text-sm font-black text-muted">その場で集める</p>
          <button type="button" onClick={onClose} aria-label="閉じる" className="grid size-11 place-items-center rounded-full bg-surface-2 active:scale-95">
            <X className="size-5" aria-hidden />
          </button>
        </div>

        <div className="mt-2 rounded-3xl bg-white p-4">
          {qr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qr} alt="集金のページのQRコード" className="mx-auto aspect-square w-full max-w-[18rem]" />
          ) : (
            <div className="mx-auto aspect-square w-full max-w-[18rem]" />
          )}
          <p className="mt-2 text-center text-sm font-black text-black">カメラで読んで、自分の名前の「払った」を押してね</p>
        </div>

        <div className="mt-4 rounded-3xl border panel px-5 py-4 text-center" aria-live="polite">
          {unpaid.length === 0 ? (
            <p className="tier-green anim-pop text-2xl font-black text-[var(--tc)]">
              <Check className="mr-1 inline size-6" aria-hidden />
              全員の支払い完了
            </p>
          ) : (
            <>
              <p className="text-sm font-bold text-muted">
                {payers}人中{payers - unpaid.length}人 受け取り済み
              </p>
              <p className="mt-1 text-3xl font-black tracking-tight">
                あと{unpaid.length}人・{yen(left)}
              </p>
            </>
          )}
        </div>

        {sorted.length > 0 && (
          <ul className="mt-3 divide-y divide-border overflow-hidden rounded-3xl border panel">
            {sorted.map((p) => (
              <li key={p.id} className="px-4">
                <div className="flex min-h-16 items-center gap-3">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-lg font-black">{p.name}</span>
                  <span className={`block text-xs font-bold ${p.claimed ? "text-accent" : "text-danger"}`}>
                    {p.claimed ? `${payMethodLabel(p.method) ?? ""}で払ったと申告・確かめてください`.replace(/^で/, "") : "まだ"}
                  </span>
                </span>
                <span className="shrink-0 text-base font-black tabular-nums">{yen(p.amount)}</span>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => (p.method ? onReceive(p.id, p.method) : setChoosing(choosing === p.id ? null : p.id))}
                  className={`inline-flex min-h-11 shrink-0 items-center rounded-full px-4 text-sm font-black active:scale-95 disabled:opacity-50 ${
                    p.claimed ? "bg-accent text-accent-text" : "border border-white/15 bg-surface-2 text-text"
                  }`}
                >
                  受け取った
                </button>
                </div>
                {choosing === p.id && (
                  <div className="grid grid-cols-3 gap-1.5 pb-3" role="group" aria-label="払い方">
                    {PAY_METHODS.map((m) => (
                      <button
                        key={m.key}
                        type="button"
                        disabled={pending}
                        onClick={() => {
                          setChoosing(null);
                          onReceive(p.id, m.key);
                        }}
                        className="inline-flex min-h-11 items-center justify-center rounded-xl bg-surface-2 text-sm font-black ring-1 ring-white/12 active:scale-95 disabled:opacity-50"
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
