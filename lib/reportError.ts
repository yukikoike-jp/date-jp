/** 画面で起きたエラーを、サーバーの記録に送る(app/api/log)。会の id などは送らないよう、ページは先頭の区切りまでにする */
export function reportError(error: unknown): void {
  try {
    const e = error as { message?: string; digest?: string } | null;
    const path = "/" + (location.pathname.split("/")[1] ?? "");
    const body = JSON.stringify({ message: e?.message ?? String(error), digest: e?.digest, path });
    if (!navigator.sendBeacon?.("/api/log", new Blob([body], { type: "application/json" }))) {
      void fetch("/api/log", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true });
    }
  } catch {
    // 記録できなくても、画面はそのまま
  }
}
