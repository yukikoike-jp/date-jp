import { partyAttendees } from "@/app/actions";
import { bearer, notFound } from "../../../http";

/** 会計に読み込む、決まった日に行く人(幹事だけ)。名前と、お酒を飲まないかだけ */
export async function GET(request: Request, ctx: RouteContext<"/api/v1/parties/[id]/attendees">) {
  const { id } = await ctx.params;
  const result = await partyAttendees(id, bearer(request));
  if (!result) return notFound("決まった会が見つからないか、幹事の鍵が合いません");
  return Response.json({ ok: true, ...result });
}
