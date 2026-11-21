import { CalendarPlus, ExternalLink, MapPin, PartyPopper, Store } from "lucide-react";
import { ShopPageLink } from "./ShopPageLink";
import { googleCalendarUrl } from "@/lib/calendar";
import { mapsUrl } from "@/lib/maps";
import { clock, dateLabel } from "@/lib/sendai";
import type { Decision } from "@/lib/store/types";
import { PrNote } from "./PrNote";

// 決まった会のいちばん上。日にち・時間・お店と、お店の予約と場所をここにまとめる
// (決まったあとは、ほかの候補のお店の一覧を出さないので、決まったお店へはここから行く)

/** 見本のお店(s1, s2…)は実在しないので、予約や地図のリンクを出さない */
const isSampleShop = (id: string) => /^s\d+$/.test(id);

/** title = 会の名前、url = 会のページ(カレンダーの予定に入れる)、photo = 決まったお店の写真(ホットペッパー)。
 * host = 幹事の画面。決まったあとの幹事の次の仕事は予約なので、予約のボタンをいちばん目立たせる。people = 予約する人数 */
export function DecisionCard({ decision, partyId, title, url, photo = null, host = false, people }: { decision: Decision; partyId: string; title: string; url: string; photo?: string | null; host?: boolean; people?: number }) {
  const calendar = { title, date: decision.date, start: decision.start, location: decision.shopName, url };
  const shop = decision.shopId && decision.shopName ? { id: decision.shopId, name: decision.shopName } : null;
  return (
    <section className="anim-rise mx-4 rounded-3xl border border-match bg-match-soft px-4 py-6">
      <p className="flex items-center justify-center gap-2 text-sm font-bold text-match-text">
        <PartyPopper className="size-4" aria-hidden />
        決まりました!
      </p>
      <p className="mt-2 text-center text-3xl font-black tracking-tight">
        {dateLabel(decision.date)} {clock(decision.start)}〜
      </p>
      {shop ? (
        <>
          {/* 決まったお店の写真。ホットペッパーの規約で、写真を使うときは「画像提供」を添える */}
          {photo && !isSampleShop(shop.id) && (
            <figure className="mt-4">
              {/* 外のお店の写真。最適化は使わない */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo} alt={`${shop.name}の写真`} className="aspect-[16/10] w-full rounded-2xl object-cover" />
              <figcaption className="mt-1 text-right text-[10px] text-muted">画像提供:ホットペッパー グルメ</figcaption>
            </figure>
          )}
          <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-lg font-bold">
            <Store className="size-5 shrink-0" aria-hidden />
            {shop.name}
          </p>
          {!isSampleShop(shop.id) && host && (
            <div className="mt-4">
              <ShopPageLink
                href={`/go/${partyId}/${shop.id}`}
                target="_blank"
                rel="nofollow noopener"
                className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-accent px-4 text-base font-black text-accent-text transition active:scale-[0.98]"
              >
                お店のページで予約する
                <ExternalLink className="size-4" aria-hidden />
              </ShopPageLink>
              <p className="mt-2 text-center text-xs text-muted">
                {dateLabel(decision.date)} {clock(decision.start)}から{people ? `・${people}人` : ""}で予約してください。
              </p>
              <a
                href={mapsUrl(shop.name)}
                target="_blank"
                rel="noopener"
                className="mt-3 flex min-h-11 items-center justify-center gap-1 rounded-xl bg-bg/50 px-2 text-sm font-bold"
              >
                <MapPin className="size-4" aria-hidden />
                地図で場所を見る
              </a>
            </div>
          )}
          {!isSampleShop(shop.id) && !host && (
            <div className="mt-4 grid grid-cols-2 gap-2">
              <ShopPageLink
                href={`/go/${partyId}/${shop.id}`}
                target="_blank"
                rel="nofollow noopener"
                className="flex min-h-11 items-center justify-center gap-1 rounded-xl bg-bg/50 px-2 text-sm font-bold"
              >
                お店のページ
                <ExternalLink className="size-4" aria-hidden />
              </ShopPageLink>
              <a
                href={mapsUrl(shop.name)}
                target="_blank"
                rel="noopener"
                className="flex min-h-11 items-center justify-center gap-1 rounded-xl bg-bg/50 px-2 text-sm font-bold"
              >
                <MapPin className="size-4" aria-hidden />
                地図
              </a>
            </div>
          )}
          {!isSampleShop(shop.id) && <PrNote className="mt-3" />}
        </>
      ) : (
        <p className="mt-1 text-center text-sm text-muted">お店は未定</p>
      )}
      {/* カレンダーに入れると、前日のお知らせは各自のスマホが出す(Tsudoro は連絡先を持たない) */}
      <p className="mt-4 text-center text-xs font-bold text-match-text">カレンダーに入れる</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <a
          href={googleCalendarUrl(calendar)}
          target="_blank"
          rel="noopener"
          className="flex min-h-11 items-center justify-center gap-1 rounded-xl bg-bg/50 px-2 text-sm font-bold"
        >
          <CalendarPlus className="size-4" aria-hidden />
          Google
        </a>
        <a
          href={`/p/${partyId}/calendar.ics`}
          className="flex min-h-11 items-center justify-center gap-1 rounded-xl bg-bg/50 px-2 text-sm font-bold"
        >
          <CalendarPlus className="size-4" aria-hidden />
          iPhone
        </a>
      </div>
    </section>
  );
}
