// 使われ方の画面の、週ごとの数。純粋関数

const WEEK = 7 * 24 * 60 * 60 * 1000;

/** 日本時間で、now を含む週の月曜 0時(ミリ秒) */
export function weekStart(now: number): number {
  const jst = now + 9 * 60 * 60 * 1000;
  const day = new Date(jst).getUTCDay(); // 0 = 日曜
  const monday = Math.floor(jst / 86_400_000) * 86_400_000 - ((day + 6) % 7) * 86_400_000;
  return monday - 9 * 60 * 60 * 1000;
}

/** 直近 weeks 週の、週ごとの件数(古い週が先)。start = その週の月曜 0時 */
export function weeklyCounts(times: number[], now: number, weeks: number): { start: number; count: number }[] {
  const first = weekStart(now) - (weeks - 1) * WEEK;
  const out = Array.from({ length: weeks }, (_, i) => ({ start: first + i * WEEK, count: 0 }));
  for (const t of times) {
    const i = Math.floor((t - first) / WEEK);
    if (i >= 0 && i < weeks) out[i].count += 1;
  }
  return out;
}

/** グラフの起点(いちばん古い週の月曜) */
export function timelineSince(now: number, weeks: number): Date {
  return new Date(weekStart(now) - (weeks - 1) * WEEK);
}
