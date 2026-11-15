import "server-only";
import { ImageResponse } from "next/og";

// LINE などに貼ったときのプレビュー画像(1200×630)。文字は入れず、乾杯の切り絵(public/tsudoro-icon.svg と同じ)を真ん中に置く。
// 会の名前や日時は、プレビューの見出しと説明(ページの title と description)で伝わる。
// 絵は、デプロイ先にファイルが同梱されなくても出るよう、SVG の文字列として持つ

export const OG_SIZE = { width: 1200, height: 630 };

const L = 'transform="rotate(-12 66 112)"';
const R = 'transform="rotate(12 134 112)"';
const CHEERS_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <rect width="200" height="200" rx="44" fill="#0f0d0b" stroke="rgba(245,184,61,0.3)" stroke-width="1.5"/>
  <g fill="#6b4f17" transform="translate(5 5)"><path d="M44 66h44l-6 92h-32z" ${L}/><path d="M112 66h44l-6 92h-32z" ${R}/></g>
  <g fill="#f6ecd8"><path d="M44 66h44l-6 92h-32z" ${L}/><path d="M112 66h44l-6 92h-32z" ${R}/></g>
  <g fill="#f5b83d"><path d="M50 84h32l-4.6 66h-22.8z" ${L}/><path d="M118 84h32l-4.6 66h-22.8z" ${R}/></g>
  <g fill="#fff3d6"><path d="M49 78h34v10h-34z" ${L}/><path d="M117 78h34v10h-34z" ${R}/></g>
  <path d="M100 30v18M84 36l7 12M116 36l-7 12" stroke="#f5b83d" stroke-width="5" stroke-linecap="round"/>
</svg>`;

const CHEERS_URL = `data:image/svg+xml;base64,${Buffer.from(CHEERS_SVG).toString("base64")}`;

export function ogImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0b0a09",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={CHEERS_URL} width={400} height={400} alt="" />
      </div>
    ),
    OG_SIZE,
  );
}
