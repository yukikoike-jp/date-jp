import type { Metadata } from "next";
import { FunClient } from "@/components/FunClient";
import { PageMotion } from "@/components/PageMotion";
import { SiteHeader } from "@/components/SiteHeader";

// 有料パックの「もりあげ道具」。買う前は、見本の名前で動くデモ版
export const metadata: Metadata = {
  title: "もりあげ道具(真実か挑戦・ゲーム)",
  description: "真実か挑戦・ワードウルフ・王様ゲーム・チーム分け。飲み会を盛り上げる道具",
  robots: { index: false },
};

export default function FunPage() {
  return (
    <PageMotion>
      <SiteHeader />
      <FunClient />
    </PageMotion>
  );
}
