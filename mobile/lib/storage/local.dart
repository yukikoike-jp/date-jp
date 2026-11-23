import 'dart:convert';

import 'package:flutter/foundation.dart' show ChangeNotifier;
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
/// 作った会やプライベート・仕事が変わったら知らせる(ホームの一覧を、どの画面で変わっても新しくする)
class Local extends ChangeNotifier {
  Local(this._prefs);
  final SharedPreferences _prefs;

  static Future<Local> open() async => Local(await SharedPreferences.getInstance());

  static const _audience = 'nomi:audience';
  static const _parties = 'nomi:parties';
  static const maxParties = 30;

  /// private / worker。まだ選んでいなければ null
  String? get audience => _prefs.getString(_audience);
  Future<void> setAudience(String a) async {
    await _prefs.setString(_audience, a);
    notifyListeners();
  }

  List<MyParty> get parties {
    final raw = _prefs.getString(_parties);
    if (raw == null) return [];
    try {
      return (jsonDecode(raw) as List).map((e) => MyParty.fromJson(e as Map<String, dynamic>)).toList();
    } on Object {
      return [];
    }
  }

  Future<void> rememberParty(MyParty p) => _setParties([p, ...parties.where((x) => x.id != p.id)].take(maxParties).toList());

  Future<void> forgetParty(String id) => _setParties(parties.where((x) => x.id != id).toList());

  Future<void> _setParties(List<MyParty> list) async {
    await _prefs.setString(_parties, jsonEncode(list));
    notifyListeners();
  }

  String? adminToken(String partyId) => parties.where((p) => p.id == partyId).firstOrNull?.token;

  // この端末で答えた回答の鍵(Web の nomi:me:<会の id> と同じ)
  static String _me(String partyId) => 'nomi:me:$partyId';

  ({String answerId, String token, String name})? mine(String partyId) {
    final raw = _prefs.getString(_me(partyId));
    if (raw == null) return null;
    try {
      final j = jsonDecode(raw) as Map<String, dynamic>;
      return (answerId: j['answerId'] as String, token: j['token'] as String, name: j['name'] as String);
    } on Object {
      return null;
    }
  }

  // 最後の会計(続きから使えるよう、この端末にだけ残す。サーバーには送らない)
  static const _split = 'nomi:split';

  Map<String, dynamic>? get split {
    final raw = _prefs.getString(_split);
    if (raw == null) return null;
    try {
      return jsonDecode(raw) as Map<String, dynamic>;
    } on Object {
      return null;
    }
  }

  Future<void> setSplit(Map<String, Object?> v) => _prefs.setString(_split, jsonEncode(v));

  Future<void> setMine(String partyId, {required String answerId, required String token, required String name}) =>
      _prefs.setString(_me(partyId), jsonEncode({'answerId': answerId, 'token': token, 'name': name}));
}
