// 前のアドレス(date-jp.vercel.app など)から、新しいアドレス(tsudoro.com)へ、この端末の保存内容を引き継ぐ。
// ブラウザの保存はアドレスごとに別々なので、前のアドレスで作った会(幹事の鍵)や回答の記録を、そのままでは新しいアドレスで使えない。
// 引き継ぐのは、このアプリが使う名前(nomi: / date: で始まるもの)だけ。新しいアドレスに同じものがあれば、消さずにまぜる

export const NEW_ORIGIN = "https://www.tsudoro.com";

/** 引き継ぐ保存の名前か */
export function isOurKey(key: string): boolean {
  return key.startsWith("nomi:") || key.startsWith("date:");
}

/** id を持つものの一覧(作った会・集金・お気に入り)は、id でまとめる */
const LIST_KEYS = new Set(["nomi:parties", "nomi:collections", "nomi:favorites"]);

function parseList(raw: string | null): { id: string }[] | null {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x) => x && typeof x.id === "string") : null;
  } catch {
    return null;
  }
}

/**
 * 引き継ぐ内容(incoming)を、いまの保存(current)にまぜた結果を返す。
 * 一覧は id でまとめ(いまのものを先に、足りないものを後ろに)、ほかは、いまの保存にないものだけを入れる
 */
export function mergeStorage(current: Record<string, string>, incoming: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(incoming)) {
    if (!isOurKey(key) || typeof value !== "string") continue;
    if (LIST_KEYS.has(key)) {
      const mine = parseList(current[key] ?? null);
      const theirs = parseList(value);
      if (mine === null || theirs === null) continue;
      const seen = new Set(mine.map((x) => x.id));
      const merged = [...mine, ...theirs.filter((x) => !seen.has(x.id))];
      if (merged.length !== mine.length) out[key] = JSON.stringify(merged);
      continue;
    }
    if (current[key] === undefined) out[key] = value;
  }
  return out;
}

/** URL の # の後ろに載せる形にする(日本語も壊れないよう、UTF-8 にしてから base64url) */
export function encodeMove(data: Record<string, string>): string {
  const bytes = new TextEncoder().encode(JSON.stringify(data));
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeMove(text: string): Record<string, string> | null {
  try {
    const b64 = text.replace(/-/g, "+").replace(/_/g, "/");
    const bin = atob(b64 + "===".slice((b64.length + 3) % 4));
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    const v = JSON.parse(new TextDecoder().decode(bytes));
    if (!v || typeof v !== "object" || Array.isArray(v)) return null;
    return Object.fromEntries(Object.entries(v).filter(([k, x]) => isOurKey(k) && typeof x === "string")) as Record<string, string>;
  } catch {
    return null;
  }
}
