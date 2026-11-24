import type { Metadata } from "next";
import { PageMotion } from "@/components/PageMotion";
import { QuickCollect } from "@/components/QuickCollect";
import { SiteHeader } from "@/components/SiteHeader";
import { StepBar } from "@/components/StepBar";

export const metadata: Metadata = { title: "集金をはじめる", robots: { index: false } };

// 会の画面から来たときだけ、上に「日程調整 → お店探し → 集金」の段階を出す
export default async function NewCollectPage(props: PageProps<"/collect/new">) {
  const { from } = await props.searchParams;
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
          <h1 className="text-[22px] font-black tracking-tight">集金をはじめる</h1>
          <p className="mt-1 text-sm text-muted">合計と名前を入れるとすぐに集金のページができます。誰が払ったかを確かめられます。</p>
        </div>
        <QuickCollect />
      </div>
    </PageMotion>
  );
}
