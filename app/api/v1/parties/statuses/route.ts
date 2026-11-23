import { partyStatuses } from "@/app/actions";
import { badBody, body } from "../../http";

/** 作った会の一覧に出す、決まったかどうかと答えた人数。ボディ { ids: string[] }(30件まで) */
export async function POST(request: Request) {
  const b = await body(request);
  if (!b) return badBody();
  return Response.json({ ok: true, statuses: await partyStatuses(b.ids as string[]) });
}
