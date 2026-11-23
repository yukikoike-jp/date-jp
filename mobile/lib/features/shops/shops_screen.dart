import 'package:material_ui/material_ui.dart';

import '../../api/client.dart';
import '../../app_scope.dart';
import '../../domain/choices.dart';
import '../../ui/share.dart';
import '../../ui/theme.dart';
import '../../ui/widgets.dart';
import '../answer/station_picker.dart';
import '../party/shop_card.dart';

/// お店を探す(Web の /shops)。駅を選び、一次会か二次会かと条件を選ぶと、その場で探し直す。
/// いちばん上に、お気に入りのお店をたたんで出す
class ShopsScreen extends StatefulWidget {
  const ShopsScreen({super.key});

  @override
  State<ShopsScreen> createState() => _ShopsScreenState();
}

class _ShopsScreenState extends State<ShopsScreen> {
  Station? _station;
  var _second = false;
  String? _secondGenre;
  int? _budget;
  final _genres = <String>{};
  var _privateRoom = false;
  var _freeDrink = false;
  var _smoking = false;

  ShopResult? _result;
  String? _error;
  var _pending = false;

  /// 条件を続けて変えたとき、古い結果で上書きしないための番号
  var _asked = 0;

  /// 条件を変えて探し直す
  void _set(VoidCallback change) {
    setState(change);
    _search();
  }

  Future<void> _search() async {
    final station = _station;
    final n = ++_asked;
    if (station == null) {
      setState(() => _result = null);
      return;
    }
    final scope = AppScope.of(context);
    setState(() {
      _pending = true;
      _error = null;
    });
    try {
      final r = await scope.api.searchShops(
        station: station,
        audience: scope.local.audience ?? 'private',
        genres: _genres.toList(),
        budget: _budget,
        privateRoom: _privateRoom,
        freeDrink: _freeDrink,
        smoking: _smoking,
        second: _second ? (genre: _secondGenre) : null,
      );
      if (mounted && n == _asked) setState(() => _result = r);
    } on ApiException catch (e) {
      if (mounted && n == _asked) setState(() => _error = e.message);
    } finally {
      if (mounted && n == _asked) setState(() => _pending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('お店を探す')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 32),
        children: [
          const Text('条件を選ぶと下のお店がその場で更新。', style: Styles.muted),
          const SizedBox(height: 16),
          const _Favorites(),
          Panel(children: _filters()),
          const SizedBox(height: 16),
          ..._results(),
        ],
      ),
    );
  }

  List<Widget> _filters() {
    Widget chip(String label, bool on, VoidCallback onTap) => ChoiceChip(label: Text(label), selected: on, onSelected: (_) => _set(onTap));
    return [
      const FieldHead(title: 'どこで飲む?', sub: ''),
      StationPicker(value: _station, onChanged: (s) => _set(() => _station = s)),
      const SizedBox(height: 8),
      // 二次会向けは、23時以降も開いているお店だけを出す
      SegmentedButton<bool>(
        segments: const [
          ButtonSegment(value: false, label: Text('一次会向け')),
          ButtonSegment(value: true, label: Text('二次会向け')),
        ],
        selected: {_second},
        showSelectedIcon: false,
        onSelectionChanged: (v) => _set(() => _second = v.single),
      ),
      if (_second) ...[
        const Padding(
          padding: EdgeInsets.only(top: 8),
          child: Text('23時以降も開いているお店だけを表示', style: Styles.note),
        ),
        const SizedBox(height: 20),
        const FieldHead(title: 'どんなお店?', sub: ''),
        const SizedBox(height: 8),
        Wrap(
          spacing: 6,
          runSpacing: 6,
          children: [
            chip('なんでも', _secondGenre == null, () => _secondGenre = null),
            for (final g in secondGenres) chip(g.label, _secondGenre == g.key, () => _secondGenre = g.key),
          ],
        ),
      ] else ...[
        const SizedBox(height: 20),
        const FieldHead(title: '1人いくらまで?', sub: ''),
        const SizedBox(height: 8),
        Wrap(
          spacing: 6,
          runSpacing: 6,
          children: [
            chip('決めない', _budget == null, () => _budget = null),
            for (final b in searchBudgets) chip('〜${yen(b)}', _budget == b, () => _budget = b),
          ],
        ),
        const SizedBox(height: 20),
        const FieldHead(title: '何を食べる?', sub: 'いくつでも選べます'),
        const SizedBox(height: 8),
        Wrap(
          spacing: 6,
          runSpacing: 6,
          children: [
            chip('なんでも', _genres.isEmpty, _genres.clear),
            for (final g in genres)
              FilterChip(
                label: Text(g.label),
                selected: _genres.contains(g.key),
                onSelected: (on) => _set(() => on ? _genres.add(g.key) : _genres.remove(g.key)),
              ),
          ],
        ),
        const SizedBox(height: 12),
        _Toggle('個室があるお店だけにする', Icons.meeting_room, _privateRoom, (v) => _set(() => _privateRoom = v)),
        _Toggle('飲み放題があるお店だけにする', Icons.sports_bar, _freeDrink, (v) => _set(() => _freeDrink = v)),
        _Toggle('タバコが吸えるお店だけにする(分煙も含む)', Icons.smoking_rooms, _smoking, (v) => _set(() => _smoking = v)),
      ],
    ];
  }

  List<Widget> _results() {
    final r = _result;
    if (_station == null) return const [Text('上の「どこで飲む?」で駅を選ぶと近くのお店を表示', style: Styles.muted)];
    if (_error != null) return [Text(_error!, style: const TextStyle(color: Palette.noText))];
    if (_pending || r == null) return const [Center(child: CircularProgressIndicator())];
    if (r.shops.isEmpty) return const [Text('合うお店なし', style: Styles.muted)];
    return [
      Text('${r.shops.length}軒', style: Styles.bold),
      if (r.pr && !r.shops.any((s) => s.sample)) const Padding(padding: EdgeInsets.only(top: 4), child: PrNote()),
      if (r.shops.any((s) => s.sample))
        const Text(
          '実在しない見本のお店',
          style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Palette.matchText),
        ),
      if (r.otherArea) const Text('その場所に合うお店がなく、近くのエリアから', style: Styles.note),
      if (r.relaxed != null) Text('ⓘ ${r.relaxed}', style: const TextStyle(fontSize: 12)),
      const SizedBox(height: 8),
      // 会に紐づかないので、押された数は「search」として数える(Web と同じ)
      for (final s in r.shops) ShopCard(partyId: 'search', shop: s),
    ];
  }
}

class _Toggle extends StatelessWidget {
  const _Toggle(this.label, this.icon, this.value, this.onChanged);
  final String label;
  final IconData icon;
  final bool value;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    return SwitchListTile(
      contentPadding: EdgeInsets.zero,
      secondary: Icon(icon, color: Palette.muted),
      title: Text(label, style: const TextStyle(fontSize: 14)),
      value: value,
      onChanged: onChanged,
    );
  }
}

/// お気に入りのお店(Web の FavoriteShops)。最初はたたんでおく。お気に入りがなければ出さない
class _Favorites extends StatelessWidget {
  const _Favorites();

  @override
  Widget build(BuildContext context) {
    final local = AppScope.of(context).local;
    return ListenableBuilder(
      listenable: local,
      builder: (context, _) {
        final list = local.favorites;
        if (list.isEmpty) return const SizedBox.shrink();
        return Padding(
          padding: const EdgeInsets.only(bottom: 16),
          child: Panel(
            children: [
              ExpansionTile(
                tilePadding: EdgeInsets.zero,
                leading: const Icon(Icons.favorite, color: FavoriteButton.color),
                title: Text('お気に入りのお店 ${list.length}', style: Styles.bold),
                children: [
                  for (final f in list)
                    ListTile(
                      contentPadding: EdgeInsets.zero,
                      title: Text(f.name, style: Styles.bold, overflow: TextOverflow.ellipsis),
                      subtitle: Text('${f.genre} ・ ${f.budgetLabel}', style: Styles.note, overflow: TextOverflow.ellipsis),
                      trailing: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          IconButton(
                            tooltip: '${f.name}の地図',
                            icon: const Icon(Icons.place, color: Palette.muted),
                            onPressed: () => openOutside(mapsUrl(f.name)),
                          ),
                          IconButton(
                            tooltip: '${f.name}のお店のページ',
                            icon: const Icon(Icons.open_in_new, color: Palette.muted),
                            onPressed: () => openOutside(shopUrl('search', f.id)),
                          ),
                          FavoriteButton(shop: f),
                        ],
                      ),
                    ),
                  const Padding(padding: EdgeInsets.symmetric(vertical: 8), child: PrNote()),
                ],
              ),
            ],
          ),
        );
      },
    );
  }
}
