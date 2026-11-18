"use client";

import { Check, Search, TrainFront } from "lucide-react";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { searchStations } from "@/app/actions";
import type { Station } from "@/lib/stations";
import { SkeletonBlock } from "./Skeleton";
import { INPUT, PILL, PILL_OFF, PILL_ON } from "./ui";

// 行きやすい駅を1つ選ぶ。駅名を打つと、少し待ってから候補が出る(入力補完)。出てきた駅から選ぶ(全国)。
// 選ばなければ「どこでもいい」(場所はほかの人の駅で決まる)

/** anyLabel = 「選ばない」の選択肢の名前。null なら出さない(お店を探すでは駅が要る) */
export function StationPicker({
  value,
  onChange,
  anyLabel = "どこでもいい",
}: {
  value: Station | null;
  onChange: (s: Station | null) => void;
  anyLabel?: string | null;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Station[] | null>(null);
  const [pending, start] = useTransition();
  // 打つたびに探さず、手が止まってから探す。古い結果が新しい結果を上書きしないよう、最後に打った言葉の結果だけを使う
  const latest = useRef("");
  const listId = useId();

  function find(q = query.trim()) {
    if (!q) return;
    latest.current = q;
    start(async () => {
      const found = await searchStations(q);
      if (latest.current === q) setResults(found);
    });
  }

  useEffect(() => {
    const q = query.trim();
    if (!q) return;
    const t = setTimeout(() => find(q), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {anyLabel && (
          <button type="button" aria-pressed={value === null} onClick={() => onChange(null)} className={`${PILL} px-3 ${value === null ? PILL_ON : PILL_OFF}`}>
            {value === null && <Check className="size-3.5 shrink-0" aria-hidden />}
            {anyLabel}
          </button>
        )}
        {value && (
          <span className={`${PILL} px-3 ${PILL_ON}`}>
            <Check className="size-3.5 shrink-0" aria-hidden />
            {value.name}駅
            <span className="text-xs font-bold opacity-70">({value.pref})</span>
          </span>
        )}
      </div>
      <div className="flex gap-2">
        <label className="min-w-0 flex-1">
          <span className="sr-only">駅名</span>
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (!e.target.value.trim()) setResults(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                e.preventDefault();
                find();
              }
            }}
            placeholder="駅名(例: 仙台、渋谷)"
            autoComplete="off"
            role="combobox"
            aria-autocomplete="list"
            aria-controls={listId}
            aria-expanded={!!results && results.length > 0}
            enterKeyHint="search"
            className={INPUT}
          />
        </label>
        <button
          type="button"
          onClick={() => find()}
          disabled={pending || !query.trim()}
          aria-label="駅を探す"
          className="grid size-14 shrink-0 place-items-center rounded-2xl bg-white/8 ring-1 ring-white/12 transition active:scale-95 disabled:opacity-40"
        >
          <Search className="size-5" aria-hidden />
        </button>
      </div>
      {pending && (
        <div role="status" aria-label="駅を探しています" className="space-y-1.5">
          <SkeletonBlock className="h-12 w-full rounded-xl" />
          <SkeletonBlock className="h-12 w-full rounded-xl" />
        </div>
      )}
      {!pending && results !== null && results.length === 0 && (
        <p className="text-xs text-muted">見つからない駅名。「駅」を付けずに正しい名前で。</p>
      )}
      {!pending && results && results.length > 0 && (
        <ul id={listId} className="space-y-1.5" aria-label="見つかった駅">
          {results.map((s) => {
            const on = value?.name === s.name && value.pref === s.pref;
            return (
              <li key={`${s.name}-${s.pref}`}>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => {
                    onChange(s);
                    setResults(null);
                    setQuery("");
                  }}
                  className={`flex min-h-12 w-full items-center gap-3 rounded-xl px-4 text-left text-sm font-bold ring-1 transition ${
                    on ? "bg-accent text-accent-text ring-accent" : "bg-white/6 ring-white/10 hover:bg-white/10"
                  }`}
                >
                  <TrainFront className="size-4 shrink-0" aria-hidden />
                  <span className="flex-1">{s.name}駅</span>
                  <span className="text-xs opacity-70">{s.pref}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
