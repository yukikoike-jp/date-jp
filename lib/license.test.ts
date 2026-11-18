import { describe, expect, it } from "vitest";
import { licenseFromRestoreToken, signLicense, signRestoreToken, verifyLicense } from "./license";

describe("license", () => {
  const key = signLicense("cs_test_abc123", "secret");
  it("同じ秘密で作った鍵は通る", () => {
    expect(verifyLicense(key, "secret")).toBe(true);
  });
  it("秘密がちがう、または書き換えた鍵は通らない", () => {
    expect(verifyLicense(key, "other")).toBe(false);
    expect(verifyLicense(key.replace("abc123", "abc124"), "secret")).toBe(false);
    expect(verifyLicense(key + "x", "secret")).toBe(false);
  });
  it("形がおかしいものは通らない", () => {
    expect(verifyLicense("", "secret")).toBe(false);
    expect(verifyLicense("nope", "secret")).toBe(false);
    expect(verifyLicense(null, "secret")).toBe(false);
    expect(verifyLicense("cs_x.", "secret")).toBe(false);
  });
});

describe("確認メールのリンク", () => {
  const secret = "s3cret";
  const license = signLicense("cs_test_abc", secret);
  it("期限内なら鍵を取り出せる", () => {
    const t = signRestoreToken(license, secret, 1000, 60_000);
    expect(licenseFromRestoreToken(t, secret, 30_000)).toBe(license);
  });
  it("期限切れ・書きかえ・ほかの秘密では取り出せない", () => {
    const t = signRestoreToken(license, secret, 1000, 60_000);
    expect(licenseFromRestoreToken(t, secret, 70_000)).toBeNull();
    expect(licenseFromRestoreToken(t.slice(0, -2) + "xx", secret, 30_000)).toBeNull();
    expect(licenseFromRestoreToken(t, "other", 30_000)).toBeNull();
    expect(licenseFromRestoreToken("nonsense", secret, 30_000)).toBeNull();
  });
});
