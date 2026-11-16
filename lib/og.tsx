import "server-only";
import { ImageResponse } from "next/og";

// LINE などに貼ったときのプレビュー画像(1200×630)。文字は入れず、乾杯する2つのグラス(public/tsudoro-icon.svg と同じ)を真ん中に置く。
// 会の名前や日時は、プレビューの見出しと説明(ページの title と description)で伝わる。
// 絵は、デプロイ先にファイルが同梱されなくても出るよう、SVG の文字列として持つ

export const OG_SIZE = { width: 1200, height: 630 };

const GLASS = '<path d="M12.4 30h35.2l-3.3 47.6a4.6 4.6 0 0 1-4.6 4.3H20.3a4.6 4.6 0 0 1-4.6-4.3z" fill="#f5b83d"/><path d="M10 18h40l-4 60a6 6 0 0 1-6 6H20a6 6 0 0 1-6-6z" fill="none" stroke="#f5efe6" stroke-width="3" stroke-linejoin="round"/>';
const CHEERS_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <rect width="200" height="200" rx="44" fill="#0b0a09" stroke="rgba(245,184,61,0.3)" stroke-width="1.5"/>
  <path d="M100 26v18M80 32l8 14M120 32l-8 14" stroke="#f5b83d" stroke-width="5" stroke-linecap="round"/>
  <g transform="translate(23 44) scale(1.3) rotate(10 30 54)">${GLASS}</g>
  <g transform="translate(177 44) scale(-1.3 1.3) rotate(10 30 54)">${GLASS}</g>
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
