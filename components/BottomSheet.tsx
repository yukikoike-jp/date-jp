"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

// 画面の下から出てくるシート。スマホの親指で押しやすい位置に、確かめる文とボタンを出す。
// 後ろの暗い部分を押すか、Esc で閉じる。開いているあいだは、後ろの画面がスクロールしない。
// ページの動き(transform)の内側に置くと画面の下に貼り付かないので、body の直下に出す(portal)

export function BottomSheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    panel.current?.focus();
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="presentation">
      <button type="button" aria-label="閉じる" onClick={onClose} className="anim-fade absolute inset-0 bg-black/60" />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="anim-sheet relative w-full max-w-xl rounded-t-3xl border-t border-white/10 bg-surface px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] outline-none"
      >
        <span aria-hidden className="mx-auto block h-1.5 w-10 rounded-full bg-white/20" />
        <h2 className="mt-4 text-lg font-black">{title}</h2>
        <div className="mt-3">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
