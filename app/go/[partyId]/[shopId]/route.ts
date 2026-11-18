import { NextResponse } from "next/server";
import { browserShopUrl, findShop, referralUrl } from "@/lib/shops";
import { getStore } from "@/lib/store";

// お店のページへ飛ばす。押された数を数え、送客の手数料が付くリンクにする。
// 飛ばす先は id から引いたお店のページだけ(外から渡された URL には飛ばさない)。
// 「お店を探す」から来たときは partyId が "search"
//
// すぐにリダイレクト(302)すると、iPhone などでホットペッパーのアプリが勝手に開き、
// ブラウザで予約されないので紹介料が付かない。アプリの自動起動は「人が押した瞬間の移動」で起きるので、
// いったん短い画面を出し、少し間をおいてプログラムから移動して、ブラウザのまま予約ページを開く

/** HTML の属性や本文に入れても壊れないようにする */
function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function bridgePage(target: string, shopName: string, back: string): string {
  const href = escapeHtml(target);
  const backHref = escapeHtml(back);
  // スクリプトの中では、文字列として安全に埋め込む(</script> で閉じられないよう < も逃がす)
  const js = JSON.stringify(target).replace(/</g, "\\u003c");
  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>予約ページを開いています | Tsudoro</title>
<noscript><meta http-equiv="refresh" content="1;url=${href}"></noscript>
<style>
  html, body { margin: 0; height: 100%; background: #0b0a09; color: #f5efe6; font-family: "Hiragino Sans", "Noto Sans JP", system-ui, sans-serif; }
  main { min-height: 100%; display: grid; place-items: center; text-align: center; padding: 24px; box-sizing: border-box; }
  .glass { width: 44px; height: 56px; margin: 0 auto 18px; }
  .beer { transform-origin: 50% 100%; animation: pour 0.6s ease-out forwards; transform: scaleY(0); transform-box: fill-box; }
  @keyframes pour { to { transform: scaleY(1); } }
  h1 { font-size: 17px; margin: 0; }
  p { font-size: 13px; color: #a99c8a; margin: 10px 0 0; line-height: 1.7; }
  a { color: #f5b83d; }
  .back { position: fixed; top: max(12px, env(safe-area-inset-top)); left: 12px; display: inline-flex; align-items: center; gap: 4px; min-height: 44px; padding: 0 16px 0 10px; border-radius: 999px; background: #1f1c18; color: #f5efe6; font-size: 14px; font-weight: 700; text-decoration: none; border: 1px solid rgba(245,239,230,0.14); }
  .back svg { width: 18px; height: 18px; }
</style>
</head>
<body>
<a class="back" id="back" href="${backHref}">
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>
  Tsudoro に戻る
</a>
<main>
  <div>
    <svg class="glass" viewBox="0 0 44 56" aria-hidden="true">
      <path d="M6 6h32l-3.5 44a4 4 0 0 1-4 3.6H13.5a4 4 0 0 1-4-3.6z" fill="#f6ecd8"/>
      <path class="beer" d="M9.5 16h25l-2.8 33.5a2.5 2.5 0 0 1-2.5 2.2H14.8a2.5 2.5 0 0 1-2.5-2.2z" fill="#f5b83d"/>
    </svg>
    <h1>${escapeHtml(shopName)} の予約ページを開いています</h1>
    <p>そのままこのブラウザで予約できます。<br>開かないときは <a href="${href}" rel="nofollow noopener">こちら</a></p>
    <p>ホットペッパーのアプリが開いたあとは左上の「Tsudoro に戻る」で元の画面に戻れます</p>
  </div>
</main>
<script>
  // 戻るボタン。前の画面があればそこへ(選んだ条件などが残る)、なければ会やお店探しのページへ
  document.getElementById("back").addEventListener("click", function (e) {
    if (history.length > 1) { e.preventDefault(); history.back(); }
  });
  // 押した瞬間ではなく、少しあとにプログラムから移動する(アプリが勝手に開かないように)。
  // replace にして、戻るボタンでこの画面に戻ってこないようにする
  setTimeout(function () { location.replace(${js}); }, 400);
</script>
</body>
</html>`;
}

export async function GET(request: Request, ctx: RouteContext<"/go/[partyId]/[shopId]">) {
  const { partyId, shopId } = await ctx.params;
  const fromSearch = partyId === "search";
  const back = new URL(fromSearch ? "/shops" : `/p/${encodeURIComponent(partyId)}#shops`, request.url);
  const store = getStore();
  const [party, shop] = await Promise.all([fromSearch ? null : store.getParty(partyId), findShop(shopId)]);
  if (!shop || (!fromSearch && !party)) return NextResponse.redirect(back);

  await store.logShopClick(party?.id ?? null, shop.id).catch((e) => console.error("[go] 数えられませんでした", e));
  if (!shop.url) return NextResponse.redirect(back);
  return new Response(bridgePage(referralUrl(browserShopUrl(shop.url)), shop.name, back.pathname + back.hash), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
