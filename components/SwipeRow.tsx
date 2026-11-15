"use client";

import { Trash2 } from "lucide-react";
import { useRef, useState } from "react";

// 左にスワイプすると、うしろから「外す」のボタンが出る行。
// 指を離したとき、半分以上引いていればボタンが出たまま止まり、少しなら元に戻る。
// スワイプできない人のために、行を長押し・右クリックでも開ける

const OPEN = 88;

export function SwipeRow({ children, onAction, actionLabel = "外す" }: { children: React.ReactNode; onAction: () => void; actionLabel?: string }) {
  const [x, setX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const start = useRef<{ x: number; y: number; base: number } | null>(null);
  const horizontal = useRef<boolean | null>(null);

  return (
    <div className="relative overflow-hidden rounded-2xl">
      <button
        type="button"
        onClick={() => {
          setX(0);
          onAction();
        }}
        tabIndex={x === 0 ? -1 : 0}
        aria-hidden={x === 0}
        className="absolute inset-y-0 right-0 flex w-[88px] flex-col items-center justify-center gap-1 bg-red-500/90 text-xs font-black text-white"
      >
        <Trash2 className="size-5" aria-hidden />
        {actionLabel}
      </button>
      <div
        className="relative touch-pan-y"
        style={{ transform: `translateX(${x}px)`, transition: dragging ? "none" : "transform 240ms cubic-bezier(0.2, 0.9, 0.3, 1)" }}
        onTouchStart={(e) => {
          start.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, base: x };
          horizontal.current = null;
        }}
        onTouchMove={(e) => {
          if (!start.current) return;
          const dx = e.touches[0].clientX - start.current.x;
          const dy = e.touches[0].clientY - start.current.y;
          // 縦のスクロールと取り合わないよう、最初に横へ動いたときだけスワイプとして扱う
          if (horizontal.current === null && Math.abs(dx) + Math.abs(dy) > 8) horizontal.current = Math.abs(dx) > Math.abs(dy);
          if (!horizontal.current) return;
          setDragging(true);
          setX(Math.max(-OPEN - 24, Math.min(0, start.current.base + dx)));
        }}
        onTouchEnd={() => {
          setDragging(false);
          start.current = null;
          setX((v) => (v < -OPEN / 2 ? -OPEN : 0));
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          setX((v) => (v === 0 ? -OPEN : 0));
        }}
        onClickCapture={(e) => {
          // ボタンが出ているときに行を押したら、開かずに元に戻すだけにする
          if (x !== 0) {
            e.preventDefault();
            e.stopPropagation();
            setX(0);
          }
        }}
      >
        {children}
      </div>
    </div>
  );
}
