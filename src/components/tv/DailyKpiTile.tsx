import { LucideIcon } from "lucide-react";
import { BentoTile, Accent, accentVar } from "./BentoTile";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  value: string | number;
  suffix?: string;
  sub?: string;
  icon: LucideIcon;
  accent: Accent;
  code?: string; // e.g. "01" or "CSAT"
}

export function DailyKpiTile({ label, value, suffix, sub, icon: Icon, accent, code }: Props) {
  const color = `hsl(${accentVar[accent]})`;
  return (
    <BentoTile accent={accent} grid>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <div
            className="h-7 w-7 rounded-md flex items-center justify-center border"
            style={{ borderColor: `${color}55`, background: `${color}12` }}
          >
            <Icon className="h-3.5 w-3.5" strokeWidth={1.75} style={{ color }} />
          </div>
          <span className="text-[10px] uppercase tracking-[0.22em] text-[hsl(var(--tv-text-dim))] font-medium">
            {label}
          </span>
        </div>
        {code && (
          <span className="font-mono-tech text-[10px] text-[hsl(var(--tv-text-mute))] tracking-widest">
            {code}
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span
          className="font-display font-semibold tabular-nums leading-none text-[hsl(var(--tv-text))]"
          style={{ fontSize: "3.25rem" }}
        >
          {value}
        </span>
        {suffix && (
          <span className="text-lg font-mono-tech text-[hsl(var(--tv-text-dim))]">{suffix}</span>
        )}
      </div>
      {sub && (
        <div className="mt-2 text-xs text-[hsl(var(--tv-text-dim))] truncate">{sub}</div>
      )}
      <div className="mt-4 h-[2px] w-full rounded-full bg-[hsl(var(--tv-border))] overflow-hidden">
        <div
          className="h-full w-1/3 animate-pulse"
          style={{ background: color, boxShadow: `0 0 10px ${color}` }}
        />
      </div>
    </BentoTile>
  );
}
