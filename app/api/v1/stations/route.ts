import { searchStations } from "@/app/actions";

/** 駅を名前で探す(全国)。?q=仙台 */
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q") ?? "";
  return Response.json({ ok: true, stations: await searchStations(q) });
}
