import { Clock } from "lucide-react";
import { clock } from "@/lib/sendai";

/** 幹事が決めた開始の時刻を、題名のすぐ下に大きく出す(2026-11-22。前は題名の上の小さな灰色の字で分かりにくかった) */
export function StartTime({ start }: { start: number | null }) {
  if (start === null) return null;
  return (
    <p className="mt-3 inline-flex items-center gap-2.5 rounded-xl bg-surface px-3.5 py-2">
      <Clock className="size-5 text-accent" aria-hidden />
      <span className="text-sm text-muted">開始</span>
      <span className="text-2xl font-bold tabular-nums">{clock(start)}</span>
      <span className="text-sm text-muted">から</span>
    </p>
  );
}
