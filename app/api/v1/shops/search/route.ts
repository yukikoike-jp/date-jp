import { findShops } from "@/app/actions";
import { badBody, body } from "../../http";

/** お店を探す(「お店を探す」の画面と同じ条件)。ボディは findShops の入力と同じ。条件は選択肢の中だけを受け付ける */
export async function POST(request: Request) {
  const b = await body(request);
  if (!b) return badBody();
  const result = await findShops(b as unknown as Parameters<typeof findShops>[0]);
  // pr = お店のリンクが提携リンクか(アプリが「#アフィリエイト広告」を出す)。会のページと同じ
  return Response.json({ ok: true, ...result, pr: process.env.AFFILIATE_ON === "1" });
}
