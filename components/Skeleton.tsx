// 読み込み中に、これから出る中身の形だけを先に見せる(スケルトン)。
// 「読み込んでいます…」の文字だけより、待ち時間が短く感じられ、画面がガタつかない

export function SkeletonBlock({ className = "" }: { className?: string }) {
  return <span aria-hidden className={`skeleton block rounded-lg ${className}`} />;
}

/** 行の形(アイコン・見出し・説明)。count 行ぶん並べる */
export function SkeletonRows({ count = 3, label = "読み込んでいます" }: { count?: number; label?: string }) {
  return (
    <div role="status" aria-label={label} className="space-y-2">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-2xl bg-surface px-4 py-3.5 ring-1 ring-white/8">
          <SkeletonBlock className="size-9 shrink-0 rounded-xl" />
          <span className="flex-1 space-y-2">
            <SkeletonBlock className="h-3.5 w-3/5" />
            <SkeletonBlock className="h-3 w-2/5" />
          </span>
        </div>
      ))}
    </div>
  );
}

/** お店のカードの形 */
export function SkeletonShops({ count = 3 }: { count?: number }) {
  return (
    <div role="status" aria-label="お店を探しています" className="mx-4 space-y-3 rounded-3xl border panel px-4 py-6">
      <SkeletonBlock className="h-5 w-32" />
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex gap-3 rounded-2xl border border-border p-3">
          <SkeletonBlock className="size-20 shrink-0 rounded-xl" />
          <span className="flex-1 space-y-2 pt-1">
            <SkeletonBlock className="h-4 w-4/5" />
            <SkeletonBlock className="h-3 w-3/5" />
            <SkeletonBlock className="h-3 w-2/5" />
          </span>
        </div>
      ))}
    </div>
  );
}
