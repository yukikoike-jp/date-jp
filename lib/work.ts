// Support の道具(幹事メモの持ちものリストと、進行表)。純粋関数と文言

/** 幹事の持ちものリスト(当日までにやること)。チェックはこの端末にだけ残る */
// 2026-11-22: プライベートでも仕事でも、どの幹事もやることだけにしぼった(あいさつ・領収書などの会社だけのものは外した)
export const CHECKLIST = [
  "人数をお店に伝えた(当日の増減も)",
  "苦手な食べもの・アレルギーを聞いた",
  "集合の時間と場所をみんなに送った",
  "会費(1人いくら)をみんなに伝えた",
  "予約の名前とお店の電話番号を控えた",
  "乾杯のひとことを誰にするか決めた",
  "二次会をやるか決めた",
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
