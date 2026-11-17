"use client";

import { Check, Lock } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { findSecondShops } from "@/app/actions";
import { SECOND_GENRES, type SecondGenreKey } from "@/lib/sendai";
import type { Shop } from "@/lib/shops";
import { ProPaywall, loadLicense, useFunAccess } from "./ProGate";
import { ShopList } from "./ShopList";
import { PILL, PILL_OFF, PILL_ON } from "./ui";

// 二次会のお店。一次会のお店が決まったあとに、その近くで23時以降も開いているお店を出す。
// 種類(居酒屋・バー・カラオケ)を押すと、その場で探し直す

export function SecondPartyShops({ partyId }: { partyId: string }) {
  const [genre, setGenre] = useState<SecondGenreKey | null>(null);
  const [result, setResult] = useState<{ shops: Shop[]; size: number; near: string; locked?: boolean } | null>(null);
  const [asking, setAsking] = useState(false);
  const access = useFunAccess();
  const [pending, start] = useTransition();

  useEffect(() => {
    start(async () => {
      setResult(await findSecondShops(partyId, genre, loadLicense()));
    });
  }, [partyId, genre]);

  if (result && !result.near) return null;

  // 有料プレミアムではないとき。お店は出さず、何が出るかと申し込みの案内だけを出す
  if (result?.locked) {
    return (
      <div>
        <p className="text-sm text-muted">
          {result.near}の近くで、{result.size}人が残れる時刻まで開いているお店を、自動で出します。
        </p>
        {asking ? (
          <ProPaywall feature="二次会のお店" price={access.price} purchasable={access.purchasable} onClose={() => setAsking(false)} />
        ) : (
          <button type="button" onClick={() => setAsking(true)} className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-white/8 px-4 text-sm font-bold ring-1 ring-white/12">
            <Lock className="size-4 text-accent" aria-hidden />
            二次会のお店を見る(有料プレミアム)
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`transition-opacity ${pending ? "opacity-60" : ""}`} aria-busy={pending}>
      <ShopList
        others={false}
        id="second-party"
        partyId={partyId}
        shops={result?.shops ?? []}
        otherArea={false}
        heading="二次会のお店"
        // 決まったあとの画面を長くしないよう、最初は3軒だけ
        initial={3}
        lead={
          result
            ? `${result.near}の近くで、23時以降も開いているお店です(${result.size}人)`
            : "一次会のお店の近くで、遅くまで開いているお店"
        }
        empty={result ? "合うお店なし" : "検索中…"}
      >
        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="二次会のお店の種類">
          <button type="button" aria-pressed={genre === null} onClick={() => setGenre(null)} className={`${PILL} ${genre === null ? PILL_ON : PILL_OFF}`}>
            {genre === null && <Check className="size-3.5" aria-hidden />}
            なんでも
          </button>
          {SECOND_GENRES.map((g) => (
            <button
              key={g.key}
              type="button"
              aria-pressed={genre === g.key}
              onClick={() => setGenre(g.key)}
              className={`${PILL} ${genre === g.key ? PILL_ON : PILL_OFF}`}
            >
              {genre === g.key && <Check className="size-3.5" aria-hidden />}
              {g.label}
            </button>
          ))}
        </div>
      </ShopList>
    </div>
  );
}
