"use client";

import { useEffect, useId, useRef, useState } from "react";

// 指でくるくる回して選ぶ、ドラムのような選び方(iPhone の時刻合わせのような形)。
// 真ん中の帯に止まった値に決まる。真ん中から離れた行ほど、奥へ倒れて小さく見える。
// 回せない人のために、行を押しても、矢印キーでも選べる

const ROW = 48;
const VISIBLE = 5;

export function WheelPicker<T extends number>({
  label,
  value,
  options,
  onChange,
  initial,
}: {
  label: string;
  /** まだ選んでいないときは 0(そのときは initial の位置で待つ) */
  value: T | 0;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  /** まだ選んでいないときに、真ん中に出しておく値 */
  initial: T;
}) {
  const box = useRef<HTMLDivElement>(null);
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 本人が触ってから回ったときだけ決める(最初に位置を合わせる動きでは決めない)
  const touched = useRef(false);
  const [scroll, setScroll] = useState(0);
  const id = useId();
  const chosen = options.findIndex((o) => o.value === value);
  const startIndex = chosen >= 0 ? chosen : Math.max(0, options.findIndex((o) => o.value === initial));

  // 最初の位置に回しておく(まだ選んでいないときは、よくある値の位置)
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    el.scrollTop = startIndex * ROW;
    setScroll(el.scrollTop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pick = (i: number, smooth = true) => {
    touched.current = true;
    const el = box.current;
    const idx = Math.max(0, Math.min(options.length - 1, i));
    if (el) el.scrollTo({ top: idx * ROW, behavior: smooth ? "smooth" : "auto" });
    onChange(options[idx].value);
  };

  const center = Math.round(scroll / ROW);
  return (
    <div className="relative">
      <div
        ref={box}
        role="listbox"
        aria-label={label}
        aria-activedescendant={chosen >= 0 ? `${id}-${chosen}` : undefined}
        tabIndex={0}
        onScroll={(e) => {
          const top = e.currentTarget.scrollTop;
          setScroll(top);
          // 回し終わって止まったところで決める
          if (!touched.current) return;
          if (settle.current) clearTimeout(settle.current);
          settle.current = setTimeout(() => {
            const i = Math.round(top / ROW);
            if (options[i] && options[i].value !== value) onChange(options[i].value);
          }, 140);
        }}
        onPointerDown={() => (touched.current = true)}
        onTouchStart={() => (touched.current = true)}
        onWheel={() => (touched.current = true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            pick(center + 1);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            pick(center - 1);
          }
        }}
        className="no-scrollbar relative snap-y snap-mandatory overflow-y-scroll overscroll-contain rounded-2xl bg-white/6 ring-1 ring-white/10 outline-none focus-visible:ring-2 focus-visible:ring-accent [perspective:600px]"
        style={{ height: ROW * VISIBLE }}
      >
        <div style={{ height: ROW * Math.floor(VISIBLE / 2) }} aria-hidden />
        {options.map((o, i) => {
          const d = i - scroll / ROW;
          const near = Math.abs(d) < 3.2;
          return (
            <div
              key={o.value}
              id={`${id}-${i}`}
              role="option"
              aria-selected={i === chosen}
              onClick={() => pick(i)}
              className={`flex snap-center items-center justify-center font-black tabular-nums transition-colors ${
                i === center ? (chosen === i ? "text-2xl text-accent" : "text-2xl text-white") : "text-lg text-white/45"
              }`}
              style={{
                height: ROW,
                // ドラムの側面のように、真ん中から離れるほど奥へ倒す
                transform: near ? `rotateX(${Math.max(-70, Math.min(70, -d * 22))}deg) scale(${1 - Math.min(0.25, Math.abs(d) * 0.08)})` : undefined,
                opacity: near ? 1 - Math.min(0.75, Math.abs(d) * 0.22) : 0,
              }}
            >
              {o.label}
            </div>
          );
        })}
        <div style={{ height: ROW * Math.floor(VISIBLE / 2) }} aria-hidden />
      </div>
      {/* 真ん中の帯。ここに止まった値に決まる */}
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-x-2 rounded-xl border-y-2 ${chosen >= 0 ? "border-accent/70 bg-accent/10" : "border-white/25 bg-white/5"}`}
        style={{ top: ROW * Math.floor(VISIBLE / 2), height: ROW }}
      />
      <p className="mt-2 text-center text-xs font-bold text-muted">{chosen >= 0 ? "✓ 決まりました(回すと変えられます)" : "回して、真ん中に合わせてください"}</p>
    </div>
  );
}
