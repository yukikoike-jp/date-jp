// API の JSON のうち、アプリで使うところ(docs/api.md)

/// GET /parties/:id
class PartyData {
  PartyData({
    required this.id,
    required this.title,
    required this.audience,
    required this.dates,
    required this.start,
    required this.decision,
    required this.summary,
    required this.shops,
    required this.otherArea,
    required this.relaxed,
    required this.basis,
    required this.notice,
    required this.pr,
    required this.admin,
    required this.invite,
    required this.decided,
  });
  final String id;
  final String title;

  /// private / worker(前の student はサーバーで private にそろえてある)
  final String audience;
  final List<String> dates;

  /// 幹事が決めた開始時刻(分)。前の会は null で、参加者に何時から来られるかを聞く
  final int? start;
  final Decision? decision;
  final Summary summary;

  /// みんなの答えから選んだお店
  final List<Shop> shops;

  /// その場所に合うお店がなく、近くのエリアから選んだ
  final bool otherArea;

  /// 合うお店がなく、条件をゆるめて探したときの一言
  final String? relaxed;

  /// 何に合わせて選んだか(人数・予算・場所など)
  final List<String> basis;

  /// 予約のときにお店に伝えること
  final String? notice;

  /// お店のリンクが提携リンクか(「#アフィリエイト広告」を出す)
  final bool pr;
  final bool admin;

  /// 招待の文と、決まったときの文(決まっていなければ null)
  final String invite;
  final String? decided;

  int get answered => summary.answered;
  bool get worker => audience == 'worker';

  factory PartyData.fromJson(Map<String, dynamic> j) {
    final party = j['party'] as Map<String, dynamic>;
    final share = j['share'] as Map<String, dynamic>;
    return PartyData(
      id: party['id'] as String,
      title: party['title'] as String,
      audience: party['audience'] as String? ?? 'private',
      dates: (party['dates'] as List).cast<String>(),
      start: party['start'] as int?,
      decision: party['decision'] == null ? null : Decision.fromJson(party['decision'] as Map<String, dynamic>),
      summary: Summary.fromJson(j['summary'] as Map<String, dynamic>),
      shops: [for (final s in j['shops'] as List? ?? []) Shop.fromJson(s as Map<String, dynamic>)],
      otherArea: j['otherArea'] == true,
      relaxed: j['relaxed'] as String?,
      basis: (j['basis'] as List? ?? []).cast<String>(),
      notice: j['notice'] as String?,
      pr: j['pr'] == true,
      admin: j['admin'] as bool,
      invite: share['invite'] as String,
      decided: share['decided'] as String?,
    );
  }
}

class Decision {
  Decision({required this.date, required this.start, required this.shopId, required this.shopName});
  final String date;
  final int start;
  final String? shopId;
  final String? shopName;
  factory Decision.fromJson(Map<String, dynamic> j) =>
      Decision(date: j['date'] as String, start: j['start'] as int, shopId: j['shopId'] as String?, shopName: j['shopName'] as String?);
}

/// 日ごとの、行ける人(○)とたぶん(△)の数。mustOk = 必ず来てほしい人が全員来られる
typedef DateRank = ({String date, int ok, int maybe, bool mustOk});

/// 集計(lib/summary.ts の Summary のうち、アプリで使うところ)。1人ずつの予算は入っていない
class Summary {
  Summary({
    required this.answered,
    required this.names,
    required this.must,
    required this.who,
    required this.ranking,
    required this.bestDates,
    required this.date,
    required this.attendees,
    required this.maybes,
    required this.notes,
  });
  final int answered;
  final List<String> names;
  final List<String> must;

  /// 誰がいつ行けるか(表に出す)
  final List<({String name, Map<String, DateAnswer> dates})> who;
  final List<DateRank> ranking;
  final List<String> bestDates;

  /// いちばん良い日。誰も行けなければ null
  final String? date;

  /// いちばん良い日に行ける人。soft = お酒を飲まない
  final List<({String name, bool soft})> attendees;
  final List<String> maybes;
  final List<({String name, String memo})> notes;

  factory Summary.fromJson(Map<String, dynamic> j) {
    List<Map<String, dynamic>> list(String k) => (j[k] as List? ?? []).cast<Map<String, dynamic>>();
    return Summary(
      answered: j['answered'] as int,
      names: (j['names'] as List? ?? []).cast<String>(),
      must: (j['must'] as List? ?? []).cast<String>(),
      who: [
        for (final w in list('who'))
          (
            name: w['name'] as String,
            dates: (w['dates'] as Map<String, dynamic>).map((d, v) => MapEntry(d, DateAnswer.values.asNameMap()[v] ?? DateAnswer.no)),
          ),
      ],
      ranking: [
        for (final r in list('ranking'))
          (date: r['date'] as String, ok: r['ok'] as int, maybe: r['maybe'] as int, mustOk: r['mustOk'] == true),
      ],
      bestDates: (j['bestDates'] as List? ?? []).cast<String>(),
      date: j['date'] as String?,
      attendees: [for (final a in list('attendees')) (name: a['name'] as String, soft: a['soft'] == true)],
      maybes: (j['maybes'] as List? ?? []).cast<String>(),
      notes: [for (final n in list('notes')) (name: n['name'] as String, memo: n['memo'] as String)],
    );
  }
}

/// おすすめのお店(lib/shops.ts の Shop のうち、アプリで使うところ)
class Shop {
  Shop({
    required this.id,
    required this.name,
    required this.genre,
    required this.access,
    required this.budgetLabel,
    required this.features,
    required this.smoking,
    required this.photo,
    required this.sample,
  });
  final String id;
  final String name;
  final String genre;
  final String access;
  final String budgetLabel;
  final List<String> features;

  /// ok / partial / no。分からなければ null
  final String? smoking;
  final String? photo;

  /// 実在しない見本のお店(ホットペッパーの鍵がない開発環境)
  final bool sample;

  factory Shop.fromJson(Map<String, dynamic> j) => Shop(
    id: j['id'] as String,
    name: j['name'] as String,
    genre: j['genre'] as String? ?? '',
    access: j['access'] as String? ?? '',
    budgetLabel: j['budgetLabel'] as String? ?? '',
    features: (j['features'] as List? ?? []).cast<String>(),
    smoking: j['smoking'] as String?,
    photo: j['photo'] as String?,
    sample: j['sample'] == true,
  );
}

/// POST /parties/statuses の1件
class PartyStatus {
  PartyStatus({required this.decided, required this.answered});
  final bool decided;
  final int answered;
  factory PartyStatus.fromJson(Map<String, dynamic> j) => PartyStatus(decided: j['decision'] != null, answered: j['answered'] as int);
}

class Station {
  const Station({required this.name, required this.pref, required this.lat, required this.lng});
  final String name;
  final String pref;
  final double lat;
  final double lng;

  Map<String, Object> toJson() => {'name': name, 'pref': pref, 'lat': lat, 'lng': lng};
  factory Station.fromJson(Map<String, dynamic> j) =>
      Station(name: j['name'] as String, pref: j['pref'] as String, lat: (j['lat'] as num).toDouble(), lng: (j['lng'] as num).toDouble());
}

/// ○ △ ×
enum DateAnswer { ok, maybe, no }

/// 1人の回答。項目の意味と決まりは lib/validation.ts の parseAnswer
class Answer {
  Answer({
    this.name = '',
    Map<String, DateAnswer>? dates,
    this.arrival = 0,
    this.stay = 0,
    this.budget = 0,
    this.areas = const [],
    this.station,
    this.memo = '',
    Set<String>? avoids,
    this.drinks = true,
    this.smokes = false,
    Set<String>? likes,
    this.avoidNote = '',
  }) : dates = dates ?? {},
       avoids = avoids ?? {},
       likes = likes ?? {};

  String name;
  Map<String, DateAnswer> dates;
  int arrival;
  int stay;

  /// 0 = まだ選んでいない(送るときに「こだわらない」にする)
  int budget;

  /// 前の版のエリア。アプリでは選ばせず、直すときにそのまま返す
  List<String> areas;
  Station? station;
  String memo;
  Set<String> avoids;
  bool drinks;
  bool smokes;
  Set<String> likes;
  String avoidNote;

  Map<String, Object?> toJson() => {
    'name': name,
    'dates': dates.map((d, v) => MapEntry(d, v.name)),
    'arrival': arrival,
    'stay': stay,
    'budget': budget,
    'areas': areas,
    'station': station?.toJson(),
    'memo': memo,
    'avoids': avoids.toList(),
    'drinks': drinks,
    'smokes': smokes,
    'likes': likes.toList(),
    'avoidNote': avoidNote,
  };

  factory Answer.fromJson(Map<String, dynamic> j) => Answer(
    name: j['name'] as String,
    dates: (j['dates'] as Map<String, dynamic>).map((d, v) => MapEntry(d, DateAnswer.values.asNameMap()[v] ?? DateAnswer.no)),
    arrival: j['arrival'] as int,
    stay: j['stay'] as int,
    budget: j['budget'] as int,
    areas: (j['areas'] as List? ?? []).cast<String>(),
    station: j['station'] == null ? null : Station.fromJson(j['station'] as Map<String, dynamic>),
    memo: j['memo'] as String? ?? '',
    avoids: {...(j['avoids'] as List? ?? []).cast<String>()},
    drinks: j['drinks'] != false,
    smokes: j['smokes'] == true,
    likes: {...(j['likes'] as List? ?? []).cast<String>()},
    avoidNote: j['avoidNote'] as String? ?? '',
  );
}
