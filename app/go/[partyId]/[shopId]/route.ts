import { NextResponse } from "next/server";
import { findShop } from "@/lib/shops";
import { getStore } from "@/lib/store";

// お店のページへ飛ばす。押された数を数えてから、お店のページへそのまま移動する。
// 飛ばす先は id から引いたお店のページだけ(外から渡された URL には飛ばさない)。
// 「お店を探す」から来たときは partyId が "search"。
// 紹介料のリンクは使わない(フリーミアムで行く)。ホットペッパーのアプリが入っている人は、
// ログイン済みのアプリでそのまま予約できるよう、アプリで開くのを止めない

export async function GET(request: Request, ctx: RouteContext<"/go/[partyId]/[shopId]">) {
  const { partyId, shopId } = await ctx.params;
  const fromSearch = partyId === "search";
  const back = new URL(fromSearch ? "/shops" : `/p/${encodeURIComponent(partyId)}#shops`, request.url);
  const store = getStore();
  const [party, shop] = await Promise.all([fromSearch ? null : store.getParty(partyId), findShop(shopId)]);
  if (!shop || (!fromSearch && !party)) return NextResponse.redirect(back);

  await store.logShopClick(party?.id ?? null, shop.id).catch((e) => console.error("[go] 数えられませんでした", e));
  if (!shop.url) return NextResponse.redirect(back);
  return NextResponse.redirect(shop.url, { headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" } });
}
