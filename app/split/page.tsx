import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { StepBar } from "@/components/StepBar";
import { SplitClient } from "@/components/SplitClient";
import { PageMotion } from "@/components/PageMotion";

export const metadata: Metadata = {
  title: "飲み会の割り勘・傾斜計算",
  description: "合計を入れるだけで、1人いくらかがすぐ分かります。全員同じ額の割り勘も、先輩・後輩で差をつける傾斜も。集金のページも作れます",
  alternates: { canonical: "/split" },
};

// 会の画面から来たときだけ、上に「日程調整 → お店探し → 会計精算」の段階を出す(ただ計算したいときは出さない)
export default async function SplitPage(props: PageProps<"/split">) {
  const { from, mode } = await props.searchParams;
  // ホームの「集金の催促を、アプリにまかせる」から来たとき: 集金をはじめる入口にする(割り勘の計算は、集金のページを作る前の準備)
  const collect = mode === "collect";
  return (
    <PageMotion>
      {typeof from === "string" ? (
        <SiteHeader>
          <StepBar current={2} />
        </SiteHeader>
      ) : (
        <SiteHeader />
      )}
      <div className="mx-auto max-w-xl pt-6 pb-16">
        <div className="px-4 pb-5">
          <h1 className="text-[22px] font-black tracking-tight">{collect ? "集金をはじめる" : "会計"}</h1>
          <p className="mt-1 text-sm text-muted">{collect ? "金額を集めるページを作って、みんなに送ります" : "合計を入れるだけで一人ずつの金額を表示"}</p>
          {collect && (
            <ol className="mt-3 grid gap-1.5 text-sm" aria-label="集金の流れ">
              {["合計と、割る人の名前を入れる", "下の「集金のページを作る」を押す", "できたページで、PayPay のリンクを貼ってみんなに送る"].map((t, i) => (
                <li key={t} className="flex items-center gap-2.5">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent text-[11px] font-black text-accent-text">{i + 1}</span>
                  {t}
                </li>
              ))}
            </ol>
          )}
        </div>
        <SplitClient from={typeof from === "string" ? from : null} />
      </div>
    </PageMotion>
  );
}
