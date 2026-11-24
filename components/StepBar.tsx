import { CalendarDays, Wallet, Check, Store } from "lucide-react";

// 飲み会のどの段階にいるか。もとにした KANJI と同じく、上のバーの下に3つの段階を細い線で並べる
const STEPS = [
  { Icon: CalendarDays, label: "日程調整" },
  { Icon: Store, label: "お店探し" },
  { Icon: Wallet, label: "集金" },
] as const;

export function StepBar({ current }: { current: 0 | 1 | 2 }) {
  return (
    <ol className="mt-2 flex gap-2" aria-label="飲み会の段階">
      {STEPS.map(({ Icon, label }, i) => {
        // 終わった段階・今いる段階・これからの段階を、見ただけで分かるように分ける
        const done = i < current;
        const now = i === current;
        return (
          <li key={label} className="flex flex-1 flex-col gap-1.5" aria-current={i === current ? "step" : undefined}>
            <div className="flex items-center gap-1.5">
              <span
                className={`grid size-7 shrink-0 place-items-center rounded-lg transition-colors duration-300 ${
                  now ? "bg-accent text-accent-text" : done ? "bg-accent/20 text-accent" : "bg-white/6 text-white/30"
                }`}
              >
                {done ? <Check className="size-4" aria-hidden /> : <Icon className="size-4" aria-hidden />}
              </span>
              <span className={`h-[3px] flex-1 rounded-full transition-all duration-500 ${done ? "bg-accent/60" : now ? "bg-gradient-to-r from-accent/60 to-white/12" : "bg-white/12"}`} />
            </div>
            <span className={`pl-0.5 text-[10px] font-black ${now ? "text-accent" : done ? "text-accent/60" : "text-white/35"}`}>{label}</span>
          </li>
        );
      })}
    </ol>
  );
}
