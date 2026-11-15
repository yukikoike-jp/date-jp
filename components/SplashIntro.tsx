import { CutGlass, ICON_BG, Sparks } from "./Logo";

// 起動の演出(約3.2秒)
// アイコンと同じ切り絵のグラスが、左右から勢いよく飛んできて、真ん中で乾杯する。
// 飛んでくる間にビールが注がれ、ぶつかった瞬間に画面が揺れて光り、「カチン」の線が出る。
// 止まった絵は、アイコン(components/Logo.tsx の LogoMark)とまったく同じ。その下から「Tsudoro」がせり上がる。
// 動きは globals.css の .intro-* に置く。動きを減らす設定の人には出さない(HomeClient で判定)

const NAME = "Tsudoro";

// 乾杯の瞬間の集中線。角度だけ決めておく
const LINES = [-150, -120, -90, -60, -30, 30, 150];

export function SplashIntro({ onSkip }: { onSkip: () => void }) {
  return (
    <button
      type="button"
      onClick={onSkip}
      aria-label="はじめる"
      className="intro-root fixed inset-0 z-50 cursor-default overflow-hidden bg-bg"
    >
      <span aria-hidden className="intro-flash pointer-events-none absolute inset-0" />

      <span className="intro-stage absolute inset-0 flex flex-col items-center justify-center">
        <span className="relative grid place-items-center">
          <span aria-hidden className="absolute top-[38%] left-1/2">
            {LINES.map((deg) => (
              <span key={deg} className="intro-line absolute h-[3px] w-20 origin-left rounded-full bg-text" style={{ rotate: `${deg}deg` }} />
            ))}
          </span>
          {/* アイコンと同じ絵。四角い地も、アイコンと同じ色と角の丸み */}
          <svg viewBox="0 0 200 200" className="relative size-48 overflow-visible" aria-hidden>
            <rect className="intro-tile" width="200" height="200" rx="50" fill={ICON_BG} />
            <g className="intro-k-left">
              <CutGlass side="left" beerClass="intro-k-beer" foamClass="intro-k-foam" />
            </g>
            <g className="intro-k-right">
              <CutGlass side="right" beerClass="intro-k-beer" foamClass="intro-k-foam" />
            </g>
            <Sparks className="intro-k-spark" />
          </svg>
        </span>

        <span className="relative mt-4 flex flex-col items-center">
          <span aria-hidden className="intro-slash absolute top-0 h-px w-[min(80vw,26rem)] bg-accent" />
          <span className="flex overflow-hidden pt-3" aria-hidden>
            {NAME.split("").map((c, i) => (
              <span
                key={i}
                className="intro-letter inline-block font-logo text-6xl font-bold tracking-[-0.02em] text-text"
                style={{ animationDelay: `${1.25 + i * 0.05}s` }}
              >
                {c}
              </span>
            ))}
          </span>
        </span>

        <span className="sr-only">{NAME}</span>
      </span>
    </button>
  );
}
