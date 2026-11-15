import "server-only";
import { AUDIENCES } from "./audience";
import { UNLIMITED_BUDGET, areaLabel } from "./sendai";
import { searchShopsAlways, type Shop } from "./shops";
import { getStore } from "./store";
import type { Party } from "./store/types";
import { summarize, type Summary } from "./summary";

export type PartyView = {
  party: Omit<Party, "adminHash">;
  summary: Summary;
  shops: Shop[];
  otherArea: boolean;
  /** 合うお店がなく、条件をゆるめて探したときの一言(ゆるめていなければ null) */
  relaxed: string | null;
  /** おすすめのお店を、何に合わせて選んだか(人数・予算・場所・食べたいもの・タバコ) */
  basis: string[];
};

/** 飲み会のページに出すもの。1人ずつの予算はここで落とし、ブラウザには渡さない */
export async function loadParty(id: string): Promise<(PartyView & { adminHash: string }) | null> {
  const store = getStore();
  const party = await store.getParty(id);
  if (!party) return null;
  const answers = await store.listAnswers(id);
  const summary = summarize(party.dates, answers, party.decision?.date, party.must);
  // 誰も場所を選んでいなければ(全員「どこでもいい」)、選択肢のいちばん上の場所で探す
  const area = summary.area ?? AUDIENCES[party.audience].areas[0];
  const ready = summary.budget !== null;
  // 食べたいものは、いちばん多いもの(同じ数なら2つまで)。合うお店がなければ料理を問わずに探す
  const top = summary.likes[0]?.votes ?? 0;
  const genres = summary.likes.filter((l) => l.votes === top).slice(0, 2).map((l) => l.key);
  const budget = summary.budget !== null && summary.budget >= UNLIMITED_BUDGET ? null : summary.budget;
  const query = {
    area,
    point: summary.meeting,
    // 全員が「上限なし」なら、予算で絞らない
    budget,
    size: summary.attendees.length,
    audience: party.audience,
    // タバコを吸う人がいれば、吸えるお店を先に出す
    ...(summary.diet.smokers > 0 ? { smoking: "prefer" as const } : {}),
  };
  // お店が必ず出るように、見つからなければ条件をゆるめる(何をゆるめたかは relaxed で画面に出す)
  const found = ready
    ? await searchShopsAlways({ ...query, genres }, 10, AUDIENCES[party.audience].budgets)
    : { shops: [], otherArea: false, relaxed: null };
  const byLikes = genres.length > 0 && found.shops.length > 0 && found.relaxed === null;
  const basis = ready
    ? [
        `${summary.attendees.length}人`,
        budget === null ? "金額はどこでもOK" : `1人${budget.toLocaleString("ja-JP")}円くらいまで`,
        summary.meeting
          ? `${summary.meeting.name}駅の近く`
          : summary.area
            ? areaLabel(area)
            : `場所はどこでもOK(${areaLabel(area)})`,
        ...(byLikes ? [`${summary.likes.filter((l) => genres.includes(l.key)).map((l) => l.label).join("・")}が食べたい人が多い`] : []),
        ...(summary.diet.smokers > 0 ? ["タバコが吸えるお店を先に"] : []),
      ]
    : [];
  const { adminHash, ...rest } = party;
  return { party: rest, adminHash, summary, shops: found.shops, otherArea: found.otherArea, relaxed: found.relaxed, basis };
}
