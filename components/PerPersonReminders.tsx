"use client";

import { Check, ChevronDown, Lock, Send } from "lucide-react";
import { useEffect, useState } from "react";
import type { Audience } from "@/lib/audience";
import { TONES, cleanPayLink, doneText, personalReminder, toneFor } from "@/lib/reminder";
import { yen } from "@/lib/sendai";
import { ProPaywall, useFunAccess } from "./ProGate";
import { toast } from "./Toast";
import { INPUT } from "./ui";

// 有料パックの「ひとりずつ催促」(集金のページの、幹事の画面)。
// まだ払っていない人ごとに、名前・金額・払い方(幹事の PayPay の送金リンク)入りの文を作り、1人ずつ送る。
// 送った回数に合わせて、1回目はやわらかく、最後ははっきり言い方を変える。Tsudoro はお金を預からない。
// 買う前は「デモ版」: 最初の1人ぶんの文だけを、見本のリンクで見せる

const LINK_KEY = "nomi:paylink";
const sentKey = (id: string) => `nomi:reminded:${id}`;
const DEMO_LINK = "https://paypay.ne.jp/xxxxxxxx";

type Person = { id: number; name: string; amount: number };

function loadSent(id: string): Record<number, number> {
  try {
    const v = JSON.parse(localStorage.getItem(sentKey(id)) ?? "{}");
    return v && typeof v === "object" ? v : {};
  } catch {
    return {};
  }
}

/** 送る。共有の画面があれば開き(やめたら数えない)、なければコピーする。送れたら true */
async function send(text: string): Promise<boolean> {
  if (typeof navigator.share === "function") {
    try {
      await navigator.share({ text });
      return true;
    } catch {
      return false;
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    toast("コピーしました。LINE などに貼り付けてください");
    return true;
  } catch {
    return false;
  }
}

export function PerPersonReminders({
  collectionId,
  title,
  audience,
  total,
  unpaid,
  pageUrl,
}: {
  collectionId: string;
  title: string;
  audience: Audience;
  total: number;
  unpaid: Person[];
  pageUrl: string;
}) {
  const access = useFunAccess();
  const locked = !access.unlocked;
  const [showBuy, setShowBuy] = useState(false);
  const [linkText, setLinkText] = useState("");
  const [sent, setSent] = useState<Record<number, number>>({});

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    try {
      setLinkText(localStorage.getItem(LINK_KEY) ?? "");
    } catch {}
    setSent(loadSent(collectionId));
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [collectionId]);

  const link = cleanPayLink(linkText);
  const linkBad = linkText.trim() !== "" && link === null;

  function editLink(v: string) {
    setLinkText(v);
    try {
      localStorage.setItem(LINK_KEY, v.trim());
    } catch {}
  }

  async function sendTo(p: Person, text: string) {
    if (!(await send(text))) return;
    const next = { ...sent, [p.id]: (sent[p.id] ?? 0) + 1 };
    setSent(next);
    try {
      localStorage.setItem(sentKey(collectionId), JSON.stringify(next));
    } catch {}
  }

  const msg = (p: Person, count: number, payLink: string | null) =>
    personalReminder({ audience, title, name: p.name, amount: p.amount, tone: toneFor(count), payLink, pageUrl });

  // 買う前の案内の間は、まだ読み込み中なら何も出さない(買った人に一瞬デモ版が見えないように)
  if (access.loading) return null;
  // 全員そろったあとは、買った人にだけお礼の文を出す
  if (unpaid.length === 0) {
    if (locked) return null;
    const text = doneText(audience, title, total);
    return (
      <section className="mx-4 mt-4 rounded-3xl border panel px-5 py-5">
        <h2 className="flex items-center justify-between text-lg font-black">
          全員そろった!お礼を送る
          <Badge locked={false} />
        </h2>
        <p className="mt-3 rounded-2xl bg-surface-2 px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap">{text}</p>
        <button type="button" onClick={() => send(text)} className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-accent text-base font-black text-accent-text active:scale-[0.97]">
          <Send className="size-4" aria-hidden />
          お礼の文を送る
        </button>
      </section>
    );
  }

  return (
    <section className="mx-4 mt-4 rounded-3xl border panel px-5 py-5" aria-label="ひとりずつ催促">
      <h2 className="flex items-center justify-between gap-2 text-lg font-black">
        ひとりずつ催促
        <Badge locked={locked} />
      </h2>
      <p className="mt-1 text-sm text-muted">名前・金額・払い方のリンク入りの文を、1人ずつ送ります。催促のたびに、言い方がやさしい順に変わります。</p>

      {locked ? (
        <>
          {/* デモ版: 最初の1人ぶんだけ、見本のリンクで見せる。ほかの人は鍵のかかった行 */}
          <div className="mt-4 rounded-2xl border border-accent/40 px-4 py-3">
            <p className="flex items-center gap-1.5 text-xs font-black text-accent">
              <Lock className="size-3.5" aria-hidden />
              デモ版の見本({unpaid[0].name}さんへ・1回目)
            </p>
            <p className="mt-2 text-sm leading-relaxed break-all whitespace-pre-wrap text-white/80">{msg(unpaid[0], 0, DEMO_LINK)}</p>
          </div>
          <ul className="mt-3 divide-y divide-border overflow-hidden rounded-2xl border border-border opacity-60">
            {unpaid.map((p) => (
              <li key={p.id} className="flex min-h-12 items-center gap-2 px-4 text-sm">
                <span className="min-w-0 flex-1 truncate font-bold">{p.name}</span>
                <span className="tabular-nums">{yen(p.amount)}</span>
                <Lock className="size-4 text-accent" aria-label="有料パックで使えます" />
              </li>
            ))}
          </ul>
          {!showBuy && (
            <button type="button" onClick={() => setShowBuy(true)} className="mt-3 inline-flex min-h-11 items-center rounded-2xl bg-accent px-4 text-sm font-black text-accent-text active:scale-95">
              有料パックのくわしく
            </button>
          )}
          {showBuy && <ProPaywall feature="ひとりずつ催促" fun price={access.price} purchasable={access.purchasable} onClose={() => setShowBuy(false)} />}
        </>
      ) : (
        <>
          <label className="mt-4 block text-sm font-bold text-white/70" htmlFor="paylink">
            あなたの PayPay の送金リンク
          </label>
          <input
            id="paylink"
            inputMode="url"
            value={linkText}
            onChange={(e) => editLink(e.target.value)}
            placeholder="https://paypay.ne.jp/…"
            className={`${INPUT} mt-1.5`}
            aria-invalid={linkBad}
          />
          <p className={`mt-1.5 text-xs ${linkBad ? "font-bold text-danger" : "text-muted"}`}>
            {linkBad ? "PayPay のリンク(https://paypay.ne.jp/…)を入れてください" : "PayPay アプリの「送る・受け取る」で作ったリンクを貼ります。空でも使えます(その場合は、直接払ってもらう言い方になります)"}
          </p>

          <ul className="mt-4 space-y-2">
            {unpaid.map((p) => {
              const count = sent[p.id] ?? 0;
              const tone = TONES.find((t) => t.key === toneFor(count))!;
              const text = msg(p, count, linkBad ? null : link);
              return (
                <li key={p.id} className="rounded-2xl border border-border px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold">{p.name}</span>
                      <span className="block text-xs text-muted">
                        {yen(p.amount)} ・ {tone.label}
                        {count > 0 && ` ・ ${count}回送りました`}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => sendTo(p, text)}
                      className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl bg-accent px-3 text-sm font-black text-accent-text active:scale-95"
                    >
                      <Send className="size-4" aria-hidden />
                      送る
                    </button>
                  </div>
                  <details className="group mt-1 [&_summary::-webkit-details-marker]:hidden">
                    <summary className="flex min-h-9 cursor-pointer list-none items-center gap-1 text-xs font-bold text-muted">
                      送る文を見る
                      <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" aria-hidden />
                    </summary>
                    <p className="mt-1 rounded-xl bg-surface-2 px-3 py-2 text-sm leading-relaxed break-all whitespace-pre-wrap">{text}</p>
                  </details>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 flex items-center gap-1 text-xs text-muted">
            <Check className="size-3.5 shrink-0" aria-hidden />
            払い終わった人は「受け取った」を押すと、この一覧から消えます
          </p>
        </>
      )}
    </section>
  );
}

function Badge({ locked }: { locked: boolean }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-accent/50 px-1.5 py-0.5 text-[10px] font-black leading-none text-accent">
      <Lock className="size-3" aria-hidden />
      {locked ? "デモ版" : "有料パック"}
    </span>
  );
}
