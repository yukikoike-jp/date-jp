// 有料パックの「もりあげ道具」(席替え・チーム分け・王様ゲーム・ルーレット)。純粋関数。
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
 * 席替え。席の順に名前を入れた一覧を返す。
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

export function seatPlan(names: readonly string[], layout: SeatLayout, rand: Rand = Math.random, pins: SeatPins = {}): { rows: string[][] } {
  const order = arrange(names, layout, rand, pins);
  if (layout === "table") {
    const half = Math.ceil(order.length / 2);
    return { rows: [order.slice(0, half), order.slice(half)] };
  }
  return { rows: [order] };
}

export type KingDraw = { name: string; card: "王様" | number };

/** 王様ゲームのくじ。1人が王様、残りは 1〜(人数−1) の番号。誰が何を引いたかを返す */
export function kingGame(names: readonly string[], rand: Rand = Math.random): KingDraw[] {
  const cards: KingDraw["card"][] = ["王様", ...Array.from({ length: Math.max(0, names.length - 1) }, (_, i) => i + 1)];
  const dealt = shuffle(cards, rand);
  return names.map((name, i) => ({ name, card: dealt[i] }));
}

/** 王様の命令の例(だれでも楽しめる軽いもの) */
export const KING_ORDERS = [
  "◯番がみんなに乾杯の音頭をとる",
  "◯番がいまの気分を一言で言う",
  "◯番と◯番がグラスで軽く乾杯する",
  "◯番が最近いちばん笑ったことを話す",
  "◯番が好きな食べものを発表する",
  "◯番が右隣の人をほめる",
  "◯番が今日のおすすめの一品を決める",
  "◯番が次に行きたい場所を1つ言う",
  "◯番と◯番が席を交換する",
  "◯番がみんなの写真を撮る",
];

/** 名前の一覧から1人を選ぶ(ルーレット)。選んだ人の番号を返す。いなければ -1 */
export function pickIndex(count: number, rand: Rand = Math.random): number {
  return count <= 0 ? -1 : Math.floor(rand() * count);
}
