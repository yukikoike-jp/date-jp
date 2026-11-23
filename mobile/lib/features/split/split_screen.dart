import 'package:material_ui/material_ui.dart';

import '../../api/client.dart';
import '../../app_scope.dart';
import '../../domain/choices.dart' show yen;
import '../../domain/split.dart';
import '../../ui/format.dart';
import '../../ui/theme.dart';
import '../../ui/widgets.dart';
import '../../ui/share.dart';

const _tones = {
  'red': Palette.noFill,
  'yellow': Palette.maybeFill,
  'blue': Palette.blue,
  'green': Palette.okFill,
  'purple': Palette.purple,
  'gray': Palette.muted,
};

/// 1人分。weight は区分の key。自分で倍率を書いたときは 'custom' にして、書いた文字を custom に持つ
class _Person {
  _Person({String name = '', this.weight = 'normal', String custom = ''})
    : name = TextEditingController(text: name),
      custom = TextEditingController(text: custom);
  final TextEditingController name;
  String weight;
  final TextEditingController custom;

  Map<String, Object> toJson() => {'name': name.text, 'weight': weight, 'custom': custom.text};
  void dispose() {
    name.dispose();
    custom.dispose();
  }
}

/// 会計(Web の /split)。fromPartyId があれば、その会の行く人を読み込む
class SplitScreen extends StatefulWidget {
  const SplitScreen({super.key, this.fromPartyId});
  final String? fromPartyId;

  @override
  State<SplitScreen> createState() => _SplitScreenState();
}

class _SplitScreenState extends State<SplitScreen> {
  final _title = TextEditingController();
  final _total = TextEditingController();
  final _subsidy = TextEditingController();
  var _people = <_Person>[];
  var _unit = 100;
  var _organizer = 0;
  var _weighted = false;
  var _subsidyPer = true;
  var _ready = false;

  String get _audience => AppScope.of(context).local.audience == 'worker' ? 'worker' : 'private';
  bool get _worker => _audience == 'worker';

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_ready) return;
    _ready = true;
    for (final c in [_title, _total, _subsidy]) {
      c.addListener(_changed);
    }
    final from = widget.fromPartyId;
    if (from != null) {
      _startOver();
      _import(from);
    } else {
      _restore();
    }
  }

  @override
  void dispose() {
    for (final c in [_title, _total, _subsidy]) {
      c.dispose();
    }
    for (final p in _people) {
      p.dispose();
    }
    super.dispose();
  }

  /// 人を入れ替える(前の人の入力欄は片づける)
  void _setPeople(List<_Person> people) {
    for (final p in _people) {
      p.dispose();
    }
    for (final p in people) {
      p.name.addListener(_changed);
      p.custom.addListener(_changed);
    }
    _people = people;
  }

  void _startOver() {
    _title.text = '';
    _total.text = '';
    _subsidy.text = '';
    _setPeople([_Person(name: '幹事'), _Person(), _Person(), _Person()]);
    _unit = 100;
    _organizer = 0;
  }

  void _restore() {
    final s = AppScope.of(context).local.split;
    final people = (s?['people'] as List?)?.cast<Map<String, dynamic>>() ?? const [];
    if (s == null || people.isEmpty) {
      _startOver();
      return;
    }
    _title.text = s['title'] as String? ?? '';
    _total.text = s['total'] as String? ?? '';
    _subsidy.text = s['subsidyYen'] as String? ?? '';
    _setPeople([
      for (final p in people)
        _Person(name: p['name'] as String? ?? '', weight: p['weight'] as String? ?? 'normal', custom: p['custom'] as String? ?? ''),
    ]);
    _unit = s['unit'] as int? ?? 100;
    _organizer = (s['organizer'] as int? ?? 0).clamp(0, _people.length - 1);
    _weighted = s['weighted'] == true;
    _subsidyPer = s['subsidyPer'] != false;
  }

  Future<void> _import(String partyId) async {
    final scope = AppScope.of(context);
    final messenger = ScaffoldMessenger.of(context);
    final token = scope.local.adminToken(partyId);
    try {
      if (token == null) throw ApiException('この会の行く人を読み込めませんでした');
      final r = await scope.api.attendees(partyId, token);
      if (!mounted || r.attendees.isEmpty) return;
      setState(() {
        _title.text = '${r.title} ${dateLabel(r.date).split('(').first}';
        _setPeople([for (final a in r.attendees.take(30)) _Person(name: a.name, weight: a.soft ? 'soft' : 'normal')]);
        _organizer = 0;
        // 飲まない人がいれば、はじめから傾斜にしておく
        _weighted = r.attendees.any((a) => a.soft);
      });
      _changed();
    } on ApiException catch (e) {
      messenger.showSnackBar(SnackBar(content: Text(e.message)));
    }
  }

  void _changed() {
    if (!mounted) return;
    setState(() {});
    AppScope.of(context).local.setSplit({
      'title': _title.text,
      'total': _total.text,
      'people': [for (final p in _people) p.toJson()],
      'unit': _unit,
      'organizer': _organizer,
      'weighted': _weighted,
      'subsidyPer': _subsidyPer,
      'subsidyYen': _subsidy.text,
    });
  }

  Weight _weightOf(_Person p) {
    const even = (key: 'even', label: '', note: '', tenths: 10, mark: '', tone: 'yellow');
    if (!_weighted) return even;
    final list = weights[_audience]!;
    final normal = list.firstWhere((w) => w.key == 'normal');
    if (p.weight != 'custom') return list.where((w) => w.key == p.weight).firstOrNull ?? normal;
    final t = tenthsFromInput(p.custom.text) ?? normal.tenths;
    return (key: 'custom', label: '×${(t / 10).toStringAsFixed(1)}', note: '', tenths: t, mark: '✎', tone: 'gray');
  }

  String _nameOf(int i) => _people[i].name.text.trim().isEmpty ? '${i + 1}人目' : _people[i].name.text.trim();

  @override
  Widget build(BuildContext context) {
    final total = int.tryParse(_total.text) ?? 0;
    final ok = total > 0 && _people.isNotEmpty;
    final subsidy = ok && _worker
        ? subsidyTotal(
            _subsidy.text.isEmpty ? null : (perPerson: _subsidyPer, yen: int.tryParse(_subsidy.text) ?? 0),
            total,
            _people.length,
          )
        : 0;
    final result = ok
        ? splitBill(total: total - subsidy, weights: [for (final p in _people) _weightOf(p).tenths], unit: _unit, organizer: _organizer)
        : null;
    final message = result == null
        ? ''
        : [
            '${_title.text.trim().isEmpty ? '' : '「${_title.text.trim()}」の'}お会計 ${yen(total)}(${_people.length}人)',
            if (subsidy > 0) '補助 ${yen(subsidy)} を引いて、${yen(total - subsidy)} をみんなで',
            for (var i = 0; i < _people.length; i++)
              '${_weighted ? '${_weightOf(_people[i]).mark} ' : '・'}${_nameOf(i)} ${yen(result.amounts[i])}',
            if (result.surplus > 0) '(全員同じ額にしたので ${yen(result.surplus)} のお釣りが出ます)',
          ].join('\n');

    return Scaffold(
      appBar: AppBar(
        title: const Text('会計'),
        actions: [TextButton(onPressed: _confirmStartOver, child: const Text('新しい会計'))],
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
        children: [
          TextField(
            controller: _title,
            maxLength: 30,
            decoration: const InputDecoration(hintText: '何の会計?(例: ゼミの打ち上げ 10/30)', counterText: ''),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _total,
            keyboardType: TextInputType.number,
            style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w900),
            decoration: const InputDecoration(labelText: 'お会計の合計(円)', prefixText: '¥ '),
          ),
          if (_worker) ...[
            const SizedBox(height: 12),
            Row(
              children: [
                const Text(
                  '会社の補助',
                  style: TextStyle(fontWeight: FontWeight.w700, color: Palette.muted),
                ),
                const SizedBox(width: 12),
                SegmentedButton<bool>(
                  segments: const [
                    ButtonSegment(value: true, label: Text('1人')),
                    ButtonSegment(value: false, label: Text('全体')),
                  ],
                  selected: {_subsidyPer},
                  showSelectedIcon: false,
                  onSelectionChanged: (v) {
                    _subsidyPer = v.first;
                    _changed();
                  },
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: TextField(
                    controller: _subsidy,
                    keyboardType: TextInputType.number,
                    decoration: InputDecoration(hintText: _subsidyPer ? '1人あたり(円)' : '全体(円)'),
                  ),
                ),
              ],
            ),
          ],
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: SegmentedButton<bool>(
                  segments: const [
                    ButtonSegment(value: false, label: Text('割り勘')),
                    ButtonSegment(value: true, label: Text('傾斜')),
                  ],
                  selected: {_weighted},
                  showSelectedIcon: false,
                  onSelectionChanged: (v) {
                    _weighted = v.first;
                    _changed();
                  },
                ),
              ),
              const SizedBox(width: 12),
              DropdownButton<int>(
                value: _unit,
                items: [for (final u in roundUnits) DropdownMenuItem(value: u, child: Text('$u円単位'))],
                onChanged: (u) {
                  _unit = u ?? _unit;
                  _changed();
                },
              ),
            ],
          ),
          const SizedBox(height: 12),
          for (var i = 0; i < _people.length; i++) _personRow(i, result),
          TextButton.icon(
            onPressed: _people.length >= 30
                ? null
                : () {
                    final p = _Person()
                      ..name.addListener(_changed)
                      ..custom.addListener(_changed);
                    _people = [..._people, p];
                    _changed();
                  },
            icon: const Icon(Icons.add),
            label: const Text('人を足す'),
          ),
          const Text('顔のマークを押した人が幹事(端数を受け持ちます)。', style: TextStyle(fontSize: 11, color: Palette.muted)),
          const SizedBox(height: 16),
          if (result == null)
            const Text('合計を入れると一人ずつの金額が出ます。', style: TextStyle(color: Palette.muted))
          else ...[
            if (result.surplus > 0)
              Text(
                '全員 ${yen(result.amounts.first)} で同じ額。${yen(result.surplus)} のお釣りが出ます(幹事が預かる)。',
                style: const TextStyle(fontSize: 12, color: Palette.muted),
              ),
            if (result.organizerDiff != 0)
              Text(
                '端数の${yen(result.organizerDiff.abs())}ぶん幹事が${result.organizerDiff > 0 ? '多め' : '少なめ'}です。',
                style: const TextStyle(fontSize: 12, color: Palette.muted),
              ),
            const SizedBox(height: 12),
            PrimaryButton(label: '共有して金額を送る', onPressed: () => shareText(message)),
            TextButton(
              onPressed: () => copyText(context, message, '金額をコピーしました'),
              child: const Text('金額をコピー', style: TextStyle(color: Palette.muted)),
            ),
          ],
        ],
      ),
    );
  }

  Widget _personRow(int i, SplitResult? result) {
    final p = _people[i];
    final w = _weightOf(p);
    final list = weights[_audience]!;
    final organizer = i == _organizer;
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          // 押すと幹事(端数を受け持つ人)
          IconButton(
            tooltip: '${_nameOf(i)}を幹事にする',
            onPressed: () {
              _organizer = i;
              _changed();
            },
            icon: CircleAvatar(
              radius: 18,
              backgroundColor: organizer ? Palette.accent : (_tones[w.tone] ?? Palette.muted).withValues(alpha: 0.25),
              child: organizer
                  ? const Icon(Icons.emoji_events, size: 18, color: Colors.black)
                  : Text(
                      p.name.text.trim().isEmpty ? '?' : p.name.text.trim().characters.first,
                      style: const TextStyle(fontWeight: FontWeight.w900),
                    ),
            ),
          ),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                TextField(
                  controller: p.name,
                  maxLength: 20,
                  decoration: InputDecoration(hintText: '${i + 1}人目', counterText: '', isDense: true),
                ),
                if (_weighted)
                  Row(
                    children: [
                      DropdownButton<String>(
                        value: p.weight == 'custom' || list.any((x) => x.key == p.weight) ? p.weight : 'normal',
                        isDense: true,
                        items: [
                          for (final x in list) DropdownMenuItem(value: x.key, child: Text('${x.mark} ${x.label}')),
                          const DropdownMenuItem(value: 'custom', child: Text('✎ 倍率を入力')),
                        ],
                        onChanged: (v) {
                          p.weight = v ?? p.weight;
                          _changed();
                        },
                      ),
                      if (p.weight == 'custom')
                        SizedBox(
                          width: 72,
                          child: TextField(
                            controller: p.custom,
                            keyboardType: const TextInputType.numberWithOptions(decimal: true),
                            decoration: const InputDecoration(hintText: '1.0', isDense: true),
                          ),
                        ),
                    ],
                  ),
              ],
            ),
          ),
          SizedBox(
            width: 88,
            child: Text(
              result == null ? '—' : yen(result.amounts[i]),
              textAlign: TextAlign.right,
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900),
            ),
          ),
          IconButton(
            tooltip: '${_nameOf(i)}を外す',
            onPressed: _people.length <= 1
                ? null
                : () {
                    final gone = _people[i];
                    _people = [..._people]..removeAt(i);
                    gone.dispose();
                    _organizer = _organizer == i ? 0 : (_organizer > i ? _organizer - 1 : _organizer);
                    _changed();
                  },
            icon: const Icon(Icons.close, size: 18, color: Palette.muted),
          ),
        ],
      ),
    );
  }

  Future<void> _confirmStartOver() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        content: const Text('いまの会計を消して、新しい会計を始めますか?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('やめる')),
          TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('始める')),
        ],
      ),
    );
    if (ok != true) return;
    setState(_startOver);
    _changed();
  }
}
