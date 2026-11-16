import { describe, expect, it } from "vitest";
import { weekStart, weeklyCounts } from "./weekly";

// 2026-11-18(水) 12:00 日本時間
const NOW = Date.UTC(2026, 10, 18, 3, 0);

describe("weekStart", () => {
  it("日本時間の月曜 0時を返す", () => {
    expect(new Date(weekStart(NOW)).toISOString()).toBe("2026-11-15T15:00:00.000Z"); // 11/16(月) 0時 JST
  });
});

describe("weeklyCounts", () => {
  it("週ごとに数える。古い週が先、範囲の外は数えない", () => {
    const mon = weekStart(NOW);
    const r = weeklyCounts([mon, mon + 1000, mon - 1, mon - 30 * 86_400_000], NOW, 2);
    expect(r.map((x) => x.count)).toEqual([1, 2]);
  });
});
