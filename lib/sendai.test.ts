import { describe, expect, it } from "vitest";
import { ANSWER_BUDGETS, stayFromStep, stayStep, STAY_CHOICES, UNLIMITED_BUDGET, inputFromMinutes, isAnswerBudget, isArrival, isStay, minutesFromInput, stayLabel } from "./sendai";

describe("自由に書いた時刻", () => {
  it("来られる時刻は 15:00〜24:00 の5分きざみ", () => {
    expect(isArrival(1065)).toBe(true); // 17:45
    expect(isArrival(1067)).toBe(false);
    expect(isArrival(840)).toBe(false);
  });
  it("残れる時刻は夜をまたいで書ける", () => {
    expect(minutesFromInput("01:30", true)).toBe(1530);
    expect(minutesFromInput("21:15", true)).toBe(1275);
    expect(minutesFromInput("17:45", false)).toBe(1065);
    expect(isStay(1530)).toBe(true);
    expect(stayLabel(1530)).toBe("深夜1:30まで");
    expect(stayLabel(1290)).toBe("21:30まで");
    expect(inputFromMinutes(1530)).toBe("01:30");
  });
});

describe("答えの細かい選択肢", () => {
  it("予算は 1,000円〜15,000円を500円ごと、20,000円・30,000円・上限なしを受け付ける", () => {
    expect(ANSWER_BUDGETS[0]).toBe(1000);
    expect(ANSWER_BUDGETS).toContain(15000);
    expect(isAnswerBudget(3500)).toBe(true);
    expect(isAnswerBudget(20000)).toBe(true);
    expect(isAnswerBudget(UNLIMITED_BUDGET)).toBe(true);
    expect(isAnswerBudget(3333)).toBe(false);
  });
  it("残れる時刻は 20:00〜5:00 を30分ごと、0:00 は終電まで、最後は最後まで", () => {
    expect(STAY_CHOICES[0]).toBe(1200);
    expect(STAY_CHOICES).toContain(1440);
    expect(stayLabel(1440)).toBe("終電まで");
    expect(stayLabel(STAY_CHOICES.at(-1)!)).toBe("最後まで");
    expect(STAY_CHOICES.every(isStay)).toBe(true);
  });
});

describe("残れる時刻の4つの選び方", () => {
  it("一次会まで・二次会まで・終電まで・最後まで が、それぞれの時刻になる", () => {
    expect(stayFromStep("first", 1140)).toBe(1260);
    expect(stayFromStep("first", null)).toBe(1260);
    expect(stayFromStep("second", 1140)).toBe(1380);
    expect(stayFromStep("train", 1140)).toBe(1440);
    expect(stayFromStep("last", 1140)).toBe(1800);
  });
  it("前に答えた時刻も、近い選び方に戻せる", () => {
    expect(stayStep(0, 1140)).toBeNull();
    expect(stayStep(1260, 1140)).toBe("first");
    expect(stayStep(1380, 1140)).toBe("second");
    expect(stayStep(1440, 1140)).toBe("train");
    expect(stayStep(1500, 1140)).toBe("train");
    expect(stayStep(1800, 1140)).toBe("last");
    // 一次会の終わりに残れる人は、二次会の人に数えられない(summary の判定と同じ)
    expect(stayFromStep("first", 1140)).not.toBeGreaterThan(1140 + 120);
  });
});
