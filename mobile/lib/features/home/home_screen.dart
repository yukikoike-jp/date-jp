import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';

import '../../api/client.dart';
import '../../app_scope.dart';
import '../../storage/local.dart';
import '../../ui/theme.dart';
import '../../ui/widgets.dart';
import '../../ui/share.dart';

const audiences = {
  'private': (label: 'プライベート', note: '学生・友達・サークル・同期', lead: 'サークル・友達の飲み会をURLひとつで'),
  'worker': (label: '仕事', note: '職場・部署・取引先', lead: '歓送迎会・忘年会をURLひとつで'),
};

/// 最初はプライベート・仕事を選ぶ。選んだあとはホーム(会をつくる・作った会の一覧)
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  var _choosing = false;
  Future<Map<String, PartyStatus>>? _statuses;

  Local? _local;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_local != null) return;
    // どの画面で会が増えても(幹事の URL から開いたときも)、一覧と数を新しくする
    _local = AppScope.of(context).local..addListener(_onLocal);
    _refresh();
  }

  @override
  void dispose() {
    _local?.removeListener(_onLocal);
    super.dispose();
  }

  void _onLocal() => setState(_refresh);

  void _refresh() {
    final scope = AppScope.of(context);
    // 一覧の数字が取れなくても、一覧そのものは出す
    _statuses = scope.api.statuses(scope.local.parties.map((p) => p.id).toList()).catchError((_) => <String, PartyStatus>{});
  }

  @override
  Widget build(BuildContext context) {
    final local = AppScope.of(context).local;
    final audience = local.audience;
    if (audience == null || _choosing) {
      return _Choose(
        onChoose: (a) async {
          _choosing = false;
          await local.setAudience(a);
        },
      );
    }
    final parties = local.parties;
    return Scaffold(
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () async {
            setState(_refresh);
            await _statuses;
          },
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
            children: [
              Row(
                children: [
                  const Expanded(
                    child: Text('Tsudoro', style: logoStyle, textScaler: TextScaler.linear(1.6)),
                  ),
                  OutlinedButton(
                    onPressed: () => setState(() => _choosing = true),
                    child: Text('${audiences[audience]?.label ?? 'プライベート'} ▾'),
                  ),
                ],
              ),
              const SizedBox(height: 20),
              _Hero(lead: audiences[audience]?.lead ?? '', onTap: () => context.push('/new')),
              const SizedBox(height: 12),
              Material(
                color: Palette.surface,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                  side: const BorderSide(color: Palette.border),
                ),
                child: ListTile(
                  leading: const Icon(Icons.calculate, color: Palette.accent),
                  title: const Text('会計', style: Styles.bold),
                  subtitle: Text(audience == 'worker' ? '補助や上司多めの計算' : '割り勘と先輩多めの計算', style: Styles.note),
                  trailing: const Icon(Icons.chevron_right, color: Palette.muted),
                  onTap: () => context.push('/split'),
                ),
              ),
              const SizedBox(height: 28),
              if (parties.isNotEmpty) ...[
                const Text(
                  '作った会',
                  style: TextStyle(fontWeight: FontWeight.w700, color: Palette.muted),
                ),
                const SizedBox(height: 8),
                FutureBuilder(
                  future: _statuses,
                  builder: (context, snap) => Column(
                    children: [
                      for (final p in parties)
                        _PartyRow(
                          party: p,
                          status: snap.data?[p.id],
                          onForget: () async {
                            await local.forgetParty(p.id);
                          },
                        ),
                    ],
                  ),
                ),
              ],
              const SizedBox(height: 28),
              const _OpenByUrl(),
              const SizedBox(height: 32),
              // 方針は Web のページを外のブラウザで開く(アプリの中に同じ文を持たない)
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  TextButton(
                    onPressed: () => openOutside('$siteOrigin/privacy'),
                    child: const Text('プライバシーポリシー', style: Styles.note),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Choose extends StatelessWidget {
  const _Choose({required this.onChoose});
  final ValueChanged<String> onChoose;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Tsudoro', style: logoStyle, textScaler: TextScaler.linear(2.4)),
              const SizedBox(height: 24),
              Text('あなたは?', style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.w900)),
              const SizedBox(height: 8),
              const Text('選んだものに合う予算・時間・お店を表示\nあとから切り替えOK', style: Styles.muted),
              const SizedBox(height: 28),
              for (final MapEntry(key: a, value: v) in audiences.entries)
                Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Material(
                    color: Palette.surface,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(24),
                      side: const BorderSide(color: Palette.border),
                    ),
                    child: ListTile(
                      contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                      title: Text(v.label, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900)),
                      subtitle: Text(v.note, style: const TextStyle(fontSize: 11, color: Palette.muted)),
                      trailing: const Icon(Icons.chevron_right, color: Palette.muted),
                      onTap: () => onChoose(a),
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Hero extends StatelessWidget {
  const _Hero({required this.lead, required this.onTap});
  final String lead;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(24, 28, 24, 24),
      decoration: BoxDecoration(
        color: Palette.surface,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Palette.accent.withValues(alpha: 0.35)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('飲み会をつくる', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900)),
          const SizedBox(height: 4),
          Text(lead, style: const TextStyle(fontSize: 13, color: Palette.muted)),
          const SizedBox(height: 20),
          PrimaryButton(label: 'URLをつくる', onPressed: onTap),
        ],
      ),
    );
  }
}

class _PartyRow extends StatelessWidget {
  const _PartyRow({required this.party, required this.status, required this.onForget});
  final MyParty party;
  final PartyStatus? status;
  final VoidCallback onForget;

  @override
  Widget build(BuildContext context) {
    final s = status;
    return Dismissible(
      key: ValueKey(party.id),
      direction: DismissDirection.endToStart,
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 20),
        color: Palette.danger,
        child: const Text(
          '一覧から外す',
          style: TextStyle(color: Colors.black, fontWeight: FontWeight.w700),
        ),
      ),
      onDismissed: (_) => onForget(),
      child: ListTile(
        contentPadding: EdgeInsets.zero,
        title: Text(party.title, maxLines: 1, overflow: TextOverflow.ellipsis),
        subtitle: Text(
          s == null
              ? ''
              : s.decided
              ? '決定済み'
              : s.answered == 0
              ? 'まだ回答なし'
              : '${s.answered}人が回答',
          style: TextStyle(fontSize: 12, color: s?.decided == true ? Palette.accent : Palette.muted),
        ),
        trailing: const Icon(Icons.chevron_right, color: Palette.muted),
        onTap: () => context.push('/p/${party.id}/admin'),
      ),
    );
  }
}

/// アプリで開くリンク(App Links)ができるまで、LINE で届いた URL を貼って開く
class _OpenByUrl extends StatelessWidget {
  const _OpenByUrl();

  @override
  Widget build(BuildContext context) {
    return TextField(
      decoration: const InputDecoration(labelText: '届いた会のURLを貼って開く'),
      textInputAction: TextInputAction.go,
      onSubmitted: (v) {
        final id = partyIdFrom(v);
        if (id != null) context.push('/p/$id');
      },
    );
  }
}

/// 「https://www.tsudoro.com/p/abc」でも「abc」でも、会の id を取り出す
String? partyIdFrom(String input) {
  final s = input.trim();
  final m = RegExp(r'/p/([A-Za-z0-9]+)').firstMatch(s);
  if (m != null) return m.group(1);
  return RegExp(r'^[A-Za-z0-9]+$').hasMatch(s) ? s : null;
}
