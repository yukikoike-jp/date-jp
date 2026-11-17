"use client";

import { Check } from "lucide-react";
import { useState, useTransition } from "react";
import { saveCollectionSettings } from "@/app/actions";
import { cleanPayLink } from "@/lib/reminder";
import { INPUT } from "./ui";

// 集金のページ(幹事の画面)の「払い方」。幹事の PayPay の送金リンクを貼ると、みんなの画面に「PayPay で払う」が出る(無料)。
// Tsudoro はお金を預からない。PayPay のリンクだけを通す(lib/reminder.ts の cleanPayLink)

export function PayLinkPanel({ collectionId, hostToken, initialPayLink }: { collectionId: string; hostToken: string; initialPayLink: string | null }) {
  const [linkText, setLinkText] = useState(initialPayLink ?? "");
  const [savedLink, setSavedLink] = useState<string | null>(initialPayLink);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const link = cleanPayLink(linkText);
  const linkBad = linkText.trim() !== "" && link === null;
  const changed = (link ?? "") !== (savedLink ?? "");

  function save() {
    setError(null);
    start(async () => {
      // autoRemind は送らないので、ここでは払い方だけが変わる
      const r = await saveCollectionSettings(collectionId, hostToken, { payLink: linkText }, null);
      if (!r.ok) setError(r.error);
      else setSavedLink(r.payLink);
    });
  }

  return (
    <section className="mx-4 mt-4 rounded-3xl border panel px-5 py-5" aria-label="払い方">
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
          disabled={pending || linkBad || !changed}
          onClick={save}
          className="inline-flex min-h-14 shrink-0 items-center rounded-2xl bg-white/8 px-4 text-sm font-bold ring-1 ring-white/12 active:scale-95 disabled:opacity-40"
        >
          {savedLink && !changed ? <Check className="size-4" aria-label="保存済み" /> : "保存"}
        </button>
      </div>
      <p className={`mt-1.5 text-xs ${linkBad ? "font-bold text-danger" : "text-muted"}`}>
        {linkBad ? "PayPay のリンク(https://paypay.ne.jp/…)を入れてください" : "貼るとみんなの画面に「PayPay で払う」が出ます(空でもOK)"}
      </p>
      {error && (
        <p role="alert" className="mt-2 text-sm font-bold text-danger">
          {error}
        </p>
      )}
    </section>
  );
}
