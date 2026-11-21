import { shuffle, type Rand } from "./fun";

// 飲み会ゲーム(ワードウルフ・NGワード)。純粋関数。お題は、だれでも楽しめる軽いものだけにする
// (人を傷つける・体に負担がかかる・お酒を強いるものは入れない)

/** ワードウルフのお題の組。多数派と少数派(ウルフ)に、近いけれど違う言葉を配る */
export const WORD_PAIRS: [string, string][] = [
  ["カレー", "シチュー"],
  ["ラーメン", "うどん"],
  ["コーヒー", "紅茶"],
  ["犬", "猫"],
  ["海", "プール"],
  ["ビール", "ハイボール"],
  ["電車", "バス"],
  ["スマホ", "タブレット"],
  ["サッカー", "ラグビー"],
  ["夏", "冬"],
  ["寿司", "おにぎり"],
  ["映画館", "遊園地"],
  ["東京", "大阪"],
  ["図書館", "本屋"],
  ["コンビニ", "スーパー"],
  ["お花見", "花火"],
  ["ギター", "ピアノ"],
  ["やきとり", "から揚げ"],
  ["カラオケ", "ボウリング"],
  ["温泉", "サウナ"],
  ["ケーキ", "プリン"],
  ["朝ごはん", "夜食"],
  ["先生", "コーチ"],
  ["布団", "ベッド"],
];

export type WolfDeal = { name: string; word: string };

/** ワードウルフ。1人だけ違う言葉(ウルフ)を配る。どちらの言葉を多数派にするかも、くじで決める */
export function wordWolf(names: readonly string[], rand: Rand = Math.random): { deals: WolfDeal[]; wolf: string; majorityWord: string; wolfWord: string } {
  const pair = WORD_PAIRS[Math.floor(rand() * WORD_PAIRS.length)];
  const flip = rand() < 0.5;
  const [majorityWord, wolfWord] = flip ? [pair[1], pair[0]] : pair;
  const order = shuffle(names, rand);
  const wolf = order[0];
  return { deals: names.map((name) => ({ name, word: name === wolf ? wolfWord : majorityWord })), wolf, majorityWord, wolfWord };
}

/** 「せーの!」のお題。全員が同時に答えを言い、同じ答えの人が多いほど成功。だれでも答えやすく、会社の会でも気まずくならないもの(2026-11-21。NGワードの代わり。覚えることがない) */
export const SYNC_THEMES = [
  "赤い食べものといえば?", "夏といえば?", "コンビニで買うものといえば?", "朝ごはんといえば?", "居酒屋の最初の一品といえば?",
  "動物園の人気者といえば?", "冬の鍋といえば?", "日本一の山といえば?", "おにぎりの具といえば?", "黄色いものといえば?",
  "お寿司のネタといえば?", "遊園地の乗り物といえば?", "雨の日に持つものといえば?", "北海道の名物といえば?", "丸いものといえば?",
  "カレーの具といえば?", "お祭りの屋台といえば?", "スポーツといえば?", "白い食べものといえば?", "旅行に持っていくものといえば?",
];
