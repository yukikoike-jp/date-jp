import { describe, expect, it } from "vitest";
import { otherSites, stationFromAccess, vcLink } from "./otherSites";

describe("stationFromAccess", () => {
  it("行き方の文から駅の名前を取り出す", () => {
    expect(stationFromAccess("JR仙台駅西口より徒歩3分")).toBe("仙台");
    expect(stationFromAccess("仙台駅 西口 徒歩3分")).toBe("仙台");
    expect(stationFromAccess("地下鉄南北線勾当台公園駅 徒歩4分")).toBe("勾当台公園");
    expect(stationFromAccess("東京メトロ銀座線渋谷駅B1出口すぐ")).toBe("渋谷");
  });
  it("駅がなければ null", () => {
    expect(stationFromAccess("国分町交差点すぐ")).toBeNull();
  });
});

describe("otherSites", () => {
  it("駅があれば、その駅で探すリンクにする。リンクはバリューコマースを通す", () => {
    const [ikyu] = otherSites("仙台");
    expect(ikyu.href).toBe(vcLink("892749796", "https://restaurant.ikyu.com/search?term=%E4%BB%99%E5%8F%B0"));
    expect(ikyu.href.startsWith("https://ck.jp.ap.valuecommerce.com/servlet/referral?sid=3788519&pid=892749796&vc_url=")).toBe(true);
  });
  it("ボタンの文字にサイト名を入れない(提携先の決まり)", () => {
    for (const s of otherSites(null)) expect(`${s.label}${s.note}`).not.toMatch(/一休|オズモール|OZmall|ikyu/i);
  });
});
