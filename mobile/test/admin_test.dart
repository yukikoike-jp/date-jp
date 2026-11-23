import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:material_ui/material_ui.dart' show FilterChip;
import 'package:tsudoro/api/client.dart';
import 'package:tsudoro/features/party/shop_card.dart';
import 'package:tsudoro/main.dart';

import 'helpers.dart';

const d1 = '2026-12-04';
const d2 = '2026-12-05';

Map<String, Object?> shop(String id, {bool sample = false}) => {
  'id': id,
  'name': 'お店$id',
  'genre': '居酒屋',
  'access': '仙台駅から徒歩3分',
  'budgetLabel': '3,001〜4,000円',
  'features': ['飲み放題'],
  'smoking': 'no',
  'photo': null,
  'sample': sample,
};

/// 2人が答えた会。d1 に2人、d2 に1人が行ける
Map<String, Object?> answeredParty({Map<String, Object?>? decision, bool pr = true, bool sample = false}) => {
  'ok': true,
  'party': {
    'id': 'abc123',
    'title': '忘年会',
    'audience': 'private',
    'dates': [d1, d2],
    'start': 1140,
    'decision': decision,
  },
  'summary': {
    'answered': 2,
    'names': ['山田', '佐藤'],
    'must': [],
    'who': [
      {
        'name': '山田',
        'dates': {d1: 'ok', d2: 'ok'},
      },
      {
        'name': '佐藤',
        'dates': {d1: 'ok', d2: 'no'},
      },
    ],
    'ranking': [
      {'date': d1, 'ok': 2, 'maybe': 0, 'mustOk': true},
      {'date': d2, 'ok': 1, 'maybe': 0, 'mustOk': true},
    ],
    'bestDates': [d1],
    'date': d1,
    'attendees': [
      {'name': '山田', 'soft': false},
      {'name': '佐藤', 'soft': true},
    ],
    'maybes': [],
    'notes': [],
  },
  'shops': [shop('J1', sample: sample), shop('J2', sample: sample)],
  'otherArea': false,
  'relaxed': null,
  'basis': ['2人', '4,000円くらい'],
  'notice': null,
  'pr': pr,
  'admin': true,
  'share': {'invite': '忘年会 https://www.tsudoro.com/p/abc123', 'decided': decision == null ? null : '忘年会に決まったよ'},
};

void main() {
  late List<http.Request> sent;
  late Map<String, Object?> party;

  Api api() => Api(
    client: MockClient((r) async {
      sent.add(r);
      if (r.url.path.endsWith('/statuses')) return jsonRes({'ok': true, 'statuses': {}});
      if (r.url.path.endsWith('/decision')) {
        final b = jsonDecode(r.body) as Map<String, dynamic>;
        party = answeredParty(
          decision: b['clear'] == true ? null : {'date': b['date'], 'start': 1140, 'shopId': b['shopId'], 'shopName': 'お店J1'},
        );
        return jsonRes({'ok': true});
      }
      if (r.url.path.endsWith('/must')) {
        (party['summary'] as Map<String, Object?>)['must'] = (jsonDecode(r.body) as Map<String, dynamic>)['names'];
        return jsonRes({'ok': true});
      }
      final p = jsonDecode(jsonEncode(party)) as Map<String, dynamic>;
      // 幹事の鍵が合うときだけ admin
      p['admin'] = r.headers['authorization'] == 'Bearer k';
      return jsonRes(p);
    }),
  );

  setUp(() {
    sent = [];
    party = answeredParty();
  });

  Future<TsudoroApp> open(WidgetTester tester, String path) async {
    tallScreen(tester);
    final app = TsudoroApp(api: api(), local: await local({'nomi:audience': 'private'}));
    await tester.pumpWidget(app);
    app.router.push(path);
    await tester.pumpAndSettle();
    return app;
  }

  testWidgets('いちばん良い日と最初のお店が選ばれていて、そのまま決められる', (tester) async {
    await open(tester, '/p/abc123/admin?token=k');
    expect(find.text('幹事の画面'), findsOneWidget);
    expect(find.text('12/4(金) ・ お店J1'), findsOneWidget);

    await tester.tap(find.text('これで決定する'));
    await tester.pumpAndSettle();
    final req = sent.firstWhere((r) => r.url.path.endsWith('/decision'));
    expect(req.headers['authorization'], 'Bearer k');
    expect(jsonDecode(req.body), {'date': d1, 'shopId': 'J1'});
    // 決まったあとは、予約の人数と「決まったよ」を送るボタン
    expect(find.text('決まりました!'), findsOneWidget);
    expect(find.text('共有して「決まったよ」を送る'), findsOneWidget);
    expect(find.text('これで決定する'), findsNothing);
  });

  testWidgets('日にちとお店を選び直し、「お店はあとで」なら shopId を送らない', (tester) async {
    await open(tester, '/p/abc123/admin?token=k');
    await tester.tap(find.textContaining('12/5(土)'));
    await tester.tap(find.text('お店はあとで決める(日にちだけ先に決定)'));
    await tester.pump();
    expect(find.text('12/5(土) ・ お店はあとで'), findsOneWidget);
    await tester.tap(find.text('これで決定する'));
    await tester.pumpAndSettle();
    expect(jsonDecode(sent.firstWhere((r) => r.url.path.endsWith('/decision')).body), {'date': d2});
  });

  testWidgets('決定を取り消すときは確かめてから送る', (tester) async {
    party = answeredParty(decision: {'date': d1, 'start': 1140, 'shopId': 'J1', 'shopName': 'お店J1'});
    await open(tester, '/p/abc123/admin?token=k');
    expect(find.text('予約の人数: 2人'), findsOneWidget);
    await tester.tap(find.text('決定を取り消す'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('やめる'));
    await tester.pumpAndSettle();
    expect(sent.where((r) => r.url.path.endsWith('/decision')), isEmpty);

    await tester.tap(find.text('決定を取り消す'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('取り消して選び直す'));
    await tester.pumpAndSettle();
    expect(jsonDecode(sent.firstWhere((r) => r.url.path.endsWith('/decision')).body), {'clear': true});
    expect(find.text('これで決定する'), findsOneWidget);
  });

  testWidgets('幹事の URL から開いたら「作った会」に残す。鍵が違えば残さない', (tester) async {
    final app = await open(tester, '/p/abc123/admin?token=k');
    final local = app.local;
    expect(local.adminToken('abc123'), 'k');
    expect(local.parties.single.title, '忘年会');
  });

  testWidgets('届いた URL から開いても、戻るとホーム', (tester) async {
    tallScreen(tester);
    final app = TsudoroApp(api: api(), local: await local({'nomi:audience': 'private'}));
    await tester.pumpWidget(app);
    app.router.go('/p/abc123/admin?token=k');
    await tester.pumpAndSettle();
    expect(find.text('幹事の画面'), findsOneWidget);
    app.router.pop();
    await tester.pumpAndSettle();
    expect(find.text('飲み会をつくる'), findsOneWidget);
    // 開いた会は、ホームの「作った会」に出ている
    expect(find.text('作った会'), findsOneWidget);
    expect(find.text('忘年会'), findsOneWidget);
  });

  testWidgets('必ず来てほしい人を押すと選ばれ、もう一度押すと外れる', (tester) async {
    await open(tester, '/p/abc123/admin?token=k');
    final chip = find.widgetWithText(FilterChip, '佐藤');
    await tester.tap(chip);
    await tester.pumpAndSettle();
    final put = sent.where((r) => r.url.path.endsWith('/must')).single;
    expect(put.method, 'PUT');
    expect(put.headers['authorization'], 'Bearer k');
    expect(jsonDecode(put.body), {
      'names': ['佐藤'],
    });
    expect(tester.widget<FilterChip>(chip).selected, isTrue);

    await tester.tap(chip);
    await tester.pumpAndSettle();
    expect(jsonDecode(sent.where((r) => r.url.path.endsWith('/must')).last.body), {'names': []});
    expect(tester.widget<FilterChip>(chip).selected, isFalse);
  });

  testWidgets('決まった会には、お店のページ・地図・カレンダーのボタンを出す。見本のお店にはカレンダーだけ', (tester) async {
    party = answeredParty(decision: {'date': d1, 'start': 1140, 'shopId': 'J1', 'shopName': 'お店J1'});
    await open(tester, '/p/abc123');
    expect(find.text('お店のページ'), findsOneWidget);
    expect(find.text('地図'), findsOneWidget);
    expect(find.text('カレンダーに入れる'), findsOneWidget);
    expect(find.text('#アフィリエイト広告'), findsOneWidget);

    party = answeredParty(decision: {'date': d1, 'start': 1140, 'shopId': 's1', 'shopName': '見本 串焼き'});
    await open(tester, '/p/abc123');
    expect(find.text('お店のページ'), findsNothing);
    expect(find.text('カレンダーに入れる'), findsOneWidget);
  });

  testWidgets('答える画面の URL から開いても、戻ると会のページ', (tester) async {
    tallScreen(tester);
    final app = TsudoroApp(api: api(), local: await local({'nomi:audience': 'private'}));
    await tester.pumpWidget(app);
    app.router.go('/p/abc123/answer');
    await tester.pumpAndSettle();
    expect(find.text('30秒で答えられます'), findsOneWidget);
    app.router.pop();
    await tester.pumpAndSettle();
    expect(find.text('答える'), findsOneWidget);
  });

  testWidgets('参加者には決めるところも幹事の画面も出さない', (tester) async {
    await open(tester, '/p/abc123');
    expect(find.text('幹事の画面'), findsNothing);
    expect(find.text('これで決定する'), findsNothing);
    expect(find.text('答える'), findsOneWidget);
  });

  testWidgets('鍵が違えば、幹事の URL でも参加者の画面', (tester) async {
    final app = await open(tester, '/p/abc123/admin?token=wrong');
    expect(app.local.parties, isEmpty);
    expect(find.text('幹事の画面'), findsNothing);
    expect(find.text('これで決定する'), findsNothing);
  });

  testWidgets('提携リンクなら「#アフィリエイト広告」を出す', (tester) async {
    await open(tester, '/p/abc123/admin?token=k');
    expect(find.byType(PrNote), findsOneWidget);
  });

  testWidgets('提携リンクでなければ PR の印を出さない', (tester) async {
    party = answeredParty(pr: false);
    await open(tester, '/p/abc123/admin?token=k');
    expect(find.byType(PrNote), findsNothing);
  });

  testWidgets('見本のお店には PR の印も選ぶボタンも出さない', (tester) async {
    party = answeredParty(sample: true);
    await open(tester, '/p/abc123/admin?token=k');
    expect(find.byType(PrNote), findsNothing);
    expect(find.text('このお店を選ぶ'), findsNothing);
    expect(find.text('見本のためお店のページなし'), findsNWidgets(2));
  });
}
