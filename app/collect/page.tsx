import type { Metadata } from "next";
import { CollectList } from "@/components/CollectList";
import { PageMotion } from "@/components/PageMotion";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "集金チェック",
  description: "飲み会の集金を、誰が払ったかまで確かめられます。合計と名前を入れるだけ。",
  alternates: { canonical: "/collect" },
};

// 集金(無料)。この端末で作った集金を並べ、新しく始められる
export default function CollectPage() {
  return (
    <PageMotion>
      <SiteHeader />
      <div className="mx-auto max-w-xl pt-6 pb-16">
        <div className="px-4 pb-5">
          <h1 className="text-[22px] font-black tracking-tight">集金</h1>
          <p className="mt-1 text-sm text-muted">名前を入れて、誰が払ったかを確かめます。</p>
        </div>
        <div className="mx-4">
          <CollectList />
        </div>
      </div>
    </PageMotion>
  );
}
