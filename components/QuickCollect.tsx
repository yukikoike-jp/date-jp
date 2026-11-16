"use client";

import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { startCollection } from "@/app/actions";
import { loadAudience } from "@/lib/audience";
import { rememberCollection } from "@/lib/myCollections";
import { BUTTON_PRIMARY, INPUT } from "./ui";

// 集金をすぐはじめる(ホームの「集金の催促を、アプリにまかせる」の行き先)。割り勘の計算の画面を通らず、
// 合計と名前を入れるだけで、集金のページ(幹事の画面。払い方・催促のおまかせはそこで)に進む。全員同じ額で割る

/** 名前の一覧にする。改行・カンマ・読点で区切り、空は捨てて、20文字・30人まで */
function parseNames(text: string): string[] {
  return text
    .split(/[\n,、，]+/)
    .map((n) => n.trim().slice(0, 20))
    .filter(Boolean)
    .slice(0, 30);
}

export function QuickCollect() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [total, setTotal] = useState("");
  const [names, setNames] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const list = parseNames(names);
  const totalYen = Number(total);
  const ready = Number.isInteger(totalYen) && totalYen > 0 && list.length >= 2;

  function submit() {
    setError(null);
    start(async () => {
      const r = await startCollection({
        title,
        audience: loadAudience() ?? "student",
        total: totalYen,
        subsidy: null,
        unit: 100,
        // いちばん上の名前が幹事(立て替えた人)。払う人に数えない
        organizer: 0,
        people: list.map((name) => ({ name, tenths: 10, label: "", mark: "", tone: "yellow" })),
      });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      rememberCollection({ id: r.id, token: r.adminToken, title: title.trim(), total: totalYen, createdAt: Date.now() });
      router.push(`/c/${r.id}?token=${r.adminToken}`);
    });
  }

  return (
    <div className="mx-4 space-y-4">
      <label className="block">
        <span className="text-sm font-bold text-white/70">何の会計?(なくてもOK)</span>
        <input value={title} onChange={(e) => setTitle(e.target.value.slice(0, 30))} placeholder="例: ゼミの打ち上げ 11/30" className={`${INPUT} mt-1.5`} />
      </label>
      <label className="block">
        <span className="text-sm font-bold text-white/70">お会計の合計(円)</span>
        <input
          inputMode="numeric"
          value={total === "" ? "" : Number(total).toLocaleString("ja-JP")}
          onChange={(e) => setTotal(e.target.value.replace(/[^\d]/g, "").replace(/^0+/, "").slice(0, 7))}
          placeholder="0"
          className={`${INPUT} mt-1.5 text-2xl font-black tabular-nums`}
        />
      </label>
      <label className="block">
        <span className="text-sm font-bold text-white/70">割る人の名前(1行に1人。いちばん上が、立て替えたあなた)</span>
        <textarea
          value={names}
          onChange={(e) => setNames(e.target.value)}
          rows={6}
          placeholder={"あなた\nあおい\nいずみ\nうた"}
          className="mt-1.5 w-full resize-none rounded-2xl bg-white/8 px-4 py-3 text-base text-white ring-1 ring-white/12 outline-none placeholder:text-white/25 focus:ring-accent/50"
        />
        <span className="mt-1 block text-xs text-muted">{list.length}人 ・ 全員同じ額で割ります</span>
      </label>
      {error && (
        <p role="alert" className="text-sm font-bold text-danger">
          {error}
        </p>
      )}
      <button type="button" onClick={submit} disabled={!ready || pending} className={`${BUTTON_PRIMARY} w-full gap-2`}>
        {pending ? "作っています…" : "集金のページを作る"}
        <ArrowRight className="size-4" aria-hidden />
      </button>
    </div>
  );
}
