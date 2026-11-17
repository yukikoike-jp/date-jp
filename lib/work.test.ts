import { describe, expect, it } from "vitest";
import { CHECKLIST, OCCASIONS, SPEECHES, TOPICS, TOPIC_KINDS, drawIndex } from "./work";

describe("話題", () => {
  it("どのカテゴリにも十分な数があり、同じ話題や空の話題はない", () => {
    for (const { key } of TOPIC_KINDS) {
      expect(TOPICS[key].length).toBeGreaterThanOrEqual(10);
      expect(new Set(TOPICS[key]).size).toBe(TOPICS[key].length);
      expect(TOPICS[key].every((t) => t.trim().length > 0)).toBe(true);
    }
  });
  it("職場で聞きにくい話題(年齢・結婚・年収・政治・宗教・健康)を含まない", () => {
    const ng = /年齢|何歳|結婚|恋人|彼氏|彼女|年収|給料|政治|宗教|病気|体重|独身/;
    for (const { key } of TOPIC_KINDS) for (const t of TOPICS[key]) expect(t).not.toMatch(ng);
  });
});

describe("drawIndex", () => {
  it("すでに出たものは、全部出るまで出さない。全部出たらはじめから", () => {
    const used = new Set<number>();
    for (let i = 0; i < 5; i++) {
      const r = drawIndex(5, used);
      expect(used.has(r.index)).toBe(false);
      used.add(r.index);
    }
    expect(drawIndex(5, used).reset).toBe(true);
  });
});

describe("あいさつ", () => {
  it("どの場面にも、乾杯と〆の例がある", () => {
    for (const { key } of OCCASIONS) {
      expect(SPEECHES[key].toast.length).toBeGreaterThanOrEqual(2);
      expect(SPEECHES[key].closing.length).toBeGreaterThanOrEqual(2);
    }
  });
});

describe("幹事の持ちもの", () => {
  it("同じ項目がない", () => {
    expect(new Set(CHECKLIST).size).toBe(CHECKLIST.length);
  });
});
