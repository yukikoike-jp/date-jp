import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:material_ui/material_ui.dart' show TextField;
import 'package:tsudoro/api/client.dart';
import 'package:tsudoro/main.dart';

import 'helpers.dart';

Map<String, Object?> shop(String id, String name) => {
  'id': id,
  'name': name,
  'genre': 'バー',
  'access': '仙台駅から徒歩3分',
  'budgetLabel': '2,001〜3,000円',
  'features': <String>[],
  'smoking': null,
  'photo': null,
  'sample': false,
};

void main() {
  late List<http.Request> searches;

  Api api() => Api(
    client: MockClient((r) async {
      if (r.url.path.endsWith('/stations')) {
        return jsonRes({
          'ok': true,
          'stations': [
            {'name': '仙台', 'pref': '宮城県', 'lat': 38.26, 'lng': 140.88},
          ],
        });
      }
      if (r.url.path.endsWith('/shops/search')) {
        searches.add(r);
        final second = (jsonDecode(r.body) as Map<String, dynamic>)['second'];
        return jsonRes({
          'ok': true,
          'shops': [second == null ? shop('J1', '一次会のお店') : shop('J2', '遅くまで開いているバー')],
          'otherArea': false,
          'relaxed': null,
          'pr': true,
        });
      }
      return jsonRes({'ok': true, 'statuses': {}});
    }),
  );

  setUp(() => searches = []);

  Future<TsudoroApp> openShops(WidgetTester tester) async {
    tallScreen(tester);
    final app = TsudoroApp(api: api(), local: await local({'nomi:audience': 'private'}));
    await tester.pumpWidget(app);
    await tester.tap(find.text('お店探し'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField).first, '仙台');
    await tester.pump(const Duration(milliseconds: 400));
    await tester.pumpAndSettle();
    await tester.tap(find.text('仙台駅'));
    await tester.pumpAndSettle();
    return app;
  }

  Map<String, dynamic> lastSearch() => jsonDecode(searches.last.body) as Map<String, dynamic>;

  testWidgets('駅を選ぶと探す。二次会向けにすると遅くまで開いているお店を、種類も付けて探し直す', (tester) async {
    await openShops(tester);
    expect(lastSearch()['station']['name'], '仙台');
    expect(lastSearch()['second'], isNull);
    expect(lastSearch()['audience'], 'private');
    expect(find.text('一次会のお店'), findsOneWidget);
    expect(find.text('#アフィリエイト広告'), findsOneWidget);

    await tester.tap(find.text('二次会向け'));
    await tester.pumpAndSettle();
    expect(lastSearch()['second'], {'genre': null});
    expect(find.text('遅くまで開いているバー'), findsOneWidget);

    await tester.tap(find.text('バー'));
    await tester.pumpAndSettle();
    expect(lastSearch()['second'], {'genre': 'bar'});
  });

  testWidgets('♡ を押すとお気に入りに入り、上の一覧から外せる', (tester) async {
    final app = await openShops(tester);
    expect(find.textContaining('お気に入りのお店'), findsNothing);

    await tester.tap(find.byTooltip('一次会のお店をお気に入りに入れる'));
    await tester.pumpAndSettle();
    expect(app.local.favorites.single.name, '一次会のお店');
    expect(find.text('お気に入りのお店 1'), findsOneWidget);

    await tester.tap(find.text('お気に入りのお店 1'));
    await tester.pumpAndSettle();
    // 一覧の ♡ もカードの ♡ も、同じお店なのでどちらも「外す」になっている
    expect(find.byTooltip('一次会のお店をお気に入りから外す'), findsNWidgets(2));
    await tester.tap(find.byTooltip('一次会のお店をお気に入りから外す').first);
    await tester.pumpAndSettle();
    expect(app.local.favorites, isEmpty);
    expect(find.textContaining('お気に入りのお店'), findsNothing);
  });
}
