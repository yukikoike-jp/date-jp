import 'dart:convert';

import 'package:http/http.dart' as http;

// 開発は --dart-define=API_BASE=... で変える。既定は Android エミュレーターから見た npm run dev
const apiBase = String.fromEnvironment('API_BASE', defaultValue: 'http://10.0.2.2:3000/api/v1');

/// API の失敗。message は画面にそのまま出せる日本語(docs/api.md)
class ApiException implements Exception {
  ApiException(this.message, {this.notFound = false});
  final String message;
  final bool notFound;
  @override
  String toString() => message;
}

/// GET /parties/:id のうち、今の画面で使うところ
class PartyData {
  PartyData({required this.id, required this.title, required this.dates, required this.answered, required this.admin, required this.invite});
  final String id;
  final String title;
  final List<String> dates;
  final int answered;
  final bool admin;
  final String invite;

  factory PartyData.fromJson(Map<String, dynamic> j) {
    final party = j['party'] as Map<String, dynamic>;
    return PartyData(
      id: party['id'] as String,
      title: party['title'] as String,
      dates: (party['dates'] as List).cast<String>(),
      answered: (j['summary'] as Map<String, dynamic>)['answered'] as int,
      admin: j['admin'] as bool,
      invite: (j['share'] as Map<String, dynamic>)['invite'] as String,
    );
  }
}

class PartyStatus {
  PartyStatus({required this.decided, required this.answered});
  final bool decided;
  final int answered;
  factory PartyStatus.fromJson(Map<String, dynamic> j) => PartyStatus(decided: j['decision'] != null, answered: j['answered'] as int);
}

class Api {
  Api({http.Client? client, this.base = apiBase}) : _http = client ?? http.Client();
  final http.Client _http;
  final String base;

  Future<PartyData> party(String id, {String? adminToken}) async {
    final j = await _send(_http.get(
      Uri.parse('$base/parties/${Uri.encodeComponent(id)}'),
      headers: {if (adminToken != null) 'authorization': 'Bearer $adminToken'},
    ));
    return PartyData.fromJson(j);
  }

  /// 会を作る。adminToken は端末に残す(DB にはハッシュしかないので、なくすと戻せない)
  Future<({String id, String adminToken})> createParty({
    required String title,
    required String audience,
    required List<String> dates,
    required int start,
  }) async {
    final j = await _send(_http.post(
      Uri.parse('$base/parties'),
      headers: _json,
      body: jsonEncode({'title': title, 'audience': audience, 'dates': dates, 'start': start}),
    ));
    return (id: j['id'] as String, adminToken: j['adminToken'] as String);
  }

  /// 作った会の一覧に出す、回答の数と決まったか。なくなった会は入らない
  Future<Map<String, PartyStatus>> statuses(List<String> ids) async {
    if (ids.isEmpty) return {};
    final j = await _send(_http.post(Uri.parse('$base/parties/statuses'), headers: _json, body: jsonEncode({'ids': ids})));
    return (j['statuses'] as Map<String, dynamic>)
        .map((id, s) => MapEntry(id, PartyStatus.fromJson(s as Map<String, dynamic>)));
  }

  static const _json = {'content-type': 'application/json'};

  Future<Map<String, dynamic>> _send(Future<http.Response> request) async {
    final http.Response res;
    try {
      res = await request;
    } on Exception {
      throw ApiException('つながりませんでした。電波を確かめてください');
    }
    final Object? j;
    try {
      j = jsonDecode(utf8.decode(res.bodyBytes));
    } on FormatException {
      throw ApiException('読み込めませんでした');
    }
    if (j is! Map<String, dynamic>) throw ApiException('読み込めませんでした');
    if (j['ok'] != true) throw ApiException(j['error'] as String? ?? '読み込めませんでした', notFound: res.statusCode == 404);
    return j;
  }
}
