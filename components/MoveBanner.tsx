"use client";

import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { encodeMove, isOurKey, NEW_ORIGIN } from "@/lib/move";

// 前のアドレス(〜.vercel.app)で開いたときだけ、画面の上に「新しいアドレスへ」を出す。
// 押すと、この端末の保存(作った会・回答・集金など)を、URL の # の後ろに載せて新しいアドレスへ渡す。
// # の後ろはサーバーに送られないので、幹事の鍵などがサーバーや記録に残らない

export function MoveBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // 新しいアドレスと、開発中の画面では出さない
    const host = location.hostname;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShow(host.endsWith(".vercel.app"));
  }, []);

  if (!show) return null;

  function move() {
    const data: Record<string, string> = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && isOurKey(k)) data[k] = localStorage.getItem(k) ?? "";
      }
    } catch {
      // 保存が読めなくても、新しいアドレスへは移る
    }
    // 今いるページ(会のページなど)のまま、新しいアドレスで開く
    const back = `${location.pathname}${location.search}`;
    // 別のアドレス(tsudoro.com)へ移るので、ページ遷移ではなくブラウザの移動を使う
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    location.href = `${NEW_ORIGIN}/move?to=${encodeURIComponent(back)}#${encodeMove(data)}`;
  }

  return (
    <div className="sticky top-0 z-40 border-b border-accent/40 bg-[#1d1608] px-4 py-2.5">
      <div className="mx-auto flex max-w-xl items-center gap-3">
        <p className="min-w-0 flex-1 text-xs leading-relaxed">
          <span className="font-black text-accent">新しいアドレス tsudoro.com</span> に変わりました。作った会や回答も引き継げます
        </p>
        <button
          type="button"
          onClick={move}
          className="inline-flex min-h-10 shrink-0 items-center gap-1 rounded-xl bg-accent px-3 text-xs font-black text-accent-text active:scale-95"
        >
          引き継いで開く
          <ArrowRight className="size-3.5" aria-hidden />
        </button>
      </div>
    </div>
  );
}
