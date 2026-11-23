import 'package:flutter_test/flutter_test.dart';
import 'package:tsudoro/domain/split.dart';

// Web の lib/split.test.ts と同じ例。どちらかの計算が変わったら、両方で落ちる

int sum(List<int> xs) => xs.reduce((a, b) => a + b);

void main() {
  group('splitBill', () {
    test('同じ重みなら全員同じ額。単位に切り上げ、多い分はお釣りにする', () {
      final r = splitBill(total: 10000, weights: [10, 10, 10], unit: 100, organizer: 0);
      expect(r.amounts, [3400, 3400, 3400]);
      expect(r.surplus, 200);
      expect(r.organizerDiff, 0);
      final r1 = splitBill(total: 10000, weights: [10, 10, 10], unit: 1, organizer: 0);
      expect(r1.amounts, [3334, 3334, 3334]);
      expect(r1.surplus, 2);
      final r2 = splitBill(total: 9000, weights: [10, 10, 10], unit: 100, organizer: 2);
      expect(r2.amounts, [3000, 3000, 3000]);
      expect(r2.surplus, 0);
    });

    test('重みに比べて割る', () {
      final r = splitBill(total: 30000, weights: [13, 10, 7], unit: 100, organizer: 1);
      expect(r.amounts, [13000, 10000, 7000]);
      expect(r.organizerDiff, 0);
    });

    test('合計はいつも一致し、幹事以外は単位にそろう', () {
      for (final unit in roundUnits) {
        final r = splitBill(total: 23456, weights: [15, 12, 10, 7, 7], unit: unit, organizer: 2);
        expect(sum(r.amounts), 23456);
        for (var i = 0; i < r.amounts.length; i++) {
          if (i != 2) expect(r.amounts[i] % unit, 0);
        }
      }
    });

    test('幹事の額がマイナスになるなら、ほかの人を切り捨てる', () {
      final r = splitBill(total: 1000, weights: [10, 11, 11, 11], unit: 500, organizer: 0);
      expect(r.amounts, [1000, 0, 0, 0]);
    });

    test('合計が0や人がいなければ0', () {
      expect(splitBill(total: 0, weights: [10, 10], unit: 100, organizer: 0).amounts, [0, 0]);
      expect(splitBill(total: 5000, weights: [], unit: 100, organizer: 0).amounts, isEmpty);
    });
  });

  group('tenthsFromInput', () {
    test('書いた倍率を0.1単位の整数にする', () {
      expect(tenthsFromInput('1.2'), 12);
      expect(tenthsFromInput('２'), 20);
      expect(tenthsFromInput('1.25'), 13);
    });
    test('範囲の外や読めないものは null', () {
      expect(tenthsFromInput(''), isNull);
      expect(tenthsFromInput('0'), isNull);
      expect(tenthsFromInput('6'), isNull);
      expect(tenthsFromInput('たくさん'), isNull);
    });
  });

  group('subsidyTotal', () {
    test('1人あたりなら人数をかけ、全体ならその額にする', () {
      expect(subsidyTotal((perPerson: true, yen: 3000), 40000, 8), 24000);
      expect(subsidyTotal((perPerson: false, yen: 10000), 40000, 8), 10000);
    });
    test('お会計の合計を超えない。なし・0円・マイナスは0にする', () {
      expect(subsidyTotal((perPerson: true, yen: 6000), 40000, 8), 40000);
      expect(subsidyTotal(null, 40000, 8), 0);
      expect(subsidyTotal((perPerson: false, yen: -5), 40000, 8), 0);
    });
  });
}
