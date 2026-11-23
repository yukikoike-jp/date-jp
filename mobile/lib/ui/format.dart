// Web の lib/sendai.ts と同じ書き方。日付は「YYYY-MM-DD」、時刻は「0時からの分」

const _weekdays = ['日', '月', '火', '水', '木', '金', '土'];

/// 1140 → 「19:00」
String clock(int minutes) => '${minutes ~/ 60}:${(minutes % 60).toString().padLeft(2, '0')}';

/// 「2026-12-04」→「12/4(金)」
String dateLabel(String date) {
  final d = DateTime.parse(date);
  return '${d.month}/${d.day}(${_weekdays[d.weekday % 7]})';
}

/// DateTime の年月日 → 「YYYY-MM-DD」
String ymd(DateTime d) => '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

/// 日本時間の今日(端末の時刻の設定によらない)
DateTime jstToday([DateTime? now]) {
  final j = (now ?? DateTime.now()).toUtc().add(const Duration(hours: 9));
  return DateTime(j.year, j.month, j.day);
}
