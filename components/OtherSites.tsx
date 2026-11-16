import { ExternalLink } from "lucide-react";
import { otherSites } from "@/lib/otherSites";

// お店の一覧の下に置く、ほかの予約サイトへのボタン。提携リンク(広告)なので、見出しにはっきり書く
export function OtherSites({ station }: { station: string | null }) {
  return (
    <div className="mt-5 border-t border-white/10 pt-4">
      <p className="flex items-center gap-2 text-sm font-black">
        ほかの予約サイトでも探す
        <span className="rounded border border-white/40 px-1.5 text-[11px] font-bold leading-5 text-white/80">#アフィリエイト広告</span>
      </p>
      <div className="mt-2 grid gap-2">
        {otherSites(station).map((s) => (
          <a
            key={s.key}
            href={s.href}
            target="_blank"
            rel="nofollow sponsored noopener"
            className="flex min-h-14 items-center gap-3 rounded-2xl bg-surface-2 px-4 py-2.5 ring-1 ring-white/10 transition active:scale-[0.98]"
          >
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold">{s.label}</span>
              <span className="block text-xs text-muted">{s.note}</span>
            </span>
            <ExternalLink className="size-4 shrink-0 text-muted" aria-hidden />
          </a>
        ))}
      </div>
    </div>
  );
}
