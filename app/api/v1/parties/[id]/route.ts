import { normalizeAudience } from "@/lib/audience";
import { dietNotice } from "@/lib/diet";
import { decidedText, inviteText } from "@/lib/share";
import { SITE_URL } from "@/lib/site";
import { verifyToken } from "@/lib/tokens";
import { loadParty } from "@/lib/view";
import { bearer, notFound } from "../../http";

/**
 * 会の中身(集計・おすすめのお店・共有の文)。幹事と参加者で同じ中身を返す。
 * 1人ずつの予算は loadParty の時点で落ちている。adminHash は必ず除く。admin = 送られた幹事の鍵が合うか
 */
export async function GET(request: Request, ctx: RouteContext<"/api/v1/parties/[id]">) {
  const { id } = await ctx.params;
  const view = await loadParty(id);
  if (!view) return notFound("飲み会が見つかりません");
  const { adminHash, ...rest } = view;
  const { party } = rest;
  const audience = normalizeAudience(party.audience);
  const url = `${SITE_URL}/p/${party.id}`;
  return Response.json({
    ok: true,
    ...rest,
    admin: verifyToken(bearer(request), adminHash),
    // 予約のときにお店に伝えること(苦手なもの・お酒を飲まない人の数)。Web の幹事の画面と同じ
    notice: dietNotice(rest.summary.diet),
    // お店のリンクが提携リンクか。true なら「#アフィリエイト広告」を出す(components/PrNote.tsx と同じ決まり)
    pr: process.env.AFFILIATE_ON === "1",
    share: {
      invite: inviteText(party.title, url, party.start, audience),
      decided: party.decision ? decidedText(party.title, party.decision.date, party.decision.start, party.decision.shopName, url, audience) : null,
    },
  });
}
