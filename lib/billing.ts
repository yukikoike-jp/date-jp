import "server-only";
import { cleanEnv } from "./env";
import { signLicense, verifyLicense } from "./license";

// 有料プレミアム(月額のサブスク。エンタメの Play だけ)。
// Stripe のお会計のページ(Checkout、mode=subscription)を使い、カードの情報はこちらで持たない。
// STRIPE_SECRET_KEY と LICENSE_SECRET がそろうまでは、買えない。
// 支払いのあとは /pro/done に戻り、Stripe に支払いを確かめてから、端末に鍵(lib/license.ts)を渡す。
// 鍵は「Stripe のお会計の id」に署名したもの。使うたびに、Stripe でその契約がまだ続いているか(解約されていないか)を確かめる

/** 月額(円・税込)。PRO_PRICE で変えられる */
export function proPrice(): number {
  const n = Number(cleanEnv(process.env.PRO_PRICE));
  return Number.isInteger(n) && n >= 100 ? n : 500;
}

const API = "https://api.stripe.com/v1";

function secretKey(): string | null {
  return cleanEnv(process.env.STRIPE_SECRET_KEY);
}

function licenseSecret(): string | null {
  return cleanEnv(process.env.LICENSE_SECRET);
}

/** 有料にしているか(Stripe のキーと、鍵に署名する秘密が入っているか) */
export function billingEnabled(): boolean {
  return secretKey() !== null && licenseSecret() !== null;
}

async function stripe(path: string, init: RequestInit = {}): Promise<Record<string, unknown>> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    cache: "no-store",
    headers: { Authorization: `Bearer ${secretKey()}`, "Content-Type": "application/x-www-form-urlencoded", ...init.headers },
  });
  const body = (await res.json()) as Record<string, unknown>;
  if (!res.ok) throw new Error(`stripe ${res.status} ${JSON.stringify(body.error ?? {})}`);
  return body;
}

/** 契約が続いているかの確認を、少しのあいだ覚えておく(画面を開くたびに Stripe へ聞かないため) */
const CACHE_MS = 10 * 60 * 1000;
const cache = new Map<string, { at: number; active: boolean }>();

/** テスト用: 覚えたものを消す */
export function resetBillingCache() {
  cache.clear();
}

/** 契約が続いているか。月額は active / trialing の間だけ。前の買い切りは、支払い済みなら続いているとみなす */
export function isActiveSession(session: Record<string, unknown>): boolean {
  if (session.metadata && (session.metadata as Record<string, string>).kind !== "pro") return false;
  if (session.mode === "subscription") {
    const sub = session.subscription as { status?: string } | string | null | undefined;
    return typeof sub === "object" && sub !== null && (sub.status === "active" || sub.status === "trialing");
  }
  return session.payment_status === "paid";
}

/** 鍵が本物で、契約が続いているか(有料にしていなければ false) */
export async function proActive(license: unknown): Promise<boolean> {
  const secret = licenseSecret();
  if (!billingEnabled() || !secret || !verifyLicense(license, secret)) return false;
  const sessionId = (license as string).slice(0, (license as string).lastIndexOf("."));
  const hit = cache.get(sessionId);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.active;
  try {
    const session = await stripe(`/checkout/sessions/${encodeURIComponent(sessionId)}?expand%5B%5D=subscription`);
    const active = isActiveSession(session);
    cache.set(sessionId, { at: Date.now(), active });
    return active;
  } catch (e) {
    // Stripe に聞けなかったときは、直前に分かっていた結果を使い、なければ使えないことにする
    console.error("[billing] 契約を確かめられませんでした", e);
    return hit?.active ?? false;
  }
}

/**
 * 催促をアプリにまかせる(自動でお知らせ)が使えるか。支払いの準備ができていなくても鍵をかけたままにする
 * (買う前は、見本だけのデモ版になる)。FUN_UNLOCK=1 のときは使える(持ち主の確認用)
 */
export async function hasFun(license: unknown): Promise<boolean> {
  if (cleanEnv(process.env.FUN_UNLOCK) === "1") return true;
  return proActive(license);
}

/** お会計のページを作り、その URL を返す。origin はこのサイトの URL、back は買ったあとに戻るページ */
export async function createProCheckout(origin: string, back: string): Promise<string> {
  const params = new URLSearchParams({
    mode: "subscription",
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": "jpy",
    "line_items[0][price_data][unit_amount]": String(proPrice()),
    "line_items[0][price_data][recurring][interval]": "month",
    "line_items[0][price_data][product_data][name]": "Tsudoro 有料プレミアム",
    // Stripe の Managed Payments(最初からオン)では、商品の税コードが必要。電子的に提供するサービス(一般)
    "line_items[0][price_data][product_data][tax_code]": "txcd_10000000",
    "metadata[kind]": "pro",
    "subscription_data[metadata][kind]": "pro",
    success_url: `${origin}/pro/done?session={CHECKOUT_SESSION_ID}&back=${encodeURIComponent(back)}`,
    cancel_url: `${origin}${back}`,
  });
  const session = await stripe("/checkout/sessions", { method: "POST", body: params.toString() });
  if (typeof session.url !== "string") throw new Error("stripe: お会計のページの URL がありません");
  return session.url;
}

function isPaidPro(session: Record<string, unknown>): boolean {
  return session.payment_status === "paid" && (session.metadata as Record<string, string> | undefined)?.kind === "pro";
}

/** 支払いが済んでいれば、端末に渡す鍵を返す */
export async function licenseForSession(sessionId: string): Promise<string | null> {
  const secret = licenseSecret();
  if (!secret || !/^cs_[A-Za-z0-9_]+$/.test(sessionId)) return null;
  const session = await stripe(`/checkout/sessions/${encodeURIComponent(sessionId)}`);
  return isPaidPro(session) ? signLicense(sessionId, secret) : null;
}

/** 買ったときのメールアドレスから、続いている契約を探して鍵を返す(別の端末で使うとき) */
export async function licenseForEmail(email: string): Promise<string | null> {
  const secret = licenseSecret();
  if (!secret) return null;
  const customers = await stripe(`/customers?email=${encodeURIComponent(email)}&limit=10`);
  for (const c of (customers.data as { id: string }[] | undefined) ?? []) {
    const sessions = await stripe(`/checkout/sessions?customer=${encodeURIComponent(c.id)}&limit=20`);
    for (const s of ((sessions.data as Record<string, unknown>[] | undefined) ?? []).filter(isPaidPro)) {
      if (typeof s.id !== "string") continue;
      const license = signLicense(s.id, secret);
      if (await proActive(license)) return license;
    }
  }
  return null;
}

/** 契約の確認・解約のページ(Stripe のカスタマーポータル)を開く URL。Stripe のダッシュボードで、ポータルを有効にしておく必要がある */
export async function billingPortalUrl(license: unknown, returnUrl: string): Promise<string | null> {
  const secret = licenseSecret();
  if (!billingEnabled() || !secret || !verifyLicense(license, secret)) return null;
  const sessionId = (license as string).slice(0, (license as string).lastIndexOf("."));
  const session = await stripe(`/checkout/sessions/${encodeURIComponent(sessionId)}`);
  const customer = typeof session.customer === "string" ? session.customer : null;
  if (!customer) return null;
  const portal = await stripe("/billing_portal/sessions", {
    method: "POST",
    body: new URLSearchParams({ customer, return_url: returnUrl }).toString(),
  });
  return typeof portal.url === "string" ? portal.url : null;
}
