import { describe, expect, it } from "vitest";
import { DARES, TRUTHS, WORD_PAIRS, drawCard, nextPlayer, wordWolf } from "./games";

describe("お題", () => {
  it("どのお題も、空でなく、ゆるめ・ちょい攻めの両方に十分な数がある", () => {
    for (const set of [TRUTHS, DARES]) {
      for (const level of ["soft", "spicy"] as const) {
        expect(set[level].length).toBeGreaterThanOrEqual(10);
        expect(new Set(set[level]).size).toBe(set[level].length);
        expect(set[level].every((t) => t.trim().length > 0)).toBe(true);
      }
    }
  });
});

describe("drawCard", () => {
  it("すでに出たお題は、全部出るまで出さない", () => {
    const n = TRUTHS.soft.length;
    const used = new Set<number>();
    for (let i = 0; i < n; i++) {
      const c = drawCard("truth", "soft", used);
      expect(used.has(c.index)).toBe(false);
      expect(c.reset).toBe(false);
      used.add(c.index);
    }
    // 全部出たら、はじめから
    expect(drawCard("truth", "soft", used).reset).toBe(true);
  });
});

describe("nextPlayer", () => {
  it("全員が1回ずつ当たるまで、同じ人は選ばない", () => {
    const done = new Set<number>();
    for (let i = 0; i < 6; i++) {
      const p = nextPlayer(6, done);
      expect(done.has(p.index)).toBe(false);
      done.add(p.index);
    }
    expect(nextPlayer(6, done).reset).toBe(true);
  });
});

describe("wordWolf", () => {
  const names = ["あおい", "いずみ", "うた", "えま", "おと"];
  it("ウルフは1人だけで、その人だけ違う言葉。ほかは全員同じ言葉", () => {
    for (let k = 0; k < 20; k++) {
      const r = wordWolf(names);
      expect(r.deals).toHaveLength(5);
      const wolfDeals = r.deals.filter((d) => d.word === r.wolfWord);
      expect(wolfDeals.map((d) => d.name)).toEqual([r.wolf]);
      expect(r.deals.filter((d) => d.word === r.majorityWord)).toHaveLength(4);
      expect(r.majorityWord).not.toBe(r.wolfWord);
    }
  });
  it("お題の組は、同じ言葉どうしにならない", () => {
    expect(WORD_PAIRS.every(([a, b]) => a !== b)).toBe(true);
  });
});
