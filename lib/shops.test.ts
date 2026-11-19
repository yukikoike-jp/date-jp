import { describe, expect, it } from "vitest";
import { browserShopUrl, budgetFromRange, budgetFromText, genreKeyOf, genreParams, matchesGenre, mergeShops, pickSamples, searchShopsAlways, smokeFriendly, smokingFromText, type Shop } from "./shops";

describe("budgetFromRange", () => {
  it("予算の区分名から上限を読む", () => {
    expect(budgetFromRange("5001～6000円")).toBe(6000);
    expect(budgetFromRange("7001～8000円")).toBe(8000);
    expect(budgetFromRange("～500円")).toBe(500);
  });
  it("上限のない区分は無限大", () => {
    expect(budgetFromRange("30001円～")).toBe(Number.POSITIVE_INFINITY);
  });
  it("読めなければ0", () => {
    expect(budgetFromRange(undefined)).toBe(0);
    expect(budgetFromRange("")).toBe(0);
  });
});

describe("budgetFromText", () => {
  it("予算の目安の文から額を読む", () => {
    expect(budgetFromText("12,000円")).toBe(12000);
    expect(budgetFromText("7000円～８０００円")).toBe(7000);
    expect(budgetFromText("5500")).toBe(5500);
  });
  it("昼と夜があれば夜の額を読む", () => {
    expect(budgetFromText("昼750円／夜1000円")).toBe(1000);
    expect(budgetFromText("昼：1501～2000円/夜：4001～5000円")).toBe(4001);
  });
  it("読めなければ0", () => {
    expect(budgetFromText(undefined)).toBe(0);
    expect(budgetFromText("お問い合わせください")).toBe(0);
  });
});

describe("mergeShops", () => {
  const shop = (id: string) => ({ id }) as Shop;
  it("場所ごとのお店を交互に並べ、同じお店は1回だけにする", () => {
    const merged = mergeShops([[shop("a1"), shop("x"), shop("a3")], [shop("b1"), shop("x")]], 10);
    expect(merged.map((s) => s.id)).toEqual(["a1", "b1", "x", "a3"]);
  });
  it("上限で切る", () => {
    expect(mergeShops([[shop("a1"), shop("a2")], [shop("b1")]], 2).map((s) => s.id)).toEqual(["a1", "b1"]);
  });
});

describe("smokingFromText", () => {
  it("ホットペッパーの禁煙・喫煙の欄を読む", () => {
    expect(smokingFromText("全面禁煙")).toBe("no");
    expect(smokingFromText("一部禁煙")).toBe("partial");
    expect(smokingFromText("禁煙席なし")).toBe("ok");
    expect(smokingFromText(undefined)).toBeNull();
  });
});

describe("pickSamples のタバコの条件", () => {
  const q = { area: "station" as const, budget: null, size: 2 };
  it("only なら吸えるお店だけ", () => {
    expect(pickSamples({ ...q, smoking: "only" }, 10).shops.every(smokeFriendly)).toBe(true);
  });
  it("prefer なら吸えるお店を先に出す", () => {
    expect(smokeFriendly(pickSamples({ ...q, smoking: "prefer" }, 10).shops[0])).toBe(true);
  });
});


describe("searchShopsAlways(お店が必ず出る)", () => {
  const steps = [2000, 3000, 4000, 5000, 6000];
  it("予算が低すぎても、予算を上げてお店を出し、何をゆるめたかを返す", async () => {
    delete process.env.HOTPEPPER_API_KEY;
    const r = await searchShopsAlways({ area: "station", budget: 1000, size: 4 }, 10, steps);
    expect(r.shops.length).toBeGreaterThan(0);
    expect(r.relaxed).toContain("予算");
  });
  it("条件に合えば、ゆるめない", async () => {
    const r = await searchShopsAlways({ area: "station", budget: 5000, size: 4 }, 10, steps);
    expect(r.shops.length).toBeGreaterThan(0);
    expect(r.relaxed).toBeNull();
  });
  it("人数が多すぎる・個室・タバコのような厳しい条件でも、最後は出す", async () => {
    const r = await searchShopsAlways({ area: "station", budget: 1000, size: 500, privateRoom: true, smoking: "only", genres: ["yoshoku"] }, 10, steps);
    expect(r.shops.length).toBeGreaterThan(0);
    expect(r.relaxed).not.toBeNull();
  });
});

describe("browserShopUrl(アプリが開かない形のお店の URL)", () => {
  it("お店のページの最後の / を外す。後ろの ?… はそのまま", () => {
    expect(browserShopUrl("https://www.hotpepper.jp/strJ001155193/?vos=nhppalsa000016")).toBe("https://www.hotpepper.jp/strJ001155193?vos=nhppalsa000016");
    expect(browserShopUrl("https://www.hotpepper.jp/strJ001155193/")).toBe("https://www.hotpepper.jp/strJ001155193");
  });
  it("お店のページ以外や、ほかのサイトは変えない", () => {
    expect(browserShopUrl("https://www.hotpepper.jp/strJ001155193/yoyaku/")).toBe("https://www.hotpepper.jp/strJ001155193/yoyaku/");
    expect(browserShopUrl("https://example.com/strJ001155193/")).toBe("https://example.com/strJ001155193/");
    expect(browserShopUrl("not a url")).toBe("not a url");
  });
});

describe("pickSamples の飲み放題の条件", () => {
  it("飲み放題だけにすると、飲み放題のあるお店だけが出る", () => {
    const q = { area: "station" as const, budget: null, size: 2 };
    const all = pickSamples(q, 20).shops;
    const only = pickSamples({ ...q, freeDrink: true }, 20).shops;
    expect(only.length).toBeGreaterThan(0);
    expect(only.length).toBeLessThanOrEqual(all.length);
    expect(only.every((s) => s.features.includes("飲み放題"))).toBe(true);
  });
});

describe("たこ焼き・インド料理(言葉で探す料理)", () => {
  it("たこ焼きは店名や説明の言葉で見分ける", () => {
    expect(genreKeyOf({ name: "築地銀だこ 一番町店", genre: { code: "G015", catch: "たこ焼き食べ放題" } })).toBe("takoyaki");
    expect(matchesGenre({ name: "たこやき専門 まる", genre: { code: "G001" } }, "takoyaki")).toBe(true);
    expect(matchesGenre({ name: "居酒屋 たこ八", genre: { code: "G001", catch: "海鮮" } }, "takoyaki")).toBe(false);
  });
  it("インド料理はアジア料理のうち、インド・ネパールの言葉があるお店", () => {
    expect(genreKeyOf({ name: "ナマステ", genre: { code: "G009", catch: "本格インドカレー" } })).toBe("indian");
    expect(genreKeyOf({ name: "タイ屋台", genre: { code: "G009", catch: "ガパオ" } })).toBe("ethnic");
    // アジア料理を選んだ人には、インド料理のお店も出す
    expect(matchesGenre({ name: "ナマステ", genre: { code: "G009", catch: "本格インドカレー" } }, "ethnic")).toBe(true);
    // 各国料理(G010)は、アジア料理に入れない
    expect(matchesGenre({ name: "スペインバル", genre: { code: "G010" } }, "ethnic")).toBe(false);
  });
  it("ジャンルで探せる料理は1回にまとめ、言葉で探す料理は別に探す", () => {
    expect(genreParams([])).toEqual([{}]);
    expect(genreParams(["izakaya", "ethnic"])).toEqual([{ genre: "G001,G009" }]);
    expect(genreParams(["izakaya", "takoyaki", "indian"])).toEqual([
      { genre: "G001" },
      { keyword: "たこ焼" },
      { keyword: "インド", genre: "G009" },
    ]);
  });
});

it("インドネシア料理は、インド料理に入れない", () => {
  expect(genreKeyOf({ name: "アジアン料理 Makan", genre: { code: "G009", catch: "エスニック" }, catch: "タイ・インドネシア料理" })).toBe("ethnic");
});

describe("referralUrl(バリューコマースの提携リンク)", () => {
  it("テンプレートがあれば、ホットペッパーの印を差し替えて提携リンクにする", async () => {
    const { referralUrl } = await import("./shops");
    const before = process.env.AFFILIATE_URL_TEMPLATE;
    process.env.AFFILIATE_URL_TEMPLATE = "https://ck.jp.ap.valuecommerce.com/servlet/referral?sid=3788519&pid=892753048&vc_url={url}";
    try {
      expect(referralUrl("https://www.hotpepper.jp/strJ001155193?vos=nhppalsa000016")).toBe(
        "https://ck.jp.ap.valuecommerce.com/servlet/referral?sid=3788519&pid=892753048&vc_url=" +
          encodeURIComponent("https://www.hotpepper.jp/strJ001155193?vos=nhppvccp99002"),
      );
    } finally {
      if (before === undefined) delete process.env.AFFILIATE_URL_TEMPLATE;
      else process.env.AFFILIATE_URL_TEMPLATE = before;
    }
  });
  it("テンプレートがなければ、そのまま", async () => {
    const { referralUrl } = await import("./shops");
    const before = process.env.AFFILIATE_URL_TEMPLATE;
    delete process.env.AFFILIATE_URL_TEMPLATE;
    try {
      expect(referralUrl("https://www.hotpepper.jp/strJ001155193")).toBe("https://www.hotpepper.jp/strJ001155193");
    } finally {
      if (before !== undefined) process.env.AFFILIATE_URL_TEMPLATE = before;
    }
  });
});
