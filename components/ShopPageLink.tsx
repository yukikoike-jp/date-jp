"use client";

import type { AnchorHTMLAttributes } from "react";
import { openShopInPlace } from "@/lib/openShop";

/** お店のページ(/go/...)へのリンク。ホーム画面から開いているときは同じ画面で移動する(lib/openShop.ts) */
export function ShopPageLink(props: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a {...props} onClick={openShopInPlace} />;
}
