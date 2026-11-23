import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:material_ui/material_ui.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:tsudoro/api/client.dart';
import 'package:tsudoro/features/create/create_screen.dart';
import 'package:tsudoro/features/home/home_screen.dart';
import 'package:tsudoro/main.dart';
import 'package:tsudoro/storage/local.dart';
import 'package:tsudoro/ui/format.dart';

http.Response jsonRes(Object body, [int status = 200]) =>
    http.Response.bytes(utf8.encode(jsonEncode(body)), status, headers: {'content-type': 'application/json'});

final partyJson = {
  'ok': true,
  'party': {'id': 'abc123', 'title': '忘年会', 'dates': ['2026-12-04']},
  'summary': {'answered': 2},
  'admin': true,
  'share': {'invite': '忘年会 https://www.tsudoro.com/p/abc123', 'decided': null},
};

Future<Local> local([Map<String, Object> values = const {}]) async {
  SharedPreferences.setMockInitialValues(values);
  return Local.open();
}

/// カレンダーで、今日から days 日後を押す
Future<void> tapDay(WidgetTester tester, int days) async {
  final day = find.bySemanticsLabel(dateLabel(ymd(jstToday().add(Duration(days: days)))));
  await tester.tap(day);
  await tester.pump();
}

/// カレンダーが1画面に入る縦長の画面(375 幅は崩れないかの確認も兼ねる)
void tallScreen(WidgetTester tester) {
  tester.view.physicalSize = const Size(375, 2400);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);
}

void main() {
  test('幹事の鍵を Bearer で送り、会の中身を読む', () async {
    late http.Request sent;
    final api = Api(base: 'https://x/api/v1', client: MockClient((r) async {
      sent = r;
      return jsonRes(partyJson);
    }));
    final p = await api.party('abc123', adminToken: 'k');
    expect(sent.url.toString(), 'https://x/api/v1/parties/abc123');
    expect(sent.headers['authorization'], 'Bearer k');
    expect(p.title, '忘年会');
    expect(p.admin, isTrue);
  });

  test('失敗はサーバーの日本語の文で、404 は notFound', () async {
    final api = Api(client: MockClient((_) async => jsonRes({'ok': false, 'error': '会が見つかりません'}, 404)));
    await expectLater(
      api.party('nothere'),
      throwsA(isA<ApiException>().having((e) => e.message, 'message', '会が見つかりません').having((e) => e.notFound, 'notFound', true)),
    );
  });

  test('会の URL からも id を取り出す', () {
    expect(partyIdFrom('https://www.tsudoro.com/p/abc123'), 'abc123');
    expect(partyIdFrom(' abc123 '), 'abc123');
    expect(partyIdFrom('こんにちは'), isNull);
  });

  test('日付と時刻は Web と同じ書き方。今日は日本時間', () {
    expect(dateLabel('2026-12-04'), '12/4(金)');
    expect(clock(1140), '19:00');
    expect(clock(1365), '22:45');
    // UTC 11/23 15:30 は、日本では 11/24 0:30
    expect(ymd(jstToday(DateTime.utc(2026, 11, 23, 15, 30))), '2026-11-24');
  });

  test('作った会は新しい順で、同じ会は1つにまとめ、30件まで', () async {
    final l = await local();
    for (var i = 0; i < 31; i++) {
      await l.rememberParty(MyParty(id: 'p$i', title: '会$i', token: 't$i', createdAt: i));
    }
    await l.rememberParty(MyParty(id: 'p5', title: '会5', token: 't5', createdAt: 99));
    expect(l.parties.length, Local.maxParties);
    expect(l.parties.first.id, 'p5');
    expect(l.parties.where((p) => p.id == 'p5').length, 1);
    expect(l.adminToken('p5'), 't5');
    await l.forgetParty('p5');
    expect(l.adminToken('p5'), isNull);
  });

  testWidgets('はじめはプライベート・仕事を選び、会を作ると、鍵を端末に残して幹事の画面へ', (tester) async {
    Map<String, dynamic>? created;
    final api = Api(client: MockClient((r) async {
      if (r.method == 'POST' && r.url.path.endsWith('/parties')) {
        created = jsonDecode(r.body) as Map<String, dynamic>;
        return jsonRes({'ok': true, 'id': 'abc123', 'adminToken': 'secret'}, 201);
      }
      if (r.url.path.endsWith('/statuses')) return jsonRes({'ok': true, 'statuses': {}});
      expect(r.headers['authorization'], 'Bearer secret');
      return jsonRes(partyJson);
    }));
    tallScreen(tester);
    final l = await local();
    final app = TsudoroApp(api: api, local: l);
    await tester.pumpWidget(app);

    await tester.tap(find.text('仕事'));
    await tester.pumpAndSettle();
    expect(l.audience, 'worker');

    app.router.push('/new');
    await tester.pumpAndSettle();
    // 足りないうちは押せない
    expect(find.text('会の名前を入力してください'), findsOneWidget);
    await tester.enterText(find.byType(TextField), '忘年会');
    await tapDay(tester, 3);
    await tester.pump();
    await tester.tap(find.text('URLを作る'));
    await tester.pumpAndSettle();

    expect(created?['title'], '忘年会');
    expect(created?['audience'], 'worker');
    expect(created?['start'], 1140);
    expect((created?['dates'] as List).length, 1);
    expect(l.adminToken('abc123'), 'secret');
    expect(find.text('幹事'), findsOneWidget);
  });

  testWidgets('作れなかったときは、サーバーの文を出す', (tester) async {
    final api = Api(client: MockClient((_) async => jsonRes({'ok': false, 'error': '作れませんでした'}, 400)));
    tallScreen(tester);
    final l = await local({'nomi:audience': 'private'});
    final app = TsudoroApp(api: api, local: l);
    await tester.pumpWidget(app);
    app.router.push('/new');
    await tester.pumpAndSettle();
    expect(find.byType(CreateScreen), findsOneWidget);
    await tester.enterText(find.byType(TextField), '飲み会');
    await tapDay(tester, 0);
    await tester.pump();
    await tester.tap(find.text('URLを作る'));
    await tester.pumpAndSettle();
    expect(find.text('作れませんでした'), findsOneWidget);
  });
}
