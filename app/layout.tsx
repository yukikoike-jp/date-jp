import type { Metadata, Viewport } from "next";
import { Noto_Sans_JP, Poppins } from "next/font/google";
import { MoveBanner } from "@/components/MoveBanner";
import { ToastHost } from "@/components/Toast";
import "./globals.css";

const jp = Noto_Sans_JP({
  // もとにした KANJI と同じく、見出しはいちばん太い字(900)を使う
  weight: ["400", "500", "700", "900"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jp",
});

// 名前「Tsudoro」に使う字体。丸みのある幾何学的な太字で、親しみやすく今っぽく見せる
const logo = Poppins({ weight: "700", subsets: ["latin"], display: "swap", variable: "--font-poppins" });

export const metadata: Metadata = {
  // LINE のプレビュー画像などの絶対 URL は、正式なアドレス(独自ドメイン)で作る
  metadataBase: new URL(process.env.SITE_URL || "https://www.tsudoro.com"),
  title: { default: "Tsudoro | 飲み会の日程とお店がすぐ決まる", template: "%s | Tsudoro" },
  description:
    "飲み会の日程調整・お店探し・割り勘を、登録なしで。URLをLINEに貼ってみんなが30秒で答えるだけで、日にちと予算とお店が決まります。幹事の負担を減らす無料のアプリ。",
  applicationName: "Tsudoro",
  keywords: ["飲み会", "日程調整", "幹事", "お店探し", "割り勘", "傾斜", "忘年会", "新年会", "歓迎会", "サークル", "LINE"],
  // Google Search Console の確認用。値は Vercel の環境変数に入れる
  verification: process.env.GOOGLE_SITE_VERIFICATION ? { google: process.env.GOOGLE_SITE_VERIFICATION } : undefined,
  openGraph: { siteName: "Tsudoro", locale: "ja_JP", type: "website" },
  appleWebApp: { title: "Tsudoro", statusBarStyle: "black-translucent", capable: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#000000",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja" className={`${jp.variable} ${logo.variable} h-full antialiased`}>
      <body className="min-h-full">
        {/* 前のアドレス(〜.vercel.app)で開いたときだけ、新しいアドレスへの引き継ぎを出す */}
        <MoveBanner />
        <main>{children}</main>
        <ToastHost />
      </body>
    </html>
  );
}
