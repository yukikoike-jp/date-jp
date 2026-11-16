import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// 検索エンジンに知らせる、誰でも見られるページの一覧
export default function sitemap(): MetadataRoute.Sitemap {
  const pages: [string, number][] = [
    ["/", 1],
    ["/new", 0.9],
    ["/shops", 0.8],
    ["/split", 0.8],
    ["/privacy", 0.2],
    ["/legal", 0.2],
  ];
  return pages.map(([path, priority]) => ({ url: `${SITE_URL}${path}`, changeFrequency: "weekly", priority }));
}
