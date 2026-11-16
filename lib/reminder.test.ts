import { describe, expect, it } from "vitest";
import { cleanPayLink, doneText, personalReminder, toneFor } from "./reminder";

const base = { title: "ゼミの打ち上げ", name: "あおい", amount: 3400, payLink: "https://paypay.ne.jp/abc123", pageUrl: "https://www.tsudoro.com/c/xyz" };

describe("cleanPayLink", () => {
  it("PayPay の https のリンクだけを通す", () => {
    expect(cleanPayLink(" https://paypay.ne.jp/abc123 ")).toBe("https://paypay.ne.jp/abc123");
    expect(cleanPayLink("https://qr.paypay.ne.jp/XYZ789")).toBe("https://qr.paypay.ne.jp/XYZ789");
  });
  it("後ろの # 以降は落とす", () => {
    expect(cleanPayLink("https://paypay.ne.jp/abc#x")).toBe("https://paypay.ne.jp/abc");
  });
  it("ほかのサイト・http・空・空白入り・長すぎるものは通さない", () => {
    expect(cleanPayLink("https://evil.example/paypay.ne.jp/abc")).toBeNull();
    expect(cleanPayLink("https://paypay.ne.jp.evil.example/abc")).toBeNull();
    expect(cleanPayLink("http://paypay.ne.jp/abc")).toBeNull();
    expect(cleanPayLink("")).toBeNull();
    expect(cleanPayLink("https://paypay.ne.jp/a b")).toBeNull();
    expect(cleanPayLink(`https://paypay.ne.jp/${"a".repeat(300)}`)).toBeNull();
    expect(cleanPayLink("https://paypay.ne.jp/")).toBeNull();
  });
});

describe("toneFor", () => {
  it("送った回数が増えるほど、はっきりした言い方にする", () => {
    expect([0, 1, 2, 5].map(toneFor)).toEqual(["soft", "normal", "last", "last"]);
  });
});

describe("personalReminder", () => {
  it("名前・金額・払い方のリンク・集金のページを入れる", () => {
    const t = personalReminder({ ...base, audience: "student", tone: "soft" });
    expect(t).toContain("あおいさん");
    expect(t).toContain("3,400円");
    expect(t).toContain("https://paypay.ne.jp/abc123");
    expect(t).toContain("https://www.tsudoro.com/c/xyz");
  });
  it("リンクがなければ、直接払ってもらう言い方にする", () => {
    const t = personalReminder({ ...base, payLink: null, audience: "student", tone: "soft" });
    expect(t).not.toContain("paypay");
    expect(t).toContain("会ったときでもいいよ");
  });
  it("会社の会は敬語、最後のお願いは期限を書く", () => {
    const t = personalReminder({ ...base, audience: "worker", tone: "last" });
    expect(t).toContain("お疲れさまです");
    expect(t).toContain("今週中");
    expect(t).not.toContain("ありがとう!");
  });
  it("回数で言い方が変わる", () => {
    const a = personalReminder({ ...base, audience: "student", tone: "soft" });
    const b = personalReminder({ ...base, audience: "student", tone: "last" });
    expect(a).not.toBe(b);
    expect(b).toContain("最後のお願い");
  });
});

describe("doneText", () => {
  it("合計を入れたまとめを作る", () => {
    expect(doneText("student", "ゼミ", 20000)).toContain("20,000円");
    expect(doneText("worker", "", 20000)).toContain("ご協力ありがとうございました");
  });
});
