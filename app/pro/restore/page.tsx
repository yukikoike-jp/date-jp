import type { Metadata } from "next";
import { connection } from "next/server";
import { SiteHeader } from "@/components/SiteHeader";
import { PageMotion } from "@/components/PageMotion";
import { licenseFromToken } from "@/lib/billing";
import { ProDone } from "../done/ProDone";

// 確認メールのリンクから開くページ。リンクの合言葉を確かめてから、この端末に鍵を保存して Play の画面へ戻す

export const metadata: Metadata = { title: "ほかの端末で使う", robots: { index: false } };

export default async function ProRestorePage(props: PageProps<"/pro/restore">) {
  await connection();
  const { t } = await props.searchParams;
  let license: string | null = null;
  try {
    license = await licenseFromToken(t);
  } catch (e) {
    console.error("[billing] 確認のリンクを確かめられませんでした", e);
  }
  return (
    <PageMotion>
      <SiteHeader />
      <div className="mx-auto max-w-xl px-4 py-10">
        <ProDone license={license} back="/fun" restored />
      </div>
    </PageMotion>
  );
}
