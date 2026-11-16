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
  ["日程調整", "候補日を選んで URL を LINE に貼るだけ。みんなは登録なしで、30秒で行ける日と予算を答えられます"],
  ["お店探し", "みんなの予算と人数、集まりやすい駅から、合うお店を自動で出します。個室・飲み放題・喫煙可でも探せます"],
  ["割り勘・傾斜", "合計を入れるだけで1人いくら。全員同じ額の割り勘も、先輩・後輩で差をつける傾斜もできます"],
] as const;

export default function Home() {
  return (
    <PageMotion>
      <HomeClient />
      {/* アプリの説明と幹事のガイド。画面のいちばん下に、閉じた形で置く(押すと開く)。
          閉じていても中身はページに入っているので、検索エンジンには読める */}
      <section className="mx-auto grid max-w-xl gap-2 px-4 pt-4 pb-12">
        <details className="group rounded-2xl border panel px-4 [&_summary::-webkit-details-marker]:hidden">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between text-sm font-bold text-white/85">
            Tsudoro について
            <ChevronDown className="size-4 text-muted transition-transform group-open:rotate-180" aria-hidden />
          </summary>
          <div className="pb-4 text-white/70">
            <h2 className="text-sm font-black text-white/85">Tsudoro は、飲み会の幹事を楽にする無料のアプリです</h2>
            <dl className="mt-3 grid gap-3 text-xs leading-relaxed">
              {FEATURES.map(([t, d]) => (
                <div key={t}>
                  <dt className="font-bold text-white/80">{t}</dt>
                  <dd className="mt-0.5">{d}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-xs leading-relaxed">
              サークルや学生の飲み会、友達との集まり、会社の忘年会・新年会・歓送迎会まで。アカウント登録もアプリのインストールもいりません。
            </p>
          </div>
        </details>
        <details className="group rounded-2xl border panel px-4 [&_summary::-webkit-details-marker]:hidden">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between text-sm font-bold text-white/85">
            幹事のガイド
            <ChevronDown className="size-4 text-muted transition-transform group-open:rotate-180" aria-hidden />
          </summary>
          <ul className="grid gap-2 pb-4 text-xs text-white/70">
            {GUIDES.map((g) => (
              <li key={g.slug}>
                <Link href={`/guide/${g.slug}`} className="underline underline-offset-2">
                  {g.title}
                </Link>
              </li>
            ))}
          </ul>
        </details>
      </section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\u003c") }} />
    </PageMotion>
  );
}
