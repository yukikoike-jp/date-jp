import 'package:material_ui/material_ui.dart';

// Web の app/globals.css と同じ色。ライトテーマは作らない
abstract final class Palette {
  static const bg = Color(0xFF000000);
  static const surface = Color(0xFF1D1D1D);
  static const surface2 = Color(0xFF2A2A2A);
  static const text = Color(0xFFFFFFFF);
  static const muted = Color(0x80FFFFFF);
  static const border = Color(0x14FFFFFF);
  static const accent = Color(0xFFF5B83D);
  static const matchSoft = Color(0xFF2A2112);
  static const matchText = Color(0xFFFFD47E);
  static const danger = Color(0xFFFF7A6B);

  // ○ △ × の色(globals.css の .tier-green / yellow / red の --tb と --tc)
  static const okFill = Color(0xFF4CC982);
  static const okText = Color(0xFF93E3B2);
  static const maybeFill = Color(0xFFF5B83D);
  static const maybeText = Color(0xFFFFD47E);
  static const noFill = Color(0xFFFF6B74);
  static const noText = Color(0xFFFF9DA3);
  // 傾斜の区分の色(.tier-blue / purple の --tb)
  static const blue = Color(0xFF6F9BFF);
  static const purple = Color(0xFF9D7BFF);
}

final ThemeData darkTheme = ThemeData(
  brightness: Brightness.dark,
  scaffoldBackgroundColor: Palette.bg,
  // ドロップダウンのメニューの地。黒い画面の上で見分けられるよう、一段明るくする
  canvasColor: Palette.surface2,
  colorScheme: const ColorScheme.dark(
    surface: Palette.bg,
    surfaceContainer: Palette.surface,
    surfaceContainerHigh: Palette.surface2,
    onSurface: Palette.text,
    onSurfaceVariant: Palette.muted,
    primary: Palette.accent,
    onPrimary: Colors.black,
    // 選んだチップ(ChoiceChip・FilterChip)は金に黒い字。Flutter の既定の青緑にしない
    secondary: Palette.accent,
    onSecondary: Colors.black,
    secondaryContainer: Palette.accent,
    onSecondaryContainer: Colors.black,
    error: Palette.danger,
    outlineVariant: Palette.border,
  ),
  appBarTheme: const AppBarTheme(backgroundColor: Palette.bg, foregroundColor: Palette.text, elevation: 0),
  snackBarTheme: const SnackBarThemeData(
    backgroundColor: Palette.surface2,
    contentTextStyle: TextStyle(color: Palette.text),
    behavior: SnackBarBehavior.floating,
  ),
);

/// 名前「Tsudoro」の字(Poppins の太字)
const logoStyle = TextStyle(fontFamily: 'Poppins', fontWeight: FontWeight.w700, color: Palette.text);

/// よく使う文字の形
abstract final class Styles {
  /// 灰色の小さな説明(12)
  static const note = TextStyle(fontSize: 12, color: Palette.muted);

  /// 灰色の本文
  static const muted = TextStyle(color: Palette.muted);

  /// 太字(見出し・ボタン)
  static const bold = TextStyle(fontWeight: FontWeight.w900);

  /// 枠の見出し(18)
  static const heading = TextStyle(fontSize: 18, fontWeight: FontWeight.w900);
}
