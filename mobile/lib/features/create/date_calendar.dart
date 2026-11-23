import 'package:material_ui/material_ui.dart';

import '../../ui/format.dart';
import '../../ui/theme.dart';

/// 今日から何日先まで選べるか(Web の components/DateCalendar.tsx と同じ)
const calendarDays = 90;

/// 候補の日を、月のカレンダーから選ぶ。押すたびに入れる・外す
class DateCalendar extends StatelessWidget {
  const DateCalendar({super.key, required this.today, required this.selected, required this.onToggle});
  final DateTime today;
  final Set<String> selected;
  final ValueChanged<String> onToggle;

  @override
  Widget build(BuildContext context) {
    final last = today.add(const Duration(days: calendarDays - 1));
    final months = <DateTime>[];
    for (var m = DateTime(today.year, today.month); !m.isAfter(last); m = DateTime(m.year, m.month + 1)) {
      months.add(m);
    }
    return Column(
      children: [for (final m in months) _Month(month: m, first: today, last: last, selected: selected, onToggle: onToggle)],
    );
  }
}

class _Month extends StatelessWidget {
  const _Month({required this.month, required this.first, required this.last, required this.selected, required this.onToggle});
  final DateTime month;
  final DateTime first;
  final DateTime last;
  final Set<String> selected;
  final ValueChanged<String> onToggle;

  @override
  Widget build(BuildContext context) {
    final days = DateTime(month.year, month.month + 1, 0).day;
    final lead = DateTime(month.year, month.month).weekday % 7; // 日曜はじまり
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('${month.year}年${month.month}月', style: const TextStyle(fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          Row(
            children: [
              for (final (i, w) in ['日', '月', '火', '水', '木', '金', '土'].indexed)
                Expanded(
                  child: Center(
                    child: Text(w, style: TextStyle(fontSize: 11, color: i == 0 ? Palette.danger : Palette.muted)),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 4),
          // GridView にすると自分でスクロールを持ち、外の ListView の中で扱いにくいので Table で並べる
          Table(
            children: [
              for (var row = 0; row * 7 < lead + days; row++)
                TableRow(
                  children: [
                    for (var col = 0; col < 7; col++)
                      switch (row * 7 + col - lead + 1) {
                        final d when d >= 1 && d <= days => AspectRatio(aspectRatio: 1, child: _day(DateTime(month.year, month.month, d))),
                        _ => const SizedBox.shrink(),
                      },
                  ],
                ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _day(DateTime day) {
    final key = ymd(day);
    final enabled = !day.isBefore(first) && !day.isAfter(last);
    final on = selected.contains(key);
    return Padding(
      padding: const EdgeInsets.all(2),
      child: Material(
        color: on ? Palette.accent : Colors.transparent,
        shape: const CircleBorder(),
        child: InkWell(
          customBorder: const CircleBorder(),
          onTap: enabled ? () => onToggle(key) : null,
          child: Center(
            child: Text(
              '${day.day}',
              semanticsLabel: '${dateLabel(key)}${on ? ' 選択中' : ''}',
              style: TextStyle(
                fontWeight: on ? FontWeight.w700 : FontWeight.w400,
                color: on
                    ? Colors.black
                    : enabled
                    ? Palette.text
                    : Palette.muted.withValues(alpha: 0.25),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
