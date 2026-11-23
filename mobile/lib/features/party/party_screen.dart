import 'package:material_ui/material_ui.dart';

import '../../api/client.dart';
import '../../app_scope.dart';
import '../../ui/format.dart';
import '../../ui/theme.dart';

// shortcut: 会の中身を読んで出すだけ。答える・集計・決める・共有は次の手順で足す
class PartyScreen extends StatefulWidget {
  const PartyScreen({super.key, required this.id, this.adminToken});
  final String id;
  final String? adminToken;

  @override
  State<PartyScreen> createState() => _PartyScreenState();
}

class _PartyScreenState extends State<PartyScreen> {
  late Future<PartyData> _party;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _party = AppScope.of(context).api.party(widget.id, adminToken: widget.adminToken);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(),
      body: FutureBuilder(
        future: _party,
        builder: (context, snap) {
          if (snap.hasError) {
            return Center(child: Text('${snap.error}', style: const TextStyle(color: Palette.danger)));
          }
          final p = snap.data;
          if (p == null) return const Center(child: CircularProgressIndicator());
          return ListView(
            padding: const EdgeInsets.all(24),
            children: [
              Text(p.title, style: Theme.of(context).textTheme.headlineSmall),
              const SizedBox(height: 8),
              Text(p.answered == 0 ? 'まだ回答なし' : '${p.answered}人が回答', style: const TextStyle(color: Palette.muted)),
              if (p.admin) const Text('幹事', style: TextStyle(color: Palette.accent)),
              const SizedBox(height: 16),
              for (final d in p.dates) Text(dateLabel(d)),
            ],
          );
        },
      ),
    );
  }
}
