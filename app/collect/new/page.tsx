import type { Metadata } from "next";
import { PageMotion } from "@/components/PageMotion";
import { QuickCollect } from "@/components/QuickCollect";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = { title: "集金をはじめる", robots: { index: false } };

export default function NewCollectPage() {
  return (
    <PageMotion>
      <SiteHeader />
      <div className="mx-auto max-w-xl pt-6 pb-16">
        <div className="px-4 pb-5">
          <h1 className="text-[22px] font-black tracking-tight">集金をはじめる</h1>
          <p className="mt-1 text-sm text-muted">合計と名前を入れるとすぐに集金のページができます。</p>
        </div>
        <QuickCollect />
      </div>
    </PageMotion>
  );
}
