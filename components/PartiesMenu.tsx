"use client";

import { CalendarClock, CircleCheck, Hourglass, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { partyStatuses, type PartyStatus } from "@/app/actions";
import { loadMyParties, type MyParty } from "@/lib/myParties";
import { clock, dateLabel } from "@/lib/sendai";

// 上のバーの右上のボタン。この端末で作った会を、調整中・これから・完了に分けて、どの画面からでも開ける。
// 開いたときに、会の状態をサーバーに聞く(参加者の URL でも見られる内容だけ)。会の一覧は、この端末のブラウザの中にある

type Row = { party: MyParty; st: PartyStatus | undefined };

function Item({ r, onClose }: { r: Row; onClose: () => void }) {
  const d = r.st?.decision ?? null;
  const sub = !r.st ? "" : d ? `決定 ${dateLabel(d.date)} ${clock(d.start)}${d.shopName ? ` ・ ${d.shopName}` : ""}` : `調整中 ・ ${r.st.answered}人が回答`;
  return (
    <li>
      <Link
        href={`/p/${r.party.id}/admin?token=${r.party.token}`}
        onClick={onClose}
        className="flex min-h-14 items-center gap-3 rounded-xl px-3 py-2 transition-colors hover:bg-white/8"
      >
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-surface-2 text-accent" aria-hidden>
          {d ? <CircleCheck className="size-4" /> : <Hourglass className="size-4" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-black">{r.party.title}</span>
          {sub && <span className="mt-0.5 block truncate text-xs text-muted">{sub}</span>}
        </span>
      </Link>
    </li>
  );
}

function Group({ title, rows, onClose }: { title: string; rows: Row[]; onClose: () => void }) {
  if (rows.length === 0) return null;
  return (
    <section className="mt-3 first:mt-0">
      <h3 className="px-3 pb-1 text-[11px] font-black tracking-wider text-muted">
        {title} <span className="text-stone-500">{rows.length}</span>
      </h3>
      <ul>
        {rows.map((r) => (
          <Item key={r.party.id} r={r} onClose={onClose} />
        ))}
      </ul>
    </section>
  );
}

export function PartiesMenu() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Row[] | null>(null);

  // 別の画面に移ったら閉じる。Esc でも閉じる
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(false);
  }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // 開くたびに、最新の状態を読み込む
  useEffect(() => {
    if (!open) return;
    let alive = true;
    const parties = loadMyParties();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRows(parties.length === 0 ? [] : null);
    if (parties.length === 0) return;
    partyStatuses(parties.map((p) => p.id))
      .then((st) => alive && setRows(parties.filter((p) => st[p.id]).map((p) => ({ party: p, st: st[p.id] }))))
      .catch(() => alive && setRows(parties.map((p) => ({ party: p, st: undefined }))));
    return () => {
      alive = false;
    };
  }, [open]);

  const today = new Date().toLocaleDateString("sv-SE");
  const adjusting = (rows ?? []).filter((r) => !r.st?.decision);
  const upcoming = (rows ?? [])
    .filter((r) => r.st?.decision && r.st.decision.date >= today)
    .sort((a, b) => a.st!.decision!.date.localeCompare(b.st!.decision!.date));
  const done = (rows ?? []).filter((r) => r.st?.decision && r.st.decision.date < today).sort((a, b) => b.st!.decision!.date.localeCompare(a.st!.decision!.date));
  const close = () => setOpen(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="あなたの会(調整中・これから・完了)"
        aria-expanded={open}
        className="grid size-11 place-items-center rounded-xl text-stone-400 transition hover:text-white active:scale-95"
      >
        <CalendarClock className="size-5" aria-hidden />
      </button>
      {open && (
        <div className="fixed inset-0 z-20" role="presentation">
          <button type="button" aria-label="閉じる" onClick={close} className="absolute inset-0 bg-black/50" />
          <div role="dialog" aria-label="あなたの会" className="absolute inset-x-0 top-[3.75rem] mx-auto max-h-[75vh] w-[calc(100%-1.5rem)] max-w-xl overflow-y-auto rounded-3xl border panel bg-surface p-3 shadow-2xl">
            <div className="flex items-center justify-between px-3 pb-2">
              <p className="text-sm font-black">あなたの会</p>
              <button type="button" onClick={close} aria-label="閉じる" className="grid size-9 place-items-center rounded-full text-muted hover:text-white">
                <X className="size-4" aria-hidden />
              </button>
            </div>
            {rows === null ? (
              <p className="px-3 py-6 text-center text-sm text-muted">読み込んでいます…</p>
            ) : rows.length === 0 ? (
              <div className="px-3 py-6 text-center">
                <p className="text-sm text-muted">この端末で作った会はまだありません。</p>
                <Link href="/new" onClick={close} className="mt-3 inline-flex min-h-11 items-center rounded-full bg-accent px-5 text-sm font-black text-accent-text">
                  飲み会をつくる
                </Link>
              </div>
            ) : (
              <>
                <Group title="調整中" rows={adjusting} onClose={close} />
                <Group title="これから" rows={upcoming} onClose={close} />
                <Group title="完了" rows={done.slice(0, 5)} onClose={close} />
                {done.length > 0 && (
                  <Link href="/history" onClick={close} className="mt-2 flex min-h-11 items-center justify-center rounded-xl text-xs font-bold text-muted underline underline-offset-2 hover:text-white">
                    これまでの会(お店・人数・金額)を見る
                  </Link>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
