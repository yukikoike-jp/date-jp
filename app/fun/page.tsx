import type { Metadata } from "next";
import { FunClient } from "@/components/FunClient";
import { PageMotion } from "@/components/PageMotion";
import { SiteHeader } from "@/components/SiteHeader";

// 有料パックの「もりあげ道具」。買う前は、見本の名前で動くデモ版
export const metadata: Metadata = {
  title: "Play(真実か挑戦・ワードウルフ・王様ゲーム)",
  description: "真実か挑戦・ワードウルフ・王様ゲーム・NGワード・ルーレット・チーム分け。飲み会を盛り上げる遊び",
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
