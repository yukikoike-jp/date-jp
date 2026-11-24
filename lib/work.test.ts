import { describe, expect, it } from "vitest";
import { CHECKLIST, timeline } from "./work";

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
