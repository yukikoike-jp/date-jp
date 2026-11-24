import { ExternalLink } from "lucide-react";
import { pickAd } from "@/lib/ads";

// お店選びの画面の広告の枠。「こういうのどうですか?」と、お店の候補とは分けて1つだけ出す。
// 広告がないあいだは何も出さない(開発中だけ、枠の場所が分かる点線を出す)

export function AdSlot({ slotKey, className = "" }: { slotKey: string; className?: string }) {
  const ad = pickAd(slotKey);
  if (!ad) {
    if (process.env.NODE_ENV === "production") return null;
    return (
      <div className={`rounded-2xl border border-dashed border-white/25 px-4 py-5 text-center text-xs text-muted ${className}`}>
        広告の枠(lib/ads.ts の ADS に足すとここに出ます)
      </div>
    );
  }
  return (
    <aside aria-label="広告" className={`rounded-2xl border border-border p-4 ${className}`}>
      <a href={ad.href} target="_blank" rel="nofollow sponsored noopener" className="block">
        <span className="flex items-center gap-1.5 text-[11px] text-white/60">
          <span className="shrink-0 rounded border border-white/50 px-1 leading-4">PR</span>
          こういうのはどうですか?
          <span className="ml-auto truncate">提供: {ad.sponsor}</span>
        </span>
        <span className="mt-2 block font-black">{ad.title}</span>
        <span className="mt-0.5 block text-xs text-muted">{ad.body}</span>
        <span className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-accent">
          {ad.cta}
          <ExternalLink className="size-3.5" aria-hidden />
        </span>
      </a>
    </aside>
  );
}
