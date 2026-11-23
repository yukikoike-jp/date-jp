import { saveAnswer } from "@/app/actions";
import { badBody, body, reply } from "../../../http";

/**
 * 答える・直す。ボディ { answer: {...}, answerId?, token? }。
 * 直すときは、前に返した answerId と token(本人の鍵)を付ける。鍵が合わなければ、新しい回答として保存する(今の Web と同じ)
 */
export async function POST(request: Request, ctx: RouteContext<"/api/v1/parties/[id]/answers">) {
  const { id } = await ctx.params;
  const b = await body(request);
  if (!b || !b.answer || typeof b.answer !== "object" || Array.isArray(b.answer)) return badBody();
  const mine = typeof b.answerId === "string" && typeof b.token === "string" ? { answerId: b.answerId, token: b.token } : null;
  return reply(await saveAnswer(id, mine, b.answer as Record<string, unknown>));
}
