"use client";

import { useEffect } from "react";
import { recordSource } from "@/app/actions";

// どこから来たかを数える。SNS のプロフィールのリンクに ?s=ig のような印を付けておくと、
// その端末が1日に1回だけ、印の名前で数える(誰かは残さない)。印は英数字12文字まで。画面には何も出さない

export function SourceTracker() {
  useEffect(() => {
    try {
      const s = new URLSearchParams(location.search).get("s");
      if (!s || !/^[a-z0-9_-]{1,12}$/.test(s)) return;
      const day = new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);
      const key = `nomi:src:${day}:${s}`;
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, "1");
      void recordSource(s);
    } catch {}
  }, []);
  return null;
}
