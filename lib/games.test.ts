import { describe, expect, it } from "vitest";
import { NG_WORDS, WORD_PAIRS, ngWords, wordWolf } from "./games";

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

describe("ngWords", () => {
  it("全員に、重ならないNGワードを配る(30人まで)", () => {
    const names = Array.from({ length: 30 }, (_, i) => `n${i}`);
    const r = ngWords(names);
    expect(r).toHaveLength(30);
    expect(new Set(r.map((d) => d.word)).size).toBe(30);
    expect(r.every((d) => NG_WORDS.includes(d.word))).toBe(true);
  });
  it("言葉の一覧に、同じ言葉はない", () => {
    expect(new Set(NG_WORDS).size).toBe(NG_WORDS.length);
  });
});
