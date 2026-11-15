"use client";

import { useEffect, useRef, useState } from "react";
import { dateLabel } from "@/lib/sendai";
import type { DateRank } from "@/lib/summary";

// 候補の日ごとの「行ける ○」「たぶん △」を、伸びる横棒で見せる(インフォグラフィック)。
// 棒の長さは、答えた人数に対する割合。画面に見えたときに伸び、数字も数え上がる。
// 色だけに頼らず、○△の記号と人数の文字を必ず添える。動きを減らす設定の人には、最初から最後の形で出す

function useCountUp(target: number, delayMs: number, go: boolean): number {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!go) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || target === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setN(target);
      return;
    }
    let raf = 0;
    const t0 = performance.now() + delayMs;
    const dur = 650;
    const tick = (now: number) => {
      const p = Math.min(1, Math.max(0, (now - t0) / dur));
      // ゆっくり止まる
      setN(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, delayMs, go]);
  return n;
}

function Row({ r, total, best, i, go }: { r: DateRank; total: number; best: boolean; i: number; go: boolean }) {
  const ok = useCountUp(r.ok, i * 90, go);
  const okPct = total > 0 ? (r.ok / total) * 100 : 0;
  const maybePct = total > 0 ? (r.maybe / total) * 100 : 0;
  return (
    <li className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="font-bold">
          {dateLabel(r.date)}
          {best && <span className="ml-2 text-xs font-black text-match-text">★ この日</span>}
        </span>
        <span className="shrink-0 tabular-nums">
          <span className="font-black">○ {ok}人</span>
          {r.maybe > 0 && <span className="ml-2 text-muted">△ {r.maybe}人</span>}
        </span>
      </div>
      {/* 横棒: 濃い部分が ○、薄い部分が △。並ぶ順に少しずつ遅れて伸びる */}
      <div className="flex h-2.5 overflow-hidden rounded-full bg-white/8" aria-hidden>
        <span className="bar-width h-full rounded-l-full bg-accent" style={{ width: go ? `${okPct}%` : 0, transitionDelay: `${i * 90}ms` }} />
        <span className="bar-width h-full bg-accent/35" style={{ width: go ? `${maybePct}%` : 0, transitionDelay: `${i * 90 + 120}ms` }} />
      </div>
    </li>
  );
}

export function RankBars({ ranking, total, best }: { ranking: DateRank[]; total: number; best: string | null }) {
  // 画面に見えたときに伸び始める(「くわしく見る」を開いたときなど)
  const ref = useRef<HTMLUListElement>(null);
  const [go, setGo] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((es) => {
      if (es.some((e) => e.isIntersecting)) {
        setGo(true);
        io.disconnect();
      }
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  if (ranking.length === 0) return null;
  return (
    <ul ref={ref} className="space-y-3" aria-label={`候補の日ごとの、行ける人の数(${total}人中)`}>
      {ranking.map((r, i) => (
        <Row key={r.date} r={r} total={total} best={r.date === best} i={i} go={go} />
      ))}
    </ul>
  );
}
