import type { Metadata, Viewport } from "next";
import { Noto_Sans_JP, Poppins } from "next/font/google";
import "./globals.css";

const jp = Noto_Sans_JP({
  // もとにした KANJI と同じく、見出しはいちばん太い字(900)を使う
  weight: ["400", "500", "700", "900"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jp",
});

// 英字の飾りに使う字体(名前「つどろ」は日本語の太字で出す)
const logo = Poppins({ weight: "700", subsets: ["latin"], display: "swap", variable: "--font-poppins" });

export const metadata: Metadata = {
  title: { default: "つどろ | 飲み会の日程とお店がすぐ決まる", template: "%s | つどろ" },
  description:
    "URLをLINEに貼ってみんなが30秒で答えるだけで、飲み会の日にちと予算とお店が決まります",
  applicationName: "つどろ",
  appleWebApp: { title: "つどろ", statusBarStyle: "black-translucent", capable: true },
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
        <main>{children}</main>
      </body>
    </html>
  );
}
