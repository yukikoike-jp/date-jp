// API の JSON のうち、アプリで使うところ(docs/api.md)

/// GET /parties/:id
class PartyData {
  PartyData({
    required this.id,
    required this.title,
    required this.audience,
    required this.dates,
    required this.start,
    required this.answered,
    required this.admin,
    required this.invite,
  });
  final String id;
  final String title;

  /// private / worker(前の student はサーバーで private にそろえてある)
  final String audience;
  final List<String> dates;

  /// 幹事が決めた開始時刻(分)。前の会は null で、参加者に何時から来られるかを聞く
  final int? start;
  final int answered;
  final bool admin;
  final String invite;

  bool get worker => audience == 'worker';

  factory PartyData.fromJson(Map<String, dynamic> j) {
    final party = j['party'] as Map<String, dynamic>;
    return PartyData(
      id: party['id'] as String,
      title: party['title'] as String,
      audience: party['audience'] as String? ?? 'private',
      dates: (party['dates'] as List).cast<String>(),
      start: party['start'] as int?,
      answered: (j['summary'] as Map<String, dynamic>)['answered'] as int,
      admin: j['admin'] as bool,
      invite: (j['share'] as Map<String, dynamic>)['invite'] as String,
    );
  }
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
