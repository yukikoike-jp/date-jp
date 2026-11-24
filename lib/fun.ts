// 有料パックの「もりあげ道具」(席決め・ウソはどれ?・ルーレット)。純粋関数。
// 乱数は引数で渡せるようにして、テストで結果を固定できるようにする

export type Rand = () => number;

/** 見本の名前。有料パックを買う前の「デモ版」で、この名前だけを使う */
export const DEMO_NAMES = ["あおい", "いずみ", "うた", "えま", "おと", "かい"];

/** 入力の文字から名前の一覧にする。改行・カンマ・読点・空白で区切り、同じ名前は1つ、20文字・30人まで */
export function parseNames(text: string): string[] {
  const out: string[] = [];
  for (const raw of text.split(/[\n,、，;；]+/)) {
    const n = raw.trim().slice(0, 20);
    if (n && !out.includes(n)) out.push(n);
    if (out.length >= 30) break;
  }
  return out;
}

/** 並べ替え(Fisher-Yates)。元の配列は変えない */
export function shuffle<T>(items: readonly T[], rand: Rand = Math.random): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export type SeatLayout = "table" | "round" | "counter";

export const SEAT_LAYOUTS: { key: SeatLayout; label: string; note: string }[] = [
  { key: "table", label: "向かい合わせ", note: "長いテーブル。向かいにも人がいる" },
  { key: "round", label: "円卓", note: "丸いテーブルを囲む" },
  { key: "counter", label: "カウンター", note: "横一列に並ぶ" },
];

/**
 * 席決め。席の順に名前を入れた一覧を返す。
 * table = 手前の列と奥の列(奥は手前と同じか1席少ない)、round と counter = 1周・1列の順
 */
export type SeatPins = { top?: string | null; exit?: string | null };

/** 出口にいちばん近い席の番号(0から)。円卓は上座の向かい側、ほかは最後の席 */
export function seatExitIndex(layout: SeatLayout, count: number): number {
  return layout === "round" ? Math.floor(count / 2) : count - 1;
}

/**
 * 席の順に名前を並べる。席1が上座(奥)、出口に近い席が下座。
 * pins.top = 上座に座る人、pins.exit = 出口に近い席に座る人(幹事など)。ほかの人はシャッフル
 */
function arrange(names: readonly string[], layout: SeatLayout, rand: Rand, pins: SeatPins): string[] {
  const n = names.length;
  const top = pins.top && names.includes(pins.top) ? pins.top : null;
  const exit = pins.exit && pins.exit !== top && names.includes(pins.exit) ? pins.exit : null;
  const rest = shuffle(
    names.filter((x) => x !== top && x !== exit),
    rand,
  );
  const order: (string | null)[] = Array(n).fill(null);
  if (top && n > 0) order[0] = top;
  if (exit && n > 1) order[seatExitIndex(layout, n)] = exit;
  return order.map((x) => x ?? rest.shift() ?? "");
}

function toRows(order: string[], layout: SeatLayout): { rows: string[][] } {
  if (layout === "table") {
    const half = Math.ceil(order.length / 2);
    return { rows: [order.slice(0, half), order.slice(half)] };
  }
  return { rows: [order] };
}

export function seatPlan(names: readonly string[], layout: SeatLayout, rand: Rand = Math.random, pins: SeatPins = {}): { rows: string[][] } {
  return toRows(arrange(names, layout, rand, pins), layout);
}

/** 机(卓)の数の上限。1卓に2人はいるようにする */
export function maxTables(count: number): number {
  return Math.max(1, Math.min(8, Math.floor(count / 2)));
}

/**
 * 机がいくつかあるときの席決め(2026-11-21)。人数はできるだけ同じにする(差は1人まで)。
 * 上座の人は1卓目の席1、出口に近い席の人は最後の卓の出口の席
 */
export function seatTables(names: readonly string[], layout: SeatLayout, tables: number, rand: Rand = Math.random, pins: SeatPins = {}): { rows: string[][] }[] {
  const n = names.length;
  const t = Math.max(1, Math.min(Math.floor(tables) || 1, maxTables(n)));
  if (t === 1) return [seatPlan(names, layout, rand, pins)];
  const top = pins.top && names.includes(pins.top) ? pins.top : null;
  const exit = pins.exit && pins.exit !== top && names.includes(pins.exit) ? pins.exit : null;
  const rest = shuffle(
    names.filter((x) => x !== top && x !== exit),
    rand,
  );
  const out: { rows: string[][] }[] = [];
  for (let i = 0; i < t; i++) {
    const size = Math.floor(n / t) + (i < n % t ? 1 : 0);
    const seats: (string | null)[] = Array(size).fill(null);
    if (i === 0 && top) seats[0] = top;
    if (i === t - 1 && exit) seats[seatExitIndex(layout, size)] = exit;
    out.push(toRows(seats.map((x) => x ?? rest.shift() ?? ""), layout));
  }
  return out;
}

/** 「ウソはどれ?」のお題。会社の会でも話しやすい、仕事と私生活の軽いこと(2026-11-21) */
export const LIE_THEMES = [
  "休みの日のすごし方",
  "子どものころの話",
  "好きな食べもの・苦手な食べもの",
  "行ったことのある場所",
  "最近ハマっていること",
  "学生時代の部活・サークル",
  "はじめてのアルバイト・仕事",
  "朝のすごし方",
  "特技・意外な一面",
  "最近買ってよかったもの",
  "家族・ペットの話",
  "これまでの失敗談",
];

/** 名前の一覧から1人を選ぶ(ルーレット)。選んだ人の番号を返す。いなければ -1 */
export function pickIndex(count: number, rand: Rand = Math.random): number {
  return count <= 0 ? -1 : Math.floor(rand() * count);
}
