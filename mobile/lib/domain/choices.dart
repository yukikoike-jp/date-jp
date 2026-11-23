// 回答の選択肢。Web の lib/sendai.ts・lib/diet.ts と同じ値(key はサーバーが確かめるので変えない)

typedef Option = ({String key, String label});

/// 苦手なもの・アレルギー(lib/diet.ts の AVOIDS)
const allergies = <Option>[
  (key: 'shrimp', label: 'えび・かに'),
  (key: 'soba', label: 'そば'),
  (key: 'milk', label: '乳製品'),
  (key: 'egg', label: '卵'),
  (key: 'wheat', label: '小麦'),
  (key: 'nuts', label: 'ナッツ・落花生'),
  (key: 'shellfish', label: '貝類'),
  (key: 'squid', label: 'いか・たこ'),
  (key: 'fish', label: '魚'),
  (key: 'soy', label: '大豆'),
  (key: 'sesame', label: 'ごま'),
  (key: 'fruit', label: '果物(キウイ・もも など)'),
];
const dislikes = <Option>[
  (key: 'raw', label: '生もの'),
  (key: 'spicy', label: '辛いもの'),
  (key: 'offal', label: 'ホルモン・レバー'),
  (key: 'lamb', label: '羊肉'),
  (key: 'coriander', label: 'パクチー'),
  (key: 'mushroom', label: 'きのこ'),
  (key: 'garlic', label: 'にんにく'),
  (key: 'cheese', label: 'チーズ'),
];

/// 食べたいもの(lib/sendai.ts の GENRES)
const genres = <Option>[
  (key: 'izakaya', label: '居酒屋'),
  (key: 'washoku', label: '和食'),
  (key: 'yoshoku', label: '洋食'),
  (key: 'chuka', label: '中華'),
  (key: 'yakiniku', label: '焼肉・韓国'),
  (key: 'bar', label: 'ダイニングバー'),
  (key: 'sosaku', label: '創作料理'),
  (key: 'ethnic', label: 'アジア料理'),
  (key: 'indian', label: 'インド料理'),
  (key: 'okonomiyaki', label: 'お好み焼き'),
  (key: 'takoyaki', label: 'たこ焼き'),
];

/// 予算の「こだわらない」
const unlimitedBudget = 1000000;

/// 答えで選べる予算。1,000〜15,000円を500円ごと、その上は20,000円と30,000円
final answerBudgets = [for (var i = 0; i < 29; i++) 1000 + i * 500, 20000, 30000];

/// 何時から来られるか(開始時刻が決まっていない前の会だけで聞く)
const arrivals = [1080, 1110, 1140, 1170, 1200, 1260];

const maxMemo = 100;
const maxAvoidNote = 30;

/// 1人の名前の長さ(lib/validation.ts)
const maxName = 20;

String yen(int n) {
  final s = n.toString().replaceAllMapped(RegExp(r'\B(?=(\d{3})+(?!\d))'), (_) => ',');
  return '$s円';
}

enum StayStep {
  first('一次会まで', '2時間ほど'),
  second('二次会まで', '23時ごろ'),
  train('終電まで', '0時ごろ'),
  last('最後まで', '最後までいられる');

  const StayStep(this.label, this.note);
  final String label;
  final String note;
}

/// 一次会の長さ(飲み放題の2時間。lib/sendai.ts の FIRST_PARTY_MINUTES)
const firstPartyMinutes = 120;

int _firstEnd(int? start) => start != null ? start + firstPartyMinutes : 1260;

/// 4つのうちの1つを、残れる時刻(分)にする(lib/sendai.ts の stayFromStep)
int stayFromStep(StayStep step, int? start) {
  final first = _firstEnd(start);
  final second = first + 60 > 1380 ? first + 60 : 1380;
  return switch (step) {
    StayStep.first => first,
    StayStep.second => second,
    StayStep.train => second + 30 > 1440 ? second + 30 : 1440,
    StayStep.last => 1800,
  };
}

/// 残れる時刻が4つのうちどれか。まだ選んでいなければ null(lib/sendai.ts の stayStep)
StayStep? stayStep(int stay, int? start) {
  if (stay == 0) return null;
  if (stay <= _firstEnd(start)) return StayStep.first;
  if (stay <= stayFromStep(StayStep.second, start)) return StayStep.second;
  if (stay <= stayFromStep(StayStep.train, start) + 60) return StayStep.train;
  return StayStep.last;
}

/// お店探しの予算(lib/audience.ts の budgets。プライベートと仕事で同じ)
const searchBudgets = [2000, 3000, 4000, 5000, 6000, 8000];

/// 二次会のお店の種類(lib/sendai.ts の SECOND_GENRES)
const secondGenres = <Option>[(key: 'izakaya', label: '居酒屋'), (key: 'bar', label: 'バー'), (key: 'karaoke', label: 'カラオケ')];
