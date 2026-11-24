import { describe, expect, it } from "vitest";
import { pickAd, type Ad } from "./ads";

const ad = (id: string): Ad => ({ id, title: id, body: "", href: "https://example.com", cta: "見る", sponsor: "テスト" });

describe("pickAd", () => {
  it("広告がなければ null", () => {
    expect(pickAd("shops", [])).toBeNull();
  });
  it("同じ key なら同じ広告", () => {
    const ads = [ad("a"), ad("b"), ad("c")];
    expect(pickAd("shops", ads)).toBe(pickAd("shops", ads));
  });
  it("1件だけならそれが出る", () => {
    expect(pickAd("x", [ad("only")])?.id).toBe("only");
  });
});
