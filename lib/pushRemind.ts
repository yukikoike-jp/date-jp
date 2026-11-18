import { yen } from "./sendai";
import type { Collection, PushSub, Store } from "./store/types";

// 有料プレミアムの「自動でお知らせ」。払っていない人に、幹事ではなく Tsudoro が通知で知らせる(幹事が頼む側にならない)。
// 通知を受け取れるのは、集金のページで自分の名前を選び、「通知をオン」にした人だけ。連絡先は持たない。
// 1日1回動く定期ジョブ(app/api/cron/remind)が、ここの判定で送る

const DAY = 24 * 60 * 60 * 1000;
/** 自動でお知らせをオンにしてから、何日目に通知するか(まだ払っていなければ) */
export const REMIND_DAYS = [1, 3, 7];
/** 続けて通知するときの、最小の間隔(定期ジョブの時刻のずれを見込んで、1日より少し短く) */
const MIN_GAP = 20 * 60 * 60 * 1000;

/** 送ってよい時期か。オンにした日から数えて、決めた日数を過ぎるたびに1回ずつ。続けて送る間隔は空ける */
export function isDue(autoRemindAt: number, now: number, sentCount: number, lastSentAt: number | null): boolean {
  const passed = REMIND_DAYS.filter((d) => now - autoRemindAt >= d * DAY).length;
  if (sentCount >= REMIND_DAYS.length || sentCount >= passed) return false;
  return lastSentAt === null || now - lastSentAt >= MIN_GAP;
}

/** 通知の文。回数が増えるほど、はっきり言う。幹事の名前は出さない(アプリからのお知らせ) */
export function notificationText(sentCount: number, title: string, amount: number): { title: string; body: string } {
  const what = title.trim() ? `「${title.trim()}」のお会計` : "お会計";
  if (sentCount <= 0) return { title: what, body: `${yen(amount)}がまだのようです。払い方はタップして見られます` };
  if (sentCount === 1) return { title: what, body: `もう一度お知らせです。${yen(amount)}がまだ確認できていません` };
  return { title: what, body: `最後のお知らせです。${yen(amount)}がまだ確認できていません。今週中にお願いします` };
}

/** ブラウザから届いた通知の宛先を確かめる。https の宛先と、決まった形の鍵だけを通す */
export function parsePushSub(input: unknown): { endpoint: string; p256dh: string; auth: string } | null {
  const v = input as { endpoint?: unknown; p256dh?: unknown; auth?: unknown } | null;
  if (!v || typeof v.endpoint !== "string" || typeof v.p256dh !== "string" || typeof v.auth !== "string") return null;
  if (v.endpoint.length > 700 || !/^https:\/\/[^\s]+$/.test(v.endpoint)) return null;
  const key = /^[A-Za-z0-9_-]{16,200}={0,2}$/;
  if (!key.test(v.p256dh) || !key.test(v.auth)) return null;
  return { endpoint: v.endpoint, p256dh: v.p256dh, auth: v.auth };
}

export type SendResult = "ok" | "gone" | "error";
export type Sender = (sub: PushSub, payload: { title: string; body: string; url: string }) => Promise<SendResult>;

/** 払っていない人のうち、通知を受け取れる端末に、時期が来たものを送る。送った数などを返す */
export async function runReminders(deps: { store: Store; send: Sender; now: number; origin?: string }): Promise<{ collections: number; sent: number; removed: number; failed: number }> {
  const { store, send, now } = deps;
  const out = { collections: 0, sent: 0, removed: 0, failed: 0 };
  const cols: Collection[] = await store.listAutoRemind();
  for (const c of cols) {
    if (c.autoRemindAt === undefined) continue;
    out.collections += 1;
    const subs = await store.listPushSubs(c.id);
    for (const sub of subs) {
      const person = c.people.find((p) => p.id === sub.personId);
      // 幹事・知らない人・もう払い終わった人には送らない
      if (!person || person.organizer || c.payments[person.id]?.by === "host") continue;
      if (!isDue(c.autoRemindAt, now, sub.sentCount, sub.lastSentAt)) continue;
      const { title, body } = notificationText(sub.sentCount, c.title, person.amount);
      const r = await send(sub, { title, body, url: `/c/${c.id}` });
      if (r === "ok") {
        await store.markPushSent(c.id, sub.personId, sub.endpoint, now);
        out.sent += 1;
      } else if (r === "gone") {
        await store.removePushSub(c.id, sub.personId, sub.endpoint);
        out.removed += 1;
      } else out.failed += 1;
    }
  }
  return out;
}
