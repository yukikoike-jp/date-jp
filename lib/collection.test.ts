import { describe, expect, it } from "vitest";
import { canSetPayment, isConfirmed, parseCollection } from "./collection";

const person = (name: string, tenths = 10) => ({ name, tenths, label: "ふつう", mark: "●", tone: "yellow" });

describe("parseCollection", () => {
  it("金額をサーバーで計算し直し、幹事に印を付ける", () => {
    const r = parseCollection({
      title: " ゼミの打ち上げ ",
      audience: "student",
      total: 10000,
      unit: 100,
      organizer: 0,
      people: [person("幹事"), person("山田", 15), person("佐藤", 5)],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.title).toBe("ゼミの打ち上げ");
    expect(r.value.people.map((p) => p.amount).reduce((a, b) => a + b, 0)).toBe(10000);
    expect(r.value.people[0].organizer).toBe(true);
    expect(r.value.people[1].amount).toBeGreaterThan(r.value.people[2].amount);
  });
  it("おかしな値は通さない", () => {
    const base = { title: "", audience: "student", total: 10000, unit: 100, organizer: 0, people: [person("a"), person("b")] };
    expect(parseCollection({ ...base, total: 0 }).ok).toBe(false);
    expect(parseCollection({ ...base, unit: 7 }).ok).toBe(false);
    expect(parseCollection({ ...base, organizer: 5 }).ok).toBe(false);
    expect(parseCollection({ ...base, people: [person("a")] }).ok).toBe(false);
    expect(parseCollection({ ...base, people: [person("a"), person("b", 99)] }).ok).toBe(false);
  });
});

describe("canSetPayment", () => {
  it("幹事だけが変えられ、参加した人は押せない", () => {
    expect(canSetPayment(true)).toBe(true);
    expect(canSetPayment(false)).toBe(false);
  });
  it("幹事が受け取りを記録したものだけを、払ったと数える", () => {
    expect(isConfirmed({ by: "host" })).toBe(true);
    expect(isConfirmed({ by: "self" })).toBe(false);
    expect(isConfirmed(undefined)).toBe(false);
  });
});

describe("nextPayment(払ったの2段階)", () => {
  it("幹事は受け取りを記録・取り消しできる", async () => {
    const { nextPayment } = await import("./collection");
    expect(nextPayment(true, undefined, true)).toEqual({ by: "host" });
    expect(nextPayment(true, { by: "host" }, false)).toBeNull();
  });
  it("参加した人は申告だけ。幹事の記録は変えられない", async () => {
    const { nextPayment } = await import("./collection");
    expect(nextPayment(false, undefined, true)).toEqual({ by: "self" });
    expect(nextPayment(false, { by: "self" }, false)).toBeNull();
    expect(nextPayment(false, { by: "host" }, true)).toBe("forbidden");
    expect(nextPayment(false, { by: "host" }, false)).toBe("forbidden");
    expect(nextPayment(false, undefined, false)).toBe("forbidden");
  });
});

describe("nextPayment(払い方)", () => {
  it("選んだ払い方を記録し、幹事が確かめるときは本人の払い方を引き継ぐ", async () => {
    const { nextPayment } = await import("./collection");
    expect(nextPayment(false, undefined, true, "paypay")).toEqual({ by: "self", method: "paypay" });
    expect(nextPayment(true, { by: "self", method: "paypay" }, true)).toEqual({ by: "host", method: "paypay" });
    expect(nextPayment(true, undefined, true, "cash")).toEqual({ by: "host", method: "cash" });
    expect(nextPayment(true, undefined, true)).toEqual({ by: "host" });
  });
});
