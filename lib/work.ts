// Support の道具(幹事メモの持ちものリストと、進行表)。純粋関数と文言

/** 幹事の持ちものリスト(当日までにやること)。チェックはこの端末にだけ残る */
export const CHECKLIST = [
  "お店の最終の人数を連絡した",
  "アレルギーや苦手な食べものを伝えた",
  "席順を決めた",
  "乾杯のごあいさつをお願いした",
  "締めのごあいさつをお願いした",
  "会計と領収書の宛名を確認した",
  "二次会をやるか決めた",
  "当日の連絡手段をみんなに伝えた",
];

/** 進行表の1行 */
export type Step = { at: number; label: string };

/**
 * 会の進行表。start = 開始(分)、minutes = 会の長さ(分)。
 * 開会、乾杯、ご歓談、〆のごあいさつ(終わる20分前)、お開きの順に、時刻つきで返す
 */
export function timeline(start: number, minutes: number): Step[] {
  const end = start + minutes;
  const closing = Math.max(start + 20, end - 20);
  return [
    { at: start, label: "開会・幹事のごあいさつ" },
    { at: start + 10, label: "乾杯のごあいさつ・乾杯" },
    { at: start + 20, label: "ご歓談" },
    { at: closing, label: "締めのごあいさつ・集合写真" },
    { at: end, label: "お開き" },
  ];
}
