import { decide } from "@/app/actions";
import { badBody, bearer, body, reply } from "../../../http";

/** 日にちとお店を決める(幹事だけ)。ボディ { date, shopId } 。{ clear: true } で決定を取り消す */
export async function POST(request: Request, ctx: RouteContext<"/api/v1/parties/[id]/decision">) {
  const { id } = await ctx.params;
  const b = await body(request);
  if (!b) return badBody();
  const choice = b.clear === true ? null : { date: b.date as string, shopId: typeof b.shopId === "string" ? b.shopId : null };
  return reply(await decide(id, bearer(request), choice));
}
