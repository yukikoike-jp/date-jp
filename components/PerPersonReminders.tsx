"use client";

import { Check, ChevronDown, Send } from "lucide-react";
import { useEffect, useState } from "react";
import type { Audience } from "@/lib/audience";
import { TONES, doneText, personalReminder, toneFor } from "@/lib/reminder";
import { yen } from "@/lib/sendai";
import { toast } from "./Toast";

// 集金のページ(幹事の画面)の「ひとりずつ文を作る」(無料)。まだ払っていない人ごとに、名前・金額・払い方(PayPay のリンク)入りの文を作り、1人ずつ送る。
// 送った回数に合わせて、1回目はやわらかく、最後ははっきり言い方を変える。
// 気まずさそのものは、有料の「自動でお知らせ」(components/AutoRemindPanel.tsx)で、幹事の代わりにアプリが言う

const sentKey = (id: string) => `nomi:reminded:${id}`;

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
  payLink,
}: {
  collectionId: string;
  title: string;
  audience: Audience;
  total: number;
  unpaid: Person[];
  pageUrl: string;
  /** 幹事が保存した PayPay のリンク(なければ、直接払ってもらう言い方) */
  payLink: string | null;
}) {
  const [sent, setSent] = useState<Record<number, number>>({});

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSent(loadSent(collectionId));
  }, [collectionId]);

  async function sendTo(p: Person, text: string) {
    if (!(await send(text))) return;
    const next = { ...sent, [p.id]: (sent[p.id] ?? 0) + 1 };
    setSent(next);
    try {
      localStorage.setItem(sentKey(collectionId), JSON.stringify(next));
    } catch {}
  }

  const msg = (p: Person, count: number) =>
    personalReminder({ audience, title, name: p.name, amount: p.amount, tone: toneFor(count), payLink, pageUrl });

  // 全員そろったあとは、お礼の文だけ
  if (unpaid.length === 0) {
    const text = doneText(audience, title, total);
    return (
      <section className="mx-4 mt-4 rounded-3xl border panel px-5 py-5">
        <h2 className="text-lg font-black">全員そろった!お礼を送る</h2>
        <p className="mt-3 rounded-2xl bg-surface-2 px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap">{text}</p>
        <button type="button" onClick={() => send(text)} className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-accent text-base font-black text-accent-text active:scale-[0.97]">
          <Send className="size-4" aria-hidden />
          お礼の文を送る
        </button>
      </section>
    );
  }

  return (
    <details className="group mx-4 mt-4 rounded-3xl border panel px-5 [&_summary::-webkit-details-marker]:hidden">
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between text-base font-black">
        ひとりずつ文を作って送る
        <ChevronDown className="size-4 text-muted transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <div className="pb-5">
        <p className="text-sm text-muted">名前・金額・払い方入りの文を1人ずつ送れます。送るたびに言い方がやさしい順に変わります。</p>
        <ul className="mt-3 space-y-2">
          {unpaid.map((p) => {
            const count = sent[p.id] ?? 0;
            const tone = TONES.find((t) => t.key === toneFor(count))!;
            const text = msg(p, count);
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
                <details className="group/msg mt-1 [&_summary::-webkit-details-marker]:hidden">
                  <summary className="flex min-h-9 cursor-pointer list-none items-center gap-1 text-xs font-bold text-muted">
                    送る文を見る
                    <ChevronDown className="size-3.5 transition-transform group-open/msg:rotate-180" aria-hidden />
                  </summary>
                  <p className="mt-1 rounded-xl bg-surface-2 px-3 py-2 text-sm leading-relaxed break-all whitespace-pre-wrap">{text}</p>
                </details>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 flex items-center gap-1 text-xs text-muted">
          <Check className="size-3.5 shrink-0" aria-hidden />
          払い終わった人は「受け取った」を押すとこの一覧から消えます
        </p>
      </div>
    </details>
  );
}
