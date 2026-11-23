import 'package:material_ui/material_ui.dart';

import 'theme.dart';

/// 入力の見出し(Web の CreateForm の FieldHead)
class FieldHead extends StatelessWidget {
  const FieldHead({super.key, required this.title, required this.sub});
  final String title;
  final String sub;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.baseline,
      textBaseline: TextBaseline.alphabetic,
      children: [
        Expanded(
          child: Text(
            title,
            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Palette.muted),
          ),
        ),
        Text(sub, style: const TextStyle(fontSize: 11, color: Palette.muted)),
      ],
    );
  }
}

/// 金色の大きなボタン(Web の BUTTON_PRIMARY)
class PrimaryButton extends StatelessWidget {
  const PrimaryButton({super.key, required this.label, required this.onPressed});
  final String label;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      height: 52,
      child: FilledButton(
        onPressed: onPressed,
        style: FilledButton.styleFrom(
          backgroundColor: Palette.accent,
          foregroundColor: Colors.black,
          disabledBackgroundColor: Palette.surface2,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w900),
        ),
        child: Text(label),
      ),
    );
  }
}

/// 枠(Web の panel)
class Panel extends StatelessWidget {
  const Panel({super.key, required this.children, this.highlight = false});
  final List<Widget> children;
  final bool highlight;

  @override
  Widget build(BuildContext context) {
    // Material にして、中の ListTile の背景と押したときの波紋が見えるようにする
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Material(
        color: highlight ? Palette.matchSoft : Palette.surface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(24),
          side: BorderSide(color: highlight ? Palette.accent : Palette.border),
        ),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 20, 16, 20),
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: children),
        ),
      ),
    );
  }
}

class PanelTitle extends StatelessWidget {
  const PanelTitle(this.title, this.note, {super.key});
  final String title;
  final String note;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: Styles.heading),
        const SizedBox(height: 4),
        Text(note, style: const TextStyle(fontSize: 13, color: Palette.muted)),
        const SizedBox(height: 16),
      ],
    );
  }
}

/// 読み込み中、または読み込めなかったときの画面
class LoadingScaffold extends StatelessWidget {
  const LoadingScaffold({super.key, this.error});
  final Object? error;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(),
      body: Center(
        child: error != null
            ? Padding(
                padding: const EdgeInsets.all(24),
                child: Text(
                  '$error',
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: Palette.danger),
                ),
              )
            : const CircularProgressIndicator(),
      ),
    );
  }
}
