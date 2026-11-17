import type { Metadata } from "next";
import { HomeClient } from "@/components/HomeClient";
import { PageMotion } from "@/components/PageMotion";
import { ChevronDown, ExternalLink } from "lucide-react";
import Link from "next/link";
import { GUIDES } from "@/lib/guides";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = { alternates: { canonical: "/" } };

// 検索エンジン向けの、アプリの説明(Google の「アプリ」として読ませる)
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Tsudoro",
  url: SITE_URL,
  applicationCategory: "LifestyleApplication",
  operatingSystem: "iOS, Android, Windows, macOS",
  inLanguage: "ja",
  description: "飲み会の日程調整・お店探し・割り勘が、登録なしでできる無料のアプリ。URLをLINEに貼るだけで、みんなの行ける日と予算がまとまります。",
  offers: { "@type": "Offer", price: "0", priceCurrency: "JPY" },
};

const FEATURES = [
  ["日程調整", "候補日を選んでURLをLINEに貼るだけ。参加者は登録なしで30秒ほどで行ける日と予算を答えられます。"],
  ["お店探し", "全員の予算・人数・集まりやすい駅から合うお店を自動で選びます。個室・飲み放題・喫煙可でも絞り込めます。"],
  ["割り勘・傾斜", "合計金額を入れると1人あたりの金額が分かります。全員同じ額の割り勘も先輩・後輩で差をつける傾斜も使えます。"],
] as const;

export default function Home() {
  return (
    <PageMotion>
      <HomeClient
        about={
          // アプリの説明と幹事のガイド。閉じた小さな行で置き、押すと開く。閉じていても中身はページに入っているので、検索エンジンには読める
          <div className="divide-y divide-white/8 overflow-hidden rounded-xl border panel">
            <details className="group px-3 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex min-h-9 cursor-pointer list-none items-center justify-between text-[11px] font-bold text-white/60">
                Tsudoro について
                <ChevronDown className="size-3 text-muted transition-transform group-open:rotate-180" aria-hidden />
              </summary>
              <div className="pb-3.5 text-white/70">
                <h2 className="text-xs font-black leading-[1.5] text-white/85">Tsudoro は幹事の負担を減らす基本無料のアプリです</h2>
                <dl className="mt-2.5 grid gap-2 text-xs leading-[1.5]">
                  {FEATURES.map(([t, d]) => (
                    <div key={t}>
                      <dt className="font-bold text-white/80">{t}</dt>
                      <dd className="mt-0.5">{d}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-2.5 text-xs leading-[1.5]">
                  学生やサークルの飲み会から会社の忘年会・新年会・歓送迎会まで使えます。アカウント登録とアプリのインストールは不要です。
                </p>
              </div>
            </details>
            <details className="group px-3 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex min-h-9 cursor-pointer list-none items-center justify-between text-[11px] font-bold text-white/60">
                幹事のガイド
                <ChevronDown className="size-3 text-muted transition-transform group-open:rotate-180" aria-hidden />
              </summary>
              <ul className="grid gap-2 pb-3.5 text-xs text-white/70">
                {GUIDES.map((g) => (
                  <li key={g.slug}>
                    <Link href={`/guide/${g.slug}`} className="underline underline-offset-2">
                      {g.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </details>
            <details className="group px-3 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex min-h-9 cursor-pointer list-none items-center justify-between text-[11px] font-bold text-white/60">
                プライバシーポリシー
                <ChevronDown className="size-3 text-muted transition-transform group-open:rotate-180" aria-hidden />
              </summary>
              <div className="pb-3.5 text-xs leading-[1.5] text-white/70">
                <ul className="grid gap-1.5">
                  <li>会員登録はありません。氏名・住所・電話番号・メールアドレスを登録のために求めることもありません。</li>
                  <li>お預かりするのは、会のタイトル・候補日・答えた名前(ニックネーム可)・行ける日・予算などです。</li>
                  <li>会のURLを知っている人は、その会の回答を見られます。予算はほかの参加者に個別には見せません。</li>
                  <li>アクセス解析と行動を追跡する広告は使っていません。</li>
                  <li>お店や予約サイトへのリンクは、提携リンク(アフィリエイト広告)を経由することがあります。その場合は「PR」または「#アフィリエイト広告」と表示します。</li>
                  <li>ご本人の同意なく第三者に情報を提供することはありません(法令にもとづく場合を除く)。</li>
                </ul>
                <Link href="/privacy" className="mt-2.5 inline-flex min-h-9 items-center font-bold text-white/85 underline underline-offset-2">
                  全文を読む
                </Link>
              </div>
            </details>
            {/* 応援(OFUSE)。見返りのない投げ銭。URL は環境変数 SUPPORT_URL。空なら出さない */}
            {process.env.SUPPORT_URL && (
              <details className="group px-3 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex min-h-9 cursor-pointer list-none items-center justify-between text-[11px] font-bold text-white/60">
                  Tsudoro を応援する
                  <ChevronDown className="size-3 text-muted transition-transform group-open:rotate-180" aria-hidden />
                </summary>
                <div className="pb-3.5 text-xs leading-[1.5] text-white/70">
                  <p>Tsudoro は学生が1人で作っています。気に入ったら応援してもらえるとうれしいです。</p>
                  <a
                    href={process.env.SUPPORT_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2.5 inline-flex min-h-9 items-center gap-1 font-bold text-white/85 underline underline-offset-2"
                  >
                    応援する(OFUSE)
                    <ExternalLink className="size-3.5" aria-hidden />
                  </a>
                </div>
              </details>
            )}
          </div>
        }
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\u003c") }} />
    </PageMotion>
  );
}
