"use client";

import Link from "next/link";
import { useEffect } from "react";
import { reportError } from "@/lib/reportError";

// ページの中でエラーが起きたときの画面。記録に残して、もう一度読み込めるようにする
export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    reportError(error);
  }, [error]);
  return (
    <main className="mx-auto grid min-h-[70dvh] max-w-xl place-items-center px-6 text-center">
      <div>
        <p className="text-lg font-black">うまく表示できませんでした</p>
        <p className="mt-2 text-sm text-muted">通信が不安定なことがあります。もう一度お試しください。</p>
        <div className="mt-5 flex justify-center gap-2">
          <button type="button" onClick={() => retry()} className="min-h-11 rounded-xl bg-accent px-5 text-sm font-black text-accent-text">
            もう一度読み込む
          </button>
          <Link href="/" className="flex min-h-11 items-center rounded-xl border border-white/20 px-5 text-sm font-bold">
            トップへ
          </Link>
        </div>
      </div>
    </main>
  );
}
