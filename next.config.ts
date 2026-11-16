import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 開発中、2人目の端末の代わりに 127.0.0.1 からも開けるようにする(localStorage が別になる)
  allowedDevOrigins: ["127.0.0.1"],
  // 紹介料の付くリンクを使っているかどうかだけを、画面(components/PrNote.tsx)に渡す。リンクの中身は渡さない
  // 応援(OFUSE)のページの URL。空なら応援のリンクを出さない
  env: {
    AFFILIATE_ON: process.env.AFFILIATE_URL_TEMPLATE?.includes("{url}") ? "1" : "",
    // ほかの予約サイト(一休・オズモール)のボタンを出すか。バリューコマースのサイト審査が済むまでは、
    // リンクも画像もバリューコマースの仮のページ・画像になるので出さない。審査が済んだら Vercel で OTHER_SITES_ON=1 にする
    OTHER_SITES_ON: process.env.OTHER_SITES_ON === "1" ? "1" : "",
    SUPPORT_URL: process.env.SUPPORT_URL ?? "",
    // 有料の機能を売っているか(Stripe のキーと鍵の秘密がそろっているか)。特定商取引法の表記へのリンクに使う。キーの中身は渡さない
    BILLING_ON: process.env.STRIPE_SECRET_KEY && process.env.LICENSE_SECRET ? "1" : "",
  },
  images: { remotePatterns: [{ protocol: "https", hostname: "imgfp.hotp.jp" }] },
  // tsudoro.com → www.tsudoro.com の移動は、Vercel のドメインの設定で行う(ここで逆向きに移すと、行ったり来たりになる)
  async headers() {
    return [
      {
        // すべてのページ: よそのサイトに埋め込ませない(クリックジャッキング対策)、
        // 幹事の URL(?token=…)が、外のサイトへのリンクの Referer で漏れないようにする、ファイルの種類を推測させない
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      {
        // 飲み会のページは検索エンジンに載せない
        source: "/p/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default nextConfig;
