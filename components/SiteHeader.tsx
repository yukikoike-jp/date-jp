import { House } from "lucide-react";
import Link from "next/link";
import { BackButton } from "./BackButton";
import { Wordmark } from "./Logo";
import { PartiesMenu } from "./PartiesMenu";

// 上のバー。もとにした KANJI と同じく、名前を真ん中に置き、左に戻る・右にあなたの会とホーム。
export function SiteHeader({ children }: { children?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-10 border-b border-white/8 bg-black/95 backdrop-blur-sm">
      <div className="mx-auto max-w-xl px-4 pt-2 pb-2">
        <div className="grid h-11 grid-cols-[5.5rem_1fr_5.5rem] items-center">
          <BackButton />
          <Link href="/" className="justify-self-center" aria-label="Tsudoro のトップ">
            <Wordmark size={24} />
          </Link>
          {/* 右上: あなたの会(調整中・これから・完了)と、ホーム */}
          <div className="-mr-2 flex items-center justify-self-end">
            <PartiesMenu />
            <Link href="/" aria-label="ホーム" className="grid size-11 place-items-center rounded-xl text-stone-400 transition hover:text-white active:scale-95">
              <House className="size-5" aria-hidden />
            </Link>
          </div>
        </div>
        {children}
      </div>
    </header>
  );
}
