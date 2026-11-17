import { shuffle, type Rand } from "./fun";

// 有料プレミアムの飲み会ゲーム(真実か挑戦・ワードウルフ)。純粋関数。お題は、だれでも楽しめる軽いものだけにする
// (人を傷つける・体に負担がかかる・お酒を強いるものは入れない)

export type Level = "soft" | "spicy";
export const LEVELS: { key: Level; label: string; note: string }[] = [
  { key: "soft", label: "ゆるめ", note: "初めての人がいても大丈夫" },
  { key: "spicy", label: "ちょい攻め", note: "仲のいい人どうしで" },
];

export const TRUTHS: Record<Level, string[]> = {
  soft: [
    "最近、いちばん笑ったことは?",
    "子どものころの、将来の夢は?",
    "いま、ハマっているものは?",
    "人生でいちばんおいしかったごはんは?",
    "休みの日は、だいたい何をしてる?",
    "ひとりで行ってみたい場所は?",
    "最近買って、よかったものは?",
    "朝型?夜型?いつもの1日を教えて",
    "いちばん長く続けている習慣は?",
    "友だちに、よく言われる口ぐせは?",
    "いま、いちばん食べたいものは?",
    "旅行に行くなら、国内?海外?どこ?",
    "最近、ちょっと感動したことは?",
    "子どものころ、好きだったテレビ番組は?",
    "カラオケの、十八番の曲は?",
  ],
  spicy: [
    "最近、ちょっと恥ずかしかった失敗は?",
    "この中で、一緒に旅行に行くなら誰?(理由も)",
    "人に言えない、小さなこだわりは?",
    "初対面の印象が、いまと一番変わった人は誰?",
    "最後に泣いたのは、いつ?何で?",
    "いままででいちばん、見栄をはったことは?",
    "もし1日だけ入れ替われるなら、この中の誰?",
    "最近、こっそりやっている、ちょっとダメな習慣は?",
    "自分で、ここはモテると思うところは?",
    "いままでで一番、ドキッとした出来事は?",
    "この中で、いちばん意外な一面を持っていそうな人は?",
    "人生でいちばん、勇気を出したことは?",
    "友だちに、ずっと言えていない小さな秘密は?",
    "自分の性格で、直したいところは?",
    "一度は着てみたい、変わった服装は?",
  ],
};

export const DARES: Record<Level, string[]> = {
  soft: [
    "好きな動物のものまねを、3秒間する",
    "右隣の人の、いいところを3つ言う",
    "いま思いついた、一発ギャグをする",
    "30秒間、語尾に「にゃん」をつけて話す",
    "全員に、ひとことずつ感謝を伝える",
    "好きな食べものを、おいしそうに実況する",
    "いちばん最近の自撮りを、1枚だけ見せる",
    "みんなに向かって、乾杯の音頭をとる",
    "好きなアニメか映画の、名セリフを言う",
    "5秒で、右隣の人のものまねをする",
    "いまの気分を、ポーズで表す",
    "隣の人と、3秒間見つめ合って笑わずにいる",
    "自分のあだ名を、みんなに決めてもらう",
    "自分の特技を、1つ披露する",
    "今日いちばん楽しかったことを、大きな声で言う",
  ],
  spicy: [
    "好きなタイプを、3つのキーワードで言う",
    "最近の黒歴史を、1つ話す",
    "3分間、みんなの質問に「はい」としか答えられない",
    "いちばん意外だと思う人に、理由を添えて「ありがとう」を言う",
    "ものまねを、誰かのご指名で1つする",
    "初恋の思い出を、30秒で話す",
    "隣の人に、いまの気持ちを正直に一言伝える",
    "いま思いつく、いちばんおもしろい自己紹介をする",
    "全員から、1つずつ質問を受けて、すべてに答える",
    "いままでで一番はずかしかった話を、盛って話す",
    "好きな歌の、サビを1フレーズ歌う",
    "この中のだれかに、とっておきのお願いを1つする(無理のない範囲で)",
    "いちばん自信のある表情を、全員に見せる",
    "みんなに、自分のいいところを3つ聞く",
    "初対面だと思ってもらって、もう一度自己紹介をする",
  ],
};

export type CardKind = "truth" | "dare";

/** お題を1つ引く。すでに出たものは、全部出るまで出さない。全部出たら、はじめから。used は出たお題の番号 */
export function drawCard(kind: CardKind, level: Level, used: ReadonlySet<number>, rand: Rand = Math.random): { index: number; text: string; reset: boolean } {
  const list = (kind === "truth" ? TRUTHS : DARES)[level];
  let pool = list.map((_, i) => i).filter((i) => !used.has(i));
  const reset = pool.length === 0;
  if (reset) pool = list.map((_, i) => i);
  const index = pool[Math.floor(rand() * pool.length)];
  return { index, text: list[index], reset };
}

/** 次に当たる人を選ぶ。全員が1回ずつ当たるまで、同じ人は選ばない。done は当たった人の番号。全員当たったら、はじめから */
export function nextPlayer(count: number, done: ReadonlySet<number>, rand: Rand = Math.random): { index: number; reset: boolean } {
  let pool = Array.from({ length: count }, (_, i) => i).filter((i) => !done.has(i));
  const reset = pool.length === 0;
  if (reset) pool = Array.from({ length: count }, (_, i) => i);
  return { index: pool[Math.floor(rand() * pool.length)], reset };
}

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
