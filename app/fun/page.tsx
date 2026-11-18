import type { Metadata } from "next";
import { FunClient } from "@/components/FunClient";
import { PageMotion } from "@/components/PageMotion";
import { SiteHeader } from "@/components/SiteHeader";

// 有料パックの「もりあげ道具」。買う前は、遊びの名前だけ見せる
export const metadata: Metadata = {
  title: "Play・Support",
  description: "幹事がいる会をもっと楽しくする飲み会の遊び",
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
