import 'package:material_ui/material_ui.dart';

import '../../api/client.dart';
import '../../ui/theme.dart';
import '../../ui/share.dart';

const _smokingLabel = {'ok': '喫煙可', 'partial': '分煙', 'no': '全面禁煙'};

/// 提携リンクだと分かるように書く(components/PrNote.tsx と同じ。本文と同じくらいはっきり出す)
class PrNote extends StatelessWidget {
  const PrNote({super.key});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 4),
          decoration: BoxDecoration(
            border: Border.all(color: Colors.white54),
            borderRadius: BorderRadius.circular(4),
          ),
          child: const Text(
            '#アフィリエイト広告',
            style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Colors.white70),
          ),
        ),
        const SizedBox(width: 6),
        const Text(
          '予約のリンクは提携リンクです',
          style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Colors.white70),
        ),
      ],
    );
  }
}

/// お店1軒。選ぶボタン(幹事)と、お店のページで予約するリンク
class ShopCard extends StatelessWidget {
  const ShopCard({super.key, required this.partyId, required this.shop, this.selected = false, this.pickLabel, this.onPick});
  final String partyId;
  final Shop shop;
  final bool selected;

  /// 幹事が選ぶとき。null なら選ぶボタンを出さない
  final String? pickLabel;
  final VoidCallback? onPick;

  @override
  Widget build(BuildContext context) {
    final s = shop;
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: selected ? Palette.matchSoft : null,
        border: Border.all(color: selected ? Palette.accent : Palette.border),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: SizedBox.square(
                  dimension: 64,
                  child: s.photo == null
                      ? const ColoredBox(
                          color: Palette.surface2,
                          child: Icon(Icons.storefront, color: Palette.muted),
                        )
                      : Image.network(
                          s.photo!,
                          fit: BoxFit.cover,
                          errorBuilder: (_, _, _) => const ColoredBox(color: Palette.surface2),
                        ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(s.name, style: Styles.bold),
                    Text('${s.genre} ・ ${s.access}', style: Styles.note),
                    const SizedBox(height: 4),
                    Text(s.budgetLabel, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
                    if (s.features.isNotEmpty || s.smoking != null)
                      Padding(
                        padding: const EdgeInsets.only(top: 4),
                        child: Wrap(
                          spacing: 4,
                          runSpacing: 4,
                          children: [
                            for (final f in [...s.features, ?_smokingLabel[s.smoking]])
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                decoration: BoxDecoration(color: Palette.surface2, borderRadius: BorderRadius.circular(99)),
                                child: Text(f, style: const TextStyle(fontSize: 12)),
                              ),
                          ],
                        ),
                      ),
                  ],
                ),
              ),
            ],
          ),
          if (s.photo != null)
            const Padding(
              padding: EdgeInsets.only(top: 4),
              child: Text('画像提供:ホットペッパー グルメ', style: TextStyle(fontSize: 10, color: Palette.muted)),
            ),
          if (onPick != null && !s.sample) ...[
            const SizedBox(height: 12),
            FilledButton(
              onPressed: onPick,
              style: FilledButton.styleFrom(
                minimumSize: const Size.fromHeight(44),
                backgroundColor: selected ? Palette.accent : Palette.surface2,
                foregroundColor: selected ? Colors.black : Palette.text,
              ),
              child: Text(selected ? '✓ このお店を選んでいます' : pickLabel ?? 'このお店を選ぶ', style: Styles.bold),
            ),
          ],
          const SizedBox(height: 8),
          OutlinedButton.icon(
            onPressed: s.sample ? null : () => openOutside(shopUrl(partyId, s.id)),
            style: OutlinedButton.styleFrom(
              minimumSize: const Size.fromHeight(44),
              side: const BorderSide(color: Palette.border),
            ),
            icon: s.sample ? null : const Icon(Icons.open_in_new, size: 16),
            label: Text(s.sample ? '見本のためお店のページなし' : 'お店のページで予約する'),
          ),
        ],
      ),
    );
  }
}
