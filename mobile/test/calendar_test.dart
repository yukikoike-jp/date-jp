import 'package:flutter_test/flutter_test.dart';
import 'package:tsudoro/domain/calendar.dart';

// Web の lib/calendar.test.ts と同じ値
void main() {
  Map<String, String> q({int start = 19 * 60, String? location = '肉汁餃子のダンダダン 仙台西口店'}) => Uri.parse(
    googleCalendarUrl(title: 'ゼミの忘年会', date: '2026-11-13', start: start, location: location, url: 'https://www.tsudoro.com/p/abc'),
  ).queryParameters;

  test('日本時間の19時からの2時間を、UTC にして入れる', () {
    expect(q()['dates'], '20261113T100000Z/20261113T120000Z');
    expect(q()['text'], 'ゼミの忘年会');
    expect(q()['location'], '肉汁餃子のダンダダン 仙台西口店');
    expect(q()['details'], 'https://www.tsudoro.com/p/abc');
  });

  test('深夜をまたぐ時刻も、日付を進めて入れる', () {
    expect(q(start: 23 * 60)['dates'], '20261113T140000Z/20261113T160000Z');
    expect(q(start: 24 * 60 + 30)['dates'], '20261113T153000Z/20261113T173000Z');
  });

  test('お店がなければ場所を入れない', () {
    expect(q(location: null).containsKey('location'), isFalse);
  });
}
