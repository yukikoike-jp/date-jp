import type { Metadata } from "next";
import { FunClient } from "@/components/FunClient";
import { PageMotion } from "@/components/PageMotion";
import { SiteHeader } from "@/components/SiteHeader";

// 有料パックの「もりあげ道具」。買う前は、見本の名前で動くデモ版
export const metadata: Metadata = {
  title: "もりあげ道具(席替え・ゲーム)",
  description: "席替え・チーム分け・王様ゲーム・ルーレット。飲み会を盛り上げる道具",
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
