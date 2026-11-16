import { summarizeDiet, type DietSummary } from "./diet";
import { AREAS, FIRST_PARTY_MINUTES, GENRES, type AreaKey, type GenreKey } from "./sendai";
import { meetingStation, stationVotes, type Station } from "./stations";

// みんなの回答から、日・時刻・予算・場所・残れる人を決める。純粋関数

export type DateAnswer = "ok" | "maybe" | "no";

export type Answer = {
  id: string;
  name: string;
  dates: Record<string, DateAnswer>;
  /** 何時から来られるか(分) */
  arrival: number;
  /** いつまで残れるか(分) */
  stay: number;
  /** 1人あたりの予算の上限(円) */
  budget: number;
  /** 前の答えの、仙台の決まったエリア。今は station で答える */
  areas: AreaKey[];
  /** 行きやすい駅。なければ「どこでもいい」 */
  station?: Station | null;
  /** ひとこと。みんなに見える(予定の事情や、2次会は無理など) */
  memo?: string;
  /** 苦手なもの・アレルギー(lib/diet.ts の key)。人数だけを出し、誰が選んだかは出さない */
  avoids?: string[];
  /** お酒を飲むか。前の答えにはないので、ないときは飲むとみなす */
  drinks?: boolean;
  /** 食べたいもの(lib/sendai.ts の GENRES の key)。お店のおすすめに使う */
  likes?: string[];
  /** タバコを吸うか(社会人の会だけで聞く)。人数だけを出し、誰かは出さない */
  smokes?: boolean;
  /** 選択肢にない苦手なもの(自由に書く)。名前は付けずに出す */
  avoidNote?: string;
};

/** mustOk = 幹事が「必ず来てほしい」にした人が全員「行ける」の日(そういう人がいなければ true) */
export type DateRank = { date: string; ok: number; maybe: number; mustOk: boolean };

export type Summary = {
  answered: number;
  /** 答えた人の名前(幹事が「必ず来てほしい人」を選ぶのに使う) */
  names: string[];
  /** 「必ず来てほしい人」のうち、まだ答えていない人と、決めた日に行けない人 */
  mustUnanswered: string[];
  mustMissing: string[];
  /** 必ず来てほしい人の名前(表で目印を付ける) */
  must: string[];
  /** 候補の日(日付の順)と、1人ずつの答え。調整さんのように、誰がいつ行けるかを表で見せる */
  dates: string[];
  who: { name: string; dates: Record<string, DateAnswer> }[];
  ranking: DateRank[];
  /** 行ける人がいちばん多い日(同じ人数の日があれば、その中で △ が多く、早い日)。誰も行けなければ null */
  date: string | null;
  /** いちばん多い日が同じ人数(○の数が同じ)で並ぶ日を、すべて(日付の順)。誰も行けなければ空 */
  bestDates: string[];
  /** その日に行ける人。soft = お酒を飲まない(会計で「飲まない」の区分に入れる) */
  attendees: { name: string; arrival: number; stay: number; soft: boolean }[];
  /** 行く人の苦手なものと、お酒を飲まない人の数(名前は持たない) */
  diet: DietSummary;
  /** その日に「たぶん」の人 */
  maybes: string[];
  /** ひとことを書いた人(行けない人のものも出す) */
  notes: { name: string; memo: string }[];
  start: number | null;
  /** 開始に間に合わず、途中から来る人 */
  lateJoiners: string[];
  firstEnd: number | null;
  /** 一次会のあとも残れる人 */
  secondParty: string[];
  /** 行ける人(○)とたぶん(△)の人の予算の真ん中の額(誰の額かは出さない)。いちばん低い人には合わせない */
  budget: number | null;
  /** お店・予算・場所の見積もりに入れた人数(○の人 + △の人) */
  considered: number;
  area: AreaKey | null;
  areaVotes: { key: AreaKey; votes: number }[];
  /** ○と△の人の駅から決めた、みんなが集まりやすい駅。誰も駅を選んでいなければ null */
  meeting: Station | null;
  /** 駅ごとの人数(誰かは持たない) */
  stationVotes: { station: Station; votes: number }[];
  /** 行く人の食べたいもの(多い順) */
  likes: { key: GenreKey; label: string; votes: number }[];
};

/**
 * 日の順位。must(必ず来てほしい人の名前)が全員行ける日を先にし、その中で行ける人が多い順。
 * 部長が来られない日にみんなが集まっても意味がない、という会社の飲み会のため
 */
export function rankDates(dates: string[], answers: Answer[], must: string[] = []): DateRank[] {
  const keyPeople = answers.filter((a) => must.includes(a.name));
  return dates
    .map((date) => ({
      date,
      ok: answers.filter((a) => a.dates[date] === "ok").length,
      maybe: answers.filter((a) => a.dates[date] === "maybe").length,
      mustOk: keyPeople.every((a) => a.dates[date] === "ok"),
    }))
    .sort((x, y) => Number(y.mustOk) - Number(x.mustOk) || y.ok - x.ok || y.maybe - x.maybe || x.date.localeCompare(y.date));
}

/**
 * いちばん上の日と同じ(○の数が同じ、必ず来てほしい人の都合も同じ)日を、すべて返す(日付の順)。
 * 5人で ○3 の日が2つあれば、2つとも「いちばん良い日」として出す(△の数が違っても同じ扱い)。
 * 誰も行けない(いちばん上が ○0)ときは空
 */
export function topDates(ranking: DateRank[]): string[] {
  const top = ranking[0];
  if (!top || top.ok === 0) return [];
  return ranking
    .filter((r) => r.ok === top.ok && r.mustOk === top.mustOk)
    .map((r) => r.date)
    .sort();
}

/**
 * 開始時刻は、全員がそろう時刻。ただし3人以上で1人だけ遅い人がいれば、その人を待たずに始め、途中から合流してもらう
 */
export function startTime(arrivals: number[]): number | null {
  if (arrivals.length === 0) return null;
  const sorted = [...arrivals].sort((a, b) => a - b);
  const last = sorted[sorted.length - 1];
  const second = sorted[sorted.length - 2];
  if (sorted.length >= 3 && last > second) return second;
  return last;
}

/**
 * みんなの予算の「真ん中」。いちばん低い人に引っ張られないよう、低い順に並べた真ん中の額にする
 * (人数が偶数なら、真ん中の2人のうち低いほう。こだわらない人は高いほうに並ぶ)
 */
export function middleBudget(budgets: number[]): number {
  const sorted = [...budgets].sort((a, b) => a - b);
  return sorted[Math.floor((sorted.length - 1) / 2)];
}

export function summarize(dates: string[], answers: Answer[], fixedDate?: string | null, must: string[] = []): Summary {
  const ranking = rankDates(dates, answers, must);
  const best = fixedDate ?? (ranking[0] && ranking[0].ok > 0 ? ranking[0].date : null);
  const going = best ? answers.filter((a) => a.dates[best] === "ok") : [];
  // お店・予算・場所・食べたいもの・苦手なものは、○の人だけでなく △(たぶん)の人も入れて決める。
  // 来るかもしれない人の予算や苦手なものも、お店選びに反映するため。行ける人の一覧と開始時刻は ○ の人だけ
  const joiners = best ? answers.filter((a) => a.dates[best] === "ok" || a.dates[best] === "maybe") : [];
  const start = startTime(going.map((a) => a.arrival));
  const firstEnd = start === null ? null : start + FIRST_PARTY_MINUTES;

  const areaVotes = AREAS.map((a) => ({
    key: a.key,
    votes: joiners.filter((g) => g.areas.includes(a.key)).length,
  })).filter((v) => v.votes > 0);
  // 同じ票数なら、選択肢の並び順(集まりやすい順)で先のもの
  const topArea = areaVotes.reduce<{ key: AreaKey; votes: number } | null>(
    (top, v) => (top === null || v.votes > top.votes ? v : top),
    null,
  );

  return {
    answered: answers.length,
    names: answers.map((a) => a.name),
    must,
    dates: [...dates].sort(),
    who: answers.map((a) => ({ name: a.name, dates: Object.fromEntries(dates.map((d) => [d, a.dates[d] ?? "no"])) })),
    mustUnanswered: must.filter((n) => !answers.some((a) => a.name === n)),
    mustMissing: best ? answers.filter((a) => must.includes(a.name) && a.dates[best] !== "ok").map((a) => a.name) : [],
    ranking,
    date: best,
    bestDates: topDates(ranking),
    attendees: going.map((a) => ({ name: a.name, arrival: a.arrival, stay: a.stay, soft: a.drinks === false })),
    diet: summarizeDiet(joiners),
    maybes: best ? answers.filter((a) => a.dates[best] === "maybe").map((a) => a.name) : [],
    notes: answers.filter((a) => a.memo).map((a) => ({ name: a.name, memo: a.memo! })),
    start,
    lateJoiners: start === null ? [] : going.filter((a) => a.arrival > start).map((a) => a.name),
    firstEnd,
    secondParty: firstEnd === null ? [] : going.filter((a) => a.stay > firstEnd).map((a) => a.name),
    budget: joiners.length > 0 ? middleBudget(joiners.map((a) => a.budget)) : null,
    considered: joiners.length,
    area: topArea?.key ?? null,
    areaVotes: areaVotes.sort((x, y) => y.votes - x.votes),
    meeting: meetingStation(joiners.flatMap((a) => (a.station ? [a.station] : []))),
    stationVotes: stationVotes(joiners.flatMap((a) => (a.station ? [a.station] : []))),
    likes: GENRES.map((g) => ({ key: g.key, label: g.label, votes: joiners.filter((a) => a.likes?.includes(g.key)).length }))
      .filter((g) => g.votes > 0)
      .sort((x, y) => y.votes - x.votes),
  };
}
