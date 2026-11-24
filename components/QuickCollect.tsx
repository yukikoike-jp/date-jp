"use client";

import { ArrowRight, Check, Crown, Plus, Users, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { partyAttendees, partyStatuses, startCollection } from "@/app/actions";
import { loadAudience } from "@/lib/audience";
import { rememberCollection } from "@/lib/myCollections";
import { loadMyParties, type MyParty } from "@/lib/myParties";
import { dateLabel, yen } from "@/lib/sendai";
import { splitBill } from "@/lib/split";
import { SPLIT_NAMES_KEY, SPLIT_TITLE_KEY } from "./SplitClient";
import { BUTTON_PRIMARY } from "./ui";

// 集金をすぐはじめる(無料)。3つの手順を、番号つきの枠で上から並べる。
//   1 会を選ぶ(決まった会から引き継ぐ。または最初から) → 2 合計 → 3 集める人
// 会の画面から来たときは、行く人の名前と会の名前が最初から入っている。全員同じ額で割る

const MAX_PEOPLE = 30;
let nextRowId = 1;
type Row = { id: number; name: string };
const newRow = (name = ""): Row => ({ id: nextRowId++, name });

/** 手順の枠。番号の丸と見出しを付ける */
function Step({ n, title, note, children }: { n: number; title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border panel px-4 py-4">
      <h2 className="flex items-center gap-2.5">
        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent text-xs font-black text-accent-text" aria-hidden>
          {n}
        </span>
        <span className="text-base font-black tracking-tight">{title}</span>
        {note && <span className="ml-auto text-[11px] font-bold text-muted">{note}</span>}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function QuickCollect() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [total, setTotal] = useState("");
  const [rows, setRows] = useState<Row[]>(() => [newRow(), newRow(), newRow()]);
  // 立て替えた人(払う人に数えない)。行の番号
  const [organizerId, setOrganizerId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  // この端末で作った、決まった会(新しい順)。押すと、行く人の名前と会の名前を引き継ぐ
  const [decided, setDecided] = useState<{ party: MyParty; date: string }[] | null>(null);
  const [importing, startImporting] = useTransition();
  const [importedId, setImportedId] = useState<string | null>(null);
  const focusId = useRef<number | null>(null);

  const setNames = (names: string[]) => {
    const next = names.slice(0, MAX_PEOPLE).map((n) => newRow(n.slice(0, 20)));
    while (next.length < 3) next.push(newRow());
    setRows(next);
    setOrganizerId(null);
  };

  // 会の画面から渡された名前と会の名前を受け取る(URL には載せず、このタブの中だけで渡す)
  useEffect(() => {
    try {
      const handed: (string | { name: string })[] = JSON.parse(sessionStorage.getItem(SPLIT_NAMES_KEY) ?? "[]");
      const handedTitle = sessionStorage.getItem(SPLIT_TITLE_KEY) ?? "";
      if (Array.isArray(handed) && handed.length > 0) {
        /* eslint-disable react-hooks/set-state-in-effect */
        setNames(handed.map((n) => (typeof n === "string" ? n : String(n.name))));
        if (handedTitle) setTitle(handedTitle.slice(0, 30));
        /* eslint-enable react-hooks/set-state-in-effect */
      }
      // 開発中は準備が2回走るので、すぐには消さない
      setTimeout(() => {
        try {
          sessionStorage.removeItem(SPLIT_NAMES_KEY);
          sessionStorage.removeItem(SPLIT_TITLE_KEY);
        } catch {}
      }, 0);
    } catch {}
  }, []);

  useEffect(() => {
    const mine = loadMyParties();
    if (mine.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDecided([]);
      return;
    }
    partyStatuses(mine.map((p) => p.id))
      .then((st) =>
        setDecided(
          mine
            .filter((p) => st[p.id]?.decision)
            .map((p) => ({ party: p, date: st[p.id].decision!.date }))
            .sort((a, b) => b.date.localeCompare(a.date))
            .slice(0, 6),
        ),
      )
      .catch(() => setDecided([]));
  }, []);

  function importParty(p: MyParty) {
    if (importedId !== p.id && rows.some((r) => r.name.trim()) && !window.confirm(`いまの名前を消して、「${p.title}」の行く人を引き継ぎますか?`)) return;
    startImporting(async () => {
      const r = await partyAttendees(p.id, p.token);
      if (!r || r.attendees.length === 0) {
        window.alert("この会の行く人を読み込めませんでした");
        return;
      }
      setNames(r.attendees.map((a) => a.name));
      setTitle(`${r.title} ${dateLabel(r.date).split("(")[0]}`.slice(0, 30));
      setImportedId(p.id);
    });
  }

  function startFresh() {
    setImportedId(null);
    setTitle("");
    setNames([]);
  }

  // 名前が入っている行だけが、集める人
  const named = useMemo(() => rows.filter((r) => r.name.trim()), [rows]);
  const organizerAt = Math.max(0, named.findIndex((r) => r.id === organizerId));
  const totalYen = Number(total);
  const ready = Number.isInteger(totalYen) && totalYen > 0 && named.length >= 2;
  // 1人あたりの金額(幹事のぶんも含めて全員同じ額で割り、100円単位に切り上げる)
  const preview = useMemo(() => {
    if (!(totalYen > 0) || named.length < 2) return null;
    const r = splitBill({ total: totalYen, weights: named.map(() => 10), unit: 100, organizer: organizerAt });
    const each = r.amounts.find((_, i) => i !== organizerAt) ?? 0;
    return { each, payers: named.length - 1 };
  }, [totalYen, named, organizerAt]);

  function update(id: number, name: string) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, name: name.slice(0, 20) } : r)));
  }
  function remove(id: number) {
    setRows((rs) => {
      const left = rs.filter((r) => r.id !== id);
      while (left.length < 3) left.push(newRow());
      return left;
    });
    if (organizerId === id) setOrganizerId(null);
  }
  function add() {
    if (rows.length >= MAX_PEOPLE) return;
    const r = newRow();
    focusId.current = r.id;
    setRows((rs) => [...rs, r]);
  }
  /** 複数の名前を貼り付けたら、1行ずつに分ける */
  function paste(id: number, text: string): boolean {
    const parts = text.split(/[\n,、，]+/).map((n) => n.trim().slice(0, 20)).filter(Boolean);
    if (parts.length < 2) return false;
    setRows((rs) => {
      const at = rs.findIndex((r) => r.id === id);
      const merged = [...rs.slice(0, at), ...parts.map((n) => newRow(n)), ...rs.slice(at + 1)].filter((r, i, all) => r.name.trim() || all.length <= 3 || i === all.length - 1);
      return merged.slice(0, MAX_PEOPLE);
    });
    return true;
  }

  function submit() {
    setError(null);
    start(async () => {
      const r = await startCollection({
        title,
        audience: loadAudience() ?? "private",
        total: totalYen,
        subsidy: null,
        unit: 100,
        organizer: organizerAt,
        people: named.map((p) => ({ name: p.name.trim(), tenths: 10, label: "", mark: "", tone: "yellow" })),
      });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      rememberCollection({ id: r.id, token: r.adminToken, title: title.trim(), total: totalYen, createdAt: Date.now() });
      router.push(`/c/${r.id}?token=${r.adminToken}`);
    });
  }

  const hint = !(totalYen > 0) ? "合計を入れてください" : named.length < 2 ? "名前を2人以上入れてください" : null;

  return (
    <div className="mx-4 space-y-3 pb-32">
      {/* 1. 会を選ぶ。決まった会があれば、カードで並べる(押すと名前と会の名前が入る) */}
      <Step n={1} title="どの会の集金?" note={importedId ? "引き継ぎ済み" : undefined}>
        {decided && decided.length > 0 && (
          <ul className="grid gap-1.5" aria-label="決まった会から引き継ぐ">
            {decided.map(({ party: p, date }) => {
              const on = importedId === p.id;
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    disabled={importing}
                    aria-pressed={on}
                    onClick={() => importParty(p)}
                    className={`flex min-h-14 w-full items-center gap-3 rounded-2xl px-3 text-left ring-1 transition active:scale-[0.99] disabled:opacity-50 ${
                      on ? "bg-accent/15 ring-accent/60" : "bg-surface-2 ring-white/10 hover:bg-white/10"
                    }`}
                  >
                    <span className={`grid size-9 shrink-0 place-items-center rounded-full ${on ? "bg-accent text-accent-text" : "bg-white/10 text-accent"}`}>
                      {on ? <Check className="size-4" strokeWidth={3} aria-hidden /> : <Users className="size-4" aria-hidden />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-black">{p.title}</span>
                      <span className="block text-xs text-muted">{dateLabel(date)} ・ 行く人の名前を引き継ぐ</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <label className={`block ${decided && decided.length > 0 ? "mt-3" : ""}`}>
          <span className="text-xs font-bold text-muted">{decided && decided.length > 0 ? "または、集金の名前を自分で入れる" : "集金の名前(なくてもOK)"}</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, 30))}
            placeholder="例: ゼミの打ち上げ 11/30"
            className="mt-1.5 min-h-12 w-full rounded-xl bg-surface-2 px-4 text-base font-bold text-white outline-none transition placeholder:font-normal placeholder:text-white/30 focus:ring-2 focus:ring-accent/60"
          />
        </label>
        {importedId && (
          <button type="button" onClick={startFresh} className="mt-2 inline-flex min-h-9 items-center text-xs font-bold text-muted underline underline-offset-2 hover:text-text">
            引き継ぎをやめて、最初から入れる
          </button>
        )}
      </Step>

      {/* 2. 合計。大きな数字で入れて、1人あたりをその場で見せる */}
      <Step n={2} title="お会計の合計">
        <label className="flex items-baseline gap-2 rounded-2xl bg-surface-2 px-4 py-3 focus-within:ring-2 focus-within:ring-accent/60">
          <span className="text-2xl font-black text-muted">¥</span>
          <input
            inputMode="numeric"
            aria-label="お会計の合計(円)"
            value={total === "" ? "" : Number(total).toLocaleString("ja-JP")}
            onChange={(e) => setTotal(e.target.value.replace(/[^\d]/g, "").replace(/^0+/, "").slice(0, 7))}
            placeholder="0"
            className="w-full min-w-0 bg-transparent text-4xl font-black tracking-tight tabular-nums outline-none placeholder:text-white/20"
          />
        </label>
        <p className="mt-2.5 flex items-center justify-between rounded-xl bg-accent/10 px-4 py-2.5 text-sm" aria-live="polite">
          <span className="font-bold text-white/70">1人あたり</span>
          {preview ? (
            <span className="font-black text-accent">
              <span className="text-lg tabular-nums">{yen(preview.each)}</span>
              <span className="ml-1.5 text-xs font-bold text-white/60">× {preview.payers}人</span>
            </span>
          ) : (
            <span className="text-xs text-muted">合計と名前を入れると出ます</span>
          )}
        </p>
      </Step>

      {/* 3. 集める人。1人ずつの行にして、立て替えた人に王冠を付ける */}
      <Step n={3} title="集める人" note={`${named.length}人`}>
        <ul className="flex flex-col gap-1.5">
          {rows.map((r, i) => {
            const isOrg = named.length >= 2 && (organizerId === null ? named[0]?.id === r.id : organizerId === r.id);
            return (
              <li key={r.id} className="flex items-center gap-2">
                <span
                  aria-hidden
                  className={`grid size-9 shrink-0 place-items-center rounded-full text-sm font-black ${r.name.trim() ? "bg-accent/20 text-accent" : "bg-white/8 text-white/30"}`}
                >
                  {r.name.trim() ? [...r.name.trim()][0] : i + 1}
                </span>
                <input
                  ref={(el) => {
                    if (el && focusId.current === r.id) {
                      focusId.current = null;
                      el.focus();
                    }
                  }}
                  value={r.name}
                  onChange={(e) => update(r.id, e.target.value)}
                  onPaste={(e) => {
                    if (paste(r.id, e.clipboardData.getData("text"))) e.preventDefault();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                      e.preventDefault();
                      add();
                    }
                  }}
                  placeholder={i === 0 ? "例: あなた" : `${i + 1}人目の名前`}
                  aria-label={`${i + 1}人目の名前`}
                  className="min-h-11 min-w-0 flex-1 rounded-xl bg-surface-2 px-3 text-base font-bold text-white outline-none transition placeholder:font-normal placeholder:text-white/25 focus:ring-2 focus:ring-accent/60"
                />
                {r.name.trim() && named.length >= 2 && (
                  <button
                    type="button"
                    aria-pressed={isOrg}
                    aria-label={isOrg ? `${r.name}は立て替えた人` : `${r.name}を立て替えた人にする`}
                    onClick={() => setOrganizerId(r.id)}
                    className={`grid size-11 shrink-0 place-items-center rounded-xl transition active:scale-90 ${isOrg ? "bg-accent text-accent-text" : "bg-white/8 text-white/35 hover:text-white/70"}`}
                  >
                    <Crown className="size-5" aria-hidden />
                  </button>
                )}
                <button
                  type="button"
                  aria-label={`${i + 1}人目を消す`}
                  onClick={() => remove(r.id)}
                  className="grid size-11 shrink-0 place-items-center rounded-xl text-white/35 transition hover:text-white/80 active:scale-90"
                >
                  <X className="size-4" aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
        <button
          type="button"
          onClick={add}
          disabled={rows.length >= MAX_PEOPLE}
          className="mt-2 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/20 text-sm font-bold text-white/70 transition hover:border-white/40 hover:text-white active:scale-[0.99] disabled:opacity-40"
        >
          <Plus className="size-4" aria-hidden />
          人を足す
        </button>
        <p className="mt-2.5 flex items-center gap-1.5 text-xs text-muted">
          <Crown className="size-3.5 shrink-0 text-accent" aria-hidden />
          王冠は立て替えた人(払う人に数えません)。名前をまとめて貼ると、1人ずつに分かれます。
        </p>
      </Step>

      {error && (
        <p role="alert" className="text-sm font-bold text-danger">
          {error}
        </p>
      )}

      {/* 下に固定。入れ終わったら、ここから集金のページを作る */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-bg/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
        <div className="mx-auto max-w-xl">
          {hint && <p className="mb-2 text-center text-xs font-bold text-muted">{hint}</p>}
          <button type="button" onClick={submit} disabled={!ready || pending} className={`${BUTTON_PRIMARY} w-full gap-2`}>
            {pending ? "作っています…" : "集金のページを作る"}
            <ArrowRight className="size-4" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
