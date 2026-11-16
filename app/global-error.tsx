"use client";

import { useEffect } from "react";
import { reportError } from "@/lib/reportError";

// 画面全体が出せないほどのエラーのとき。いつもの見た目(globals.css)は読めないので、ここで最低限の見た目を付ける
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    reportError(error);
  }, [error]);
  return (
    <html lang="ja">
      <body style={{ margin: 0, minHeight: "100dvh", display: "grid", placeItems: "center", background: "#0b0a09", color: "#f5efe6", fontFamily: "system-ui, sans-serif", textAlign: "center", padding: 24 }}>
        <title>エラー | Tsudoro</title>
        <div>
          <p style={{ fontSize: 18, fontWeight: 900 }}>うまく表示できませんでした</p>
          <p style={{ fontSize: 14, color: "#a99c8a" }}>もう一度お試しください</p>
          <button type="button" onClick={() => retry()} style={{ marginTop: 16, minHeight: 44, padding: "0 20px", border: 0, borderRadius: 12, background: "#f5b83d", color: "#1a1206", fontWeight: 900 }}>
            もう一度読み込む
          </button>
        </div>
      </body>
    </html>
  );
}
