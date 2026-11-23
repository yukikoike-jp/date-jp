import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';

import '../../api/client.dart';
import '../../app_scope.dart';
import '../../storage/local.dart';
import '../../ui/format.dart';
import '../../ui/theme.dart';
import '../../ui/widgets.dart';
import 'date_calendar.dart';

/// 選べる開始時刻。15:00〜23:45 を15分ごと(Web の CreateForm と同じ)
final startChoices = [for (var i = 0; i < 36; i++) 900 + i * 15];

/// 候補の日は Web と同じく60日まで(lib/validation.ts の MAX_DATES)
const maxDates = 60;

class CreateScreen extends StatefulWidget {
  const CreateScreen({super.key, this.today});

  /// テストで日付を固定するため
  final DateTime? today;

  @override
  State<CreateScreen> createState() => _CreateScreenState();
}

class _CreateScreenState extends State<CreateScreen> {
  final _title = TextEditingController();
  final _dates = <String>{};
  var _start = 1140;
  var _pending = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _title.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _title.dispose();
    super.dispose();
  }

  String? get _missing => _title.text.trim().isEmpty
      ? '会の名前を入力してください'
      : _dates.isEmpty
      ? '候補の日を選んでください'
      : null;

  Future<void> _submit() async {
    final scope = AppScope.of(context);
    final title = _title.text.trim();
    setState(() {
      _pending = true;
      _error = null;
    });
    try {
      final r = await scope.api.createParty(
        title: title,
        audience: scope.local.audience ?? 'private',
        dates: _dates.toList()..sort(),
        start: _start,
      );
      await scope.local.rememberParty(
        MyParty(id: r.id, title: title, token: r.adminToken, createdAt: DateTime.now().millisecondsSinceEpoch),
      );
      if (mounted) context.pushReplacement('/p/${r.id}/admin');
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _pending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final worker = AppScope.of(context).local.audience == 'worker';
    final missing = _missing;
    return Scaffold(
      appBar: AppBar(title: const Text('候補の日を選ぶ')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
        children: [
          const FieldHead(title: '飲み会の名前', sub: 'みんなに送る画面の見出し'),
          const SizedBox(height: 8),
          TextField(
            controller: _title,
            maxLength: 40,
            decoration: InputDecoration(hintText: worker ? '例: 部署の歓迎会' : '例: ゼミの打ち上げ', counterText: ''),
          ),
          const SizedBox(height: 24),
          const FieldHead(title: '何時から始める?', sub: '幹事だけで決定'),
          const SizedBox(height: 8),
          DropdownButtonFormField<int>(
            initialValue: _start,
            items: [for (final m in startChoices) DropdownMenuItem(value: m, child: Text(clock(m)))],
            onChanged: (v) => setState(() => _start = v ?? _start),
          ),
          const SizedBox(height: 24),
          FieldHead(title: '候補の日', sub: _dates.isEmpty ? 'いくつでも' : '${_dates.length}日を選択中'),
          const SizedBox(height: 12),
          DateCalendar(
            today: widget.today ?? jstToday(),
            selected: _dates,
            onToggle: (d) => setState(() {
              if (!_dates.remove(d) && _dates.length < maxDates) _dates.add(d);
            }),
          ),
          if (_dates.isNotEmpty) Text('選んだ日: ${(_dates.toList()..sort()).map(dateLabel).join('・')}', style: Styles.note),
        ],
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 12),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                _error ?? missing ?? (worker ? '仕事向けの予算と時間で質問' : 'プライベート向けの予算と時間で質問'),
                style: TextStyle(fontSize: 11, color: _error != null ? Palette.danger : Palette.muted),
              ),
              const SizedBox(height: 8),
              PrimaryButton(label: _pending ? '作成中…' : 'URLを作る', onPressed: _pending || missing != null ? null : _submit),
            ],
          ),
        ),
      ),
    );
  }
}
