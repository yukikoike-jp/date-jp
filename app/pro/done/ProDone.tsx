"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { saveLicense } from "@/components/ProGate";
import { BUTTON_PRIMARY } from "@/components/ui";

/** 確かめた鍵をこの端末に保存し、少し待ってから元のページへ戻す */
export function ProDone({ license, back }: { license: string | null; back: string }) {
  useEffect(() => {
    if (!license) return;
    saveLicense(license);
    const t = setTimeout(() => location.replace(back), 1500);
    return () => clearTimeout(t);
  }, [license, back]);

  if (!license) {
    return (
      <>
        <h1 className="text-xl font-black">支払いを確かめられませんでした</h1>
        <p className="mt-2 text-sm text-muted">お支払いが済んでいれば、Play の画面の「ほかの端末で買った人はこちら」から、買ったときのメールアドレスで戻せます。</p>
        <Link href={back} className={`${BUTTON_PRIMARY} mt-6 w-full`}>
          もどる
        </Link>
      </>
    );
  }
  return (
    <>
      <p className="flex items-center gap-2 text-xl font-black">
        <Check className="size-6 text-accent" aria-hidden />
        購入ありがとうございます
      </p>
      <p className="mt-2 text-sm text-muted">この端末で Tsudoro Plus(Play と幹事サポート)がずっと使えます。元の画面にもどります。</p>
    </>
  );
}
