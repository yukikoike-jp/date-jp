import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';

import '../../api/client.dart';
import '../../app_scope.dart';
import '../../storage/local.dart';
import '../../ui/format.dart';
import '../../ui/theme.dart';
import '../../ui/widgets.dart';
import 'admin_sections.dart';
import 'shop_card.dart';

/// 会の画面。幹事の鍵が合えば幹事の画面(Web の /p/:id/admin)、なければ参加者の画面(/p/:id)
class PartyScreen extends StatefulWidget {
  const PartyScreen({super.key, required this.id, this.adminToken});
  final String id;
  final String? adminToken;

  @override
  State<PartyScreen> createState() => _PartyScreenState();
}

class _PartyScreenState extends State<PartyScreen> {
  PartyData? _p;
  Object? _loadError;

  /// 幹事が選んでいる日にちとお店(null = お店はあとで)
  String? _date;
  String? _shopId;
  var _pending = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_p == null && _loadError == null) _reload();
  }

  Future<void> _reload() async {
    try {
      final local = AppScope.of(context).local;
      final p = await AppScope.of(context).api.party(widget.id, adminToken: widget.adminToken);
      // 幹事の URL から開いたら、この端末の「作った会」に残す(Web の幹事の画面と同じ。次からはホームから開ける)
      final token = widget.adminToken;
      if (p.admin && token != null && local.adminToken(p.id) != token) {
        await local.rememberParty(MyParty(id: p.id, title: p.title, token: token, createdAt: DateTime.now().millisecondsSinceEpoch));
      }
      if (!mounted) return;
      setState(() {
        _p = p;
        _loadError = null;
        // いちばん良さそうな日とお店を先に選んでおく(Web と同じ)
        _date = p.decision?.date ?? p.summary.date;
        _shopId = p.decision?.shopId ?? p.shops.where((s) => !s.sample).firstOrNull?.id;
      });
    } on ApiException catch (e) {
      if (mounted) setState(() => _loadError = e);
    }
  }

  Future<void> _answer() async {
    final saved = await context.push<bool>('/p/${widget.id}/answer');
    if (saved == true && mounted) await _reload();
  }

  Future<void> _decide({required String? date, String? shopId, bool clear = false}) async {
    final api = AppScope.of(context).api;
    final messenger = ScaffoldMessenger.of(context);
    final token = widget.adminToken!;
    setState(() => _pending = true);
    try {
      if (clear) {
        await api.undecide(widget.id, token);
      } else {
        await api.decide(widget.id, token, date: date!, shopId: shopId);
      }
      messenger.showSnackBar(SnackBar(content: Text(clear ? '決定を取り消しました' : '決まりました。みんなに知らせましょう')));
      await _reload();
    } on ApiException catch (e) {
      messenger.showSnackBar(SnackBar(content: Text(e.message)));
    } finally {
      if (mounted) setState(() => _pending = false);
    }
  }

  /// 必ず来てほしい人を付けたり外したりする。いちばん良い日が変わるので、選んでいる日も選び直す
  Future<void> _toggleMust(PartyData p, String name) async {
    final api = AppScope.of(context).api;
    final messenger = ScaffoldMessenger.of(context);
    final must = p.summary.must;
    setState(() => _pending = true);
    try {
      await api.setMust(widget.id, widget.adminToken!, must.contains(name) ? must.where((n) => n != name).toList() : [...must, name]);
      await _reload();
    } on ApiException catch (e) {
      messenger.showSnackBar(SnackBar(content: Text(e.message)));
    } finally {
      if (mounted) setState(() => _pending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = _p;
    if (p == null) {
      return LoadingScaffold(error: _loadError);
    }
    final admin = p.admin && widget.adminToken != null;
    final canDecide = admin && p.decision == null && p.summary.ranking.any((r) => r.ok > 0);
    return Scaffold(
      appBar: AppBar(),
      body: RefreshIndicator(
        onRefresh: _reload,
        child: ListView(padding: const EdgeInsets.fromLTRB(16, 0, 16, 32), children: admin ? _adminBody(p) : _guestBody(p)),
      ),
      bottomNavigationBar: canDecide ? _decideBar(p) : null,
    );
  }

  Widget _header(PartyData p, {required bool admin}) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(4, 0, 4, 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (admin)
            const Text(
              '幹事の画面',
              style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900, color: Palette.muted, letterSpacing: 2),
            ),
          Text(p.title, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900)),
          const SizedBox(height: 4),
          Text(
            [if (p.start != null) '${clock(p.start!)}〜', p.answered == 0 ? 'まだ回答なし' : '${p.answered}人が回答'].join(' ・ '),
            style: Styles.muted,
          ),
        ],
      ),
    );
  }

  Widget _answerButton(PartyData p, {required bool admin}) {
    final mine = AppScope.of(context).local.mine(p.id);
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: mine == null && !admin
          ? PrimaryButton(label: '答える', onPressed: _answer)
          : OutlinedButton.icon(
              onPressed: _answer,
              style: OutlinedButton.styleFrom(
                minimumSize: const Size.fromHeight(52),
                side: const BorderSide(color: Palette.border),
              ),
              icon: const Icon(Icons.person, color: Palette.accent),
              label: Text(mine == null ? '自分の予定を入れる' : '${mine.name}さんの回答を直す'),
            ),
    );
  }

  List<Widget> _guestBody(PartyData p) => [
    _header(p, admin: false),
    if (p.decision != null) DecisionCard(decision: p.decision!),
    _answerButton(p, admin: false),
    if (p.answered > 0) WhoTable(party: p),
  ];

  List<Widget> _adminBody(PartyData p) {
    final token = widget.adminToken!;
    final d = p.decision;
    final invite = InviteBox(party: p, adminToken: token);
    return [
      _header(p, admin: true),
      if (d != null) DecisionCard(decision: d),
      if (d == null && p.answered == 0) invite,
      if (d != null)
        DecidedBox(party: p, pending: _pending, onUndo: () => _decide(date: null, clear: true))
      else if (p.summary.ranking.any((r) => r.ok > 0))
        DecideBox(
          party: p,
          date: _date,
          shopId: _shopId,
          onDate: (v) => setState(() => _date = v),
          onLater: () => setState(() => _shopId = null),
          onMust: (name) => _toggleMust(p, name),
          pending: _pending,
        ),
      // お店がまだ決まっていなければ、一覧から選ぶ(日にちだけ決めたあとは、押したお店でそのまま決める)
      if (d?.shopId == null) ..._shopList(p, decided: d),
      _answerButton(p, admin: true),
      if (p.answered > 0) WhoTable(party: p),
      // 答えが来はじめたら、招待はたたむ(まだの人に送り直すときに開く)
      if (d != null || p.answered > 0)
        ExpansionTile(
          tilePadding: EdgeInsets.zero,
          title: Text(d != null ? 'みんなに送る・幹事用のURL' : 'まだの人に送る', style: Styles.bold),
          subtitle: const Text('招待のURL・幹事用のURL', style: Styles.note),
          children: [invite],
        ),
    ];
  }

  List<Widget> _shopList(PartyData p, {required Decision? decided}) {
    if (p.shops.isEmpty) return const [];
    final sample = p.shops.any((s) => s.sample);
    return [
      Panel(
        children: [
          const Text('合いそうなお店', style: Styles.heading),
          // 提携リンクだと、一覧の上でも分かるようにする
          if (p.pr && !sample) const Padding(padding: EdgeInsets.only(top: 4), child: PrNote()),
          const SizedBox(height: 4),
          Text(p.otherArea ? 'その場所に合うお店がなく、近くのエリアから' : 'みんなの答えから自動で選んだお店', style: const TextStyle(fontSize: 13, color: Palette.muted)),
          if (p.relaxed != null)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text('ⓘ ${p.relaxed}', style: const TextStyle(fontSize: 12)),
            ),
          if (p.basis.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Wrap(
                spacing: 6,
                runSpacing: 6,
                children: [
                  for (final b in p.basis)
                    Chip(
                      label: Text('✓ $b', style: const TextStyle(fontSize: 12, color: Palette.accent)),
                      visualDensity: VisualDensity.compact,
                    ),
                ],
              ),
            ),
          if (p.notice != null)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text(
                '予約のときに伝えること: ${p.notice}',
                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Palette.noText),
              ),
            ),
          if (sample)
            const Padding(
              padding: EdgeInsets.only(top: 8),
              child: Text(
                '実在しない見本のお店',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Palette.matchText),
              ),
            ),
          const SizedBox(height: 16),
          for (final s in p.shops)
            ShopCard(
              partyId: p.id,
              shop: s,
              selected: decided == null && _shopId == s.id,
              pickLabel: decided != null ? 'このお店に決定する' : 'このお店を選ぶ',
              onPick: _pending
                  ? null
                  : decided != null
                  ? () => _decide(date: decided.date, shopId: s.id)
                  : () => setState(() => _shopId = s.id),
            ),
        ],
      ),
    ];
  }

  Widget _decideBar(PartyData p) {
    final shopName = _shopId == null ? 'お店はあとで' : p.shops.where((s) => s.id == _shopId).firstOrNull?.name ?? '選んだお店';
    return SafeArea(
      child: Container(
        decoration: const BoxDecoration(
          border: Border(top: BorderSide(color: Palette.border)),
        ),
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '${_date == null ? '日にちを選んでください' : dateLabel(_date!)} ・ $shopName',
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Palette.muted),
            ),
            const SizedBox(height: 8),
            PrimaryButton(
              label: _pending ? '決めています…' : 'これで決定する',
              onPressed: _pending || _date == null ? null : () => _decide(date: _date, shopId: _shopId),
            ),
          ],
        ),
      ),
    );
  }
}
