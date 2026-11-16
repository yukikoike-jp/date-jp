// お店のページへのリンクが、紹介料の付くリンク(ホットペッパーのアフィリエイト)になっていることを書く。
// 広告だと分かるように書く決まり(ステルスマーケティングの規制)と、ホットペッパーの決まり
// (「#アフィリエイト広告」などと、目立たない表示にしない)に合わせ、本文と同じくらいの大きさ・明るさで出す。
// AFFILIATE_ON は next.config.ts で、AFFILIATE_URL_TEMPLATE が入っているときだけ "1" になる

export function PrNote({ className = "" }: { className?: string }) {
  if (process.env.AFFILIATE_ON !== "1") return null;
  return (
    <p className={`flex items-center gap-1.5 text-xs font-bold text-white/75 ${className}`}>
      <span className="shrink-0 rounded border border-white/50 px-1 text-[11px] leading-4">#アフィリエイト広告</span>
      予約のリンクは提携リンクです
    </p>
  );
}
