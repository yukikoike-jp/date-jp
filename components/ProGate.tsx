"use client";

import { Check, Lock } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { buyPro, funStatus, restorePro } from "@/app/actions";
import { yen } from "@/lib/sendai";
import { BUTTON_PRIMARY, INPUT } from "./ui";

// 月額の有料プレミアム(エンタメの Play だけ)。割り勘・傾斜・集金の表づくりは無料のまま。
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

/** 有料プレミアムの機能(催促をアプリにまかせる)が使えるか。読み込み中と、読めなかったときは鍵をかけたまま(デモ版) */
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
        {feature}は有料プレミアム
      </p>
      <p className="mt-1 text-sm text-muted">毎月{yen(price)}が自動で更新されます。いつでも解約でき、解約しても、払った期間の終わりまでは使えます。</p>
      <ul className="mt-4 space-y-1.5 text-sm">
        {(work ? ["話題ガチャ・ひとこと・幹事メモがぜんぶ", "これからふえる道具も、契約中はずっと"] : ["盛り上がる遊びがぜんぶ", "これからふえる遊びも、契約中はずっと"]).map((t) => (
          <li key={t} className="flex items-center gap-2">
            <Check className="size-4 shrink-0 text-accent" aria-hidden />
            {t}
          </li>
        ))}
      </ul>
      {error && (
        <p role="alert" className="mt-3 text-sm font-bold text-danger">
          {error}
        </p>
      )}
      <button type="button" onClick={buy} disabled={pending || !purchasable} className={`${BUTTON_PRIMARY} mt-5 w-full disabled:opacity-60`}>
        {!purchasable ? `月${yen(price)} ・ 申し込みの受付はもうすぐ始まります` : pending && !restoring ? "お支払いのページを開いています…" : `月${yen(price)}で申し込む`}
      </button>
      <p className="mt-2 text-center text-xs text-muted">
        お支払いは Stripe のページで ・ カードの番号は Tsudoro に届きません。解約は、契約したあと、このページの下の「契約の確認・解約」からできます。{" "}
        <a href="/legal" className="underline underline-offset-2">
          特定商取引法に基づく表記
        </a>
      </p>
      {restoring ? (
        <div className="mt-4 flex gap-2">
          <label className="min-w-0 flex-1">
            <span className="sr-only">契約したときのメールアドレス</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="契約したときのメールアドレス" className={INPUT} />
          </label>
          <button type="button" onClick={restore} disabled={pending || !email.trim()} className="shrink-0 rounded-2xl bg-white/8 px-4 text-sm font-bold ring-1 ring-white/12 disabled:opacity-40">
            戻す
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => setRestoring(true)} className="mx-auto mt-3 flex min-h-11 items-center px-3 text-xs font-bold text-muted underline underline-offset-2">
          ほかの端末で契約した人はこちら
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
