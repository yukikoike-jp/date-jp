import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { hasFun, isActiveSession, proActive, resetBillingCache } from "./billing";
import { signLicense } from "./license";

const SECRET = "test-secret";
const SESSION = "cs_test_abc123";
const license = signLicense(SESSION, SECRET);

function mockStripe(session: Record<string, unknown>) {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify(session), { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

beforeEach(() => {
  resetBillingCache();
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_x");
  vi.stubEnv("LICENSE_SECRET", SECRET);
  vi.stubEnv("FUN_UNLOCK", "");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("isActiveSession", () => {
  it("月額は active / trialing の間だけ続いているとみなす", () => {
    const s = (status: string) => ({ mode: "subscription", metadata: { kind: "pro" }, subscription: { status } });
    expect(isActiveSession(s("active"))).toBe(true);
    expect(isActiveSession(s("trialing"))).toBe(true);
    expect(isActiveSession(s("canceled"))).toBe(false);
    expect(isActiveSession(s("past_due"))).toBe(false);
    expect(isActiveSession(s("unpaid"))).toBe(false);
  });
  it("前の買い切りは、支払い済みなら続いている", () => {
    expect(isActiveSession({ mode: "payment", payment_status: "paid", metadata: { kind: "pro" } })).toBe(true);
    expect(isActiveSession({ mode: "payment", payment_status: "unpaid", metadata: { kind: "pro" } })).toBe(false);
  });
  it("有料プレミアムではない支払いは通さない", () => {
    expect(isActiveSession({ mode: "payment", payment_status: "paid", metadata: { kind: "other" } })).toBe(false);
  });
});

describe("proActive", () => {
  it("契約が続いていれば使え、解約されていれば使えない", async () => {
    mockStripe({ mode: "subscription", metadata: { kind: "pro" }, subscription: { status: "active" } });
    expect(await proActive(license)).toBe(true);
    resetBillingCache();
    mockStripe({ mode: "subscription", metadata: { kind: "pro" }, subscription: { status: "canceled" } });
    expect(await proActive(license)).toBe(false);
  });
  it("偽物の鍵・鍵なしは、Stripe に聞かずに使えない", async () => {
    const f = mockStripe({});
    expect(await proActive(`${SESSION}.bad-signature`)).toBe(false);
    expect(await proActive(null)).toBe(false);
    expect(f).not.toHaveBeenCalled();
  });
  it("確かめた結果は少しのあいだ覚え、Stripe に何度も聞かない", async () => {
    const f = mockStripe({ mode: "subscription", metadata: { kind: "pro" }, subscription: { status: "active" } });
    await proActive(license);
    await proActive(license);
    expect(f).toHaveBeenCalledTimes(1);
  });
  it("Stripe に聞けなかったときは、使えないことにする(前に分かったものがあればそれ)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 500 })));
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await proActive(license)).toBe(false);
  });
});

describe("hasFun", () => {
  it("催促(hasFun)は、有料にしていなくても鍵をかけたまま。FUN_UNLOCK=1 だけは使える", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "");
    expect(await hasFun(null)).toBe(false);
    vi.stubEnv("FUN_UNLOCK", "1");
    expect(await hasFun(null)).toBe(true);
  });
});
