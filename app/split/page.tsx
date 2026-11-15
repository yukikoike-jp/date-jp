import type { Metadata } from "next";
import { ChevronRight, ListChecks } from "lucide-react";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { StepBar } from "@/components/StepBar";
import { SplitClient } from "@/components/SplitClient";
import { PageMotion } from "@/components/PageMotion";

export const metadata: Metadata = { title: "会計" };

// 会の画面から来たときだけ、上に「日程調整 → お店探し → 会計精算」の段階を出す(ただ計算したいときは出さない)
export default async function SplitPage(props: PageProps<"/split">) {
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
          <h1 className="text-[22px] font-black tracking-tight">会計</h1>
          <p className="mt-1 text-sm text-muted">合計を入れるだけで一人ずつの金額を表示</p>
        </div>
        {/* 集金は会計の中にまとめる。作った集金の「誰が払ったか」はここから見る */}
        <div className="px-4 pb-5">
          <Link
            href="/collect"
            className="flex items-center gap-3 rounded-2xl bg-surface px-4 py-3.5 ring-1 ring-white/8 transition hover:bg-stone-800 active:scale-[0.99]"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/6 text-accent">
              <ListChecks className="size-4" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-black tracking-tight text-white/90">集金のチェック</span>
              <span className="mt-0.5 block text-xs font-medium text-white/60">作った集金で、誰が払ったかを確かめる</span>
            </span>
            <ChevronRight className="size-4 shrink-0 text-white/30" aria-hidden />
          </Link>
        </div>
        <SplitClient from={typeof from === "string" ? from : null} />
      </div>
    </PageMotion>
  );
}
