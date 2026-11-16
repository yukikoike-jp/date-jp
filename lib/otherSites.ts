// ホットペッパー以外の予約サイトへのリンク(バリューコマースの提携リンク)。
// 提携先の決まりで、ボタンの文字にサイト名・会社名を入れない(一休・オズモールとも「広告文に社名・サイト名を使わない」)。
// sid = Tsudoro のサイト、pid = 提携先ごとの番号。どちらもリンクに出る値で、秘密ではない

const VC_SID = "3788519";

/** バリューコマースを通して、url を開くリンクにする */
export function vcLink(pid: string, url: string): string {
  return `https://ck.jp.ap.valuecommerce.com/servlet/referral?sid=${VC_SID}&pid=${pid}&vc_url=${encodeURIComponent(url)}`;
}

/**
 * お店の行き方(「JR仙台駅西口より徒歩3分」など)から、駅の名前(「仙台」)を取り出す。
 * 取り出せなければ null
 */
export function stationFromAccess(access: string): string | null {
  const m = access.normalize("NFKC").match(/([^\s、。,，・/／()()「」]+?)駅/);
  if (!m) return null;
  const name = m[1].replace(/^(JR|ＪＲ|地下鉄|東京メトロ|都営|各線|私鉄|市営|京王|小田急|東急|西武|東武|京急|京成|阪急|阪神|近鉄|南海|名鉄|相鉄)(線)?/, "").replace(/^.*線/, "");
  return name.length >= 1 && name.length <= 12 ? name : null;
}

export type OtherSite = {
  key: "ikyu" | "ozmall";
  label: string;
  note: string;
  href: string;
};

/** ほかの予約サイト。station があれば、その駅の近くで探す */
export function otherSites(station: string | null): OtherSite[] {
  return [
    {
      key: "ikyu",
      label: "記念日・接待向けの高級店",
      note: station ? `${station}駅の近くの、ちょっといいお店を予約サイトで探す` : "ちょっといいお店を予約サイトで探す",
      href: vcLink("892749796", station ? `https://restaurant.ikyu.com/search?term=${encodeURIComponent(station)}` : "https://restaurant.ikyu.com/"),
    },
    {
      key: "ozmall",
      label: "忘年会・宴会のプラン",
      note: "女子会・記念日にも。予約サイトで探す(関東・関西が中心)",
      href: vcLink("892749797", "https://www.ozmall.co.jp/restaurant/enkai/"),
    },
  ];
}

/** どんな会か。出す場所と順番を決めるのに使う */
export type Scene = { audience: "student" | "private" | "worker" | null; budget: number | null };

/** 高めのお店の予約サイトを、お店の一覧の上に出す予算の目安(1人あたり) */
export const HIGH_BUDGET = 5000;

/**
 * 会の種類と予算で、ほかの予約サイトをどこに、どの順で出すかを決める。
 * - 会社の会: 一覧の上。高級店(宴会は人数が多く、予約額に比べた報酬が大きい)を先に
 * - 友達の会で予算が高め: 一覧の上。女子会・記念日向けを先に
 * - それ以外(学生の会など): 一覧の下
 */
export function placeOtherSites(station: string | null, scene: Scene | null): { top: boolean; sites: OtherSite[] } {
  const [ikyu, ozmall] = otherSites(station);
  if (scene?.audience === "worker") return { top: true, sites: [ikyu, ozmall] };
  // 「こだわらない」(とても大きな数で持つ)は、高めの予算とは数えない
  const high = scene?.budget != null && scene.budget >= HIGH_BUDGET && scene.budget < 1_000_000;
  if (scene?.audience === "private" && high) return { top: true, sites: [ozmall, ikyu] };
  return { top: false, sites: [ozmall, ikyu] };
}
