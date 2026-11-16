// ロゴ: 起動のアニメーション(components/SplashIntro.tsx)の、乾杯して止まった2つのグラスそのもの。
// 白い線の縁取りのグラスに、金のビール。黒い地。public/tsudoro-icon.svg と lib/og.tsx も同じ形にそろえる

export const ICON_BG = "#0b0a09";
const LINE = "#f5efe6";
const BEER = "#f5b83d";

/** グラス1つ(アニメーションの Glass と同じ形。60×90 の座標) */
function LineGlass() {
  return (
    <>
      {/* ビールは、縁取りの内側に入る形で塗る(切り抜きを使わないので、何個並べても id がぶつからない) */}
      <path d="M12.4 30h35.2l-3.3 47.6a4.6 4.6 0 0 1-4.6 4.3H20.3a4.6 4.6 0 0 1-4.6-4.3z" fill={BEER} />
      <path d="M10 18h40l-4 60a6 6 0 0 1-6 6H20a6 6 0 0 1-6-6z" fill="none" stroke={LINE} strokeWidth="3" strokeLinejoin="round" />
    </>
  );
}

/** 乾杯して止まった2つのグラス(viewBox 0 0 200 200、地の色は含まない)。sparks = 乾杯の「カチン」の線 */
export function CheersArt({ sparks = true }: { sparks?: boolean }) {
  return (
    <>
      {sparks && <path d="M100 26v18M80 32l8 14M120 32l-8 14" stroke={BEER} strokeWidth="5" strokeLinecap="round" />}
      {/* 左のグラス: 右へ10度傾けて、真ん中でふちを合わせる */}
      <g transform="translate(23 44) scale(1.3) rotate(10 30 54)">
        <LineGlass />
      </g>
      {/* 右のグラス: 左右を反転 */}
      <g transform="translate(177 44) scale(-1.3 1.3) rotate(10 30 54)">
        <LineGlass />
      </g>
    </>
  );
}

/** アイコンと同じ絵(地とグラスとカチンの線まで、そのまま) */
export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" aria-hidden className="shrink-0">
      <rect width="200" height="200" rx="50" fill={ICON_BG} stroke="color-mix(in srgb, var(--accent) 35%, transparent)" strokeWidth="4" />
      <CheersArt />
    </svg>
  );
}

/** ロゴの横に並べる名前。起動したときに出る「Tsudoro」とそろえ、Poppins の太字を少し詰めて並べる */
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
