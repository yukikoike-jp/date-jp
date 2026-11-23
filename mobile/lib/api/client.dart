import 'dart:convert';

import 'package:http/http.dart' as http;

import 'models.dart';

export 'models.dart';

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

/// 参加者の鍵。直すときと、自分の回答を読むときに使う
typedef AnswerKey = ({String answerId, String token});

class Api {
  Api({http.Client? client, this.base = apiBase}) : _http = client ?? http.Client();
  final http.Client _http;
  final String base;

  static const _json = {'content-type': 'application/json'};

  Uri _uri(String path, [Map<String, String>? query]) => Uri.parse('$base$path').replace(queryParameters: query);

  Future<PartyData> party(String id, {String? adminToken}) async {
    final j = await _send(
      _http.get(_uri('/parties/${Uri.encodeComponent(id)}'), headers: {if (adminToken != null) 'authorization': 'Bearer $adminToken'}),
    );
    return PartyData.fromJson(j);
  }

  /// 会を作る。adminToken は端末に残す(DB にはハッシュしかないので、なくすと戻せない)
  Future<({String id, String adminToken})> createParty({
    required String title,
    required String audience,
    required List<String> dates,
    required int start,
  }) async {
    final j = await _send(
      _http.post(
        _uri('/parties'),
        headers: _json,
        body: jsonEncode({'title': title, 'audience': audience, 'dates': dates, 'start': start}),
      ),
    );
    return (id: j['id'] as String, adminToken: j['adminToken'] as String);
  }

  /// 作った会の一覧に出す、回答の数と決まったか。なくなった会は入らない
  Future<Map<String, PartyStatus>> statuses(List<String> ids) async {
    if (ids.isEmpty) return {};
    final j = await _send(_http.post(_uri('/parties/statuses'), headers: _json, body: jsonEncode({'ids': ids})));
    return (j['statuses'] as Map<String, dynamic>).map((id, s) => MapEntry(id, PartyStatus.fromJson(s as Map<String, dynamic>)));
  }

  /// 答える。mine があれば直す(鍵が合わなければ、サーバーは新しい回答として保存する)
  Future<AnswerKey> saveAnswer(String partyId, Answer answer, {AnswerKey? mine}) async {
    final j = await _send(
      _http.post(
        _uri('/parties/${Uri.encodeComponent(partyId)}/answers'),
        headers: _json,
        body: jsonEncode({'answer': answer.toJson(), if (mine != null) 'answerId': mine.answerId, if (mine != null) 'token': mine.token}),
      ),
    );
    return (answerId: j['answerId'] as String, token: j['token'] as String);
  }

  Future<Answer> myAnswer(String partyId, AnswerKey mine) async {
    final j = await _send(
      _http.get(
        _uri('/parties/${Uri.encodeComponent(partyId)}/answers/${Uri.encodeComponent(mine.answerId)}'),
        headers: {'x-answer-token': mine.token},
      ),
    );
    return Answer.fromJson(j['answer'] as Map<String, dynamic>);
  }

  /// 日にちとお店を決める(幹事)。shopId が null なら、お店はあとで決める
  Future<void> decide(String partyId, String adminToken, {required String date, String? shopId}) => _send(
    _http.post(
      _uri('/parties/${Uri.encodeComponent(partyId)}/decision'),
      headers: {..._json, 'authorization': 'Bearer $adminToken'},
      body: jsonEncode({'date': date, 'shopId': ?shopId}),
    ),
  );

  /// 決定を取り消す(幹事)。みんなの回答は消えない
  Future<void> undecide(String partyId, String adminToken) => _send(
    _http.post(
      _uri('/parties/${Uri.encodeComponent(partyId)}/decision'),
      headers: {..._json, 'authorization': 'Bearer $adminToken'},
      body: jsonEncode({'clear': true}),
    ),
  );

  /// 決まった日に行く人(幹事)。会計に名前を読み込む。soft = お酒を飲まない
  Future<({String title, String date, List<({String name, bool soft})> attendees})> attendees(String partyId, String adminToken) async {
    final j = await _send(
      _http.get(_uri('/parties/${Uri.encodeComponent(partyId)}/attendees'), headers: {'authorization': 'Bearer $adminToken'}),
    );
    return (
      title: j['title'] as String,
      date: j['date'] as String,
      attendees: [
        for (final a in (j['attendees'] as List).cast<Map<String, dynamic>>()) (name: a['name'] as String, soft: a['soft'] == true),
      ],
    );
  }

  Future<List<Station>> stations(String q) async {
    final j = await _send(_http.get(_uri('/stations', {'q': q})));
    return (j['stations'] as List).map((s) => Station.fromJson(s as Map<String, dynamic>)).toList();
  }

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
