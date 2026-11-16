import { isFormal, type Audience } from "./audience";
import { yen } from "./sendai";

// 有料パックの「ひとりずつ催促」。集金のページで、まだ払っていない人ごとに、金額と払い方(PayPay の送金リンク)入りの文を作る。
// Tsudoro はお金を預からない。リンクは幹事が自分の PayPay で作ったものを、文に入れるだけ。純粋関数

/** 回数ごとの言い方。1回目はやわらかく、最後は期限をはっきり。責める言い方にはしない */
export type Tone = "soft" | "normal" | "last";

export const TONES: { key: Tone; label: string }[] = [
  { key: "soft", label: "1回目(やわらかく)" },
  { key: "normal", label: "2回目" },
  { key: "last", label: "最後のお願い" },
];

/** これまでに送った回数から、次の言い方を決める */
export function toneFor(sent: number): Tone {
  return sent <= 0 ? "soft" : sent === 1 ? "normal" : "last";
}

/** PayPay の送金・受け取りリンクだけを通す(幹事が送る文に入るので、ほかのサイトへの誘導は入れない) */
const PAY_HOSTS = ["paypay.ne.jp", "qr.paypay.ne.jp", "pay.paypay.ne.jp"];

/** 入力された払い方のリンクを確かめる。使えるときはきれいにした URL、使えないときは null(空は null) */
export function cleanPayLink(input: string): string | null {
  const t = input.trim();
  if (!t || t.length > 200 || /\s/.test(t)) return null;
  try {
    const u = new URL(t);
    if (u.protocol !== "https:" || !PAY_HOSTS.includes(u.hostname) || u.pathname.length < 2) return null;
    // 送る文に余計なものが付かないよう、アドレスの後ろの飾り(#以降)は落とす
    u.hash = "";
    return u.toString();
  } catch {
    return null;
  }
}

export type ReminderInput = {
  audience: Audience;
  title: string;
  name: string;
  amount: number;
  tone: Tone;
  /** cleanPayLink を通したもの。なければ「幹事に直接」と書く */
  payLink: string | null;
  /** 集金のページ(金額と、払ったかどうかを見られる) */
  pageUrl: string;
};

/** 1人ぶんの催促の文。会社の会は敬語、ほかは友達の言い方 */
export function personalReminder({ audience, title, name, amount, tone, payLink, pageUrl }: ReminderInput): string {
  const formal = isFormal(audience);
  const what = title.trim() ? `「${title.trim()}」` : formal ? "先日の会" : "この前の飲み会";
  const how = payLink ? (formal ? `お支払いはこちらからお願いいたします。\n${payLink}` : `払うのはここからできるよ\n${payLink}`) : formal ? "お手すきの際に、幹事までお支払いください。" : "会ったときでもいいよ";
  const page = formal ? `金額の確認はこちらです。\n${pageUrl}` : `金額の確認はこれ\n${pageUrl}`;
  const amountText = yen(amount);

  if (formal) {
    const lead = tone === "soft" ? `お疲れさまです。${what}のお会計のご連絡です。` : tone === "normal" ? `お疲れさまです。${what}のお会計の件で、改めてご連絡いたします。` : `お疲れさまです。${what}のお会計につきまして、最後のご連絡です。`;
    const body = tone === "last" ? `${name}さんのお支払い ${amountText} が、まだ確認できておりません。恐れ入りますが、今週中にお願いできますでしょうか。` : `${name}さんのお支払いは ${amountText} です。`;
    return [lead, body, how, page, "行き違いでお済みの場合は、ご容赦ください。"].join("\n");
  }
  const lead = tone === "soft" ? `${name}さん、${what}のお会計のお知らせ!` : tone === "normal" ? `${name}さん、${what}のお会計、もう一回だけ送るね` : `${name}さん、${what}のお会計、最後のお願い!`;
  const body = tone === "last" ? `${amountText}、まだ確認できてなくて…今週中にお願いできるとうれしい` : `${amountText}です`;
  return [lead, body, how, page, "払ってたらごめん"].join("\n");
}

/** 全員そろったときの、お礼とまとめの文 */
export function doneText(audience: Audience, title: string, total: number): string {
  const what = title.trim() ? `「${title.trim()}」` : isFormal(audience) ? "先日の会" : "この前の飲み会";
  return isFormal(audience)
    ? `${what}のお会計(合計 ${yen(total)})は、全員分のお支払いを確認できました。ご協力ありがとうございました。`
    : `${what}のお会計(合計 ${yen(total)})、全員ぶん確認できました!ありがとう!`;
}
