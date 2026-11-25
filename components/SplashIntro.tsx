// 起動の演出(約3.2秒)
// 左右から金の線で描いたグラスが勢いよく飛んできて、真ん中で乾杯する。
// ぶつかった瞬間に画面が揺れて光り、グラスは乾杯したところで止まる(止まった姿がアイコンと同じ)。
// その下から「Tsudoro」がせり上がる。
// 動きは globals.css の .intro-* に置く。動きを減らす設定の人には出さない(HomeClient で判定)

const NAME = "Tsudoro";

// 乾杯の瞬間の集中線。角度だけ決めておく
const LINES = [-150, -120, -90, -60, -30, 30, 150];

function Glass({ side }: { side: "left" | "right" }) {
  // ビールは、グラデーションではなく、ふつうの琥珀色(上が少し明るく、下が深い)のベタ塗りに、白い泡と小さな気泡。
  // 光沢の筋は入れず、色はくすんだ琥珀に寄せる(つるつるの「AIっぽい」黄色にならないように)
  return (
    <svg viewBox="0 0 60 90" className="h-32 w-[5.4rem]" aria-hidden style={side === "right" ? { transform: "scaleX(-1)" } : undefined}>
      <defs>
        <clipPath id={`intro-glass-${side}`}>
          <path d="M10 18h40l-4 60a6 6 0 0 1-6 6H20a6 6 0 0 1-6-6z" />
        </clipPath>
      </defs>
      <g clipPath={`url(#intro-glass-${side})`}>
        <g className="intro-pour">
          <rect x="6" y="30" width="48" height="60" fill="#dc9413" />
          <rect x="6" y="58" width="48" height="32" fill="#cf8710" />
          {/* 気泡 */}
          <g fill="#f6d27a" opacity="0.75">
            <circle cx="22" cy="68" r="1.1" />
            <circle cx="33" cy="56" r="0.9" />
            <circle cx="40" cy="70" r="1.3" />
            <circle cx="28" cy="46" r="0.8" />
            <circle cx="37" cy="40" r="0.9" />
          </g>
          {/* 泡(ふちはまるく波うたせる) */}
          <path
            d="M8 22h44v8c-3 3-6 3-9 0-3 4-6 4-9 0-3 4-6 4-9 0-3 3-6 3-9 0-3 2-6 2-8 0z"
            fill="#fbf1d3"
          />
        </g>
      </g>
      <path
        d="M10 18h40l-4 60a6 6 0 0 1-6 6H20a6 6 0 0 1-6-6z"
        fill="none"
        stroke="var(--text)"
        strokeWidth="3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SplashIntro({ onSkip }: { onSkip: () => void }) {
  return (
    <button
      type="button"
      onClick={onSkip}
      aria-label="はじめる"
      className="intro-root fixed inset-0 z-50 cursor-default overflow-hidden bg-bg"
    >
      <span aria-hidden className="intro-flash pointer-events-none absolute inset-0" />
      {/* アイコンと同じ、うしろの金の光と細い円。乾杯の瞬間に広がる */}
      <span aria-hidden className="intro-glow pointer-events-none absolute top-1/2 left-1/2 size-[min(92vw,30rem)] -translate-x-1/2 -translate-y-[58%] rounded-full" />

      <span className="intro-stage absolute inset-0 flex flex-col items-center justify-center">
        {/* 乾杯するグラス。止まった姿はアイコン(components/Logo.tsx)と同じ */}
        <span className="relative grid h-36 w-72 place-items-center">
          <span aria-hidden className="absolute top-1/2 left-1/2">
            {LINES.map((deg) => (
              <span key={deg} className="intro-line absolute h-[3px] w-20 origin-left rounded-full bg-text" style={{ rotate: `${deg}deg` }} />
            ))}
          </span>
          {/* 乾杯の瞬間に出て、そのまま残る金の「カチン」の線(アイコンと同じ) */}
          <svg viewBox="0 0 60 30" className="intro-spark absolute -top-7 left-1/2 w-16 -translate-x-1/2" aria-hidden>
            <path d="M30 2v14M16 6l6 10M44 6l-6 10" stroke="var(--accent)" strokeWidth="4" strokeLinecap="round" fill="none" />
          </svg>
          <span className="intro-glass-left absolute">
            <Glass side="left" />
          </span>
          <span className="intro-glass-right absolute">
            <Glass side="right" />
          </span>
        </span>

        <span className="relative mt-2 flex flex-col items-center">
          <span aria-hidden className="intro-slash absolute top-0 h-px w-[min(80vw,26rem)] bg-accent" />
          <span className="flex overflow-hidden pt-3" aria-hidden>
            {NAME.split("").map((c, i) => (
              <span
                key={i}
                className="intro-letter inline-block font-logo text-6xl font-bold tracking-[-0.02em] text-text"
                style={{ animationDelay: `${1.45 + i * 0.06}s` }}
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
