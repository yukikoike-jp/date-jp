import "server-only";
import { ImageResponse } from "next/og";
import { OG_ICON_URL } from "./og-icon";

// LINE などに貼ったときのプレビュー画像(1200×630)。文字は入れず、SNS のアカウントと同じアイコン(乾杯する2つのグラス。lib/og-icon.ts)を真ん中に置く。
// 会の名前や日時は、プレビューの見出しと説明(ページの title と description)で伝わる。
// 絵は、デプロイ先にファイルが同梱されなくても出るよう、文字列として持つ

export const OG_SIZE = { width: 1200, height: 630 };

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
        <img src={OG_ICON_URL} width={520} height={520} alt="" />
      </div>
    ),
    OG_SIZE,
  );
}
