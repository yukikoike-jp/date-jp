// アプリ(Flutter)向け API の共通の部品。中身は app/actions.ts の関数を呼ぶだけにして、ロジックを2か所に書かない

type Result = { ok: true } | { ok: false; error: string };

/** 関数の結果を JSON で返す。失敗は 400(見つからないときは呼ぶ側で notFound を使う) */
export function reply<T extends Result>(result: T, okStatus = 200): Response {
  return Response.json(result, { status: result.ok ? okStatus : 400 });
}

export function notFound(error: string): Response {
  return Response.json({ ok: false, error }, { status: 404 });
}

/** 幹事の鍵(Authorization: Bearer 〜)。なければ空文字(照合で必ず落ちる) */
export function bearer(request: Request): string {
  const h = request.headers.get("authorization") ?? "";
  return h.startsWith("Bearer ") ? h.slice(7).trim() : "";
}

/** ボディの JSON。読めなければ null */
export async function body(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const v: unknown = await request.json();
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** Response は1回しか読めないので、毎回作る */
export function badBody(): Response {
  return Response.json({ ok: false, error: "送った内容を読めませんでした" }, { status: 400 });
}
