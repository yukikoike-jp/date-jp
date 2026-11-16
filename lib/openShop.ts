import type { MouseEvent } from "react";

// お店のページ(/go/...)へのリンクを押したとき。
// iPhone でホーム画面に追加して開いているときは、新しいタブ(target="_blank")にすると Safari に渡され、
// そこでホットペッパーのアプリが開いてしまう。ホーム画面から開いているときだけ、同じ画面のまま移動する。
// ふつうのブラウザでは何もしない(新しいタブで開き、Tsudoro の画面を残す)

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as { standalone?: boolean }).standalone === true
  );
}

export function openShopInPlace(e: MouseEvent<HTMLAnchorElement>): void {
  if (!isStandalone()) return;
  e.preventDefault();
  location.href = e.currentTarget.href;
}
