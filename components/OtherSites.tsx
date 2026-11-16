"use client";

import { ExternalLink } from "lucide-react";
import { useState } from "react";
import type { OtherSite } from "@/lib/otherSites";

// ほかの予約サイトへのボタン。提携リンク(広告)なので、見出しにはっきり書く。
// top = お店の一覧の上に出すとき(会社の会・予算が高めの会)。見出しの言い方を変える
export function OtherSites({ sites, top = false }: { sites: OtherSite[]; top?: boolean }) {
  return (
    <div className={top ? "mb-5 border-b border-white/10 pb-5" : "mt-5 border-t border-white/10 pt-4"}>
      <p className="flex flex-wrap items-center gap-2 text-sm font-black">
        {top ? "ちょっといいお店なら、こちらも" : "ほかの予約サイトでも探す"}
        <span className="rounded border border-white/40 px-1.5 text-[11px] font-bold leading-5 text-white/80">#アフィリエイト広告</span>
      </p>
      <div className="mt-2 grid gap-2">
        {sites.map((s) => (
          <SiteCard key={s.key} site={s} />
        ))}
      </div>
    </div>
  );
}

function SiteCard({ site: s }: { site: OtherSite }) {
  // 提携先の広告の画像。読めないとき・審査中で 1×1 の画像が返るときは、画像の場所ごと出さない
  const [bannerOk, setBannerOk] = useState(false);
  return (
    <div className="overflow-hidden rounded-2xl bg-surface-2 ring-1 ring-white/10">
      <a
        href={s.banner.href}
        target="_blank"
        rel="nofollow sponsored noopener"
        className={bannerOk ? "block bg-white" : "hidden"}
        aria-hidden={!bannerOk}
        tabIndex={bannerOk ? undefined : -1}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- 提携先の配信する画像をそのまま出す決まり */}
        <img
          src={s.banner.img}
          alt=""
          className="mx-auto block h-auto w-full max-w-[300px]"
          onLoad={(e) => setBannerOk(e.currentTarget.naturalWidth > 1)}
        />
      </a>
      <a
        href={s.href}
        target="_blank"
        rel="nofollow sponsored noopener"
        className="flex min-h-14 items-center gap-3 px-4 py-2.5 transition active:scale-[0.98]"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold">{s.label}</span>
          <span className="block text-xs text-muted">{s.note}</span>
        </span>
        <ExternalLink className="size-4 shrink-0 text-muted" aria-hidden />
      </a>
    </div>
  );
}
