// お店選びの画面に出す広告の枠(2026-11-25)。
// いまは Tsudoro+ でお金を取らず、使う人を増やしてから広告で収益にする方針。
// 広告を載せるときは、下の ADS に1件足すだけ(広告主が決まるまでは空で、画面には何も出ない)。
// リンクは「広告」と分かるよう、枠に「PR」を付け、rel="sponsored nofollow" で開く(ステルスマーケティングの規制)

export type Ad = {
  id: string;
  /** 見出し(例: 「二次会は、カラオケでどうですか?」) */
  title: string;
  /** 説明(1〜2行) */
  body: string;
  /** 飛び先。提携リンクならそのまま入れる */
  href: string;
  /** ボタンの文字 */
  cta: string;
  /** 広告主の名前(「提供: ○○」と枠に出す) */
  sponsor: string;
};

export const ADS: Ad[] = [];

/** 出す広告を1つ選ぶ(なければ null)。同じ画面では同じ広告になるよう、key で決める */
export function pickAd(key: string, ads: Ad[] = ADS): Ad | null {
  if (ads.length === 0) return null;
  let h = 0;
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return ads[h % ads.length];
}
