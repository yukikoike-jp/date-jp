"use client";

import { Check } from "lucide-react";
import { useSyncExternalStore } from "react";

// 画面の下に、短い知らせ(「保存しました」「コピーしました」など)を少しのあいだ出す。
// どこからでも toast("…") で呼べる。「元に戻す」のようなボタンを1つ付けられる。
// 画面の読み上げにも伝わるよう、aria-live で知らせる

type Action = { label: string; onClick: () => void };
type Item = { id: number; text: string; action?: Action };

let items: Item[] = [];
let seq = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function dismissToast(id: number) {
  items = items.filter((t) => t.id !== id);
  emit();
}

/** 知らせを出す。ボタンがあるときは長めに出す */
export function toast(text: string, action?: Action): number {
  const id = ++seq;
  items = [...items, { id, text, action }].slice(-3);
  emit();
  setTimeout(() => dismissToast(id), action ? 6000 : 2600);
  return id;
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const EMPTY: Item[] = [];

export function ToastHost() {
  const list = useSyncExternalStore(subscribe, () => items, () => EMPTY);
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
    >
      {list.map((t) => (
        <div
          key={t.id}
          role="status"
          className="anim-toast pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl bg-stone-100 px-4 py-3 text-sm font-bold text-stone-900 shadow-2xl shadow-black/60"
        >
          <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent text-accent-text">
            <Check className="size-4" strokeWidth={3} aria-hidden />
          </span>
          <span className="min-w-0 flex-1">{t.text}</span>
          {t.action && (
            <button
              type="button"
              onClick={() => {
                t.action!.onClick();
                dismissToast(t.id);
              }}
              className="min-h-9 shrink-0 rounded-lg px-2 text-sm font-black text-amber-700 underline underline-offset-2"
            >
              {t.action.label}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
