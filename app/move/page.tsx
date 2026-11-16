import type { Metadata } from "next";
import { MoveClient } from "@/components/MoveClient";

// 前のアドレスから引き継ぐ保存内容を受け取るページ。中身は URL の # の後ろにあり、サーバーには届かない
export const metadata: Metadata = { title: "引き継ぎ", robots: { index: false, follow: false } };

export default function MovePage() {
  return <MoveClient />;
}
