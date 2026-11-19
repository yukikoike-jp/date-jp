"use client";

import { Check, Lock } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { buyPro, funStatus, restorePro } from "@/app/actions";
import { yen } from "@/lib/sendai";
import { BUTTON_PRIMARY, INPUT } from "./ui";

// 買い切り500円(Play と、仕事の会の幹事サポート)。割り勘・傾斜・集金の表づくりは無料のまま。
// 買った鍵はこの端末に保存する(ログインなし)。別の端末では、買ったときのメールアドレスで戻せる

const KEY = "date:pro";

export function loadLicense(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function saveLicense(license: string) {
  try {
    localStorage.setItem(KEY, license);
  } catch {}
}

export type FunAccess = { loading: boolean; purchasable: boolean; unlocked: boolean; price: number; license: string | null };

/** Tsudoro+(Play と Support)が使えるか。読み込み中と、読めなかったときは鍵をかけたまま(デモ版) */
export function useFunAccess(): FunAccess {
  const [state, setState] = useState<FunAccess>({ loading: true, purchasable: false, unlocked: false, price: 500, license: null });
  useEffect(() => {
    const license = loadLicense();
    funStatus(license)
      .then((s) => setState({ loading: false, ...s, license }))
      .catch(() => setState({ loading: false, purchasable: false, unlocked: false, price: 500, license }));
  }, []);
  return state;
}

/** 有料の機能を使おうとしたときに出す案内。買う、または別の端末で買ったものを戻す */
/** Tsudoro+ で使えるようになるもの(購入の案内のチェック項目) */
const PLUS_ITEMS: { name?: string; body: string }[] = [
  { name: "Play", body: "ワードウルフ・NGワード・王様ゲームなど6つの遊び" },
  { name: "Support", body: "話題・お礼・席替え・進行表・集金チェックなど幹事の6つの道具" },
  { body: "これからふえる機能も追加料金なし" },
];

export function ProPaywall({ feature, price, onClose, purchasable = true, work = false }: { feature: string; price: number; onClose?: () => void; purchasable?: boolean; work?: boolean }) {
  const pathname = usePathname();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [email, setEmail] = useState("");

  function buy() {
    setError(null);
    start(async () => {
      const r = await buyPro(pathname);
      if (r.ok) location.href = r.url;
      else setError(r.error);
    });
  }

  function restore() {
    setError(null);
    start(async () => {
      const r = await restorePro(email);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      saveLicense(r.license);
      location.reload();
    });
  }

  return (
    <section className="anim-rise mx-4 mt-4 rounded-3xl border border-accent/50 bg-surface px-5 py-6" aria-live="polite">
      <p className="flex items-center gap-2 text-lg font-black">
        <Lock className="size-5 text-accent" aria-hidden />
        {feature} でできること
      </p>
      <p className="mt-1 text-sm text-muted">{yen(price)}の買い切り。1回払えばどちらもずっと使えます。月額も自動更新もありません。</p>
      {/* 買うと使えるようになるもの。プライベートでも仕事でも、両方とも使える */}
      <ul className="mt-4 space-y-2 text-sm">
        {(work ? [PLUS_ITEMS[1], PLUS_ITEMS[0], ...PLUS_ITEMS.slice(2)] : PLUS_ITEMS).map((t) => (
          <li key={t.body} className="flex items-start gap-2">
            <Check className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
            <span>
              {t.name && <span className="mr-1.5 font-logo font-black text-accent">{t.name}</span>}
              {t.body}
            </span>
          </li>
        ))}
      </ul>
      {error && (
        <p role="alert" className="mt-3 text-sm font-bold text-danger">
          {error}
        </p>
      )}
      <button type="button" onClick={buy} disabled={pending || !purchasable} className={`${BUTTON_PRIMARY} mt-5 w-full disabled:opacity-60`}>
        {!purchasable ? `${yen(price)} ・ 購入の受付はもうすぐ始まります` : pending && !restoring ? "お支払いのページを開いています…" : `${yen(price)}で買う`}
      </button>
      <div className="mt-2 space-y-0.5 text-center text-xs text-muted">
        <p>お支払いは Stripe の画面で行います。</p>
        <p>カードの番号は Tsudoro には届きません。</p>
        <p>買ったあとの請求はありません。</p>
        <p>
          <a href="/legal" className="underline underline-offset-2">
            特定商取引法に基づく表記
          </a>
        </p>
      </div>
      {restoring ? (
        <div className="mt-4 flex gap-2">
          <label className="min-w-0 flex-1">
            <span className="sr-only">買ったときのメールアドレス</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="買ったときのメールアドレス" className={INPUT} />
          </label>
          <button type="button" onClick={restore} disabled={pending || !email.trim()} className="shrink-0 rounded-2xl bg-white/8 px-4 text-sm font-bold ring-1 ring-white/12 disabled:opacity-40">
            戻す
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => setRestoring(true)} className="mx-auto mt-3 flex min-h-11 items-center px-3 text-xs font-bold text-muted underline underline-offset-2">
          {work ? "ほかの端末でご購入の方はこちら" : "ほかの端末で買った人はこちら"}
        </button>
      )}
      {onClose && (
        <button type="button" onClick={onClose} className="mx-auto flex min-h-11 items-center px-3 text-xs font-bold text-muted underline underline-offset-2">
          とじる
        </button>
      )}
    </section>
  );
}
