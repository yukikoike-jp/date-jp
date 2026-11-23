import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:material_ui/material_ui.dart';
import 'package:tsudoro/api/client.dart';
import 'package:tsudoro/domain/choices.dart';
import 'package:tsudoro/main.dart';

import 'helpers.dart';

void main() {
  test('残れる時刻は Web(lib/sendai.ts)と同じ値になる', () {
    // 19:00 開始
    expect([for (final s in StayStep.values) stayFromStep(s, 1140)], [1260, 1380, 1440, 1800]);
    // 22:00 開始は一次会が 0 時に終わるので、二次会・終電も後ろにずれる
    expect([for (final s in StayStep.values) stayFromStep(s, 1320)], [1440, 1500, 1530, 1800]);
    // 開始が決まっていない前の会は、一次会を 21 時までとみなす
    expect(stayFromStep(StayStep.first, null), 1260);
    for (final start in [1140, 1320, null]) {
      for (final s in StayStep.values) {
        expect(stayStep(stayFromStep(s, start), start), s, reason: '$start $s');
      }
    }
    expect(stayStep(0, 1140), isNull);
    expect(yen(15000), '15,000円');
  });

  test('回答は JSON にして戻しても同じ', () {
    final a = Answer(
      name: '山田',
      dates: {'2026-12-04': DateAnswer.maybe},
      arrival: 1140,
      stay: 1380,
      budget: 4000,
      station: const Station(name: '仙台', pref: '宮城県', lat: 38.26, lng: 140.88),
      avoids: {'egg'},
      likes: {'washoku'},
      drinks: false,
      memo: 'よろしく',
    );
    final b = Answer.fromJson(jsonDecode(jsonEncode(a.toJson())) as Map<String, dynamic>);
    expect(b.toJson(), a.toJson());
  });

  group('答える', () {
    late List<http.Request> sent;
    late Api api;

    setUp(() {
      sent = [];
      api = Api(
        client: MockClient((r) async {
          sent.add(r);
          if (r.method == 'POST' && r.url.path.endsWith('/answers')) return jsonRes({'ok': true, 'answerId': 'a1', 'token': 't1'});
          if (r.url.path.endsWith('/answers/a1')) {
            if (r.headers['x-answer-token'] != 't1') return jsonRes({'ok': false, 'error': '見つかりません'}, 404);
            return jsonRes({
              'ok': true,
              'answer': {
                'name': '山田',
                'dates': {'2026-12-04': 'ok'},
                'arrival': 1140,
                'stay': 1380,
                'budget': 4000,
                'areas': [],
              },
            });
          }
          return jsonRes({...partyJson, 'admin': false});
        }),
      );
    });

    Map<String, dynamic> lastBody() => jsonDecode(sent.lastWhere((r) => r.method == 'POST').body) as Map<String, dynamic>;

    testWidgets('参加者が答えると、鍵を端末に残し、次からは直せる', (tester) async {
      tallScreen(tester);
      final l = await local({'nomi:audience': 'private'});
      final app = TsudoroApp(api: api, local: l);
      await tester.pumpWidget(app);
      app.router.push('/p/abc123');
      await tester.pumpAndSettle();

      await tester.tap(find.text('答える'));
      await tester.pumpAndSettle();
      expect(find.text('名前を入れてください'), findsOneWidget);
      await tester.enterText(find.byType(TextField).first, '山田');
      await tester.tap(find.text('二次会まで'));
      await tester.pump();
      await tester.tap(find.text('この内容で答える'));
      await tester.pumpAndSettle();

      final body = lastBody();
      expect(body.containsKey('answerId'), isFalse);
      final answer = body['answer'] as Map<String, dynamic>;
      expect(answer['name'], '山田');
      expect(answer['dates'], {'2026-12-04': 'ok'});
      expect(answer['stay'], 1380);
      expect(answer['budget'], unlimitedBudget); // 選ばなければ「こだわらない」
      expect(l.mine('abc123')?.token, 't1');

      // 会の画面に戻り、直すボタンになる。直すときは前の答えを読み、鍵を付けて送る
      expect(find.text('山田さんの回答を直す'), findsOneWidget);
      await tester.tap(find.text('山田さんの回答を直す'));
      await tester.pumpAndSettle();
      expect(find.text('回答を直す'), findsOneWidget);
      expect(find.text('今回は行けないときはこちら(理由は聞きません)'), findsNothing);
      await tester.tap(find.text('この内容で答える'));
      await tester.pumpAndSettle();
      expect(lastBody()['answerId'], 'a1');
      expect(lastBody()['token'], 't1');
      expect((lastBody()['answer'] as Map)['budget'], 4000);
    });

    testWidgets('「今回は行けない」は、全部の日を × にして送る', (tester) async {
      tallScreen(tester);
      final app = TsudoroApp(api: api, local: await local({'nomi:audience': 'private'}));
      await tester.pumpWidget(app);
      app.router.push('/p/abc123/answer');
      await tester.pumpAndSettle();
      await tester.enterText(find.byType(TextField).first, '佐藤');
      await tester.pump();
      await tester.tap(find.text('今回は行けないときはこちら(理由は聞きません)'));
      await tester.pumpAndSettle();
      expect((lastBody()['answer'] as Map)['dates'], {'2026-12-04': 'no'});
    });
  });
}
