import "server-only";
import { sendNotification, setVapidDetails } from "web-push";
import { cleanEnv } from "./env";
import type { Sender } from "./pushRemind";

// ブラウザの通知(Web Push)を送る。VAPID の鍵は環境変数(VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY)から読む。
// 鍵は `npx web-push generate-vapid-keys` で作る。鍵がそろっていなければ、通知は送れない(参加者の画面にも出さない)

export function vapidPublicKey(): string | null {
  return cleanEnv(process.env.VAPID_PUBLIC_KEY);
}

/** 通知を送る準備(鍵)ができているか。できていなければ、画面にも「自動でお知らせ」を出さない */
export function pushReady(): boolean {
  return vapidPublicKey() !== null && cleanEnv(process.env.VAPID_PRIVATE_KEY) !== null;
}

function configured(): boolean {
  const pub = vapidPublicKey();
  const priv = cleanEnv(process.env.VAPID_PRIVATE_KEY);
  if (!pub || !priv) return false;
  setVapidDetails(cleanEnv(process.env.VAPID_SUBJECT) ?? "mailto:tsudoro.jp@gmail.com", pub, priv);
  return true;
}

/** 通知の送り手。届かなくなった宛先(解除された・期限切れ)は "gone" を返す */
export const sendWebPush: Sender = async (sub, payload) => {
  if (!configured()) return "error";
  try {
    await sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload),
      { TTL: 60 * 60 * 24, urgency: "normal" },
    );
    return "ok";
  } catch (e) {
    const code = (e as { statusCode?: number }).statusCode;
    return code === 404 || code === 410 ? "gone" : "error";
  }
};
