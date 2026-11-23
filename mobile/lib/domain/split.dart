// 傾斜の割り勘(Web の lib/split.ts と同じ計算)。金額は整数(円)
// 重みは 0.1 単位を10倍した整数で持つ(1.3 → 13)。小数の誤差を出さないため

import 'dart:math' as math;

/// tone = 区分の色の名前(globals.css の .tier-*)。色そのものは画面の側で決める
typedef Weight = ({String key, String label, String note, int tenths, String mark, String tone});

/// 区分。Web の WEIGHTS(前の student はプライベートと同じに扱う)
const weights = <String, List<Weight>>{
  // 友達どうしは上下が少ないので、割り勘を基本に、多め・少なめだけ
  'private': [
    (key: 'more', label: '多め', note: '先輩・年上・誘った人', tenths: 13, mark: '▲', tone: 'red'),
    (key: 'normal', label: 'ふつう', note: '', tenths: 10, mark: '●', tone: 'yellow'),
    (key: 'less', label: '少なめ', note: '後輩・年下', tenths: 8, mark: '▼', tone: 'blue'),
    (key: 'soft', label: '飲まない', note: 'ソフトドリンク', tenths: 7, mark: '◇', tone: 'green'),
  ],
  'worker': [
    (key: 'boss', label: '上司', note: '部長・課長', tenths: 15, mark: '★', tone: 'red'),
    (key: 'senior', label: '先輩', note: '', tenths: 12, mark: '▲', tone: 'purple'),
    (key: 'normal', label: 'ふつう', note: '同期', tenths: 10, mark: '●', tone: 'yellow'),
    (key: 'junior', label: '新人', note: '1〜2年目', tenths: 7, mark: '▼', tone: 'blue'),
    (key: 'soft', label: '飲まない', note: 'ソフトドリンク', tenths: 7, mark: '◇', tone: 'green'),
  ],
};

/// 自分で書く倍率の範囲(0.1〜5.0)。10倍した整数で持つ
const customMin = 1;
const customMax = 50;

/// 書いた倍率("1.25" や全角の "２")を、0.1 単位の整数にする。読めなければ null
int? tenthsFromInput(String text) {
  // 全角の数字と点を半角にする(Web は NFKC)
  final s = text.trim().replaceAllMapped(RegExp('[０-９．]'), (m) => String.fromCharCode(m[0]!.codeUnitAt(0) - 0xFEE0));
  final n = double.tryParse(s);
  if (s.isEmpty || n == null || !n.isFinite) return null;
  final t = (n * 10).round();
  return t >= customMin && t <= customMax ? t : null;
}

const roundUnits = [1, 10, 100, 500];

/// 会社や部署・部費から出る補助。per = 1人あたり、lump = 全体でいくら
typedef Subsidy = ({bool perPerson, int yen});

/// 補助の合計(円)。お会計の合計を超えない
int subsidyTotal(Subsidy? s, int total, int people) {
  if (s == null || s.yen <= 0 || total <= 0) return 0;
  return math.min(total, s.perPerson ? s.yen * people : s.yen);
}

/// amounts = 1人ずつの額。organizerDiff = 幹事が重みどおりの額より多く(+)・少なく(-)払う額。surplus = お釣り
typedef SplitResult = ({List<int> amounts, int organizerDiff, int surplus});

/// 全員の重みが同じなら、全員同じ額(unit 円単位に切り上げ。多い分はお釣り)。
/// 傾斜のときは、重みに比べて割り、幹事以外は unit 円単位の近い額にそろえる。合計とのずれは幹事が受け持つ。
/// 幹事の額がマイナスになるときは、ほかの人を切り捨てにして、ずれを小さくする
SplitResult splitBill({required int total, required List<int> weights, required int unit, required int organizer}) {
  final n = weights.length;
  if (n == 0 || total <= 0) return (amounts: [for (final _ in weights) 0], organizerDiff: 0, surplus: 0);
  if (weights.every((w) => w == weights.first)) {
    final each = (total / n / unit).ceil() * unit;
    return (amounts: List.filled(n, each), organizerDiff: 0, surplus: each * n - total);
  }
  final sum = weights.reduce((a, b) => a + b);
  final exact = [for (final w in weights) total * w / sum];

  List<int> build(int Function(double) round) {
    final amounts = [for (var i = 0; i < n; i++) i == organizer ? 0 : round(exact[i] / unit) * unit];
    amounts[organizer] = total - amounts.reduce((a, b) => a + b);
    return amounts;
  }

  // JavaScript の Math.round と同じく、.5 は大きいほうへ
  var amounts = build((x) => (x + 0.5).floor());
  if (amounts[organizer] < 0) amounts = build((x) => x.floor());
  return (amounts: amounts, organizerDiff: (amounts[organizer] - exact[organizer]).round(), surplus: 0);
}
