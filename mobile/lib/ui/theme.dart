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
  static const accentStrong = Color(0xFFFFC85C);
  static const matchSoft = Color(0xFF2A2112);
  static const matchText = Color(0xFFFFD47E);
  static const line = Color(0xFF06C755);
  static const danger = Color(0xFFFF7A6B);

  // ○ △ × の色(globals.css の .tier-green / yellow / red の --tb と --tc)
  static const okFill = Color(0xFF4CC982);
  static const okText = Color(0xFF93E3B2);
  static const maybeFill = Color(0xFFF5B83D);
  static const maybeText = Color(0xFFFFD47E);
  static const noFill = Color(0xFFFF6B74);
  static const noText = Color(0xFFFF9DA3);
}

final ThemeData darkTheme = ThemeData(
  brightness: Brightness.dark,
  scaffoldBackgroundColor: Palette.bg,
  colorScheme: const ColorScheme.dark(
    surface: Palette.bg,
    surfaceContainer: Palette.surface,
    surfaceContainerHigh: Palette.surface2,
    onSurface: Palette.text,
    onSurfaceVariant: Palette.muted,
    primary: Palette.accent,
    onPrimary: Colors.black,
    error: Palette.danger,
    outlineVariant: Palette.border,
  ),
  appBarTheme: const AppBarTheme(backgroundColor: Palette.bg, foregroundColor: Palette.text, elevation: 0),
);

/// 名前「Tsudoro」の字(Poppins の太字)
const logoStyle = TextStyle(fontFamily: 'Poppins', fontWeight: FontWeight.w700, color: Palette.text);
