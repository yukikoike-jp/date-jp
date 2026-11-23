import 'package:flutter/services.dart';
import 'package:material_ui/material_ui.dart';
import 'package:share_plus/share_plus.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../api/client.dart';

/// Web のページの場所(API の場所から /api/v1 を除いたもの)。開発では npm run dev を指す
final siteOrigin = Uri.parse(apiBase).replace(path: '').toString();

String guestUrl(String partyId) => '$siteOrigin/p/$partyId';
String adminUrl(String partyId, String token) => '$siteOrigin/p/$partyId/admin?token=$token';

/// お店のページは /go/ を通す(押された数を数え、紹介料の対象にするため)。外のブラウザで開く
String shopUrl(String partyId, String shopId) => '$siteOrigin/go/$partyId/$shopId';

/// LINE などに送る。端末の共有の画面を開く
Future<void> shareText(String text) => SharePlus.instance.share(ShareParams(text: text));

Future<void> copyText(BuildContext context, String text, String done) async {
  final messenger = ScaffoldMessenger.of(context);
  await Clipboard.setData(ClipboardData(text: text));
  messenger.showSnackBar(SnackBar(content: Text(done)));
}

/// アプリの中の WebView ではなく、外のブラウザで開く(紹介料の計測がずれないように)
Future<void> openOutside(String url) => launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
