import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// 検索エンジンに見てほしいページと、見なくてよいページ。
// 会のページ(/p/)は、ページの中で「検索に出さない」と書くので、ここでは止めない(止めると、その印を読めない)
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/go/", "/out/", "/api/", "/ad/", "/c/", "/move", "/stats", "/history", "/pro/"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
