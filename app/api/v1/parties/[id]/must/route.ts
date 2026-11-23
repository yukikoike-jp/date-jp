import { setMust } from "@/app/actions";
import { badBody, bearer, body, reply } from "../../../http";

/** 必ず来てほしい人を置き換える(幹事だけ)。ボディ { names: string[] } */
export async function PUT(request: Request, ctx: RouteContext<"/api/v1/parties/[id]/must">) {
  const { id } = await ctx.params;
  const b = await body(request);
  if (!b) return badBody();
  return reply(await setMust(id, bearer(request), b.names as string[]));
}
