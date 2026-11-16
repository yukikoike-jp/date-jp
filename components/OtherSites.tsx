import { ExternalLink, PartyPopper, Sparkles } from "lucide-react";
import type { OtherSite } from "@/lib/otherSites";

// ほかの予約サイトを、お店の候補の1つとして一覧に並べる。
// 提携リンク(広告)なので、ステルスマーケティングにならないよう、カードに小さく「PR」を付ける
export function OtherSiteCandidate({ site: s, station, partyId }: { site: OtherSite; station: string | null; partyId: string }) {
  // /out を通して押された数を数える。「お店を探す」(partyId = "search")からは会の id を付けない
  const q = new URLSearchParams();
  if (station) q.set("s", station);
  if (partyId !== "search") q.set("p", partyId);
  const href = `/out/${s.key}${q.size ? `?${q}` : ""}`;
  const Icon = s.key === "ikyu" ? Sparkles : PartyPopper;
  return (
    <li className="relative rounded-2xl border border-border p-4">
      <a href={href} target="_blank" rel="nofollow sponsored noopener" className="flex items-start gap-3">
        <span className="grid size-16 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-accent/30 to-accent/5 ring-1 ring-accent/30">
          <Icon className="size-7 text-accent" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="font-black">{s.label}</span>
            <span className="shrink-0 rounded border border-white/30 px-1 text-[10px] leading-4 text-white/60">PR</span>
          </span>
          <span className="mt-0.5 block text-xs text-muted">{s.note}</span>
          <span className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-accent">
            候補を見る
            <ExternalLink className="size-3.5" aria-hidden />
          </span>
        </span>
      </a>
    </li>
  );
}
