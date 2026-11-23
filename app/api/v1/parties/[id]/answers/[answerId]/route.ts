import { getMyAnswer } from "@/app/actions";
import { notFound } from "../../../../http";

/** 自分の回答を読む(直すとき)。本人の鍵を X-Answer-Token ヘッダーで送る。予算は本人にだけ返す */
export async function GET(request: Request, ctx: RouteContext<"/api/v1/parties/[id]/answers/[answerId]">) {
  const { id, answerId } = await ctx.params;
  const answer = await getMyAnswer(id, answerId, request.headers.get("x-answer-token") ?? "");
  if (!answer) return notFound("回答が見つかりません");
  return Response.json({ ok: true, answer });
}
