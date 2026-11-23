import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';

import '../../api/client.dart';
import '../../domain/calendar.dart';
import '../../ui/format.dart';
import '../../ui/theme.dart';
import '../../ui/widgets.dart';
import '../../ui/share.dart';
import 'shop_card.dart' show PrNote;

/// みんなに送る(招待)と、幹事用の URL を自分に送る
class InviteBox extends StatelessWidget {
  const InviteBox({super.key, required this.party, required this.adminToken});
  final PartyData party;
  final String adminToken;

  @override
  Widget build(BuildContext context) {
    return Panel(
      children: [
        const PanelTitle('みんなに送る', 'グループやチャットに送るだけでみんなが回答'),
        PrimaryButton(label: '共有してみんなに送る', onPressed: () => shareText(party.invite)),
        TextButton(
          onPressed: () => copyText(context, guestUrl(party.id), 'URLをコピーしました'),
          child: const Text('URLをコピー', style: Styles.muted),
        ),
        const SizedBox(height: 8),
        // なくすと会を開けなくなるので、いつも出しておく
        ListTile(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: const BorderSide(color: Palette.accent),
          ),
          tileColor: Palette.matchSoft,
          leading: const Icon(Icons.key, color: Palette.matchText),
          title: const Text(
            '幹事用のURLを自分にも送っておく',
            style: TextStyle(fontWeight: FontWeight.w900, color: Palette.matchText, fontSize: 14),
          ),
          subtitle: const Text('この端末には保存済み。ほかの端末で開くときに', style: TextStyle(fontSize: 11, color: Palette.matchText)),
          onTap: () => shareText('「${party.title}」の幹事用URL(自分用)\n${adminUrl(party.id, adminToken)}'),
        ),
      ],
    );
  }
}

/// 幹事が決める: 日にちとお店(お店は下の一覧から選ぶ)
class DecideBox extends StatelessWidget {
  const DecideBox({
    super.key,
    required this.party,
    required this.date,
    required this.shopId,
    required this.onDate,
    required this.onLater,
    required this.onMust,
    required this.pending,
  });
  final PartyData party;
  final String? date;
  final String? shopId;
  final ValueChanged<String> onDate;
  final VoidCallback onLater;

  /// 必ず来てほしい人を、付けたり外したりする
  final ValueChanged<String> onMust;
  final bool pending;

  @override
  Widget build(BuildContext context) {
    final s = party.summary;
    final shopName = party.shops.where((x) => x.id == shopId).firstOrNull?.name;
    return Panel(
      children: [
        PanelTitle('幹事が決める', '${s.answered}人が答えました。いちばん良さそうな日とお店を先に選んであります。'),
        // 部長や主役が行ける日を、日にちの候補の先頭に出す(Web の MustPicker)
        const Row(
          children: [
            Icon(Icons.workspace_premium, size: 18, color: Palette.purple),
            SizedBox(width: 6),
            Text(
              '必ず来てほしい人',
              style: TextStyle(fontWeight: FontWeight.w900, color: Palette.purple),
            ),
          ],
        ),
        const Text('部長や主役が行ける日を優先。', style: Styles.note),
        const SizedBox(height: 8),
        Wrap(
          spacing: 6,
          runSpacing: 6,
          children: [
            for (final w in s.who)
              FilterChip(
                selected: s.must.contains(w.name),
                onSelected: pending ? null : (_) => onMust(w.name),
                selectedColor: Palette.purple,
                checkmarkColor: Colors.black,
                label: Text(w.name, style: TextStyle(color: s.must.contains(w.name) ? Colors.black : Palette.purple)),
              ),
          ],
        ),
        const SizedBox(height: 20),
        const Text(
          '日にち',
          style: TextStyle(fontWeight: FontWeight.w900, color: Palette.muted),
        ),
        const SizedBox(height: 8),
        if (s.bestDates.length > 1)
          const Padding(
            padding: EdgeInsets.only(bottom: 8),
            child: Text('★ のついた日は行ける人(○)もたぶん(△)も同じ数で、いちばん良い日です。どれを選んでもOK。', style: Styles.note),
          ),
        Wrap(
          spacing: 6,
          runSpacing: 6,
          children: [
            for (final r in s.ranking.where((r) => r.ok > 0))
              ChoiceChip(
                selected: date == r.date,
                onSelected: (_) => onDate(r.date),
                label: Text(
                  '${s.bestDates.contains(r.date) ? '★ ' : ''}${dateLabel(r.date)} ・ ○${r.ok}人${r.maybe > 0 ? ' △${r.maybe}人' : ''}',
                ),
              ),
          ],
        ),
        const SizedBox(height: 20),
        const Text(
          'お店',
          style: TextStyle(fontWeight: FontWeight.w900, color: Palette.muted),
        ),
        const SizedBox(height: 8),
        Align(
          alignment: Alignment.centerLeft,
          child: ChoiceChip(selected: shopId == null, onSelected: (_) => onLater(), label: const Text('お店はあとで決める(日にちだけ先に決定)')),
        ),
        if (shopName != null) ...[
          const SizedBox(height: 8),
          Text(
            '✓ $shopName',
            style: const TextStyle(fontWeight: FontWeight.w900, color: Palette.matchText),
          ),
        ],
        if (party.shops.isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Text('下の一覧からほかのお店も選べます(${party.shops.length}軒)', style: Styles.note),
          ),
      ],
    );
  }
}

/// 決まったこと(みんなに見える)。決まったお店へはここから行く(決まったあとはお店の一覧を出さない)
class DecisionCard extends StatelessWidget {
  const DecisionCard({super.key, required this.party});
  final PartyData party;

  /// 見本のお店(s1, s2…)は実在しないので、予約や地図のリンクを出さない(Web の DecisionCard と同じ)
  static final _sample = RegExp(r'^s\d+$');

  @override
  Widget build(BuildContext context) {
    final d = party.decision!;
    final shopId = d.shopId;
    final shopName = d.shopName;
    final realShop = shopId != null && shopName != null && !_sample.hasMatch(shopId);
    Widget button(IconData icon, String label, String url) => Expanded(
      child: OutlinedButton.icon(
        onPressed: () => openOutside(url),
        style: OutlinedButton.styleFrom(
          minimumSize: const Size.fromHeight(44),
          side: const BorderSide(color: Palette.accent),
        ),
        icon: Icon(icon, size: 16),
        label: Text(label),
      ),
    );
    return Panel(
      highlight: true,
      children: [
        const Text(
          '決まりました!',
          style: TextStyle(fontWeight: FontWeight.w900, color: Palette.matchText),
        ),
        const SizedBox(height: 8),
        Text('${dateLabel(d.date)} ${clock(d.start)}〜', style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900)),
        const SizedBox(height: 4),
        Text(shopName ?? 'お店はこれから決めます', style: const TextStyle(fontSize: 15)),
        if (realShop) ...[
          const SizedBox(height: 12),
          Row(
            children: [
              button(Icons.open_in_new, 'お店のページ', shopUrl(party.id, shopId)),
              const SizedBox(width: 8),
              button(Icons.place, '地図', mapsUrl(shopName)),
            ],
          ),
          if (party.pr) const Padding(padding: EdgeInsets.only(top: 8), child: PrNote()),
        ],
        const SizedBox(height: 8),
        // カレンダーに入れれば、前日のお知らせは各自のスマホが出す(Tsudoro は連絡先を持たない)
        Row(
          children: [
            button(
              Icons.event,
              'カレンダーに入れる',
              googleCalendarUrl(title: party.title, date: d.date, start: d.start, location: shopName, url: guestUrl(party.id)),
            ),
          ],
        ),
      ],
    );
  }
}

/// 決まったあと: みんなに知らせる・予約の人数・取り消し
class DecidedBox extends StatelessWidget {
  const DecidedBox({super.key, required this.party, required this.onUndo, required this.pending});
  final PartyData party;
  final VoidCallback onUndo;
  final bool pending;

  @override
  Widget build(BuildContext context) {
    final going = party.summary.attendees.length;
    final maybes = party.summary.maybes.length;
    final text = party.decided ?? '';
    return Panel(
      children: [
        const PanelTitle('決まったことを知らせる', '日にち・時間・お店入りの案内文。'),
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(color: Palette.surface2, borderRadius: BorderRadius.circular(12)),
          child: Text.rich(
            TextSpan(
              children: [
                const TextSpan(text: '予約の人数: '),
                TextSpan(text: '$going人', style: Styles.bold),
                if (maybes > 0) TextSpan(text: '(たぶんの人を入れると${going + maybes}人)', style: Styles.muted),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),
        PrimaryButton(label: '共有して「決まったよ」を送る', onPressed: () => shareText(text)),
        TextButton(
          onPressed: () => copyText(context, text, '送る文をコピーしました'),
          child: const Text('送る文をコピー', style: Styles.muted),
        ),
        const SizedBox(height: 8),
        // 会が決まったあとの次の一歩なので、金色の枠で目立たせる
        ListTile(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: const BorderSide(color: Palette.accent),
          ),
          leading: const Icon(Icons.calculate, color: Palette.accent),
          title: const Text('この会の会計をする', style: Styles.bold),
          subtitle: Text('$going人の名前を入れた状態からスタート', style: Styles.note),
          trailing: const Icon(Icons.chevron_right, color: Palette.accent),
          onTap: () => context.push('/split?from=${party.id}'),
        ),
        // 取り消しはめったに使わないので、小さな文字のボタンにする
        TextButton(
          onPressed: pending ? null : () => _confirmUndo(context),
          child: const Text(
            '決定を取り消す',
            style: TextStyle(fontSize: 12, color: Palette.muted, decoration: TextDecoration.underline),
          ),
        ),
      ],
    );
  }

  Future<void> _confirmUndo(BuildContext context) async {
    final ok = await showModalBottomSheet<bool>(
      context: context,
      backgroundColor: Palette.surface,
      builder: (context) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text('決定を取り消しますか?', style: Styles.heading),
              const SizedBox(height: 8),
              const Text('日にちとお店の決定を取り消して選び直せる状態に戻します。みんなの回答は消えません。', style: Styles.muted),
              const SizedBox(height: 20),
              FilledButton(
                onPressed: () => Navigator.pop(context, true),
                style: FilledButton.styleFrom(
                  backgroundColor: Colors.red,
                  foregroundColor: Colors.white,
                  minimumSize: const Size.fromHeight(48),
                ),
                child: const Text('取り消して選び直す', style: Styles.bold),
              ),
              const SizedBox(height: 8),
              OutlinedButton(
                onPressed: () => Navigator.pop(context, false),
                style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(48)),
                child: const Text('やめる'),
              ),
            ],
          ),
        ),
      ),
    );
    if (ok == true) onUndo();
  }
}

/// みんなの答え(誰がいつ行けるか)。いつもはたたんでおく
class WhoTable extends StatelessWidget {
  const WhoTable({super.key, required this.party});
  final PartyData party;

  static const _marks = {
    DateAnswer.ok: ('○', Palette.okText),
    DateAnswer.maybe: ('△', Palette.maybeText),
    DateAnswer.no: ('×', Palette.noText),
  };

  @override
  Widget build(BuildContext context) {
    final s = party.summary;
    return ExpansionTile(
      tilePadding: EdgeInsets.zero,
      title: Text('みんなの答え(${s.answered}人)', style: Styles.bold),
      subtitle: const Text('誰がいつ行けるか・ひとこと', style: Styles.note),
      children: [
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: DataTable(
            columnSpacing: 16,
            columns: [
              const DataColumn(label: Text('')),
              for (final d in party.dates) DataColumn(label: Text(dateLabel(d))),
            ],
            rows: [
              for (final w in s.who)
                DataRow(
                  cells: [
                    DataCell(Text(s.must.contains(w.name) ? '★ ${w.name}' : w.name)),
                    for (final d in party.dates)
                      DataCell(
                        Text(
                          _marks[w.dates[d] ?? DateAnswer.no]!.$1,
                          style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: _marks[w.dates[d] ?? DateAnswer.no]!.$2),
                        ),
                      ),
                  ],
                ),
            ],
          ),
        ),
        for (final n in s.notes)
          ListTile(
            dense: true,
            contentPadding: EdgeInsets.zero,
            title: Text(n.memo),
            subtitle: Text(n.name, style: Styles.muted),
          ),
      ],
    );
  }
}
