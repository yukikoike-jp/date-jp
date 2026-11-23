import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:material_ui/material_ui.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:tsudoro/storage/local.dart';
import 'package:tsudoro/ui/format.dart';

http.Response jsonRes(Object body, [int status = 200]) =>
    http.Response.bytes(utf8.encode(jsonEncode(body)), status, headers: {'content-type': 'application/json'});

final partyJson = {
  'ok': true,
  'party': {
    'id': 'abc123',
    'title': '忘年会',
    'audience': 'private',
    'dates': ['2026-12-04'],
    'start': 1140,
  },
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
