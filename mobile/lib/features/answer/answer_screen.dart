import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';

import '../../api/client.dart';
import '../../app_scope.dart';
import '../../domain/choices.dart';
import '../../ui/format.dart';
import '../../ui/theme.dart';
import '../../ui/widgets.dart';
import 'station_picker.dart';

/// 答える・直す(Web の components/AnswerPanel.tsx)。保存すると会の画面に戻る
class AnswerScreen extends StatefulWidget {
  const AnswerScreen({super.key, required this.id});
  final String id;

  @override
  State<AnswerScreen> createState() => _AnswerScreenState();
}

class _AnswerScreenState extends State<AnswerScreen> {
  Future<(PartyData, Answer?)>? _load;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _load ??= _fetch();
  }

  Future<(PartyData, Answer?)> _fetch() async {
    final scope = AppScope.of(context);
    final mine = scope.local.mine(widget.id);
    final party = await scope.api.party(widget.id);
    if (mine == null) return (party, null);
    try {
      return (party, await scope.api.myAnswer(widget.id, (answerId: mine.answerId, token: mine.token)));
    } on ApiException catch (e) {
      // 鍵が合わない(回答が消えた)なら、新しく答える
      if (e.notFound) return (party, null);
      rethrow;
    }
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder(
      future: _load,
      builder: (context, snap) {
        final data = snap.data;
        if (data == null) {
          return LoadingScaffold(error: snap.error);
        }
        return _AnswerForm(party: data.$1, previous: data.$2);
      },
    );
  }
}

class _AnswerForm extends StatefulWidget {
  const _AnswerForm({required this.party, required this.previous});
  final PartyData party;
  final Answer? previous;

  @override
  State<_AnswerForm> createState() => _AnswerFormState();
}

class _AnswerFormState extends State<_AnswerForm> {
  late final Answer _a;
  late final TextEditingController _name;
  late bool _more;
  var _pending = false;
  String? _error;

  bool get _editing => widget.previous != null;

  /// この端末で作った会(幹事が自分の予定を入れる)
  bool get _host => AppScope.of(context).local.adminToken(_party.id) != null;
  PartyData get _party => widget.party;

  @override
  void initState() {
    super.initState();
    final prev = widget.previous;
    _a = prev ?? Answer(dates: {for (final d in _party.dates) d: DateAnswer.ok}, arrival: _party.start ?? 0);
    // 前の回答にない日(あとから足された日)は × にしておく
    for (final d in _party.dates) {
      _a.dates.putIfAbsent(d, () => DateAnswer.no);
    }
    _name = TextEditingController(text: _a.name)..addListener(() => setState(() => _a.name = _name.text));
    // 「もっと答える」は、そこに入れたものがあるときだけ開いておく(予算の「こだわらない」は入れていないのと同じ)
    _more =
        prev != null &&
        ((prev.budget != 0 && prev.budget != unlimitedBudget) ||
            prev.likes.isNotEmpty ||
            prev.avoids.isNotEmpty ||
            prev.memo.isNotEmpty ||
            prev.avoidNote.isNotEmpty ||
            !prev.drinks ||
            prev.smokes);
  }

  @override
  void dispose() {
    _name.dispose();
    super.dispose();
  }

  String? get _missing => _a.name.trim().isEmpty
      ? '名前を入れてください'
      : _party.start == null && _a.arrival == 0
      ? '何時から来られるかを選んでください'
      : _a.stay == 0
      ? 'いつまで残れるかを選んでください'
      : null;

  Future<void> _submit({bool pass = false}) async {
    final scope = AppScope.of(context);
    final router = GoRouter.of(context);
    final messenger = ScaffoldMessenger.of(context);
    final answer = pass
        // 理由を聞かずに断れるよう、全部の日を × にして送る。時刻と予算は使われない値
        ? Answer(
            name: _a.name,
            dates: {for (final d in _party.dates) d: DateAnswer.no},
            arrival: _party.start ?? 1080,
            stay: 1440,
            budget: unlimitedBudget,
          )
        : _a;
    setState(() {
      _pending = true;
      _error = null;
    });
    try {
      final m = scope.local.mine(_party.id);
      final key = await scope.api.saveAnswer(_party.id, answer, mine: m == null ? null : (answerId: m.answerId, token: m.token));
      await scope.local.setMine(_party.id, answerId: key.answerId, token: key.token, name: answer.name.trim());
      messenger.showSnackBar(SnackBar(content: Text(pass ? '「今回はパス」で伝えました' : '回答を保存しました')));
      router.pop(true);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _pending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final missing = _missing;
    return Scaffold(
      appBar: AppBar(title: Text(_editing ? '回答を直す' : '30秒で答えられます')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
        children: [
          Text(_party.title, style: Styles.heading),
          const SizedBox(height: 20),
          const FieldHead(title: '名前', sub: '必須'),
          const SizedBox(height: 8),
          TextField(
            controller: _name,
            maxLength: maxName,
            decoration: const InputDecoration(hintText: 'みんなが分かる名前で', counterText: ''),
          ),
          // 幹事には出さない(Web と同じ)
          if (!_editing && !_host)
            TextButton(
              onPressed: _pending || _a.name.trim().isEmpty ? null : () => _submit(pass: true),
              child: Text(
                _a.name.trim().isEmpty ? '今回行けないときは名前を入れてここを押してください' : '今回は行けないときはこちら(理由は聞きません)',
                style: const TextStyle(fontSize: 13),
              ),
            ),
          const SizedBox(height: 16),
          const FieldHead(title: '行ける日', sub: ''),
          for (final d in _party.dates) _DateRow(date: d, value: _a.dates[d]!, onChanged: (v) => setState(() => _a.dates[d] = v)),
          if (_party.start == null) ...[
            const SizedBox(height: 20),
            const FieldHead(title: '何時から来られる?', sub: '必須'),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final m in arrivals)
                  ChoiceChip(label: Text(clock(m)), selected: _a.arrival == m, onSelected: (_) => setState(() => _a.arrival = m)),
              ],
            ),
          ],
          const SizedBox(height: 20),
          const FieldHead(title: 'いつまで残れる?', sub: '必須'),
          const SizedBox(height: 8),
          _StayGrid(value: stayStep(_a.stay, _party.start), onChanged: (s) => setState(() => _a.stay = stayFromStep(s, _party.start))),
          const SizedBox(height: 20),
          const FieldHead(title: '行きやすい駅', sub: ''),
          const SizedBox(height: 8),
          StationPicker(
            value: _a.station,
            onChanged: (s) => setState(() {
              _a.station = s;
              _a.areas = const [];
            }),
          ),
          const SizedBox(height: 4),
          const Text('みんなの駅から集まりやすい駅を自動で決定。', style: Styles.note),
          const SizedBox(height: 12),
          ExpansionTile(
            initiallyExpanded: _more,
            tilePadding: EdgeInsets.zero,
            childrenPadding: EdgeInsets.zero,
            expandedCrossAxisAlignment: CrossAxisAlignment.start,
            title: const Text('もっと答える', style: Styles.bold),
            subtitle: const Text('予算・お酒・苦手なもの・食べたいもの・ひとこと。なくてもOK', style: Styles.note),
            children: [_moreFields()],
          ),
        ],
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 12),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                _error ?? missing ?? '必須の項目はすべて入力済み',
                style: TextStyle(fontSize: 12, color: _error != null ? Palette.danger : Palette.muted),
              ),
              const SizedBox(height: 8),
              PrimaryButton(label: _pending ? '保存しています…' : 'この内容で答える', onPressed: _pending || missing != null ? null : _submit),
            ],
          ),
        ),
      ),
    );
  }

  Widget _moreFields() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const FieldHead(title: 'どのくらいのお店がいい?', sub: 'なくてもOK'),
        const SizedBox(height: 8),
        DropdownButtonFormField<int>(
          initialValue: _a.budget == 0 ? unlimitedBudget : _a.budget,
          items: [
            const DropdownMenuItem(value: unlimitedBudget, child: Text('こだわらない')),
            for (final b in answerBudgets) DropdownMenuItem(value: b, child: Text('${yen(b)}くらいまで')),
          ],
          onChanged: (b) => setState(() => _a.budget = b ?? 0),
        ),
        const SizedBox(height: 4),
        const Text('誰が選んだかは幹事にも非公開 ・ お店はみんなの真ん中の額で探します。', style: Styles.note),
        const SizedBox(height: 20),
        const FieldHead(title: 'お酒は飲む?', sub: ''),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          children: [
            ChoiceChip(label: const Text('飲む'), selected: _a.drinks, onSelected: (_) => setState(() => _a.drinks = true)),
            ChoiceChip(label: const Text('飲まない'), selected: !_a.drinks, onSelected: (_) => setState(() => _a.drinks = false)),
          ],
        ),
        const SizedBox(height: 4),
        const Text('「飲まない」なら会計で「飲まない」の区分に。', style: Styles.note),
        // タバコは会社の会だけ聞く(プライベートには未成年の学生もいるため)
        if (_party.worker) ...[
          const SizedBox(height: 20),
          const FieldHead(title: 'タバコは吸う?', sub: ''),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            children: [
              ChoiceChip(label: const Text('吸う'), selected: _a.smokes, onSelected: (_) => setState(() => _a.smokes = true)),
              ChoiceChip(label: const Text('吸わない'), selected: !_a.smokes, onSelected: (_) => setState(() => _a.smokes = false)),
            ],
          ),
          const SizedBox(height: 4),
          const Text('吸える店を優先・誰が吸うかは非公開。', style: Styles.note),
        ],
        const SizedBox(height: 20),
        const FieldHead(title: '苦手なもの・アレルギー', sub: 'なければそのままでOK'),
        const SizedBox(height: 8),
        const Text('アレルギー', style: Styles.note),
        _Chips(options: allergies, selected: _a.avoids, onToggle: _toggle(_a.avoids)),
        const SizedBox(height: 8),
        const Text('苦手なもの', style: Styles.note),
        _Chips(options: dislikes, selected: _a.avoids, onToggle: _toggle(_a.avoids)),
        const SizedBox(height: 8),
        TextFormField(
          initialValue: _a.avoidNote,
          maxLength: maxAvoidNote,
          decoration: const InputDecoration(hintText: 'そのほか(例: パクチー、甲殻類すべて)', counterText: ''),
          onChanged: (v) => _a.avoidNote = v,
        ),
        const Text('誰が選んだかは幹事にも非公開。', style: Styles.note),
        const SizedBox(height: 20),
        const FieldHead(title: '食べたいもの', sub: 'いくつでも・なくてもOK'),
        const SizedBox(height: 8),
        _Chips(options: genres, selected: _a.likes, onToggle: _toggle(_a.likes)),
        const Text('多かったものからお店を自動で選定。', style: Styles.note),
        const SizedBox(height: 20),
        const FieldHead(title: 'ひとこと', sub: 'なくてもOK・みんなに見えます'),
        const SizedBox(height: 8),
        TextFormField(
          initialValue: _a.memo,
          maxLength: maxMemo,
          minLines: 3,
          maxLines: 5,
          decoration: const InputDecoration(hintText: '例: 金曜はバイト終わりの19時半から行けます / 2次会は無理そう'),
          onChanged: (v) => _a.memo = v,
        ),
      ],
    );
  }

  ValueChanged<String> _toggle(Set<String> set) =>
      (k) => setState(() => set.contains(k) ? set.remove(k) : set.add(k));
}

class _DateRow extends StatelessWidget {
  const _DateRow({required this.date, required this.value, required this.onChanged});
  final String date;
  final DateAnswer value;
  final ValueChanged<DateAnswer> onChanged;

  static const _choices = [
    (v: DateAnswer.ok, mark: '○', label: '行ける', fill: Palette.okFill, text: Palette.okText),
    (v: DateAnswer.maybe, mark: '△', label: 'たぶん', fill: Palette.maybeFill, text: Palette.maybeText),
    (v: DateAnswer.no, mark: '×', label: '無理', fill: Palette.noFill, text: Palette.noText),
  ];

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(dateLabel(date), style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900)),
          const SizedBox(height: 6),
          Row(
            children: [
              for (final c in _choices)
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 3),
                    child: Semantics(
                      selected: value == c.v,
                      button: true,
                      label: '${dateLabel(date)} ${c.label}',
                      excludeSemantics: true,
                      child: OutlinedButton(
                        onPressed: () => onChanged(c.v),
                        style: OutlinedButton.styleFrom(
                          minimumSize: const Size.fromHeight(48),
                          backgroundColor: value == c.v ? c.fill : Palette.surface2,
                          foregroundColor: value == c.v ? Colors.black : Palette.text,
                          side: BorderSide(color: value == c.v ? c.fill : Palette.border),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                          padding: EdgeInsets.zero,
                        ),
                        child: Text.rich(
                          TextSpan(
                            children: [
                              TextSpan(
                                text: '${c.mark} ',
                                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: value == c.v ? null : c.text),
                              ),
                              TextSpan(
                                text: c.label,
                                style: const TextStyle(fontWeight: FontWeight.w700),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }
}

class _StayGrid extends StatelessWidget {
  const _StayGrid({required this.value, required this.onChanged});
  final StayStep? value;
  final ValueChanged<StayStep> onChanged;

  @override
  Widget build(BuildContext context) {
    Widget cell(StayStep s) => Expanded(
      child: Padding(
        padding: const EdgeInsets.all(3),
        child: OutlinedButton(
          onPressed: () => onChanged(s),
          style: OutlinedButton.styleFrom(
            minimumSize: const Size.fromHeight(56),
            backgroundColor: value == s ? Palette.accent : Palette.surface2,
            foregroundColor: value == s ? Colors.black : Palette.text,
            side: BorderSide(color: value == s ? Palette.accent : Palette.border),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(s.label, style: Styles.bold),
              Text(s.note, style: const TextStyle(fontSize: 10)),
            ],
          ),
        ),
      ),
    );
    return Column(
      children: [
        Row(children: [cell(StayStep.first), cell(StayStep.second)]),
        Row(children: [cell(StayStep.train), cell(StayStep.last)]),
      ],
    );
  }
}

class _Chips extends StatelessWidget {
  const _Chips({required this.options, required this.selected, required this.onToggle});
  final List<Option> options;
  final Set<String> selected;
  final ValueChanged<String> onToggle;

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 6,
      runSpacing: 6,
      children: [
        for (final o in options) FilterChip(label: Text(o.label), selected: selected.contains(o.key), onSelected: (_) => onToggle(o.key)),
      ],
    );
  }
}
