// ロゴ: 2つのジョッキで乾杯する絵(public/tsudoro-icon.svg と同じ形)。
// 線を減らした平たい絵にして、写真のような陰影は付けない

const BEER = "#f5b83d";
const FOAM = "#fff3d6";

/** ジョッキ1つ(取っ手は左)。左右の位置と傾きは呼ぶ側の transform で決める */
function Mug() {
  return (
    <>
      <path d="M0 52h-22a32 32 0 0 0-32 32v46a32 32 0 0 0 32 32h22" fill="none" stroke={BEER} strokeWidth="22" />
      <rect x="0" y="0" width="140" height="196" rx="22" fill={BEER} />
      <rect x="22" y="46" width="14" height="118" rx="7" fill="#fff" opacity="0.35" />
      <rect x="52" y="46" width="8" height="118" rx="4" fill="#fff" opacity="0.2" />
      <rect x="-4" y="-8" width="148" height="34" rx="14" fill={FOAM} />
      <circle cx="28" cy="-8" r="28" fill={FOAM} />
      <circle cx="74" cy="-20" r="32" fill={FOAM} />
      <circle cx="118" cy="-6" r="26" fill={FOAM} />
    </>
  );
}

/** 乾杯の絵(viewBox 0 0 512 512)。sparks = 「カチン」の線を出すか */
export function CheersArt({ sparks = true }: { sparks?: boolean }) {
  return (
    <>
      {sparks && (
        <g stroke={FOAM} strokeWidth="14" strokeLinecap="round">
          <path d="M256 70v40" />
          <path d="M200 92l18 28" />
          <path d="M312 92l-18 28" />
        </g>
      )}
      <g transform="translate(116 200) rotate(14 140 0)">
        <Mug />
      </g>
      <g transform="translate(396 200) scale(-1 1) rotate(14 140 0)">
        <Mug />
      </g>
    </>
  );
}

export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" aria-hidden className="shrink-0">
      <rect x="8" y="8" width="496" height="496" rx="128" fill="#171513" stroke="color-mix(in srgb, var(--accent) 40%, transparent)" strokeWidth="16" />
      {/* 小さく出すときは「カチン」の線を省き、ジョッキを少し大きく見せる */}
      <g transform="translate(256 290) scale(1.12) translate(-256 -290)">
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
