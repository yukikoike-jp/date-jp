import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { connection } from "next/server";
import { AdminPanel } from "@/components/AdminPanel";
import { AnswerPanel } from "@/components/AnswerPanel";
import { DecisionCard } from "@/components/DecisionCard";
import { Fold } from "@/components/Fold";
import { SiteHeader } from "@/components/SiteHeader";
import { StepBar } from "@/components/StepBar";
import { SummaryView } from "@/components/SummaryView";
import { verifyToken } from "@/lib/tokens";
import { dietNotice } from "@/lib/diet";
import { findShop } from "@/lib/shops";
import { loadParty } from "@/lib/view";
import { PageMotion } from "@/components/PageMotion";
import { PullToRefresh } from "@/components/PullToRefresh";

export const metadata: Metadata = { title: "幹事の画面", robots: { index: false } };

export default async function AdminPage(props: PageProps<"/p/[id]/admin">) {
  await connection();
  const { id } = await props.params;
  const { token, created } = await props.searchParams;
  const view = await loadParty(id);
  if (!view) notFound();
  const { party, summary, shops, otherArea, adminHash } = view;
  // 決まったお店の写真(「決まりました!」のカードに出す)
  const decidedPhoto = party.decision?.shopId ? ((await findShop(party.decision.shopId))?.photo ?? null) : null;
  // カレンダーの予定に入れる、この会のページの URL
  const h = await headers();
  const pageUrl = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host") ?? h.get("host")}/p/${party.id}`;

  if (typeof token !== "string" || !verifyToken(token, adminHash)) {
    return (
      <PageMotion>
        <SiteHeader />
        <div className="mx-auto max-w-xl px-4 py-10">
          <h1 className="text-xl font-black">幹事のURLが正しくありません</h1>
          <p className="mt-2 text-sm text-muted">会を作ったときに保存した幹事用のURLから開いてください。</p>
        </div>
      </PageMotion>
    );
  }

  return (
    <PullToRefresh>
    <PageMotion>
      {/* 日にちが決まるまでは「日程調整」、決まったら「お店探し」 */}
      <SiteHeader>
        <StepBar current={party.decision?.shopId ? 2 : party.decision ? 1 : 0} />
      </SiteHeader>
      <div className={`mx-auto max-w-xl ${party.decision ? "pb-16" : "pb-40"}`}>
        <div className="px-4 pt-6 pb-4">
          <p className="text-[11px] font-black text-stone-400">幹事の画面</p>
          <h1 className="mt-1 text-[22px] font-black tracking-tight">{party.title}</h1>
        </div>
        {party.decision && (
          <div className="mb-4">
            <DecisionCard host people={summary.attendees.length} photo={decidedPhoto} decision={party.decision} partyId={party.id} title={party.title} url={pageUrl} />
          </div>
        )}
        <AdminPanel
          // 必ず来てほしい人を変えたら、いちばん良い日を選び直す
          key={party.must.join("|")}
          partyId={party.id}
          title={party.title}
          token={token}
          created={created === "1"}
          ranking={summary.ranking}
          answered={summary.answered}
          bestDate={summary.date}
          bestDates={summary.bestDates}
          shops={shops}
          decision={party.decision}
          attendees={summary.attendees.map((a) => ({ name: a.name, soft: a.soft }))}
          start={party.start}
          names={summary.names}
          maybes={summary.maybes.length}
          must={party.must}
          otherArea={otherArea}
          notice={dietNotice(summary.diet)}
          basis={view.basis}
          relaxed={view.relaxed}
          scene={{ audience: party.audience, budget: summary.budget }}
        />
        {/* 幹事も自分の予定を入れられる。ふだんは1行のボタンにたたみ、押すと開く */}
        {/* みんなの答えの細かい表は、いつもたたんでおく(いちばん良い日は「幹事が決める」に出ている) */}
        {summary.answered > 0 && (
          <Fold title={`みんなの答え(${summary.answered}人)`} note="日にち・時間・予算・場所">
            <SummaryView summary={summary} />
          </Fold>
        )}
        {/* お店の一覧は AdminPanel の中に1つだけ出す(選ぶのと予約のリンクを同じ一覧に) */}
        {/* 幹事の答えは、どの段階でもいちばん下 */}
        <div className="mt-4">
          <AnswerPanel host partyId={party.id} dates={party.dates} audience={party.audience} start={party.start} />
        </div>
      </div>
    </PageMotion>
    </PullToRefresh>
  );
}
