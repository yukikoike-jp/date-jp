// ロゴ: 切り絵の2つのグラスで乾杯する絵(public/tsudoro-icon.svg と lib/og.tsx と同じ形)。
// 黒い地に、白い紙のグラス、黄色のビールと白い泡、金の影。起動のアニメーション(黒い画面に金のビール)と雰囲気をそろえる

const PAPER = "#f6ecd8";
const SHADOW = "#6b4f17";
const BEER = "#f5b83d";
const FOAM = "#fff3d6";

const LEFT = "rotate(-12 66 112)";
const RIGHT = "rotate(12 134 112)";

/** 乾杯の切り絵(viewBox 0 0 200 200、地の色は含まない)。sparks = 「カチン」の線を出すか */
export function CheersArt({ sparks = true }: { sparks?: boolean }) {
  return (
    <>
      <g fill={SHADOW} transform="translate(5 5)">
        <path d="M44 66h44l-6 92h-32z" transform={LEFT} />
        <path d="M112 66h44l-6 92h-32z" transform={RIGHT} />
      </g>
      <g fill={PAPER}>
        <path d="M44 66h44l-6 92h-32z" transform={LEFT} />
        <path d="M112 66h44l-6 92h-32z" transform={RIGHT} />
      </g>
      <g fill={BEER}>
        <path d="M50 84h32l-4.6 66h-22.8z" transform={LEFT} />
        <path d="M118 84h32l-4.6 66h-22.8z" transform={RIGHT} />
      </g>
      <g fill={FOAM}>
        <path d="M49 78h34v10h-34z" transform={LEFT} />
        <path d="M117 78h34v10h-34z" transform={RIGHT} />
      </g>
      {sparks && <path d="M100 30v18M84 36l7 12M116 36l-7 12" stroke={BEER} strokeWidth="5" strokeLinecap="round" />}
    </>
  );
}

export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" aria-hidden className="shrink-0">
      <rect x="3" y="3" width="194" height="194" rx="50" fill="#0f0d0b" stroke="color-mix(in srgb, var(--accent) 40%, transparent)" strokeWidth="6" />
      {/* 小さく出すときは「カチン」の線を省き、グラスを少し大きく見せる */}
      <g transform="translate(100 118) scale(1.15) translate(-100 -112)">
        <CheersArt sparks={false} />
      </g>
    </svg>
  );
}

/** ロゴの横に並べる名前。起動したときに出る「つどろ」(components/SplashIntro.tsx)とそろえる */
export function Wordmark({ size = 28 }: { size?: number }) {
  return (
    <span className="flex items-center gap-2">
      <LogoMark size={size} />
      <span className="font-black tracking-[0.02em] text-white" style={{ fontSize: Math.round(size * 0.7) }}>
        つどろ
      </span>
    </span>
  );
}
