"use client";

import { Crown, NotebookPen, Plus, RotateCcw, Users, X } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { partyAttendees, partyStatuses, startCollection } from "@/app/actions";
import { useRouter } from "next/navigation";
import { Wallet } from "lucide-react";
import { rememberCollection } from "@/lib/myCollections";
import { isFormal, loadAudience, type Audience } from "@/lib/audience";
import { loadMyParties, type MyParty } from "@/lib/myParties";
import { dateLabel, yen } from "@/lib/sendai";
import { SendButtons, useCanShare } from "./SendButtons";
import { ROUND_UNITS, WEIGHTS, splitBill, subsidyTotal, tenthsFromInput, type Weight } from "@/lib/split";

// 会計。最初は全員同じ額の割り勘で、「傾斜で割る」に切り替えると区分や倍率を選べる(学生やプライベートでは傾斜はあまり使わないため)。
// 傾斜では hasuru と同じく、区分ごとに色・記号・頭文字の丸で人を見分ける(色だけに頼らない)

/** weight は区分の key。自分で倍率を書いたときは "custom" にして、書いた文字を custom に持つ */
type Person = { id: number; name: string; weight: string; custom: string };

/** 幹事の画面から「この会の会計」で来たとき、行く人の名前とお酒を飲まないかを受け取る(URL には載せない) */
export const SPLIT_NAMES_KEY = "nomi:split-names";
export const SPLIT_TITLE_KEY = "nomi:split-title";

/** 続きから使えるよう、最後の会計をこの端末に残す(サーバーには送らない) */
const SAVE_KEY = "nomi:split";
type Saved = {
  title: string;
  total: string;
  people: Person[];
  unit: number;
  organizer: number;
  /** 傾斜で割るか。前の保存にないときは割り勘にする */
  weighted?: boolean;
  /** 会社や部署からの補助。前の保存にはない */
  subsidyKind?: "per" | "lump";
  subsidyYen?: string;
};

function loadSaved(): Saved | null {
  try {
    const v = JSON.parse(localStorage.getItem(SAVE_KEY) ?? "null") as Saved | null;
    return v && Array.isArray(v.people) && v.people.length > 0 ? v : null;
  } catch {
    return null;
  }
}

let nextId = 1;
const person = (weight: string, name = ""): Person => ({ id: nextId++, name, weight, custom: "" });
const startPeople = () => [person("normal", "幹事"), person("normal"), person("normal"), person("normal")];

function Avatar({ name, tone, size = "md", no }: { name: string; tone: Weight["tone"]; size?: "sm" | "md"; no?: number }) {
  // 名前を入れていないときは、何人目かの番号を出す(「10人目」の頭の文字が「1」になるのを防ぐ。2026-11-22)
  const initial = no !== undefined ? String(no) : ([...name.trim()][0] ?? "?");
  return (
    <span
      aria-hidden
      className={`tier-${tone} grid shrink-0 place-items-center rounded-full bg-[var(--ts)] font-black text-[var(--tc)] ring-1 ring-[var(--tb)]/40 ${
        size === "md" ? "size-11 text-base" : "size-8 text-xs"
      }`}
    >
      {initial}
    </span>
  );
}


export function SplitClient() {
  const [audience, setAudience] = useState<Audience>("private");
  const [title, setTitle] = useState("");
  const [total, setTotal] = useState("");
  const [people, setPeople] = useState<Person[]>([]);
  const [unit, setUnit] = useState<number>(100);
  const [organizer, setOrganizer] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [weighted, setWeighted] = useState(false);
  // 会社や部署・部費からの補助(1人あたり、または全体でいくら)。空なら補助なし
  const [subsidyKind, setSubsidyKind] = useState<"per" | "lump">("per");
  const [subsidyYen, setSubsidyYen] = useState("");
  const canShare = useCanShare();
  // この端末で作った、決まった会。押すと行く人の名前をそのまま読み込む
  const [decidedParties, setDecidedParties] = useState<{ party: MyParty; date: string }[]>([]);
  const [importing, startImporting] = useTransition();

  useEffect(() => {
    const mine = loadMyParties();
    if (mine.length === 0) return;
    partyStatuses(mine.map((p) => p.id))
      .then((st) =>
        setDecidedParties(
          mine
            .filter((p) => st[p.id]?.decision)
            .map((p) => ({ party: p, date: st[p.id].decision!.date }))
            .sort((a, b) => b.date.localeCompare(a.date))
            .slice(0, 5),
        ),
      )
      .catch(() => {});
  }, []);

  function importParty(p: MyParty) {
    if (people.some((x) => x.name.trim()) && !window.confirm(`いまの名前を消して、「${p.title}」の行く人を読み込みますか?`)) return;
    startImporting(async () => {
      const r = await partyAttendees(p.id, p.token);
      if (!r || r.attendees.length === 0) {
        window.alert("この会の行く人を読み込めませんでした");
        return;
      }
      setTitle(`${r.title} ${dateLabel(r.date).split("(")[0]}`.slice(0, 30));
      setPeople(r.attendees.slice(0, 30).map((a) => person(a.soft ? "soft" : "normal", a.name.slice(0, 20))));
      setOrganizer(0);
    });
  }

  useEffect(() => {
    const a = loadAudience() ?? "private";
    // 前の形(名前だけの文字列)でも受け取れるようにする
    let names: (string | { name: string; soft?: boolean })[] = [];
    let handedTitle = "";
    try {
      names = JSON.parse(sessionStorage.getItem(SPLIT_NAMES_KEY) ?? "[]");
      handedTitle = sessionStorage.getItem(SPLIT_TITLE_KEY) ?? "";
      // 受け取ったら消す。開発中は準備が2回走るので、すぐには消さず、2回とも同じ名前を読めるようにする
      setTimeout(() => {
        try {
          sessionStorage.removeItem(SPLIT_NAMES_KEY);
          sessionStorage.removeItem(SPLIT_TITLE_KEY);
        } catch {}
      }, 0);
    } catch {}
    const saved = names.length > 0 ? null : loadSaved();
    /* eslint-disable react-hooks/set-state-in-effect */
    setAudience(a);
    if (saved) {
      // 前の会計の続き。足す人の番号が重ならないようにする
      nextId = Math.max(...saved.people.map((p) => p.id)) + 1;
      setTitle(saved.title ?? "");
      setTotal(saved.total ?? "");
      setPeople(saved.people.map((p) => ({ id: p.id, name: p.name, weight: p.weight, custom: p.custom ?? "" })));
      setWeighted(saved.weighted ?? false);
      setSubsidyKind(saved.subsidyKind ?? "per");
      setSubsidyYen(saved.subsidyYen ?? "");
      setUnit(saved.unit ?? 100);
      setOrganizer(saved.organizer ?? 0);
    } else {
      if (handedTitle) setTitle(handedTitle.slice(0, 30));
      setPeople(names.length > 0 ? names.slice(0, 30).map((n) =>
              typeof n === "string"
                ? person("normal", n.slice(0, 20))
                : person(n.soft ? "soft" : "normal", String(n.name).slice(0, 20)),
            ) : startPeople());
    }
    setLoaded(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // 変えるたびにこの端末に残す(読み込みが済むまでは上書きしない)
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ title, total, people, unit, organizer, weighted, subsidyKind, subsidyYen } satisfies Saved));
    } catch {}
  }, [loaded, title, total, people, unit, organizer, weighted, subsidyKind, subsidyYen]);

  function startOver() {
    if (!window.confirm("いまの会計を消して、新しい会計を始めますか?")) return;
    setTitle("");
    setTotal("");
    setPeople(startPeople());
    setUnit(100);
    setOrganizer(0);
    setWeighted(true);
    setSubsidyYen("");
  }

  const weights = WEIGHTS[audience];
  const normal = weights.find((w) => w.key === "normal")!;
  /** 割り勘のとき。全員同じ倍率で、区分の印は出さない */
  const even: Weight = { key: "even", label: "", note: "", tenths: 10, mark: "", tone: "yellow" };
  const weightOf = (p: Person): Weight => {
    if (!weighted) return even;
    if (p.weight !== "custom") return weights.find((w) => w.key === p.weight) ?? normal;
    // 書きかけで読めないうちは「ふつう」と同じ倍率で数える
    const tenths = tenthsFromInput(p.custom) ?? normal.tenths;
    return { key: "custom", label: `×${(tenths / 10).toFixed(1)}`, note: "", tenths, mark: "✎", tone: "gray" };
  };
  const totalYen = Number(total);
  const ready = Number.isInteger(totalYen) && totalYen > 0 && people.length > 0;
  const subsidy = ready && isFormal(audience) ? subsidyTotal(subsidyYen ? { kind: subsidyKind, yen: Number(subsidyYen) } : null, totalYen, people.length) : 0;
  // 補助を引いた残りを、みんなで割る
  const result = ready
    ? splitBill({ total: totalYen - subsidy, weights: people.map((p) => weightOf(p).tenths), unit, organizer })
    : null;
  const nameOf = (p: Person, i: number) => p.name.trim() || `${i + 1}人目`;

  const router = useRouter();
  const [collecting, startCollecting] = useTransition();
  const [collectError, setCollectError] = useState<string | null>(null);
  function toCollection() {
    setCollectError(null);
    startCollecting(async () => {
      const r = await startCollection({
        title,
        audience,
        total: totalYen,
        subsidy: isFormal(audience) && subsidyYen ? { kind: subsidyKind, yen: Number(subsidyYen) } : null,
        unit,
        organizer,
        people: people.map((p, i) => {
          const w = weightOf(p);
          return { name: nameOf(p, i), tenths: w.tenths, label: w.label, mark: w.mark, tone: w.tone };
        }),
      });
      if (!r.ok) {
        setCollectError(r.error);
        return;
      }
      rememberCollection({ id: r.id, token: r.adminToken, title: title.trim(), total: totalYen, createdAt: Date.now() });
      router.push(`/c/${r.id}?token=${r.adminToken}`);
    });
  }

  function update(id: number, patch: Partial<Person>) {
    setPeople((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }
  function remove(i: number) {
    setPeople((ps) => ps.filter((_, j) => j !== i));
    setOrganizer((o) => (o === i ? 0 : o > i ? o - 1 : o));
  }

  const shareText = result
    ? [
        `${title.trim() ? `「${title.trim()}」の` : ""}お会計 ${yen(totalYen)}(${people.length}人)`,
        ...(subsidy > 0 ? [`補助 ${yen(subsidy)} を引いて、${yen(totalYen - subsidy)} をみんなで`] : []),
        ...people.map((p, i) => `${weighted ? `${weightOf(p).mark} ` : "・"}${nameOf(p, i)} ${yen(result.amounts[i])}`),
        ...(result.surplus > 0 ? [`(全員同じ額にしたので ${yen(result.surplus)} のお釣りが出ます)`] : []),
      ].join("\n")
    : "";

  return (
    <>
      {/* 決まった会があれば、行く人の名前とお酒を飲まない人をそのまま読み込める */}
      {decidedParties.length > 0 && (
        <section className="mx-4 mb-2">
          <p className="mb-1.5 px-1 text-xs font-black text-stone-400">決まった会から名前を読み込む</p>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {decidedParties.map(({ party: p, date }) => (
              <button
                key={p.id}
                type="button"
                disabled={importing}
                onClick={() => importParty(p)}
                className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-full bg-surface px-4 text-left ring-1 ring-white/12 transition hover:bg-stone-800 active:scale-95 disabled:opacity-50"
              >
                <Users className="size-3.5 shrink-0 text-accent" aria-hidden />
                <span className="max-w-[9rem] truncate text-sm font-black">{p.title}</span>
                <span className="text-xs text-white/40">{dateLabel(date)}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* 何の会計か(催促の文にも入る)と合計を、1つの枠にまとめる */}
      <div className="mx-4 rounded-3xl border panel px-4 py-4">
        <label className="flex items-center gap-2">
          <NotebookPen className="size-5 shrink-0 text-accent" aria-hidden />
          <input
            className="min-h-11 w-full min-w-0 bg-transparent text-base font-bold outline-none placeholder:font-normal placeholder:text-muted"
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, 30))}
            placeholder="何の会計? 例: ゼミの打ち上げ 10/30"
            aria-label="何の会計かのメモ"
          />
        </label>
        <label className="mt-2 flex items-baseline gap-2 border-t border-border pt-3">
          <span className="shrink-0 text-sm font-bold text-muted">合計</span>
          <span className="text-2xl font-black text-muted">¥</span>
          <input
            className="w-full min-w-0 bg-transparent text-4xl font-black tracking-tight tabular-nums outline-none placeholder:text-border"
            inputMode="numeric"
            value={total === "" ? "" : Number(total).toLocaleString("ja-JP")}
            onChange={(e) => setTotal(e.target.value.replace(/[^\d]/g, "").replace(/^0+/, "").slice(0, 7))}
            placeholder="0"
            aria-label="お会計の合計(円)"
          />
        </label>
      </div>

      {/* 会社や部署からの補助(会社の会だけ)。入れると、その分を引いた残りをみんなで割る。最初は 0円 */}
      {isFormal(audience) && (
        <div className="mx-4 mt-2 flex items-center gap-2 rounded-2xl border panel px-4 py-3">
          <span className="shrink-0 text-sm font-bold text-muted">会社の補助</span>
          <div className="grid shrink-0 grid-cols-2 gap-0.5 rounded-lg bg-surface-2 p-0.5" role="group" aria-label="補助の出し方">
            {(["per", "lump"] as const).map((k) => (
              <button
                key={k}
                type="button"
                aria-pressed={subsidyKind === k}
                onClick={() => setSubsidyKind(k)}
                className={`min-h-10 rounded-md px-3 text-sm font-bold ${subsidyKind === k ? "bg-surface text-text shadow" : "text-muted"}`}
              >
                {k === "per" ? "1人" : "全体"}
              </button>
            ))}
          </div>
          <span className="ml-auto flex min-w-0 items-baseline gap-0.5">
            <input
              className="w-24 min-w-0 bg-transparent text-right text-lg font-black tabular-nums outline-none"
              inputMode="numeric"
              value={Number(subsidyYen || 0).toLocaleString("ja-JP")}
              onChange={(e) => setSubsidyYen(e.target.value.replace(/[^\d]/g, "").replace(/^0+/, "").slice(0, 7))}
              onFocus={(e) => e.target.select()}
              aria-label={subsidyKind === "per" ? "1人あたりの補助(円)" : "全体の補助(円)"}
            />
            <span className="text-sm font-bold text-muted">円</span>
          </span>
        </div>
      )}
      {subsidy > 0 && (
        <p className="mx-4 mt-1 px-1 text-sm font-bold text-accent">
          補助 {yen(subsidy)} を引いて、{yen(totalYen - subsidy)} をみんなで割る計算
        </p>
      )}

      {/* 割り方(割り勘・傾斜)と、何円単位にそろえるか。1行にまとめる */}
      <div className="mx-4 mt-3 flex items-center gap-2">
        <div className="grid flex-1 grid-cols-2 gap-0.5 rounded-xl bg-surface-2 p-0.5" role="group" aria-label="割り方">
          {([false, true] as const).map((v) => (
            <button
              key={String(v)}
              type="button"
              aria-pressed={weighted === v}
              onClick={() => setWeighted(v)}
              className={`min-h-12 rounded-lg text-base font-bold transition-colors ${weighted === v ? "bg-surface text-text shadow" : "text-muted hover:text-text"}`}
            >
              {v ? "傾斜" : "割り勘"}
            </button>
          ))}
        </div>
        <select
          value={unit}
          onChange={(e) => setUnit(Number(e.target.value) as typeof unit)}
          aria-label="何円単位にそろえるか"
          className="min-h-12 shrink-0 rounded-xl bg-surface-2 px-3 text-base font-bold outline-none"
        >
          {ROUND_UNITS.map((u) => (
            <option key={u} value={u}>
              {u}円単位
            </option>
          ))}
        </select>
      </div>

      {/* 払う人。1人1行に、名前・区分・金額を並べる。顔のマークを押すと幹事(端数を受け持つ人) */}
      <ul className="mx-4 mt-2 divide-y divide-border overflow-hidden rounded-2xl border bg-surface" aria-live="polite">
        {people.map((p, i) => {
          const w = weightOf(p);
          const customOn = p.weight === "custom";
          const customBad = customOn && p.custom.trim() !== "" && tenthsFromInput(p.custom) === null;
          return (
            <li key={p.id} className={`tier-${w.tone} px-3 py-2.5`}>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setOrganizer(i)}
                  aria-pressed={organizer === i}
                  aria-label={`${nameOf(p, i)}を幹事にする(端数を受け持つ)`}
                  className="relative grid size-11 shrink-0 place-items-center"
                >
                  <Avatar name={nameOf(p, i)} tone={w.tone} no={p.name.trim() ? undefined : i + 1} />
                  {organizer === i && (
                    <span className="absolute -top-1 -right-1 grid size-5 place-items-center rounded-full bg-accent text-accent-text" aria-hidden>
                      <Crown className="size-3" />
                    </span>
                  )}
                </button>
                <input
                  className="min-h-11 w-full min-w-0 rounded-lg bg-surface-2 px-3 text-base font-bold outline-none placeholder:font-normal placeholder:text-muted focus:ring-1 focus:ring-[var(--tb)]"
                  value={p.name}
                  onChange={(e) => update(p.id, { name: e.target.value.slice(0, 20) })}
                  placeholder={`${i + 1}人目`}
                  aria-label={`${i + 1}人目の名前`}
                />
                <span className="w-[5.2rem] shrink-0 text-right text-base font-black tabular-nums">{result ? yen(result.amounts[i]) : "—"}</span>
                {people.length > 1 && (
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    aria-label={`${nameOf(p, i)}を外す`}
                    className="grid size-10 shrink-0 place-items-center rounded-full text-muted hover:text-text"
                  >
                    <X className="size-5" aria-hidden />
                  </button>
                )}
              </div>
              {/* 傾斜の区分は名前の下の段に(名前の欄をせまくしない。2026-11-21) */}
              <div className={weighted ? "mt-2 ml-13 flex flex-wrap items-center gap-2" : "hidden"}>
                {weighted && (
                  <select
                    value={p.weight}
                    onChange={(e) => update(p.id, { weight: e.target.value as typeof p.weight })}
                    aria-label={`${nameOf(p, i)}の区分`}
                    className="min-h-10 w-[8rem] shrink-0 rounded-lg bg-[var(--ts)] px-1 text-sm font-bold text-[var(--tc)] outline-none"
                  >
                    {weights.map((opt) => (
                      <option key={opt.key} value={opt.key}>
                        {opt.label} ×{(opt.tenths / 10).toFixed(1)}
                      </option>
                    ))}
                    <option value="custom">倍率を入力</option>
                  </select>
                )}
                {weighted && customOn && (
                  <label className="flex items-center gap-1.5">
                    <span className="text-sm font-black text-[var(--tc)]" aria-hidden>
                      ×
                    </span>
                    <input
                      className="min-h-10 w-20 rounded-lg bg-surface-2 px-2 text-base font-black tabular-nums outline-none placeholder:font-normal placeholder:text-muted focus:ring-1 focus:ring-[var(--tb)]"
                      inputMode="decimal"
                      value={p.custom}
                      onChange={(e) => update(p.id, { custom: e.target.value.slice(0, 4) })}
                      placeholder="1.2"
                      aria-label={`${nameOf(p, i)}の倍率`}
                      autoFocus
                    />
                    <span className={`text-xs ${customBad ? "font-bold text-danger" : "text-muted"}`}>{customBad ? "0.1〜5.0 の数で" : "ふつうが1.0"}</span>
                  </label>
                )}
              </div>
            </li>
          );
        })}
        <li>
          <button
            type="button"
            onClick={() => setPeople((ps) => [...ps, person("normal")])}
            disabled={people.length >= 30}
            className="flex min-h-12 w-full items-center justify-center gap-1.5 text-base font-bold text-muted hover:text-text disabled:opacity-40"
          >
            <Plus className="size-5" aria-hidden />
            人を足す
          </button>
        </li>
      </ul>
      <p className="mx-4 mt-1.5 px-1 text-xs text-muted">顔のマークを押した人が幹事。端数を受け持ちます。</p>

      {/* 合計と送る。金額は上の一覧に出ているので、ここは合計と送るボタンだけ */}
      {result ? (
        <section className="mx-4 mt-3 rounded-3xl border border-accent/40 bg-surface px-4 py-4">
          <p className="flex items-baseline justify-between">
            <span className="text-base font-bold">合計</span>
            <span className="text-2xl font-black tabular-nums">{yen(totalYen)}</span>
          </p>
          {result.surplus > 0 && (
            <p className="mt-1 text-sm text-muted">
              全員 {yen(result.amounts[0])} で同じ額。{yen(result.surplus)} のお釣りが出ます(幹事が預かる)
            </p>
          )}
          {result.organizerDiff !== 0 && (
            <p className="mt-1 text-sm text-muted">
              端数の{yen(Math.abs(result.organizerDiff))}ぶん幹事が{result.organizerDiff > 0 ? "多め" : "少なめ"}です
            </p>
          )}
          <SendButtons mainLabel="共有して金額を送る" share={{ text: shareText }} copy={shareText} copyLabel="金額をコピー" canShare={canShare} subtleCopy />
          {/* 送ったあとの回収は集金のページで(払った人が自分で押し、幹事が確かめる) */}
          {people.length >= 2 && (
            <button
              type="button"
              onClick={toCollection}
              disabled={collecting}
              className="mt-3 flex w-full items-center gap-3 rounded-2xl border border-accent/60 bg-accent/10 px-4 py-3 text-left transition-colors hover:bg-accent/15 active:scale-[0.99] disabled:opacity-60"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-accent-text">
                <Wallet className="size-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-black">{collecting ? "集金のページを作っています…" : "この金額で集金を始める"}</span>
                <span className="mt-0.5 block text-xs text-muted">誰が払ってないか一目でわかります。お店を出る前にその場で集められます。</span>
              </span>
            </button>
          )}
          {collectError && <p role="alert" className="mt-2 text-sm font-bold text-danger">{collectError}</p>}
        </section>
      ) : (
        <p className="mx-4 mt-3 px-1 text-sm text-muted">合計を入れると一人ずつの金額が出ます。</p>
      )}

      <div className="mx-4 mt-2 flex items-center justify-center gap-4">
        <button type="button" onClick={startOver} className="inline-flex min-h-11 items-center gap-1.5 px-2 text-xs font-bold text-muted underline underline-offset-2 hover:text-text">
          <RotateCcw className="size-3.5" aria-hidden />
          新しい会計を始める
        </button>
      </div>
    </>
  );
}
