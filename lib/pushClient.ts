// ブラウザの通知の登録に使う、小さな変換(画面側)。サーバーの鍵(VAPID の公開鍵)は URL で安全な base64 の文字なので、
// 登録の関数が受け取れる数の並び(Uint8Array)に直す

export function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/** この端末・このブラウザで、通知を受け取れるか。iPhone は、ホーム画面に追加したアプリからだけ受け取れる */
export function pushSupport(): "ok" | "needs-install" | "unsupported" {
  if (typeof window === "undefined") return "unsupported";
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
  if (ios && !standalone) return "needs-install";
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window ? "ok" : "unsupported";
}
