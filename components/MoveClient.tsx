"use client";

import { useEffect, useState } from "react";
import { decodeMove, isOurKey, mergeStorage } from "@/lib/move";

// 前のアドレスから渡された保存内容を、この端末の保存にまぜて入れ、元いたページへ移る。
// まぜたら、URL の # の後ろ(幹事の鍵などを含む)はすぐ消す(履歴に残さない)

/** 移り先は、このサイトの中のページだけ(ほかのサイトへは飛ばさない) */
function safePath(to: string | null): string {
  return to && /^\/(?!\/)[A-Za-z0-9/_?=&.%-]*$/.test(to) ? to : "/";
}

export function MoveClient() {
  const [done, setDone] = useState<number | null>(null);

  useEffect(() => {
    const incoming = decodeMove(location.hash.slice(1)) ?? {};
    const to = safePath(new URLSearchParams(location.search).get("to"));
    let count = 0;
    try {
      const current: Record<string, string> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && isOurKey(k)) current[k] = localStorage.getItem(k) ?? "";
      }
      for (const [k, v] of Object.entries(mergeStorage(current, incoming))) {
        localStorage.setItem(k, v);
        count += 1;
      }
    } catch {
      // 保存できない端末(プライベートモードなど)でも、ページは開く
    }
    // 消すのは # の後ろ(引き継いだ中身)だけ。移り先(?to=)は残す(もう一度読んでも同じ所へ移れるように)
    history.replaceState(null, "", `/move?to=${encodeURIComponent(to)}`);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDone(count);
    const t = setTimeout(() => location.replace(to), 900);
    return () => clearTimeout(t);
  }, []);

  return (
    <main className="mx-auto grid min-h-dvh max-w-xl place-items-center px-6 text-center">
      <div>
        <p className="text-lg font-black">{done === null ? "引き継いでいます…" : "引き継ぎました"}</p>
        <p className="mt-2 text-sm text-muted">
          {done === null ? "少しお待ちください" : "新しいアドレス tsudoro.com で、作った会や回答をそのまま使えます"}
        </p>
      </div>
    </main>
  );
}
