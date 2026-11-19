"use client";

import { Crown, ExternalLink, NotebookPen, Plus, RotateCcw, Users, Wallet, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { partyAttendees, partyStatuses, startCollection } from "@/app/actions";
import { isFormal, loadAudience, type Audience } from "@/lib/audience";
import { rememberCollection } from "@/lib/myCollections";
import { loadMyParties, type MyParty } from "@/lib/myParties";
import { dateLabel, yen } from "@/lib/sendai";
import { SendButtons, useCanShare } from "./SendButtons";
import { ROUND_UNITS, WEIGHTS, splitBill, subsidyTotal, tenthsFromInput, type Weight } from "@/lib/split";
import { useFunAccess } from "./ProGate";
import { BUTTON_SUB } from "./ui";

// 会計。最初は全員同じ額の割り勘で、「傾斜で割る」に切り替えると区分や倍率を選べる(学生やプライベートでは傾斜はあまり使わないため)。
// 傾斜では hasuru と同じく、区分ごとに色・記号・頭文字の丸で人を見分ける(色だけに頼らない)

/** weight は区分の key。自分で倍率を書いたときは "custom" にして、書いた文字を custom に持つ */
type Person = { id: number; name: string; weight: string; custom: string };

/** 幹事の画面から「この会の会計」で来たとき、行く人の名前とお酒を飲まないかを受け取る(URL には載せない) */
export const SPLIT_NAMES_KEY = "nomi:split-names";

/** 集金が終わるまで続きから使えるよう、最後の会計をこの端末に残す(サーバーには送らない) */
const SAVE_KEY = "nomi:split";
/** collection は作った集金のページ(幹事の鍵つき)。作ったあとに金額を変えたら作り直す */
type Saved = {
  title: string;
  total: string;
  people: Person[];
  unit: number;
  organizer: number;
  /** 傾斜で割るか。前の保存にないときは割り勘にする */
  weighted?: boolean;
  collection?: { id: string; token: string } | null;
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

function Avatar({ name, tone, size = "md" }: { name: string; tone: Weight["tone"]; size?: "sm" | "md" }) {
  const initial = [...name.trim()][0] ?? "?";
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

/** from = 会の画面から来たときの、その会の id。作った集金をその会とつなぐ */
export function SplitClient({ from = null }: { from?: string | null }) {
  const access = useFunAccess();
  // どの会の会計か。会の画面から来たか、決まった会から名前を読み込んだときに入る
  const [fromParty, setFromParty] = useState<string | null>(from);
  const [audience, setAudience] = useState<Audience>("private");
  const [title, setTitle] = useState("");
  const [total, setTotal] = useState("");
  const [people, setPeople] = useState<Person[]>([]);
  const [unit, setUnit] = useState<number>(100);
  const [organizer, setOrganizer] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [collection, setCollection] = useState<Saved["collection"]>(null);
  const [weighted, setWeighted] = useState(false);
  // 会社や部署・部費からの補助(1人あたり、または全体でいくら)。空なら補助なし
  const [subsidyKind, setSubsidyKind] = useState<"per" | "lump">("per");
  const [subsidyYen, setSubsidyYen] = useState("");
  const [collectError, setCollectError] = useState<string | null>(null);
  const [collecting, startCollecting] = useTransition();
  const router = useRouter();
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
      setCollection(null);
      setFromParty(p.id);
    });
  }

  useEffect(() => {
    const a = loadAudience() ?? "private";
    // 前の形(名前だけの文字列)でも受け取れるようにする
    let names: (string | { name: string; soft?: boolean })[] = [];
    try {
      names = JSON.parse(sessionStorage.getItem(SPLIT_NAMES_KEY) ?? "[]");
      // 受け取ったら消す。開発中は準備が2回走るので、すぐには消さず、2回とも同じ名前を読めるようにする
      setTimeout(() => {
        try {
          sessionStorage.removeItem(SPLIT_NAMES_KEY);
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
      setCollection(saved.collection ?? null);
      setWeighted(saved.weighted ?? false);
      setSubsidyKind(saved.subsidyKind ?? "per");
      setSubsidyYen(saved.subsidyYen ?? "");
      setUnit(saved.unit ?? 100);
      setOrganizer(saved.organizer ?? 0);
    } else {
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
      localStorage.setItem(SAVE_KEY, JSON.stringify({ title, total, people, unit, organizer, weighted, collection, subsidyKind, subsidyYen } satisfies Saved));
    } catch {}
  }, [loaded, title, total, people, unit, organizer, weighted, collection, subsidyKind, subsidyYen]);

  function startOver() {
    if (!window.confirm("いまの会計を消して、新しい会計を始めますか?")) return;
    setTitle("");
    setTotal("");
    setPeople(startPeople());
    setUnit(100);
    setOrganizer(0);
    setWeighted(true);
    setSubsidyYen("");
    setCollection(null);
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

  /** 集金のページを作る。金額はサーバーで計算し直し、幹事の画面へ移る */
  function makeCollection() {
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
      setCollection({ id: r.id, token: r.adminToken });
      // 「これまでの会」で、その会にいくらかかったかを出せるようにする
      rememberCollection({ id: r.id, token: r.adminToken, title, total: totalYen, createdAt: Date.now(), ...(fromParty ? { partyId: fromParty } : {}) });
      router.push(`/c/${r.id}?token=${r.adminToken}`);
    });
  }

  return (
    <>
      {/* 決まった会があれば、行く人の名前とお酒を飲まない人をそのまま読み込める */}
      {decidedParties.length > 0 && (
        <section className="mx-4 mb-2">
          <p className="mb-1 px-1 text-[10px] font-black tracking-[0.15em] text-stone-400">決まった会から名前を読み込む</p>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {decidedParties.map(({ party: p, date }) => (
              <button
                key={p.id}
                type="button"
                disabled={importing}
                onClick={() => importParty(p)}
                className="flex min-h-9 shrink-0 items-center gap-1.5 rounded-full bg-surface px-3 text-left ring-1 ring-white/12 transition hover:bg-stone-800 active:scale-95 disabled:opacity-50"
              >
                <Users className="size-3.5 shrink-0 text-accent" aria-hidden />
                <span className="max-w-[8rem] truncate text-xs font-black">{p.title}</span>
                <span className="text-[10px] text-white/40">{dateLabel(date)}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* 何の会計か(催促の文にも入る)と合計を、1つの枠にまとめる */}
      <div className="mx-4 rounded-3xl border panel px-4 py-3">
        <label className="flex items-center gap-2">
          <NotebookPen className="size-4 shrink-0 text-accent" aria-hidden />
          <input
            className="min-h-9 w-full min-w-0 bg-transparent text-sm font-bold outline-none placeholder:font-normal placeholder:text-muted"
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, 30))}
            placeholder="何の会計?(例: ゼミの打ち上げ 10/30)"
            aria-label="何の会計かのメモ"
          />
        </label>
        <label className="mt-1 flex items-baseline gap-2 border-t border-border pt-2">
          <span className="shrink-0 text-xs font-bold text-muted">合計</span>
          <span className="text-xl font-black text-muted">¥</span>
          <input
            className="w-full min-w-0 bg-transparent text-3xl font-black tracking-tight tabular-nums outline-none placeholder:text-border"
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
        <div className="mx-4 mt-2 flex items-center gap-2 rounded-2xl border panel px-4 py-2">
          <span className="shrink-0 text-xs font-bold text-muted">会社の補助</span>
          <div className="grid shrink-0 grid-cols-2 gap-0.5 rounded-lg bg-surface-2 p-0.5" role="group" aria-label="補助の出し方">
            {(["per", "lump"] as const).map((k) => (
              <button
                key={k}
                type="button"
                aria-pressed={subsidyKind === k}
                onClick={() => setSubsidyKind(k)}
                className={`min-h-8 rounded-md px-2 text-[11px] font-bold ${subsidyKind === k ? "bg-surface text-text shadow" : "text-muted"}`}
              >
                {k === "per" ? "1人" : "全体"}
              </button>
            ))}
          </div>
          <span className="ml-auto flex min-w-0 items-baseline gap-0.5">
            <input
              className="w-20 min-w-0 bg-transparent text-right text-base font-black tabular-nums outline-none"
              inputMode="numeric"
              value={Number(subsidyYen || 0).toLocaleString("ja-JP")}
              onChange={(e) => setSubsidyYen(e.target.value.replace(/[^\d]/g, "").replace(/^0+/, "").slice(0, 7))}
              onFocus={(e) => e.target.select()}
              aria-label={subsidyKind === "per" ? "1人あたりの補助(円)" : "全体の補助(円)"}
            />
            <span className="text-xs font-bold text-muted">円</span>
          </span>
        </div>
      )}
      {subsidy > 0 && (
        <p className="mx-4 mt-1 px-1 text-xs font-bold text-accent">
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
              className={`min-h-10 rounded-lg text-sm font-bold transition-colors ${weighted === v ? "bg-surface text-text shadow" : "text-muted hover:text-text"}`}
            >
              {v ? "傾斜" : "割り勘"}
            </button>
          ))}
        </div>
        <select
          value={unit}
          onChange={(e) => setUnit(Number(e.target.value) as typeof unit)}
          aria-label="何円単位にそろえるか"
          className="min-h-10 shrink-0 rounded-xl bg-surface-2 px-2 text-sm font-bold outline-none"
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
            <li key={p.id} className={`tier-${w.tone} px-2 py-1.5`}>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setOrganizer(i)}
                  aria-pressed={organizer === i}
                  aria-label={`${nameOf(p, i)}を幹事にする(端数を受け持つ)`}
                  className="relative grid size-9 shrink-0 place-items-center"
                >
                  <Avatar name={nameOf(p, i)} tone={w.tone} size="sm" />
                  {organizer === i && (
                    <span className="absolute -top-0.5 -right-0.5 grid size-4 place-items-center rounded-full bg-accent text-accent-text" aria-hidden>
                      <Crown className="size-2.5" />
                    </span>
                  )}
                </button>
                <input
                  className="min-h-9 w-full min-w-0 rounded-lg bg-surface-2 px-2 text-sm font-bold outline-none placeholder:font-normal placeholder:text-muted focus:ring-1 focus:ring-[var(--tb)]"
                  value={p.name}
                  onChange={(e) => update(p.id, { name: e.target.value.slice(0, 20) })}
                  placeholder={`${i + 1}人目`}
                  aria-label={`${i + 1}人目の名前`}
                />
                {weighted && (
                  <select
                    value={p.weight}
                    onChange={(e) => update(p.id, { weight: e.target.value as typeof p.weight })}
                    aria-label={`${nameOf(p, i)}の区分`}
                    className="min-h-9 w-[6.4rem] shrink-0 rounded-lg bg-[var(--ts)] px-1 text-xs font-bold text-[var(--tc)] outline-none"
                  >
                    {weights.map((opt) => (
                      <option key={opt.key} value={opt.key}>
                        {opt.label} ×{(opt.tenths / 10).toFixed(1)}
                      </option>
                    ))}
                    <option value="custom">倍率を入力</option>
                  </select>
                )}
                <span className="w-[4.2rem] shrink-0 text-right text-sm font-black tabular-nums">{result ? yen(result.amounts[i]) : "—"}</span>
                {people.length > 1 && (
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    aria-label={`${nameOf(p, i)}を外す`}
                    className="grid size-8 shrink-0 place-items-center rounded-full text-muted hover:text-text"
                  >
                    <X className="size-4" aria-hidden />
                  </button>
                )}
              </div>
              {weighted && customOn && (
                <label className="mt-1 ml-10 flex items-center gap-1.5">
                  <span className="text-sm font-black text-[var(--tc)]" aria-hidden>
                    ×
                  </span>
                  <input
                    className="min-h-8 w-16 rounded-lg bg-surface-2 px-2 text-sm font-black tabular-nums outline-none placeholder:font-normal placeholder:text-muted focus:ring-1 focus:ring-[var(--tb)]"
                    inputMode="decimal"
                    value={p.custom}
                    onChange={(e) => update(p.id, { custom: e.target.value.slice(0, 4) })}
                    placeholder="1.2"
                    aria-label={`${nameOf(p, i)}の倍率`}
                    autoFocus
                  />
                  <span className={`text-[11px] ${customBad ? "font-bold text-danger" : "text-muted"}`}>{customBad ? "0.1〜5.0 の数で" : "ふつうが1.0"}</span>
                </label>
              )}
            </li>
          );
        })}
        <li>
          <button
            type="button"
            onClick={() => setPeople((ps) => [...ps, person("normal")])}
            disabled={people.length >= 30}
            className="flex min-h-10 w-full items-center justify-center gap-1.5 text-sm font-bold text-muted hover:text-text disabled:opacity-40"
          >
            <Plus className="size-4" aria-hidden />
            人を足す
          </button>
        </li>
      </ul>
      <p className="mx-4 mt-1 px-1 text-[11px] text-muted">顔のマークを押した人が幹事(端数を受け持ちます)</p>

      {/* 合計と送る。金額は上の一覧に出ているので、ここは合計と送るボタンだけ */}
      {result ? (
        <section className="mx-4 mt-3 rounded-3xl border border-accent/40 bg-surface px-4 py-3">
          <p className="flex items-baseline justify-between">
            <span className="text-sm font-bold">合計</span>
            <span className="text-lg font-black tabular-nums">{yen(totalYen)}</span>
          </p>
          {result.surplus > 0 && (
            <p className="text-xs text-muted">
              全員 {yen(result.amounts[0])} で同じ額。{yen(result.surplus)} のお釣りが出ます(幹事が預かる)
            </p>
          )}
          {result.organizerDiff !== 0 && (
            <p className="text-xs text-muted">
              端数の{yen(Math.abs(result.organizerDiff))}ぶん幹事が{result.organizerDiff > 0 ? "多め" : "少なめ"}です
            </p>
          )}
          <SendButtons mainLabel="共有して金額を送る" share={{ text: shareText }} copy={shareText} copyLabel="金額をコピー" canShare={canShare} subtleCopy />
        </section>
      ) : (
        <p className="mx-4 mt-3 px-1 text-sm text-muted">合計を入れると一人ずつの金額が出ます。</p>
      )}

      {/* 集金。金額が出たあとだけ、1つのボタンで出す。作った集金の一覧は小さなリンクで */}
      {result && (
        <section id="collect" className="mx-4 mt-3 scroll-mt-20">
          {collectError && (
            <p role="alert" className="mb-2 text-sm font-bold text-danger">
              {collectError}
            </p>
          )}
          {collection ? (
            <div className="grid grid-cols-2 gap-2">
              <Link href={`/c/${collection.id}?token=${collection.token}`} className={`${BUTTON_SUB} gap-1.5 text-sm`}>
                <ExternalLink className="size-4" aria-hidden />
                集金のページ
              </Link>
              <button type="button" onClick={makeCollection} disabled={collecting} className={`${BUTTON_SUB} text-sm`}>
                {collecting ? "作っています…" : "作り直す"}
              </button>
            </div>
          ) : !access.loading && !access.unlocked ? (
            // 集金のページは Tsudoro+ の機能。買う前は、そのまま Tsudoro+ の案内(Support の集金チェック)へ送る
            <Link href="/fun?tab=collect" className="flex min-h-16 w-full items-center gap-3 rounded-2xl bg-accent/12 px-4 py-3 text-left ring-2 ring-accent transition-colors hover:bg-accent/20">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent text-accent-text">
                <Wallet className="size-5" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block text-base font-black">集金のページを開く</span>
                <span className="block text-xs text-muted">Tsudoro+ で使えます</span>
              </span>
            </Link>
          ) : (
            <button
              type="button"
              onClick={makeCollection}
              disabled={collecting}
              className="flex min-h-16 w-full items-center gap-3 rounded-2xl bg-accent/12 px-4 py-3 text-left ring-2 ring-accent transition-colors hover:bg-accent/20 disabled:opacity-60"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent text-accent-text">
                <Wallet className="size-5" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block text-base font-black">{collecting ? "作っています…" : "集金のページを作る"}</span>
                <span className="block text-xs text-muted">まだの人にだけ催促できます</span>
              </span>
            </button>
          )}
        </section>
      )}

      <div className="mx-4 mt-2 flex items-center justify-center gap-4">
        <Link href="/fun?tab=collect" className="inline-flex min-h-11 items-center px-2 text-xs font-bold text-muted underline underline-offset-2 hover:text-text">
          集金チェック
        </Link>
        <button type="button" onClick={startOver} className="inline-flex min-h-11 items-center gap-1.5 px-2 text-xs font-bold text-muted underline underline-offset-2 hover:text-text">
          <RotateCcw className="size-3.5" aria-hidden />
          新しい会計を始める
        </button>
      </div>
    </>
  );
}
