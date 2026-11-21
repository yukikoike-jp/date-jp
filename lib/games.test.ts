import { describe, expect, it } from "vitest";
import { SYNC_THEMES, WORD_PAIRS, wordWolf } from "./games";

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

describe("SYNC_THEMES", () => {
  it("お題に同じものはない", () => {
    expect(new Set(SYNC_THEMES).size).toBe(SYNC_THEMES.length);
  });
});
