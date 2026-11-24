import type { Metadata } from "next";
import { connection } from "next/server";
import { PageMotion } from "@/components/PageMotion";
import { SiteHeader } from "@/components/SiteHeader";
import { cleanText } from "@/lib/env";

export const metadata: Metadata = { title: "特定商取引法に基づく表記", alternates: { canonical: "/legal" } };

// 2026-11-25: ユーザーからはお金を取らない方針(収益は提携先からの送客手数料と広告)。有料の機能は売っていないので、価格や支払いの行は外した。
// Tsudoro+ を売り直すときは、販売価格・支払い方法・返品の行を戻す(lib/billing.ts の proPrice)。
// 売る人の名前・住所・連絡先は個人の情報なので、コードには書かず環境変数(SELLER_*)から読む。
// 住所と電話は、請求があったときに開示する形でもよい(消費者庁の案内による)

const DISCLOSE = "請求があった場合には、遅滞なく開示いたします。";

export default async function LegalPage() {
  await connection();
  const rows: [string, string][] = [
    ["販売事業者", cleanText(process.env.SELLER_NAME) ?? "準備中"],
    ["運営責任者", cleanText(process.env.SELLER_NAME) ?? "準備中"],
    ["所在地", cleanText(process.env.SELLER_ADDRESS) ?? DISCLOSE],
    ["電話番号", cleanText(process.env.SELLER_PHONE) ?? DISCLOSE],
    ["メールアドレス", cleanText(process.env.SELLER_EMAIL) ?? "準備中"],
    ["利用料金", "無料です。ご利用者さまに料金をいただくことはありません。有料の機能は、いまはありません。"],
    ["運営の費用について", "お店や旅行サイトの予約が成立したときに提携先から受け取る紹介料(送客手数料)と、サイト内の広告でまかなっています。ご利用者さまのお支払いが増えることはありません。紹介リンクと広告には、「PR」「#アフィリエイト広告」と表示します。"],
    ["商品代金以外の必要料金", "なし(インターネットの通信料はお客さまのご負担です)。"],
    ["今後について", "有料の機能を始めるときは、先にこのページと画面でお知らせします。お知らせなく、お金をいただくことはありません。"],
  ];
  return (
    <PageMotion>
      <SiteHeader />
      <div className="mx-auto max-w-xl px-4 pt-6 pb-16">
        <h1 className="text-[22px] font-black tracking-tight">特定商取引法に基づく表記</h1>
        <dl className="mt-5 divide-y divide-border rounded-3xl border panel">
          {rows.map(([k, v]) => (
            <div key={k} className="grid grid-cols-[7rem_minmax(0,1fr)] gap-x-4 px-5 py-4">
              <dt className="text-xs font-bold text-muted">{k}</dt>
              <dd className="text-sm break-words whitespace-pre-wrap">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </PageMotion>
  );
}
