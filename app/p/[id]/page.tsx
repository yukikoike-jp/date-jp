import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { connection } from "next/server";
import { AnswerPanel } from "@/components/AnswerPanel";
import { DecisionCard } from "@/components/DecisionCard";
import { Fold } from "@/components/Fold";
import { ShopList } from "@/components/ShopList";
import { SiteHeader } from "@/components/SiteHeader";
import { SummaryView } from "@/components/SummaryView";
import { getStore } from "@/lib/store";
import { dietNotice } from "@/lib/diet";
import { clock } from "@/lib/sendai";
import { findShop } from "@/lib/shops";
import { loadParty } from "@/lib/view";
import { PageMotion } from "@/components/PageMotion";
import { PullToRefresh } from "@/components/PullToRefresh";

export async function generateMetadata(props: PageProps<"/p/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const party = await getStore().getParty(id);
  // 会のページは、URLを知っている人だけのもの。検索には出さない
  if (!party) return { title: "飲み会が見つかりません", robots: { index: false } };
  const description = "行ける日と予算を30秒で答えられます";
  return { title: party.title, description, robots: { index: false }, alternates: { canonical: null }, openGraph: { title: party.title, description } };
}

export default async function PartyPage(props: PageProps<"/p/[id]">) {
  await connection();
  const { id } = await props.params;
  const view = await loadParty(id);
  if (!view) notFound();
  const { party, summary, shops, otherArea } = view;
  // 決まったお店の写真(「決まりました!」のカードに出す)
  const decidedPhoto = party.decision?.shopId ? ((await findShop(party.decision.shopId))?.photo ?? null) : null;
  // カレンダーの予定に入れる、この会のページの URL
  const h = await headers();
  const pageUrl = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host") ?? h.get("host")}/p/${party.id}`;
  // 答えた人を次の幹事に誘うときの、その時期の会の呼び方(忘年会・新歓など)

  return (
    <PullToRefresh>
    <PageMotion>
      <SiteHeader />
      <div className="mx-auto max-w-xl pb-16">
        <div className="px-4 pt-6 pb-4">
          <p className="text-sm font-bold text-muted">飲み会の日程とお店{party.start !== null ? ` ・ ${clock(party.start)}から` : ""}</p>
          <h1 className="mt-1 text-[22px] font-black tracking-tight">{party.title}</h1>
        </div>
        {party.decision && <DecisionCard photo={decidedPhoto} decision={party.decision} partyId={party.id} title={party.title} url={pageUrl} />}
        {!party.decision && <AnswerPanel partyId={party.id} dates={party.dates} audience={party.audience} start={party.start} />}
        {/* 決まったあとは、みんなの答えはたたんでおく。お店まで決まったら、ほかの候補のお店は出さない */}
        {party.decision ? (
          <Fold title={`みんなの答え(${summary.answered}人)`} note="日にち・時間・予算・場所">
            <SummaryView summary={summary} />
          </Fold>
        ) : (
          <div className="mt-4">
            <SummaryView summary={summary} />
          </div>
        )}
        {!party.decision?.shopId && (
          <ShopList
            partyId={party.id}
            shops={shops}
            otherArea={otherArea}
            chosenId={party.decision?.shopId}
            notice={dietNotice(summary.diet)}
            basis={view.basis}
            relaxed={view.relaxed}
            scene={{ audience: party.audience, budget: summary.budget }}
            initial={6}
          />
        )}
        {/* 決まったあとは、自分の答えはいちばん下(直したいときだけ使う) */}
        {party.decision && (
          <div className="mt-4">
            <AnswerPanel partyId={party.id} dates={party.dates} audience={party.audience} start={party.start} />
          </div>
        )}
      </div>
    </PageMotion>
    </PullToRefresh>
  );
}
