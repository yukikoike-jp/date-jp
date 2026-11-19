import { describe, expect, it } from "vitest";
import { DEMO_NAMES, kingGame, parseNames, pickIndex, seatPlan, shuffle, splitTeams } from "./fun";

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

describe("splitTeams", () => {
  it("全員をどこかのチームに入れ、人数の差は1人まで", () => {
    const t = splitTeams(DEMO_NAMES.concat("くう"), 3);
    expect(t.flat().sort()).toEqual([...DEMO_NAMES, "くう"].sort());
    const sizes = t.map((x) => x.length);
    expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1);
  });
  it("人数より多いチームは作らない", () => {
    expect(splitTeams(["a", "b"], 5)).toHaveLength(2);
  });
});

describe("kingGame", () => {
  it("王様は1人だけ、ほかは 1〜(人数−1) の番号が1つずつ", () => {
    const d = kingGame(DEMO_NAMES);
    expect(d.filter((x) => x.card === "王様")).toHaveLength(1);
    expect(d.filter((x) => x.card !== "王様").map((x) => x.card).sort()).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("pickIndex", () => {
  it("0 〜 人数−1 の番号を返す。いなければ -1", () => {
    expect(pickIndex(5, () => 0.999)).toBe(4);
    expect(pickIndex(5, () => 0)).toBe(0);
    expect(pickIndex(0)).toBe(-1);
  });
});
