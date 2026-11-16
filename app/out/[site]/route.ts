import { NextResponse } from "next/server";
import { otherSites } from "@/lib/otherSites";
import { getStore } from "@/lib/store";

// ほかの予約サイト(一休・オズモール)へ飛ばす。押された数を数えてから、提携リンクへ移る。
// 飛ばす先は、こちらで決めた提携リンクだけ(外から渡された URL には飛ばさない)。
// ?s = 駅の名前(検索に使う)、?p = 会の id(「お店を探す」から来たときはなし)
export async function GET(request: Request, ctx: RouteContext<"/out/[site]">) {
  const { site } = await ctx.params;
  const url = new URL(request.url);
  const raw = url.searchParams.get("s")?.trim() ?? "";
  const station = raw && raw.length <= 12 && !/[<>"'&\/\\]/.test(raw) ? raw : null;
  const target = otherSites(station).find((x) => x.key === site);
  if (!target) return NextResponse.redirect(new URL("/shops", request.url));

  const store = getStore();
  const p = url.searchParams.get("p");
  const party = p && /^[A-Za-z0-9_-]{1,40}$/.test(p) ? await store.getParty(p).catch(() => null) : null;
  // 数えるときは、お店の id の代わりに「site:一休」のような名前で残す
  await store.logShopClick(party?.id ?? null, `site:${site}`).catch((e) => console.error("[out] 数えられませんでした", e));
  return NextResponse.redirect(target.href, { headers: { "X-Robots-Tag": "noindex, nofollow", "Cache-Control": "no-store" } });
}
