import { describe, expect, it } from "vitest";
import { splitBill, subsidyTotal, tenthsFromInput } from "./split";

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

describe("splitBill", () => {
  it("同じ重みなら全員同じ額。単位に切り上げ、多い分はお釣りにする", () => {
    const r = splitBill({ total: 10000, weights: [10, 10, 10], unit: 100, organizer: 0 });
    expect(r.amounts).toEqual([3400, 3400, 3400]);
    expect(r.surplus).toBe(200);
    expect(r.organizerDiff).toBe(0);
    // 1円単位なら、お釣りは人数より少ない
    const r1 = splitBill({ total: 10000, weights: [10, 10, 10], unit: 1, organizer: 0 });
    expect(r1.amounts).toEqual([3334, 3334, 3334]);
    expect(r1.surplus).toBe(2);
    // ちょうど割り切れれば、お釣りはない
    expect(splitBill({ total: 9000, weights: [10, 10, 10], unit: 100, organizer: 2 })).toEqual({ amounts: [3000, 3000, 3000], organizerDiff: 0, surplus: 0 });
  });

  it("重みに比べて割る", () => {
    // 13 + 10 + 7 = 30。30000円なら 13000 / 10000 / 7000
    const r = splitBill({ total: 30000, weights: [13, 10, 7], unit: 100, organizer: 1 });
    expect(r.amounts).toEqual([13000, 10000, 7000]);
    expect(r.organizerDiff).toBe(0);
  });

  it("合計はいつも一致し、幹事以外は単位にそろう", () => {
    for (const unit of [1, 10, 100, 500]) {
      const r = splitBill({ total: 23456, weights: [15, 12, 10, 7, 7], unit, organizer: 2 });
      expect(sum(r.amounts)).toBe(23456);
      r.amounts.forEach((a, i) => {
        if (i !== 2) expect(a % unit).toBe(0);
      });
    }
  });

  it("幹事の額がマイナスになるなら、ほかの人を切り捨てる", () => {
    // 1000円を 500円単位で4人(傾斜あり)。四捨五入だと 3人×500 = 1500 で幹事が -500 になる
    const r = splitBill({ total: 1000, weights: [10, 11, 11, 11], unit: 500, organizer: 0 });
    expect(r.amounts).toEqual([1000, 0, 0, 0]);
    expect(r.amounts.every((a) => a >= 0)).toBe(true);
  });

  it("合計が0や人がいなければ0", () => {
    expect(splitBill({ total: 0, weights: [10, 10], unit: 100, organizer: 0 }).amounts).toEqual([0, 0]);
    expect(splitBill({ total: 5000, weights: [], unit: 100, organizer: 0 }).amounts).toEqual([]);
  });
});

describe("tenthsFromInput", () => {
  it("書いた倍率を0.1単位の整数にする", () => {
    expect(tenthsFromInput("1.2")).toBe(12);
    expect(tenthsFromInput("２")).toBe(20);
    expect(tenthsFromInput("1.25")).toBe(13);
  });
  it("範囲の外や読めないものは null", () => {
    expect(tenthsFromInput("")).toBeNull();
    expect(tenthsFromInput("0")).toBeNull();
    expect(tenthsFromInput("6")).toBeNull();
    expect(tenthsFromInput("たくさん")).toBeNull();
  });
});

describe("subsidyTotal", () => {
  it("1人あたりなら人数をかけ、全体ならその額にする", () => {
    expect(subsidyTotal({ kind: "per", yen: 3000 }, 40000, 8)).toBe(24000);
    expect(subsidyTotal({ kind: "lump", yen: 10000 }, 40000, 8)).toBe(10000);
  });
  it("お会計の合計を超えない。なし・0円・マイナスは0にする", () => {
    expect(subsidyTotal({ kind: "per", yen: 6000 }, 40000, 8)).toBe(40000);
    expect(subsidyTotal(null, 40000, 8)).toBe(0);
    expect(subsidyTotal({ kind: "lump", yen: -5 }, 40000, 8)).toBe(0);
  });
});
