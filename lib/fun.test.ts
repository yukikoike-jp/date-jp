import { describe, expect, it } from "vitest";
import { DEMO_NAMES, LIE_THEMES, maxTables, parseNames, pickIndex, seatPlan, seatTables, shuffle } from "./fun";

// 乱数を固定する(0.1, 0.2, ... を順に返す)
function seq(...v: number[]) {
  let i = 0;
  return () => v[i++ % v.length];
}

describe("parseNames", () => {
  it("改行・カンマ・読点で区切り、同じ名前は1つにする", () => {
    expect(parseNames("あおい\nいずみ, うた、あおい\n\n  えま  ")).toEqual(["あおい", "いずみ", "うた", "えま"]);
  });
  it("20文字・30人までにする", () => {
    expect(parseNames("あ".repeat(30))[0]).toHaveLength(20);
    expect(parseNames(Array.from({ length: 40 }, (_, i) => `n${i}`).join("\n"))).toHaveLength(30);
  });
});

describe("shuffle", () => {
  it("人はそのままで、順番だけ変わる。元の配列は変えない", () => {
    const src = ["a", "b", "c", "d", "e"];
    const out = shuffle(src, seq(0.1, 0.9, 0.5, 0.3));
    expect([...out].sort()).toEqual(src);
    expect(src).toEqual(["a", "b", "c", "d", "e"]);
  });
});

describe("seatPlan の指定", () => {
  const names = ["あ", "い", "う", "え", "お"];
  it("上座の人は席1、出口に近い席の人は最後の席(円卓は向かい側)に座る", () => {
    for (let i = 0; i < 20; i++) {
      const flat = seatPlan(names, "table", Math.random, { top: "い", exit: "お" }).rows.flat();
      expect(flat[0]).toBe("い");
      expect(flat[flat.length - 1]).toBe("お");
      expect([...flat].sort()).toEqual([...names].sort());
      const round = seatPlan(names, "round", Math.random, { exit: "う" }).rows[0];
      expect(round[2]).toBe("う");
    }
  });
  it("同じ人を両方に指定したら、上座を優先する。名前にない人は無視する", () => {
    const flat = seatPlan(names, "counter", Math.random, { top: "あ", exit: "あ" }).rows.flat();
    expect(flat[0]).toBe("あ");
    expect(seatPlan(names, "counter", Math.random, { top: "x", exit: "y" }).rows.flat().sort()).toEqual([...names].sort());
  });
});

describe("seatPlan", () => {
  it("向かい合わせは2列に分ける(奥は手前と同じか1席少ない)", () => {
    const r = seatPlan(DEMO_NAMES.slice(0, 5), "table", seq(0.4)).rows;
    expect(r.map((x) => x.length)).toEqual([3, 2]);
    expect(r.flat().sort()).toEqual([...DEMO_NAMES.slice(0, 5)].sort());
  });
  it("円卓とカウンターは1列(1周)", () => {
    expect(seatPlan(DEMO_NAMES, "round").rows).toHaveLength(1);
    expect(seatPlan(DEMO_NAMES, "counter").rows[0]).toHaveLength(DEMO_NAMES.length);
  });
});

describe("LIE_THEMES", () => {
  it("お題が重ならない", () => {
    expect(new Set(LIE_THEMES).size).toBe(LIE_THEMES.length);
    expect(LIE_THEMES.length).toBeGreaterThan(5);
  });
});

describe("pickIndex", () => {
  it("0 〜 人数−1 の番号を返す。いなければ -1", () => {
    expect(pickIndex(5, () => 0.999)).toBe(4);
    expect(pickIndex(5, () => 0)).toBe(0);
    expect(pickIndex(0)).toBe(-1);
  });
});

describe("seatTables", () => {
  const names = Array.from({ length: 11 }, (_, i) => `n${i}`);
  it("全員を、人数の差が1人までの卓に分ける", () => {
    const t = seatTables(names, "table", 3);
    expect(t).toHaveLength(3);
    const sizes = t.map((x) => x.rows.flat().length);
    expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1);
    expect(t.flatMap((x) => x.rows.flat()).sort()).toEqual([...names].sort());
  });
  it("上座は1卓目の席1、出口の人は最後の卓", () => {
    for (let k = 0; k < 20; k++) {
      const t = seatTables(names, "counter", 2, Math.random, { top: "n3", exit: "n5" });
      expect(t[0].rows[0][0]).toBe("n3");
      expect(t[1].rows[0].at(-1)).toBe("n5");
    }
  });
  it("卓の数は1卓に2人まで", () => {
    expect(maxTables(5)).toBe(2);
    expect(seatTables(names.slice(0, 3), "round", 5)).toHaveLength(1);
  });
});
