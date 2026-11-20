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

/** NGワードゲームの言葉。会話の中で、つい言ってしまいそうな、ふつうの言葉(30個。1人に1つずつ、重ならないように配る) */
export const NG_WORDS = [
  "確かに", "ていうか", "やばい", "マジで", "なるほど", "ほんと", "ちょっと", "たぶん", "とりあえず", "でも",
  "ごめん", "いや", "ありがとう", "おいしい", "楽しい", "好き", "すごい", "わかる", "それな", "かわいい",
  "たしかに", "だから", "うん", "えっと", "そうそう", "はい", "ねえ", "どうしよう", "最近", "今日",
];

/** NGワードゲーム。全員に、重ならないNGワードを1つずつ配る(自分のNGワードを会話で言ったら、アウト) */
export function ngWords(names: readonly string[], rand: Rand = Math.random): { name: string; word: string }[] {
  const words = shuffle(NG_WORDS, rand);
  return names.map((name, i) => ({ name, word: words[i % words.length] }));
}
