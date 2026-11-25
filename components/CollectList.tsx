"use client";

import { Check, ChevronDown, ChevronRight, ListChecks, Wallet } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { collectionProgress } from "@/app/actions";
import { loadMyCollections, type MyCollection } from "@/lib/myCollections";
import { yen } from "@/lib/sendai";
import { BUTTON_PRIMARY } from "./ui";

// 「集金のチェック」。この端末で作った集金を並べ、誰が何人払ったかを棒で見せる。
// 新しく始めるときは、合計と名前を入れる画面(/collect/new)へ送る

type Progress = { payers: number; paid: number; unpaidYen: number };

const STEPS = [
  { title: "合計と名前を入れて、集金のページを作る", note: "全員同じ額で割って、一人ずつの金額が出る" },
  { title: "集金のページをみんなに送る", note: "共有のボタンで LINE やチャットへ" },
  { title: "払った人が自分で「払った」を押す", note: "幹事が確かめて「受け取った」。お店を出る前ならその場で集める" },
];

/** 買う前の「もや」の下に出す見本。どの端末・どのブラウザ(Instagram の中も)でも、同じ見た目にする */
const DEMO_ITEMS: MyCollection[] = [
  { id: "demo1", token: "", title: "ゼミの打ち上げ", total: 24000, createdAt: new Date("2026-11-12").getTime() },
  { id: "demo2", token: "", title: "サークルの忘年会", total: 52000, createdAt: new Date("2026-11-05").getTime() },
];
const DEMO_PROGRESS: Record<string, Progress> = {
  demo1: { payers: 6, paid: 6, unpaidYen: 0 },
  demo2: { payers: 13, paid: 8, unpaidYen: 20000 },
};

export function CollectList({ demo = false }: { demo?: boolean }) {
  const [items, setItems] = useState<MyCollection[] | null>(demo ? DEMO_ITEMS : null);
  const [progress, setProgress] = useState<Record<string, Progress>>(demo ? DEMO_PROGRESS : {});
  const [all, setAll] = useState(false);

  useEffect(() => {
    if (demo) return;
    const list = loadMyCollections();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems(list);
    if (list.length === 0) return;
    collectionProgress(list.map((c) => c.id))
      .then((rows) => setProgress(Object.fromEntries(rows.map((r) => [r.id, r]))))
      .catch(() => {});
  }, [demo]);

  return (
    <>
      <Link href="/collect/new" className={`${BUTTON_PRIMARY} w-full gap-2`}>
        <Wallet className="size-5" aria-hidden />
        集金を始める
      </Link>

      {items && items.length > 0 && (
        <>
          <h3 className="mt-5 mb-2 flex items-baseline justify-between px-1 text-xs font-bold text-muted">
            <span>これまでの集金</span>
            <span className="font-normal">{items.length}件</span>
          </h3>
          {/* 1行ずつに縮めた一覧。名前・日付・払った人数だけを見せる(くわしくは押して開く) */}
          <ul className="overflow-hidden rounded-2xl bg-surface-2 ring-1 ring-white/8">
            {(all ? items : items.slice(0, 4)).map((c, i) => {
              const p = progress[c.id];
              const done = p && p.payers > 0 && p.paid === p.payers;
              return (
                <li key={c.id} className="anim-stagger border-t border-border first:border-t-0" style={{ "--i": i } as React.CSSProperties}>
                  <Link href={`/c/${c.id}?token=${c.token}`} className="flex min-h-14 items-center gap-3 px-4 py-2 transition-colors hover:bg-white/5">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-black">{c.title || "お会計"}</span>
                      <span className="block text-[11px] text-muted">
                        {new Date(c.createdAt).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" })} ・ {yen(c.total)}
                      </span>
                    </span>
                    {p ? (
                      done ? (
                        <span className="tier-green inline-flex shrink-0 items-center gap-1 rounded-full bg-[var(--ts)] px-2.5 py-1 text-xs font-bold text-[var(--tc)]">
                          <Check className="size-3.5" aria-hidden />
                          完了
                        </span>
                      ) : (
                        <span className="shrink-0 text-right">
                          <span className="block text-sm font-black tabular-nums">
                            {p.paid}
                            <span className="text-xs font-bold text-muted">/{p.payers}人</span>
                          </span>
                          <span className="block text-[11px] font-bold text-accent">あと{yen(p.unpaidYen)}</span>
                        </span>
                      )
                    ) : (
                      <span className="h-4 w-12 shrink-0 rounded bg-white/8" aria-hidden />
                    )}
                    <ChevronRight className="size-4 shrink-0 text-muted" aria-hidden />
                  </Link>
                </li>
              );
            })}
          </ul>
          {!all && items.length > 4 && (
            <button
              type="button"
              onClick={() => setAll(true)}
              className="mt-2 flex min-h-11 w-full items-center justify-center gap-1 rounded-xl text-sm font-bold text-muted transition-colors hover:text-text"
            >
              ほかの{items.length - 4}件を見る
              <ChevronDown className="size-4" aria-hidden />
            </button>
          )}
        </>
      )}

      {/* 集金のしかた(たたまず、いつも開いておく) */}
      <h3 className="mt-5 mb-2 flex items-center gap-1.5 text-xs font-bold text-muted">
        <ListChecks className="size-3.5" aria-hidden />
        集金のしかた
      </h3>
      <ol className="overflow-hidden rounded-2xl bg-surface-2 ring-1 ring-white/8">
        {STEPS.map((s, i) => (
          <li key={s.title} className="flex gap-3 border-t border-border px-4 py-3 first:border-t-0">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-accent text-xs font-black text-accent-text" aria-hidden>
              {i + 1}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-black">{s.title}</span>
              <span className="mt-0.5 block text-xs text-muted">{s.note}</span>
            </span>
          </li>
        ))}
      </ol>
    </>
  );
}
