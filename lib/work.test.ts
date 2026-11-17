import { describe, expect, it } from "vitest";
import { CHECKLIST, OCCASIONS, SPEECHES, THANKS, THANKS_KINDS, TOPICS, TOPIC_KINDS, drawIndex, timeline } from "./work";

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

describe("timeline", () => {
  it("開会から乾杯、ご歓談、締め(終わる20分前)、お開きの順に並べる", () => {
    const t = timeline(1140, 120);
    expect(t.map((s) => s.at)).toEqual([1140, 1150, 1160, 1240, 1260]);
    expect(t[3].label).toContain("締め");
  });
  it("短い会でも、締めはご歓談より前にならない", () => {
    const t = timeline(1140, 30);
    expect(t[3].at).toBeGreaterThanOrEqual(t[2].at);
  });
});

describe("お礼・ご連絡の文", () => {
  it("どの種類にも例があり、キャンセル料の文には金額の置き場所がある", () => {
    for (const k of THANKS_KINDS) expect(THANKS[k.key].length).toBeGreaterThan(0);
    expect(THANKS.cancel.every((t) => t.includes("○○円"))).toBe(true);
  });
});
