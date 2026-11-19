import { redirect } from "next/navigation";

// 集金のチェックは Tsudoro+ の Support の中にある。昔のリンクで来た人は、そこへ送る
export default function CollectPage() {
  redirect("/fun?tab=collect");
}
