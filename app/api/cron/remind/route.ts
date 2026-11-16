import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { cleanEnv } from "@/lib/env";
import { runReminders } from "@/lib/pushRemind";
import { getStore } from "@/lib/store";
import { sendWebPush } from "@/lib/webpush";

// 1日1回、Vercel の定期ジョブが呼ぶ(vercel.json の crons)。「自動でお知らせ」がオンの集金で、時期が来た通知を送る。
// Vercel は、環境変数 CRON_SECRET があると「Authorization: Bearer 〜」を付けて呼ぶ。合わなければ断る

function authorized(request: Request): boolean {
  const secret = cleanEnv(process.env.CRON_SECRET);
  const header = request.headers.get("authorization") ?? "";
  if (!secret) return false;
  const a = Buffer.from(header);
  const b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request: Request) {
  if (!authorized(request)) return new NextResponse("unauthorized", { status: 401 });
  const result = await runReminders({ store: getStore(), send: sendWebPush, now: Date.now() });
  console.log("[cron/remind]", JSON.stringify(result));
  return NextResponse.json(result);
}
