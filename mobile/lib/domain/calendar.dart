// 決まった会をカレンダーに入れる(Web の lib/calendar.ts の googleCalendarUrl)。
// 前日のお知らせは各自のカレンダーに任せる(Tsudoro は連絡先を持たない)

import 'choices.dart' show firstPartyMinutes;

/// 日本時間の日付(YYYY-MM-DD)と0時からの分を、UTC の「YYYYMMDDTHHMMSSZ」にする。24時を超える分は翌日になる
String _utcStamp(String date, int minutes) {
  final [y, m, d] = date.split('-').map(int.parse).toList();
  final t = DateTime.utc(y, m, d, 0, minutes).subtract(const Duration(hours: 9));
  String two(int n) => n.toString().padLeft(2, '0');
  return '${t.year}${two(t.month)}${two(t.day)}T${two(t.hour)}${two(t.minute)}00Z';
}

/// Google カレンダーの「予定を作る」画面を開く URL。一次会の長さ(2時間)で入れる。location はお店の名前など
String googleCalendarUrl({required String title, required String date, required int start, String? location, required String url}) =>
    Uri.https('calendar.google.com', '/calendar/render', {
      'action': 'TEMPLATE',
      'text': title,
      'dates': '${_utcStamp(date, start)}/${_utcStamp(date, start + firstPartyMinutes)}',
      'details': url,
      'location': ?location,
    }).toString();
