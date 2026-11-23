import { createParty } from "@/app/actions";
import { badBody, body, reply } from "../http";

/** 会を作る。返す adminToken は幹事の鍵(DB にはハッシュだけを残す)。アプリが端末に保存する */
export async function POST(request: Request) {
  const b = await body(request);
  if (!b) return badBody();
  const result = await createParty({
    title: b.title as string,
    audience: b.audience as string,
    dates: b.dates as string[],
    start: b.start as number,
    via: b.via as string | undefined,
  });
  return reply(result, 201);
}
