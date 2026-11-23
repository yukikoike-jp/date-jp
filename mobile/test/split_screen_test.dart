import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:material_ui/material_ui.dart';
import 'package:tsudoro/api/client.dart';
import 'package:tsudoro/main.dart';

import 'helpers.dart';

void main() {
  late List<http.Request> sent;

  Api api() => Api(
    client: MockClient((r) async {
      sent.add(r);
      if (r.url.path.endsWith('/statuses')) return jsonRes({'ok': true, 'statuses': {}});
      if (r.headers['authorization'] != 'Bearer k') return jsonRes({'ok': false, 'error': '読み込めませんでした'}, 404);
      return jsonRes({
        'ok': true,
        'title': '忘年会',
        'date': '2026-12-04',
        'attendees': [
          {'name': '山田', 'soft': false},
          {'name': '佐藤', 'soft': true},
        ],
      });
    }),
  );

  setUp(() => sent = []);

  Future<TsudoroApp> open(WidgetTester tester, String path, [Map<String, Object> saved = const {}]) async {
    tallScreen(tester);
    final parties = jsonEncode([
      {'id': 'abc123', 'title': '忘年会', 'token': 'k', 'createdAt': 0},
    ]);
    final app = TsudoroApp(api: api(), local: await local({'nomi:audience': 'private', 'nomi:parties': parties, ...saved}));
    await tester.pumpWidget(app);
    app.router.push(path);
    await tester.pumpAndSettle();
    return app;
  }

  testWidgets('合計を入れると割り勘の額が出て、端末に残る', (tester) async {
    final app = await open(tester, '/split');
    expect(find.text('合計を入れると一人ずつの金額が出ます。'), findsOneWidget);
    await tester.enterText(find.widgetWithText(TextField, 'お会計の合計(円)'), '10000');
    await tester.pump();
    expect(find.text('2,500円'), findsNWidgets(4));

    // 閉じて開き直しても、続きから
    app.router.pop();
    await tester.pumpAndSettle();
    app.router.push('/split');
    await tester.pumpAndSettle();
    expect(find.text('2,500円'), findsNWidgets(4));
  });

  testWidgets('決まった会から、行く人とお酒を飲まない人を読み込み、傾斜で割る', (tester) async {
    await open(tester, '/split?from=abc123');
    expect(sent.where((r) => r.url.path.endsWith('/parties/abc123/attendees')), hasLength(1));
    expect(find.text('山田'), findsOneWidget);
    expect(find.text('◇ 飲まない'), findsOneWidget);
    await tester.enterText(find.widgetWithText(TextField, 'お会計の合計(円)'), '8500');
    await tester.pump();
    // 10 : 7 で 8500円 → 5000円と3500円
    expect(find.text('5,000円'), findsOneWidget);
    expect(find.text('3,500円'), findsOneWidget);
  });
}
