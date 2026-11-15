"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "./Toast";

// 画面のいちばん上で下に引っぱると、最新の回答を読み込み直す。
// ホーム画面に追加したアプリ(ブラウザの再読み込みボタンがない)でも、ほかの人の回答をすぐ見られるようにする。
// 引っぱった量に合わせて、グラスにビールが注がれていく。指で触れる端末だけで働く

const THRESHOLD = 72;

export function PullToRefresh({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [pull, setPull] = useState(0);
  const [busy, setBusy] = useState(false);
  const [touching, setTouching] = useState(false);
  const start = useRef<number | null>(null);
  const pullRef = useRef(0);

  useEffect(() => {
    const down = (e: TouchEvent) => {
      start.current = window.scrollY <= 0 && !busy ? e.touches[0].clientY : null;
      setTouching(start.current !== null);
    };
    const move = (e: TouchEvent) => {
      if (start.current === null) return;
      const dy = e.touches[0].clientY - start.current;
      // 引くほど重くなるように(ゴムのような手ごたえ)
      const next = dy > 0 ? Math.min(110, dy * 0.5) : 0;
      pullRef.current = next;
      setPull(next);
    };
    const up = () => {
      if (start.current === null) return;
      start.current = null;
      setTouching(false);
      if (pullRef.current >= THRESHOLD) {
        setBusy(true);
        router.refresh();
        // 読み込みが終わるのを少し待ってから閉じる(すぐ消えると、更新されたか分からない)
        setTimeout(() => {
          setBusy(false);
          setPull(0);
          pullRef.current = 0;
          toast("最新の回答にしました");
        }, 700);
      } else {
        setPull(0);
        pullRef.current = 0;
      }
    };
    window.addEventListener("touchstart", down, { passive: true });
    window.addEventListener("touchmove", move, { passive: true });
    window.addEventListener("touchend", up);
    return () => {
      window.removeEventListener("touchstart", down);
      window.removeEventListener("touchmove", move);
      window.removeEventListener("touchend", up);
    };
  }, [router, busy]);

  const shown = busy ? THRESHOLD : pull;
  const fill = Math.min(1, shown / THRESHOLD);
  return (
    <>
      <div
        aria-hidden={shown === 0}
        className="pointer-events-none fixed inset-x-0 top-0 z-40 flex justify-center"
        style={{ transform: `translateY(${shown - 44}px)`, transition: touching ? "none" : "transform 220ms ease-out" }}
      >
        <span className="mt-2 flex items-center gap-2 rounded-full bg-surface px-3 py-1.5 text-xs font-bold ring-1 ring-white/10">
          {/* グラスにビールが注がれていく(引いた量 = ビールの量) */}
          <svg viewBox="0 0 20 24" className={`h-5 w-4 ${busy ? "anim-wiggle" : ""}`}>
            <clipPath id="ptr-glass">
              <path d="M3 3h14l-1.6 17.5a2 2 0 0 1-2 1.5H6.6a2 2 0 0 1-2-1.5z" />
            </clipPath>
            <rect x="0" y={24 - 21 * fill} width="20" height="24" fill="var(--accent)" clipPath="url(#ptr-glass)" />
            <path d="M3 3h14l-1.6 17.5a2 2 0 0 1-2 1.5H6.6a2 2 0 0 1-2-1.5z" fill="none" stroke="currentColor" strokeWidth="1.6" />
          </svg>
          {busy ? "読み込んでいます" : fill >= 1 ? "はなすと更新" : "引っぱって更新"}
        </span>
      </div>
      {children}
    </>
  );
}
