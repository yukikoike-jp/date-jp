"use client";

import { Check, ChevronDown, Crown, QrCode, RotateCcw, Users, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { setCollectionPayment } from "@/app/actions";
import { FREE_LIVE_PAYERS, isConfirmed } from "@/lib/collection";
import { yen } from "@/lib/sendai";
import { loadMyCollections, rememberCollection } from "@/lib/myCollections";
import { collectText } from "@/lib/share";
import type { Collection } from "@/lib/store/types";
import { LiveCollect } from "./LiveCollect";
import { ProPaywall, useFunAccess } from "./ProGate";
import { SendButtons, useCanShare } from "./SendButtons";

// 集金のページ。払った人は自分で「払った」を押し(申告)、幹事が受け取りを確かめて記録する(2段階)。
// 払ったと数えるのは幹事が記録したものだけ。色だけでなく ✓ と文字でも分かるようにする。
// 大人数でも、まだの人が上に来る。お店を出る前に「その場で集める」(QR と、まだの人の一覧)で、払わずに帰る人を出さない

/** 幹事の鍵。集金のページを作った端末に残し、鍵なしの URL で開いても幹事として使えるようにする */
const hostKey = (id: string) => `nomi:collect:${id}`;

/** 全員そろったときに、金色の粒を8方向へはじけさせる(飾りなので読み上げない) */
function Burst() {
  const dirs = [0, 45, 90, 135, 180, 225, 270, 315];
  return (
    <span aria-hidden className="burst pointer-events-none absolute top-1/2 left-2">
      {dirs.map((deg) => (
        <span
          key={deg}
          className="absolute size-1.5 rounded-full bg-accent"
          style={
            {
              "--dx": `${Math.round(Math.cos((deg * Math.PI) / 180) * 34)}px`,
              "--dy": `${Math.round(Math.sin((deg * Math.PI) / 180) * 34)}px`,
            } as React.CSSProperties
          }
        />
      ))}
    </span>
  );
}

export function CollectionView({
  collection: c,
  hostToken,
}: {
  collection: Omit<Collection, "adminHash">;
  hostToken: string | null;
}) {
  const router = useRouter();
  const canShare = useCanShare();
  const [token, setToken] = useState<string | null>(hostToken);
  const [origin, setOrigin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setOrigin(location.origin);
    try {
      if (hostToken) {
        localStorage.setItem(hostKey(c.id), hostToken);
        // 「集金のチェック」の一覧に出す(作った日は最初に開いた日のまま)
        const prev = loadMyCollections().find((x) => x.id === c.id);
        rememberCollection({ id: c.id, token: hostToken, title: c.title, total: c.total, createdAt: prev?.createdAt ?? Date.now(), partyId: prev?.partyId });
      } else setToken(localStorage.getItem(hostKey(c.id)));
    } catch {}
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [c.id, c.title, c.total, hostToken]);

  // ほかの人が押した「払った」を、画面に戻ってきたときに読み直す
  useEffect(() => {
    const onShow = () => document.visibilityState === "visible" && router.refresh();
    document.addEventListener("visibilitychange", onShow);
    return () => document.removeEventListener("visibilitychange", onShow);
  }, [router]);

  const isHost = token !== null;
  const isHostRank = isHost;
  const payers = c.people.filter((p) => !p.organizer);
  const unpaid = payers.filter((p) => !isConfirmed(c.payments[p.id]));
  const unpaidYen = unpaid.reduce((sum, p) => sum + p.amount, 0);
  const claimedCount = unpaid.filter((p) => c.payments[p.id]?.by === "self").length;
  const access = useFunAccess();
  const [live, setLive] = useState(false);
  const [showBuy, setShowBuy] = useState(false);
  // 少ない人数なら無料。多い会(払う人が FREE_LIVE_PAYERS 人より多い)は Tsudoro+
  const liveLocked = payers.length > FREE_LIVE_PAYERS && !access.loading && !access.unlocked;
  // 並べる順: 払ったと申告した人(幹事が確かめる)→ まだの人 → 幹事 → 受け取り済み(人数が多いときはたたむ)
  const rank = (p: (typeof c.people)[number]) => {
    const pay = c.payments[p.id];
    if (p.organizer) return 2;
    if (isConfirmed(pay)) return 3;
    return pay?.by === "self" ? (isHostRank ? 0 : 1) : 1;
  };
  const host = c.people.find((p) => p.organizer);
  const url = `${origin}/c/${c.id}`;
  const heading = c.title ? `「${c.title}」の集金` : "お会計の集金";

  function setPaid(personId: number, paid: boolean) {
    setError(null);
    start(async () => {
      const r = await setCollectionPayment(c.id, personId, paid, token);
      if (!r.ok) setError(r.error);
      router.refresh();
    });
  }

  const autoOn = c.autoRemindAt !== undefined;
  const askText = collectText(c.title, url, c.audience, autoOn);

  return (
    <>
      <div className="px-4 pt-6 pb-4">
        <p className="text-sm font-bold text-muted">{isHost ? "幹事の集金ページ" : "集金"}</p>
        <h1 className="mt-1 text-[22px] font-black tracking-tight">{heading}</h1>
        <p className="mt-1 text-sm text-muted">
          合計 {yen(c.total)}・{c.people.length}人{host ? `・幹事は${host.name}さん` : ""}
          {/* 補助があれば、引いた残りをみんなで割ったことを書く */}
          {(c.subsidy ?? 0) > 0 && <span className="block">補助 {yen(c.subsidy!)} を引いた {yen(c.total - c.subsidy!)} を全員で割り勘</span>}
        </p>
      </div>


      <section className="mx-4 rounded-3xl border panel px-5 py-5" aria-live="polite">
        <p className="flex items-center gap-2 font-black">
          <Wallet className="size-5" aria-hidden />
          {payers.length}人中{payers.length - unpaid.length}人が支払い済み
        </p>
        <div className="tier-green mt-3 h-2.5 overflow-hidden rounded-full bg-surface-2" aria-hidden>
          <div
            className="anim-grow h-full rounded-full bg-[var(--tb)]"
            style={{ width: `${payers.length ? ((payers.length - unpaid.length) / payers.length) * 100 : 0}%` }}
          />
        </div>
        <p className="mt-2 text-sm">
          {unpaid.length === 0 ? (
            <span className="tier-green anim-pop relative inline-flex items-center gap-1 font-bold text-[var(--tc)]">
              <Burst />
              <Check className="size-4" aria-hidden />
              全員の支払い完了
            </span>
          ) : (
            <span className="font-bold">
              まだ{unpaid.length}人・あと{yen(unpaidYen)}
              {isHost && claimedCount > 0 && <span className="ml-2 text-accent">払ったと申告 {claimedCount}人</span>}
            </span>
          )}
        </p>
        {isHost && unpaid.length > 0 && (
          <button
            type="button"
            onClick={() => (liveLocked ? setShowBuy((v) => !v) : setLive(true))}
            className="mt-4 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-accent px-4 text-base font-black text-accent-text active:scale-[0.98]"
          >
            <QrCode className="size-5" aria-hidden />
            その場で集める
          </button>
        )}
        {isHost && unpaid.length > 0 && !showBuy && (
          <p className="mt-2 text-center text-xs text-muted">お店を出る前に、QRを見せて全員に「払った」を押してもらいます。</p>
        )}
        {isHost && showBuy && (
          <div className="mt-3">
            <p className="mb-2 text-xs text-muted">{FREE_LIVE_PAYERS}人までの会は無料。それより多い会は Tsudoro+ で使えます。</p>
            <ProPaywall feature="Tsudoro+" price={access.price} purchasable={access.purchasable} onClose={() => setShowBuy(false)} />
          </div>
        )}
        {!isHost && unpaid.length > 0 && (
          <p className="mt-3 rounded-2xl bg-surface-2 px-4 py-3 text-sm">
            払ったら自分の名前の「払った」を押してね。幹事が確かめると ✓ が付きます。
          </p>
        )}
      </section>


      {(() => {
        const ordered = [...c.people].sort((a, b) => rank(a) - rank(b));
        const open = ordered.filter((p) => rank(p) < 3);
        const done = ordered.filter((p) => rank(p) === 3);
        // 払う人が多い会は、受け取り済みの人をたたんで、まだの人だけを見やすくする
        const fold = done.length > 0 && payers.length > 8;
        const renderRow = (p: (typeof c.people)[number], i: number) => {
          const raw = c.payments[p.id];
          // 幹事が受け取ったものだけを「払った」とする。本人が押しただけのものは「申告」として、幹事に確かめてもらう
          const pay = isConfirmed(raw) ? raw : undefined;
          const claimed = raw && !pay;
            return (
              <li key={p.id} className="anim-stagger flex min-h-16 items-center gap-2.5 px-4" style={{ "--i": i } as React.CSSProperties}>
                <span
                  aria-hidden
                  className={`tier-${p.tone} grid size-9 shrink-0 place-items-center rounded-full bg-[var(--ts)] text-sm font-black text-[var(--tc)]`}
                >
                  {[...p.name][0] ?? "?"}
                </span>
                <span className="min-w-0 flex-1 py-2">
                  <span className="block truncate font-bold">{p.name}</span>
                  <span className="mt-1 flex items-center gap-1">
                    {p.label && !p.organizer && (
                      <span className={`tier-${p.tone} inline-flex items-center gap-0.5 whitespace-nowrap rounded-md bg-[var(--ts)] px-1.5 py-0.5 text-[11px] font-bold leading-none text-[var(--tc)]`}>
                        <span aria-hidden>{p.mark}</span>
                        {p.label}
                      </span>
                    )}
                    {p.organizer && (
                      <span className="inline-flex items-center gap-0.5 rounded-md bg-accent px-1.5 py-0.5 text-[11px] font-bold leading-none text-accent-text">
                        <Crown className="size-3" aria-hidden />
                        幹事
                      </span>
                    )}
                  </span>
                </span>
                <span className={`shrink-0 text-lg font-black tabular-nums ${pay ? "text-muted line-through decoration-2" : ""}`}>
                  {yen(p.amount)}
                </span>
                <span className="flex w-[5.5rem] shrink-0 flex-col items-center gap-0.5">
                  {p.organizer ? (
                    <span className="text-[11px] font-bold text-muted">立て替え</span>
                  ) : pay ? (
                    <>
                      <span className="tier-green anim-pop inline-flex min-h-9 w-full items-center justify-center gap-1 rounded-full bg-[var(--tb)] text-xs font-bold text-black">
                        <Check className="size-3.5" aria-hidden />
                        受取済み
                      </span>
                      {isHost && (
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => setPaid(p.id, false)}
                          className="inline-flex min-h-8 items-center gap-0.5 text-[11px] font-bold text-muted underline-offset-2 hover:underline"
                        >
                          <RotateCcw className="size-3" aria-hidden />
                          取り消す
                        </button>
                      )}
                    </>
                  ) : isHost ? (
                    <>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => setPaid(p.id, true)}
                        className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-white/15 bg-surface-2 text-xs font-bold text-text hover:border-white/30 disabled:opacity-50"
                      >
                        受け取った
                      </button>
                      {claimed && <span className="text-[10px] font-bold text-accent">払ったと申告</span>}
                    </>
                  ) : claimed ? (
                    <>
                      <span className="text-xs font-bold text-accent">確認待ち</span>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => setPaid(p.id, false)}
                        className="inline-flex min-h-8 items-center text-[11px] font-bold text-muted underline-offset-2 hover:underline"
                      >
                        取り消す
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => setPaid(p.id, true)}
                      className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-accent text-xs font-black text-accent-text active:scale-95 disabled:opacity-50"
                    >
                      払った
                    </button>
                  )}
                </span>
              </li>
            );
        };
        return (
          <>
            <ul className="mx-4 mt-3 divide-y divide-border overflow-hidden rounded-3xl border panel">
              {(fold ? open : ordered).map(renderRow)}
            </ul>
            {fold && (
              <details className="group mx-4 mt-2 overflow-hidden rounded-3xl border panel">
                <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-5 text-sm font-bold [&::-webkit-details-marker]:hidden">
                  <span className="tier-green flex items-center gap-1.5 text-[var(--tc)]">
                    <Check className="size-4" aria-hidden />
                    受け取り済み {done.length}人
                  </span>
                  <ChevronDown className="size-4 text-muted transition-transform group-open:rotate-180" aria-hidden />
                </summary>
                <ul className="divide-y divide-border border-t border-border">{done.map(renderRow)}</ul>
              </details>
            )}
          </>
        );
      })()}
      {live && isHost && (
        <LiveCollect
          url={url}
          payers={payers.length}
          pending={pending}
          unpaid={unpaid.map((p) => ({ id: p.id, name: p.name, amount: p.amount, claimed: c.payments[p.id]?.by === "self" }))}
          onReceive={(id) => setPaid(id, true)}
          onClose={() => setLive(false)}
        />
      )}
      {error && (
        <p role="alert" className="mx-4 mt-3 text-sm font-bold text-danger">
          {error}
        </p>
      )}

      {isHost && (
        <>
          <section className="mx-4 mt-4 rounded-3xl border panel px-5 py-5">
            <h2 className="flex items-center gap-2 text-lg font-black">
              <Users className="size-5" aria-hidden />
              みんなにこのページを送る
            </h2>
            <p className="mt-1 text-sm text-muted">一人ずつの金額入りの案内文。</p>
            <SendButtons mainLabel="共有してみんなに送る" share={{ text: askText }} copy={askText} copyLabel="送る文をコピー" canShare={canShare} />
          </section>

          <p className="mx-4 mt-3 text-xs text-muted">
            現金で受け取ったら「受け取った」
          </p>
        </>
      )}
    </>
  );
}
