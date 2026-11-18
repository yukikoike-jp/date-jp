import { createHmac, timingSafeEqual } from "node:crypto";

// 買い切りの「会計・集金の全部の機能」を、ログインなしで覚えておくための鍵。
// 支払いの id(Stripe のお会計の id)に、サーバーだけが知る秘密で署名したものを、端末に保存してもらう。
// DB には何も残さない。偽物は署名が合わないので通らない

function sign(sessionId: string, secret: string): string {
  return createHmac("sha256", secret).update(`pro:${sessionId}`).digest("base64url");
}

/** 鍵を作る。「支払いの id.署名」の形 */
export function signLicense(sessionId: string, secret: string): string {
  return `${sessionId}.${sign(sessionId, secret)}`;
}

/** 確認メールのリンクに入れる合言葉。鍵と期限(ミリ秒)を入れて署名する。30分で切れる */
export function signRestoreToken(license: string, secret: string, now = Date.now(), ttlMs = 30 * 60 * 1000): string {
  const body = Buffer.from(JSON.stringify({ l: license, e: now + ttlMs })).toString("base64url");
  return `${body}.${createHmac("sha256", secret).update(`restore:${body}`).digest("base64url")}`;
}

/** 確認メールのリンクの合言葉から、鍵を取り出す。署名が合わない・期限切れ・中の鍵が偽物なら null */
export function licenseFromRestoreToken(token: unknown, secret: string, now = Date.now()): string | null {
  if (typeof token !== "string" || token.length > 1000) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const a = Buffer.from(token.slice(dot + 1));
  const b = Buffer.from(createHmac("sha256", secret).update(`restore:${body}`).digest("base64url"));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const { l, e } = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as { l?: unknown; e?: unknown };
    if (typeof e !== "number" || now > e) return null;
    return verifyLicense(l, secret) ? (l as string) : null;
  } catch {
    return null;
  }
}

/** 鍵が本物か。形がおかしいもの、署名が合わないものは false */
export function verifyLicense(license: unknown, secret: string): boolean {
  if (typeof license !== "string" || license.length > 300) return false;
  const dot = license.lastIndexOf(".");
  if (dot <= 0) return false;
  const sessionId = license.slice(0, dot);
  if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId)) return false;
  const a = Buffer.from(license.slice(dot + 1));
  const b = Buffer.from(sign(sessionId, secret));
  return a.length === b.length && timingSafeEqual(a, b);
}
