import { cleanEnv, cleanText } from "./env";

// メールを送る(Resend の API を使う)。いまは「ほかの端末で Plus を使う」ための確認メールだけ。
// RESEND_API_KEY と MAIL_FROM(例: Tsudoro <no-reply@tsudoro.com>。Resend で認証したドメインのアドレス)が要る

export function mailReady(): boolean {
  return cleanEnv(process.env.RESEND_API_KEY) !== null && cleanText(process.env.MAIL_FROM) !== null;
}

export async function sendMail(to: string, subject: string, text: string): Promise<boolean> {
  const key = cleanEnv(process.env.RESEND_API_KEY);
  const from = cleanText(process.env.MAIL_FROM);
  if (!key || !from) return false;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    cache: "no-store",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject, text }),
  });
  if (!res.ok) console.error("[mail] 送れませんでした", res.status, await res.text().catch(() => ""));
  return res.ok;
}
