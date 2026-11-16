import type { Metadata } from "next";
import { HomeClient } from "@/components/HomeClient";
import { PageMotion } from "@/components/PageMotion";
import { ChevronDown } from "lucide-react";
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
  description: "飲み会の日程調整・お店探し・割り勘が、登録なしでできる無料のアプリ。URLをLINEに貼るだけで、みんなの行ける日と予算がまとまります",
  offers: { "@type": "Offer", price: "0", priceCurrency: "JPY" },
};

const FEATURES = [
  ["日程調整", "候補日を選び、URLをLINEに貼るだけです。参加者は、登録なしで、30秒ほどで行ける日と予算を答えられます。"],
  ["お店探し", "全員の予算と人数、集まりやすい駅から、合うお店を自動で選びます。個室、飲み放題、喫煙可などの条件でも絞り込めます。"],
  ["割り勘・傾斜", "合計金額を入れると、1人あたりの金額が分かります。全員同じ額の割り勘と、先輩・後輩などで差をつける傾斜の、どちらにも対応しています。"],
] as const;

export default function Home() {
  return (
    <PageMotion>
      <HomeClient
        about={
          // アプリの説明と幹事のガイド。閉じた小さな行で置き、押すと開く。閉じていても中身はページに入っているので、検索エンジンには読める
          <div className="grid gap-1.5">
            <details className="group rounded-xl border panel px-3.5 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between text-xs font-bold text-white/70">
                Tsudoro について
                <ChevronDown className="size-3.5 text-muted transition-transform group-open:rotate-180" aria-hidden />
              </summary>
              <div className="pb-3.5 text-white/70">
                <h2 className="text-xs font-black text-white/85">Tsudoro は、飲み会の幹事の負担を減らす、基本無料のアプリです</h2>
                <dl className="mt-2.5 grid gap-2.5 text-xs leading-relaxed">
                  {FEATURES.map(([t, d]) => (
                    <div key={t}>
                      <dt className="font-bold text-white/80">{t}</dt>
                      <dd className="mt-0.5">{d}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-2.5 text-xs leading-relaxed">
                  学生やサークルの飲み会、友達どうしの集まり、会社の忘年会・新年会・歓送迎会まで使えます。アカウント登録とアプリのインストールは不要です。
                </p>
              </div>
            </details>
            <details className="group rounded-xl border panel px-3.5 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between text-xs font-bold text-white/70">
                幹事のガイド
                <ChevronDown className="size-3.5 text-muted transition-transform group-open:rotate-180" aria-hidden />
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
          </div>
        }
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\u003c") }} />
    </PageMotion>
  );
}
