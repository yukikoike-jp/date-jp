import { afterEach, describe, expect, it, vi } from "vitest";
import type { MouseEvent } from "react";
import { openShopInPlace } from "./openShop";

function fakeClick() {
  const e = { preventDefault: vi.fn(), currentTarget: { href: "https://www.tsudoro.com/go/search/J1" } };
  return e as unknown as MouseEvent<HTMLAnchorElement> & { preventDefault: ReturnType<typeof vi.fn> };
}

function setup(standalone: boolean) {
  const loc = { href: "https://www.tsudoro.com/shops" };
  vi.stubGlobal("window", { matchMedia: () => ({ matches: false }) });
  vi.stubGlobal("navigator", { standalone });
  vi.stubGlobal("location", loc);
  return loc;
}

afterEach(() => vi.unstubAllGlobals());

describe("openShopInPlace", () => {
  it("ホーム画面から開いているときは、同じ画面のまま移動する", () => {
    const loc = setup(true);
    const e = fakeClick();
    openShopInPlace(e);
    expect(e.preventDefault).toHaveBeenCalled();
    expect(loc.href).toBe("https://www.tsudoro.com/go/search/J1");
  });
  it("ふつうのブラウザでは、何もしない(新しいタブで開く)", () => {
    const loc = setup(false);
    const e = fakeClick();
    openShopInPlace(e);
    expect(e.preventDefault).not.toHaveBeenCalled();
    expect(loc.href).toBe("https://www.tsudoro.com/shops");
  });
});
