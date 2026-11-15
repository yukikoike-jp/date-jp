import "server-only";
import { ImageResponse } from "next/og";

// LINE などに貼ったときのプレビュー画像(1200×630)。文字は入れず、乾杯のジョッキの絵(public/tsudoro-icon.svg と同じ)を真ん中に置く。
// 会の名前や日時は、プレビューの見出しと説明(ページの title と description)で伝わる。
// 絵は、デプロイ先にファイルが同梱されなくても出るよう、SVG の文字列として持つ

export const OG_SIZE = { width: 1200, height: 630 };

const MUG = `
  <path d="M0 52h-22a32 32 0 0 0-32 32v46a32 32 0 0 0 32 32h22" fill="none" stroke="#f5b83d" stroke-width="22"/>
  <rect x="0" y="0" width="140" height="196" rx="22" fill="#f5b83d"/>
  <rect x="22" y="46" width="14" height="118" rx="7" fill="#fff" opacity="0.35"/>
  <rect x="52" y="46" width="8" height="118" rx="4" fill="#fff" opacity="0.2"/>
  <rect x="-4" y="-8" width="148" height="34" rx="14" fill="#fff3d6"/>
  <circle cx="28" cy="-8" r="28" fill="#fff3d6"/>
  <circle cx="74" cy="-20" r="32" fill="#fff3d6"/>
  <circle cx="118" cy="-6" r="26" fill="#fff3d6"/>`;

const CHEERS_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="112" fill="#1c1813" stroke="rgba(245,184,61,0.3)" stroke-width="4"/>
  <g stroke="#fff3d6" stroke-width="14" stroke-linecap="round"><path d="M256 70v40"/><path d="M200 92l18 28"/><path d="M312 92l-18 28"/></g>
  <g transform="translate(116 200) rotate(14 140 0)">${MUG}</g>
  <g transform="translate(396 200) scale(-1 1) rotate(14 140 0)">${MUG}</g>
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
