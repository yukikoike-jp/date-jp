"use client";

import { Beef, Beer, ChefHat, Check, Cigarette, CookingPot, DoorClosed, Fish, Flame, MapPin, Martini, MicVocal, SlidersHorizontal, Soup, TrainFront, Utensils, UtensilsCrossed, Wallet, Wine } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { findShops } from "@/app/actions";
import { loadAudience, type Audience } from "@/lib/audience";
import { GENRES, SECOND_GENRES, yen, type GenreKey, type SecondGenreKey } from "@/lib/sendai";
import type { Shop } from "@/lib/shops";
import type { Station } from "@/lib/stations";
import { SkeletonShops } from "./Skeleton";
import { ShopList } from "./ShopList";
import { StationPicker } from "./StationPicker";
import { LABEL } from "./ui";

// お店を探す。条件を押すたびに、その場で絞りこむ(探すボタンは置かない)。
// 選択肢は横にすべらせず、折り返して全部見えるように並べる。場所は駅を1つ選ぶ(全国)。
// 料理はいくつでも選べる(印を四角にして、1つだけ選ぶ予算と見分ける)

function Option({
  on,
  onClick,
  title,
  note,
  compact,
  multi,
  icon,
}: {
  on: boolean;
  onClick: () => void;
  title: React.ReactNode;
  note?: string;
  /** 3つ並べるときは丸の印を省き、文字を真ん中に寄せる */
  compact?: boolean;
  /** いくつでも選べる選択肢。印を四角にする */
  multi?: boolean;
  /** 料理・お金の絵(線の絵。アプリのほかのマークとそろえる。2026-11-22) */
  icon?: React.ReactNode;
}) {
  // 3つ並べる札は、✓を右上に重ねる(✓を文字の横に置くと、長い名前(ダイニングバー)がずれるため)
  if (compact) {
    return (
      <button
        type="button"
        aria-pressed={on}
        onClick={onClick}
        className={`relative flex flex-col items-center justify-center gap-1 rounded-2xl border px-1 text-center transition-colors ${icon ? "min-h-[4.5rem] py-2" : "min-h-12 py-2"} ${
          on ? "border-accent bg-accent text-accent-text" : "border-border bg-surface-2 text-text hover:border-muted"
        }`}
      >
        {on && <Check className="absolute top-1.5 right-1.5 size-3.5" strokeWidth={3} aria-hidden />}
        {icon && (
          <span aria-hidden className={`flex h-6 items-center ${on ? "" : "text-accent"}`}>
            {icon}
          </span>
        )}
        <span className="block text-[13px] font-bold tracking-tight whitespace-nowrap">{title}</span>
      </button>
    );
  }
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`flex min-h-12 items-center gap-2 rounded-2xl border py-2 transition-colors ${
        compact ? "justify-center px-1 text-center" : "px-3 text-left"
      } ${on ? "border-accent bg-accent text-accent-text" : "border-border bg-surface-2 text-text hover:border-muted"}`}
    >
      {compact ? (
        on && <Check className="size-3.5 shrink-0" aria-hidden />
      ) : (
        <span
          aria-hidden
          className={`grid size-5 shrink-0 place-items-center border ${multi ? "rounded-md" : "rounded-full"} ${on ? "border-accent-text" : "border-border"}`}
        >
          {on && <Check className="size-3.5" />}
        </span>
      )}
      <span className="min-w-0 leading-tight">
        <span className="block text-sm font-bold tracking-tight whitespace-nowrap">{title}</span>
        {note && <span className={`block text-[11px] ${on ? "opacity-75" : "text-muted"}`}>{note}</span>}
      </span>
    </button>
  );
}

const SHOP_BUDGETS = [2000, 3000, 4000, 5000, 6000, 8000];

/** お好み焼きを返すヘラ(コテ)。lucide にないので、同じ線の太さで描く */
function Hera({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M9 9.5 15 15.5 9.5 21 3 14.5Z" />
      <path d="M12 12.5 19.5 5" />
      <path d="M18 3l3 3" />
    </svg>
  );
}

/** たこ焼きのタコ */
function Tako({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M6 13v-2a6 6 0 0 1 12 0v2" />
      <path d="M6 13c0 3-1.5 4.5-3 5.5" />
      <path d="M9.5 14c0 3-.5 5-2 7" />
      <path d="M14.5 14c0 3 .5 5 2 7" />
      <path d="M18 13c0 3 1.5 4.5 3 5.5" />
      <path d="M10 10h.01" />
      <path d="M14 10h.01" />
    </svg>
  );
}

/** 料理の絵(2026-11-22。絵文字は AI っぽく見えるので、アプリのほかのマークと同じ線の絵にする) */
const ICON = "size-6";
const GENRE_ICON: Record<string, React.ReactNode> = {
  izakaya: <Beer className={ICON} />,
  washoku: <Fish className={ICON} />,
  yoshoku: <Utensils className={ICON} />,
  chuka: <CookingPot className={ICON} />,
  yakiniku: <Beef className={ICON} />,
  bar: <Wine className={ICON} />,
  sosaku: <ChefHat className={ICON} />,
  ethnic: <Soup className={ICON} />,
  indian: <Flame className={ICON} />,
  okonomiyaki: <Hera className={ICON} />,
  takoyaki: <Tako className={ICON} />,
};
const SECOND_ICON: Record<string, React.ReactNode> = {
  izakaya: <Beer className={ICON} />,
  bar: <Martini className={ICON} />,
  karaoke: <MicVocal className={ICON} />,
};
/** 予算の高さ。¥ の数で見せる(3段。使わない ¥ はうすく) */
function YenLevel({ budget }: { budget: number }) {
  const level = budget <= 3000 ? 1 : budget <= 5000 ? 2 : 3;
  return (
    <span className="text-[17px] font-bold tracking-wide">
      {[1, 2, 3].map((i) => (
        <span key={i} className={i <= level ? "" : "opacity-25"}>
          ¥
        </span>
      ))}
    </span>
  );
}

export function ShopSearch() {
  const [audience, setAudience] = useState<Audience | null>(null);
  // 駅は最初は選ばない(選ぶまではお店を出さない)。いくつでも(3つまで)選べる(2026-11-21)
  const [stations, setStations] = useState<Station[]>([]);
  const station = stations[0] ?? null;
  const stationNames = stations.map((s) => `${s.name}駅`).join("・");
  const [genres, setGenres] = useState<GenreKey[]>([]);
  const [budget, setBudget] = useState<number | null>(null);
  const [privateRoom, setPrivateRoom] = useState(false);
  const [freeDrink, setFreeDrink] = useState(false);
  // 社会人の会は、上司がタバコを吸えるかどうかが大事なので、吸えるお店だけに絞れるようにする
  const [smoking, setSmoking] = useState(false);
  // 二次会向け(遅くまで開いているお店)。一次会か二次会かを、最初に選ぶ
  const [second, setSecond] = useState(false);
  const [secondGenre, setSecondGenre] = useState<SecondGenreKey | null>(null);
  const [result, setResult] = useState<{ shops: Shop[]; otherArea: boolean; relaxed: string | null } | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    const a = loadAudience() ?? "private";
    /* eslint-disable react-hooks/set-state-in-effect */
    setAudience(a);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // 条件が変わるたびに探し直す
  useEffect(() => {
    if (!audience) return;
    if (!station) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResult(null);
      return;
    }
    start(async () => {
      setResult(await findShops({ station, stations, genres, budget, privateRoom, freeDrink, smoking: audience !== null && smoking, second: second ? { genre: secondGenre } : null, audience }));
    });
  }, [station, stations, genres, budget, privateRoom, freeDrink, smoking, second, secondGenre, audience]);

  const toggleGenre = (k: GenreKey) =>
    setGenres((cur) => (cur.includes(k) ? cur.filter((g) => g !== k) : [...cur, k]));

  const summary = [
    station ? stationNames : "場所はまだ",
    second ? "二次会向け" : null,
    second ? (secondGenre ? SECOND_GENRES.find((g) => g.key === secondGenre)!.label : null) : budget === null ? "予算は決めない" : `${yen(budget)}まで`,
    !second && genres.length > 0 ? genres.map((k) => GENRES.find((g) => g.key === k)!.label).join("・") : null,
    !second && privateRoom ? "個室あり" : null,
    !second && freeDrink ? "飲み放題あり" : null,
    !second && audience !== null && smoking ? "喫煙できる" : null,
  ]
    .filter(Boolean)
    .join(" / ");

  return (
    <>
      <div id="filters" className="mx-4 overflow-hidden rounded-3xl border panel">
        <fieldset className="border-b border-border px-4 py-5">
          <legend className="sr-only">場所</legend>
          <p className={LABEL} aria-hidden>
            <MapPin className="size-4" />
            どこで飲む?
            <span className="ml-auto text-xs font-normal">3つまで選べます</span>
          </p>
          <StationPicker value={station} onChange={(s) => setStations(s ? [s] : [])} multi={stations} onMultiChange={setStations} anyLabel={null} quick />
          {/* 一次会か二次会か。二次会向けは、23時以降も開いているお店だけを出す */}
          <div className="mt-3 grid grid-cols-2 gap-2" role="group" aria-label="何次会">
            <Option compact on={!second} onClick={() => setSecond(false)} title="一次会向け" />
            <Option compact on={second} onClick={() => setSecond(true)} title="二次会向け" />
          </div>
          {second && <p className="mt-2 text-xs text-muted">23時以降も開いているお店だけを表示</p>}
        </fieldset>

        {second ? (
          <fieldset className="px-4 py-5">
            <legend className="sr-only">二次会のお店の種類</legend>
            <p className={LABEL} aria-hidden>
              <UtensilsCrossed className="size-4" />
              どんなお店?
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Option compact icon={<UtensilsCrossed className={ICON} />} on={secondGenre === null} onClick={() => setSecondGenre(null)} title="なんでも" />
              {SECOND_GENRES.map((g) => (
                <Option compact icon={SECOND_ICON[g.key]} key={g.key} on={secondGenre === g.key} onClick={() => setSecondGenre(g.key)} title={g.label} />
              ))}
            </div>
          </fieldset>
        ) : (
          <>
        <fieldset className="border-b border-border px-4 py-5">
          <legend className="sr-only">1人の予算</legend>
          <p className={LABEL} aria-hidden>
            <Wallet className="size-4" />
            1人いくらまで?
            <span className="ml-auto text-xs font-normal">もう一度押すと外れます</span>
          </p>
          <div className="grid grid-cols-3 gap-2">
            {/* 2・3・4・5・6・8千円の6つ(3つずつ2段)。選んだものをもう一度押すと「決めない」に戻る */}
            {SHOP_BUDGETS.map((b) => (
              <Option compact icon={<YenLevel budget={b} />} key={b} on={budget === b} onClick={() => setBudget(budget === b ? null : b)} title={`〜${yen(b)}`} />
            ))}
          </div>
        </fieldset>

        <fieldset className="border-b border-border px-4 py-5">
          <legend className="sr-only">料理</legend>
          <p className={LABEL} aria-hidden>
            <UtensilsCrossed className="size-4" />
            何を食べる?
            <span className="ml-auto text-xs font-normal">いくつでも選べます</span>
          </p>
          <div className="grid grid-cols-3 gap-2">
            <Option compact icon={<UtensilsCrossed className={ICON} />} on={genres.length === 0} onClick={() => setGenres([])} title="なんでも" />
            {GENRES.map((g) => (
              <Option compact multi icon={GENRE_ICON[g.key]} key={g.key} on={genres.includes(g.key)} onClick={() => toggleGenre(g.key)} title={g.label} />
            ))}
          </div>
        </fieldset>

        <div className="space-y-2 px-4 py-4">
          <Option
            on={privateRoom}
            onClick={() => setPrivateRoom(!privateRoom)}
            title={
              <span className="inline-flex items-center gap-1.5">
                <DoorClosed className="size-4" aria-hidden />
                個室があるお店だけにする
              </span>
            }
          />
          <Option
            on={freeDrink}
            onClick={() => setFreeDrink(!freeDrink)}
            title={
              <span className="inline-flex items-center gap-1.5">
                <Beer className="size-4" aria-hidden />
                飲み放題があるお店だけにする
              </span>
            }
          />
          {audience !== null && (
            <Option
              on={smoking}
              onClick={() => setSmoking(!smoking)}
              note="分煙のお店も含みます。"
              title={
                <span className="inline-flex items-center gap-1.5">
                  <Cigarette className="size-4" aria-hidden />
                  タバコが吸えるお店だけにする
                </span>
              }
            />
          )}
        </div>
          </>
        )}
      </div>

      {/* いまの条件と見つかった数を、結果の上に固定して出す */}
      <div className="sticky top-14 z-[5] mt-4 border-y border-border bg-bg/95 px-4 py-2.5 backdrop-blur" aria-live="polite">
        <div className="flex items-center gap-3">
          <p className="min-w-0 flex-1 text-sm">
            <span className="block truncate font-bold">{summary}</span>
            <span className="block text-xs text-muted">
              {pending ? "検索中" : result ? `${result.shops.length}軒` : ""}
            </span>
          </p>
          <a href="#filters" className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-bold">
            <SlidersHorizontal className="size-3.5" aria-hidden />
            条件を変える
          </a>
        </div>
      </div>

      <div className="mt-4" aria-busy={pending}>
        {!station && (
          <div id="shops" className="mx-4 flex flex-col items-center rounded-3xl border border-dashed border-white/12 px-5 py-8 text-center">
            <span className="grid size-12 place-items-center rounded-2xl bg-accent/12 text-accent ring-1 ring-accent/30">
              <TrainFront className="size-6" aria-hidden />
            </span>
            <p className="mt-3 text-sm font-bold text-white/85">まずは駅を選んでください</p>
            <p className="mt-1 text-xs text-muted">近くの飲み会向けのお店がここに出ます。</p>
            <a href="#filters" className="mt-4 inline-flex min-h-10 items-center rounded-full border border-border px-4 text-xs font-bold">
              駅を選ぶ
            </a>
          </div>
        )}
        {/* 探しているあいだは、お店のカードの形だけを先に出す */}
        {station && pending && <SkeletonShops />}
        {station && result && !pending &&
          (result.shops.length > 0 ? (
            <>
              <ShopList partyId="search" heading="見つかったお店" lead={result.otherArea ? undefined : `${stationNames}の近くで、選んだ条件に合うお店`} shops={result.shops} otherArea={result.otherArea} relaxed={result.relaxed} scene={{ audience, budget }} />
            </>
          ) : (
            <p id="shops" className="mx-4 rounded-3xl border panel px-5 py-6 text-sm text-muted">
              合うお店が見つかりませんでした。予算や料理の条件をゆるめると出てきます。
            </p>
          ))}
      </div>
    </>
  );
}
