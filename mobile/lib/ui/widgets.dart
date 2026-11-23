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
