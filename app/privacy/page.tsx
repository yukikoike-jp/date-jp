import type { Metadata } from "next";
import { connection } from "next/server";
import { PageMotion } from "@/components/PageMotion";
import { SiteHeader } from "@/components/SiteHeader";
import { cleanText } from "@/lib/env";

export const metadata: Metadata = { title: "プライバシーポリシー", alternates: { canonical: "/privacy" } };

// 実際に扱っている情報だけを書く(書いていない情報は集めない)。
// 運営者の名前と連絡先は個人の情報なので、コードには書かず環境変数から読む
// (OPERATOR_NAME / CONTACT_EMAIL。なければ特商法の SELLER_NAME / SELLER_EMAIL を使う)

const UPDATED = "2026年11月23日";

type Section = { title: string; body: (string | string[])[] };

export default async function PrivacyPage() {
  await connection();
  const operator = cleanText(process.env.OPERATOR_NAME) ?? cleanText(process.env.SELLER_NAME) ?? "Tsudoro 運営";
  const contact = cleanText(process.env.CONTACT_EMAIL) ?? cleanText(process.env.SELLER_EMAIL);

  const sections: Section[] = [
    {
      title: "1. 取得する情報",
      body: [
        "Tsudoro は、会員登録なしで使えるサービスです(Web とスマホアプリの両方で、同じ扱いです)。氏名・住所・電話番号・メールアドレスなどを、登録のために求めることはありません。使い方に応じて、次の情報をお預かりします。",
        [
          "会を作るとき: 会のタイトル、候補の日、始まる時刻、会の種類",
          "日程に答えるとき: 名前(ニックネームでかまいません)、行ける日、予算、最寄りの駅、お酒を飲むか、たばこを吸うか、苦手な食べもの、ひとこと",
          "集金のページを作るとき: 参加する人の名前、金額、支払いの記録",
          "集金のページで PayPay のリンクを入れたとき: そのリンク(参加する人の画面に「払う」ボタンを出すため)",
          "お店のリンクが押された回数(どの会から押されたかだけを数え、誰が押したかは記録しません)",
          "有料の機能を買ったとき: 決済は Stripe が行い、カードの情報を当サービスが受け取ることはありません。別の端末で使えるようにするため、購入のときのメールアドレスで、Stripe に購入の有無を確かめることがあります",
        ],
        "回答を直したり、幹事として会を開いたりするための鍵は、お使いの端末(ブラウザの保存領域、またはスマホアプリの保存領域)に保存されます。サーバーには、その鍵から作った確認用の値だけを保存します。",
      ],
    },
    {
      title: "2. 使う目的",
      body: [
        [
          "みんなの都合を集めて、日にちとお店を決めるため",
          "会計・集金を手伝うため",
          "使われ方を件数で数え、サービスをよくするため(個人を特定する分析はしません)",
          "お問い合わせに答えるため",
        ],
      ],
    },
    {
      title: "3. 見える範囲",
      body: [
        "会の URL を知っている人は、その会の回答(名前、行ける日など)を見られます。予算は、本人と集計にだけ使い、ほかの参加者には個別の金額を見せません。URL は、参加する人以外に共有しないでください。",
      ],
    },
    {
      title: "4. 外部のサービス",
      body: [
        "サービスを動かすため、次の事業者のサービスを使っています。それぞれに必要な範囲の情報だけを送ります(米国の事業者を含みます)。",
        [
          "Supabase(データの保存)",
          "Vercel(サイトの配信。アクセスの記録が一定期間残ります)",
          "ホットペッパーグルメ Webサービス(お店の検索。駅の位置と、予算・ジャンルなどの条件を送ります)",
          "HeartRails Express(駅の検索。入力された駅名を送ります)",
          "Stripe(有料の機能の決済)",
        ],
      ],
    },
    {
      title: "5. 提携リンク(アフィリエイト)",
      body: [
        "お店や予約サイト(ホットペッパーグルメ、一休.comレストラン、オズモールなど)へのリンクは、バリューコマース株式会社の提携リンク(アフィリエイト広告)を経由することがあります。その場合、予約の成果を確かめるため、同社が Cookie などを使うことがあります。同社による情報の扱いは、同社のプライバシーポリシーをご確認ください。本サービスは、予約が成立したときに紹介料を受け取ることがあります。リンクの近くには「PR」または「#アフィリエイト広告」と表示します。また、どのリンクが何回押されたかを数えますが、誰が押したかは記録しません。",
      ],
    },
    {
      title: "6. アクセス解析・広告",
      body: ["アクセス解析のツールや、行動を追跡する広告は使っていません。"],
    },
    {
      title: "7. 第三者への提供",
      body: ["法令にもとづく場合を除き、お預かりした情報を、ご本人の同意なく第三者に提供しません。"],
    },
    {
      title: "8. 保存の期間と削除",
      body: [
        "情報は、サービスの提供に必要な期間保存します。会や回答の削除を希望されるときは、下の連絡先までお知らせください。ご本人(または幹事)であることを確かめたうえで削除します。",
      ],
    },
    {
      title: "9. 開示・訂正・削除のご請求、お問い合わせ",
      body: [
        `運営者: ${operator}`,
        contact ? `連絡先: ${contact}` : "連絡先: 準備中",
        "個人情報の開示・訂正・利用停止・削除のご請求は、上の連絡先で受け付けます。",
      ],
    },
    {
      title: "10. 改定",
      body: ["この方針は、必要に応じて改定します。大きく変えるときは、このページでお知らせします。"],
    },
  ];

  return (
    <PageMotion>
      <SiteHeader />
      <div className="mx-auto max-w-xl px-4 pt-6 pb-16">
        <h1 className="text-[22px] font-black tracking-tight">プライバシーポリシー</h1>
        <p className="mt-2 text-xs text-muted">最終更新: {UPDATED}</p>
        <div className="mt-5 divide-y divide-border rounded-3xl border panel">
          {sections.map((s) => (
            <section key={s.title} className="px-5 py-4">
              <h2 className="text-sm font-black">{s.title}</h2>
              <div className="mt-2 space-y-2 text-sm leading-relaxed text-white/80">
                {s.body.map((b, i) =>
                  Array.isArray(b) ? (
                    <ul key={i} className="list-disc space-y-1 pl-5">
                      {b.map((li) => (
                        <li key={li}>{li}</li>
                      ))}
                    </ul>
                  ) : (
                    <p key={i}>{b}</p>
                  ),
                )}
              </div>
            </section>
          ))}
        </div>
      </div>
    </PageMotion>
  );
}
