// 画面で起きたエラーを、Vercel の記録(ログ)に残す。
// 受け取るのはエラーの文と、どのページかだけ(名前や回答の中身は送らない)。長すぎるものは切る
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { message?: unknown; digest?: unknown; path?: unknown };
    const s = (v: unknown, n: number) => (typeof v === "string" ? v.slice(0, n) : "");
    console.error("[client-error]", JSON.stringify({ message: s(body.message, 300), digest: s(body.digest, 40), path: s(body.path, 120) }));
  } catch {
    // 読めないものは捨てる
  }
  return new Response(null, { status: 204 });
}
