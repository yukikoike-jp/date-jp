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

export type OtherSite = { key: string; label: string; note: string; href: string };

/** 一覧の下に並べる、ほかの予約サイト。station があれば、その駅の近くで探す */
export function otherSites(station: string | null): OtherSite[] {
  return [
    {
      key: "ikyu",
      label: "記念日・接待向けの高級店を探す",
      note: station ? `${station}駅の近くの、ちょっといいお店` : "ちょっといいお店の予約サイト",
      href: vcLink("892749796", station ? `https://restaurant.ikyu.com/search?term=${encodeURIComponent(station)}` : "https://restaurant.ikyu.com/"),
    },
    {
      key: "ozmall",
      label: "忘年会・宴会のプランを探す",
      note: "女性に人気の予約サイト(関東・関西が中心)",
      href: vcLink("892749797", "https://www.ozmall.co.jp/restaurant/enkai/"),
    },
  ];
}
