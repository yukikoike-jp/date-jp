// ロゴ: 切り絵の2つのグラスで乾杯する絵(public/tsudoro-icon.svg と lib/og.tsx と同じ形)。
// 黒い地に、白い紙のグラス、黄色のビールと白い泡、金の影。
// 起動のアニメーション(components/SplashIntro.tsx)は、この絵の左右のグラスをそのまま動かすので、止まった絵はアイコンと同じになる

export const ICON_BG = "#0f0d0b";
const PAPER = "#f6ecd8";
const SHADOW = "#6b4f17";
const BEER = "#f5b83d";
const FOAM = "#fff3d6";

const SIDE = {
  left: { glass: "M44 66h44l-6 92h-32z", beer: "M50 84h32l-4.6 66h-22.8z", foam: "M49 78h34v10h-34z", tilt: "rotate(-12 66 112)" },
  right: { glass: "M112 66h44l-6 92h-32z", beer: "M118 84h32l-4.6 66h-22.8z", foam: "M117 78h34v10h-34z", tilt: "rotate(12 134 112)" },
};

/**
 * グラス1つ(影・紙・ビール・泡)。viewBox 0 0 200 200 の中の位置で描く。
 * beerClass / foamClass = 起動のアニメーションで、ビールを注ぐ・泡を出す動きに使う
 */
export function CutGlass({ side, beerClass, foamClass }: { side: "left" | "right"; beerClass?: string; foamClass?: string }) {
  const s = SIDE[side];
  return (
    <g transform={s.tilt}>
      <path d={s.glass} fill={SHADOW} transform="translate(5 5)" />
      <path d={s.glass} fill={PAPER} />
      <path d={s.beer} fill={BEER} className={beerClass} />
      <path d={s.foam} fill={FOAM} className={foamClass} />
    </g>
  );
}

/** 乾杯の「カチン」の線 */
export function Sparks({ className }: { className?: string }) {
  return <path d="M100 30v18M84 36l7 12M116 36l-7 12" stroke={BEER} strokeWidth="5" strokeLinecap="round" className={className} />;
}

/** 乾杯の切り絵(viewBox 0 0 200 200、地の色は含まない) */
export function CheersArt() {
  return (
    <>
      <CutGlass side="left" />
      <CutGlass side="right" />
      <Sparks />
    </>
  );
}

/** アイコンと同じ絵(地・グラス・カチンの線まで、そのまま) */
export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" aria-hidden className="shrink-0">
      <rect width="200" height="200" rx="50" fill={ICON_BG} />
      <CheersArt />
    </svg>
  );
}

/** ロゴの横に並べる名前。起動したときに出る「Tsudoro」(components/SplashIntro.tsx)とそろえ、Poppins の太字を少し詰めて並べる */
export function Wordmark({ size = 28 }: { size?: number }) {
  return (
    <span className="flex items-center gap-2">
      <LogoMark size={size} />
      <span className="font-logo font-bold tracking-[-0.02em] text-white" style={{ fontSize: Math.round(size * 0.72) }}>
        Tsudoro
      </span>
    </span>
  );
}
