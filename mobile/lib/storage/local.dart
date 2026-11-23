import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

/// この端末で作った会(Web の lib/myParties.ts と同じ形)。幹事の鍵をなくさないよう、端末にだけ残す
class MyParty {
  MyParty({required this.id, required this.title, required this.token, required this.createdAt});
  final String id;
  final String title;
  final String token;
  final int createdAt;

  Map<String, Object> toJson() => {'id': id, 'title': title, 'token': token, 'createdAt': createdAt};
  factory MyParty.fromJson(Map<String, dynamic> j) =>
      MyParty(id: j['id'] as String, title: j['title'] as String, token: j['token'] as String, createdAt: j['createdAt'] as int);
}

/// 端末の保存。Web の localStorage と同じ扱い(アプリの外からは読めない)。
/// shortcut: 幹事の鍵も shared_preferences に置く。Web の localStorage と同じ強さ。端末を盗まれる心配が要る機能が来たら flutter_secure_storage に移す
class Local {
  Local(this._prefs);
  final SharedPreferences _prefs;

  static Future<Local> open() async => Local(await SharedPreferences.getInstance());

  static const _audience = 'nomi:audience';
  static const _parties = 'nomi:parties';
  static const maxParties = 30;

  /// private / worker。まだ選んでいなければ null
  String? get audience => _prefs.getString(_audience);
  Future<void> setAudience(String a) => _prefs.setString(_audience, a);

  List<MyParty> get parties {
    final raw = _prefs.getString(_parties);
    if (raw == null) return [];
    try {
      return (jsonDecode(raw) as List).map((e) => MyParty.fromJson(e as Map<String, dynamic>)).toList();
    } on Object {
      return [];
    }
  }

  Future<void> rememberParty(MyParty p) {
    final list = [p, ...parties.where((x) => x.id != p.id)].take(maxParties).toList();
    return _prefs.setString(_parties, jsonEncode(list));
  }

  Future<void> forgetParty(String id) =>
      _prefs.setString(_parties, jsonEncode(parties.where((x) => x.id != id).toList()));

  String? adminToken(String partyId) => parties.where((p) => p.id == partyId).firstOrNull?.token;
}
