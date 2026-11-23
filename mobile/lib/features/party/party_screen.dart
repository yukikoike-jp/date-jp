import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';

import '../../api/client.dart';
import '../../app_scope.dart';
import '../../ui/format.dart';
import '../../ui/theme.dart';
import '../../ui/widgets.dart';

// shortcut: 集計・決める・共有はまだない。次の手順で足す
class PartyScreen extends StatefulWidget {
  const PartyScreen({super.key, required this.id, this.adminToken});
  final String id;
  final String? adminToken;

  @override
  State<PartyScreen> createState() => _PartyScreenState();
}

class _PartyScreenState extends State<PartyScreen> {
  Future<PartyData>? _party;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _party ??= _fetch();
  }

  Future<PartyData> _fetch() => AppScope.of(context).api.party(widget.id, adminToken: widget.adminToken);

  Future<void> _answer() async {
    final saved = await context.push<bool>('/p/${widget.id}/answer');
    if (saved == true && mounted) {
      setState(() {
        _party = _fetch();
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final mine = AppScope.of(context).local.mine(widget.id);
    return Scaffold(
      appBar: AppBar(),
      body: FutureBuilder(
        future: _party,
        builder: (context, snap) {
          if (snap.hasError) {
            return Center(
              child: Text('${snap.error}', style: const TextStyle(color: Palette.danger)),
            );
          }
          final p = snap.data;
          if (p == null) return const Center(child: CircularProgressIndicator());
          return RefreshIndicator(
            onRefresh: () async {
              setState(() {
                _party = _fetch();
              });
              await _party;
            },
            child: ListView(
              padding: const EdgeInsets.all(24),
              children: [
                if (p.admin)
                  const Text(
                    '幹事',
                    style: TextStyle(color: Palette.accent, fontWeight: FontWeight.w700),
                  ),
                Text(p.title, style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w900)),
                const SizedBox(height: 8),
                Text(p.answered == 0 ? 'まだ回答なし' : '${p.answered}人が回答', style: const TextStyle(color: Palette.muted)),
                if (p.start != null) Text('${clock(p.start!)}〜', style: const TextStyle(color: Palette.muted)),
                const SizedBox(height: 16),
                Text(p.dates.map(dateLabel).join('・')),
                const SizedBox(height: 24),
                PrimaryButton(label: mine == null ? (p.admin ? '自分の予定を入れる' : '答える') : '${mine.name}さんの回答を直す', onPressed: _answer),
              ],
            ),
          );
        },
      ),
    );
  }
}
